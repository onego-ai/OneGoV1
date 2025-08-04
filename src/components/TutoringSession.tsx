import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteContext } from '@/hooks/useWebsiteContext';
import { sanitizeForTTS } from '@/utils/textUtils';
import { chatMessageSchema, validateInput, sanitizeInput, containsSqlInjection } from '@/lib/validation';
import { tutorRateLimiter, securityMiddleware, logSecurityEvent } from '@/lib/security';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, X, Play, BookOpen, MessageCircle } from 'lucide-react';
import SessionTimer from './SessionTimer';
import CourseReader from './CourseReader';
import { 
  isIOS, 
  isMobile, 
  getBestMimeType, 
  requestMicrophonePermission, 
  createCompatibleAudio, 
  audioContextManager,
  playAudioWithContext,
  isAudioContextSuspended
} from '@/utils/mobileAudioUtils';

interface TutoringSessionProps {
  course: any;
  user: any;
  onEnd: () => void;
  onShowPerformance: (sessionData: any) => void;
  initialMode?: 'chat' | 'reading';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface WelcomeMessage {
  displayText: string;
  speechText: string;
}

interface PendingAudio {
  text: string;
  speechText: string;
  messageIndex: number;
  audioData?: string;
}

interface EnhancedCompanyContext {
  company_name: string;
  company_website: string | null;
  company_logo: string | null;
  websiteData: any;
  contextSummary: string;
}

const TutoringSession: React.FC<TutoringSessionProps> = ({ course, user, onEnd, onShowPerformance, initialMode = 'chat' }) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'chat' | 'reading'>(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(-1);
  const [isFirstSession, setIsFirstSession] = useState(true);
  const [companyWebsiteData, setCompanyWebsiteData] = useState<any>(null);
  const [enhancedCompanyContext, setEnhancedCompanyContext] = useState<EnhancedCompanyContext | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [canClickToReveal, setCanClickToReveal] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  const [audioRequiresUserInteraction, setAudioRequiresUserInteraction] = useState(false);
  const [pendingAudioData, setPendingAudioData] = useState<PendingAudio | null>(null);
  const [audioContextState, setAudioContextState] = useState<string>('not-initialized');
  const [showManualPlayButton, setShowManualPlayButton] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [timerActive, setTimerActive] = useState(false);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const { getEnhancedCompanyContext } = useWebsiteContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isWebsiteDataStale = (lastScrapedAt: string): boolean => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(lastScrapedAt) < thirtyDaysAgo;
  };

  const normalizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  };

  const scrapeWebsiteData = async (websiteUrl: string) => {
    try {
      console.log('Scraping website data for:', websiteUrl);
      
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: {
          websiteUrl: websiteUrl,
          userId: user.id
        }
      });

      if (error || !data?.success) {
        console.error('Error scraping website:', error);
        return null;
      }

      return data.extractedData;
    } catch (error) {
      console.error('Error in scrapeWebsiteData:', error);
      return null;
    }
  };

  const validateAndRefreshWebsiteData = async (currentWebsiteUrl: string) => {
    try {
      const { data: storedData, error } = await supabase
        .from('company_website_data')
        .select('scraped_content, last_scraped_at, website_url')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching stored website data:', error);
        return null;
      }

      let shouldRefresh = false;

      if (!storedData) {
        shouldRefresh = true;
      } else {
        const storedUrl = normalizeUrl(storedData.website_url);
        const currentUrl = normalizeUrl(currentWebsiteUrl);
        
        if (storedUrl !== currentUrl || isWebsiteDataStale(storedData.last_scraped_at)) {
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) {
        const freshData = await scrapeWebsiteData(currentWebsiteUrl);
        return freshData;
      } else {
        return storedData.scraped_content;
      }
    } catch (error) {
      console.error('Error in validateAndRefreshWebsiteData:', error);
      return null;
    }
  };

  const getTutorPersona = () => {
    if (course.course_plan?.tutorPersona) {
      return course.course_plan.tutorPersona;
    }
    
    return course.track_type === 'Corporate' ? 'Nia' : 'Leo';
  };

  const tutorPersona = getTutorPersona();
  const isNia = tutorPersona === 'Nia';
  const firstName = user.full_name?.split(' ')[0] || 'there';
  const companyName = enhancedCompanyContext?.company_name || 'your company';

  const inputsDisabled = loading || isSpeaking || isGeneratingVoice;

  const updateProgress = async (userInteractionCount: number) => {
    try {
      console.log('Updating progress for user interaction count:', userInteractionCount);
      
      // Calculate progress based on interactions (simple linear progression)
      const baseProgress = Math.min(userInteractionCount * 10, 100); // 10% per interaction, max 100%
      
      // Update local state
      setProgress(baseProgress);
      setTotalInteractions(userInteractionCount);
      
      // Update performance record in database
      const { data: existingPerformance, error: fetchError } = await supabase
        .from('user_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing performance:', fetchError);
        return;
      }

      const sessionData = {
        total_interactions: userInteractionCount,
        progress: baseProgress,
        last_activity: new Date().toISOString(),
        session_duration: calculateSessionDuration()
      } as any;

      if (existingPerformance) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_performance')
          .update({
            session_data: sessionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPerformance.id);

        if (updateError) {
          console.error('Error updating performance:', updateError);
        } else {
          console.log('Performance updated successfully');
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('user_performance')
          .insert({
            user_id: user.id,
            course_id: course.id,
            session_data: sessionData,
            started_at: sessionStartTime.toISOString(),
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating performance record:', insertError);
        } else {
          console.log('Performance record created successfully');
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleTimeUp = () => {
    toast({
      title: "⏰ Time's Up!",
      description: "Session complete. Great work!",
      duration: 5000,
    });
    
    setTimeout(() => {
      endSession();
    }, 2000);
  };

  const buildCompanyBrief = (websiteData: any): string => {
    if (!websiteData) return '';
    
    const { description, businessKeywords, mainContent } = websiteData;
    
    // Build a concise company brief
    let brief = '';
    
    if (description) {
      // Use the first sentence of the description and clean it for TTS
      const firstSentence = description.split('.')[0];
      if (firstSentence.length > 20) {
        brief = sanitizeForTTS(firstSentence) + '.';
      }
    }
    
    // Add context about work environment from keywords or content
    const workEnvironmentKeywords = businessKeywords?.filter((keyword: string) => 
      keyword.toLowerCase().includes('safety') ||
      keyword.toLowerCase().includes('warehouse') ||
      keyword.toLowerCase().includes('construction') ||
      keyword.toLowerCase().includes('manufacturing') ||
      keyword.toLowerCase().includes('machinery') ||
      keyword.toLowerCase().includes('industrial')
    ) || [];
    
    if (workEnvironmentKeywords.length > 0 && mainContent) {
      // Check if content mentions safety or work environment
      const safetyMentions = mainContent.toLowerCase().includes('safety') ||
                           mainContent.toLowerCase().includes('machinery') ||
                           mainContent.toLowerCase().includes('warehouse') ||
                           mainContent.toLowerCase().includes('construction');
      
      if (safetyMentions) {
        brief += brief ? ' ' : '';
        brief += "As an employee, it's important to remember the safety considerations in your work environment.";
      }
    }
    
    return brief;
  };

  useEffect(() => {
    const initializeSession = async () => {
      console.log('Initializing session...');
      setSessionStartTime(new Date());
      
      const isMobileDetected = isMobile();
      const isIOSDetected = isIOS();
      
      setIsMobileDevice(isMobileDetected);
      setIsIOSDevice(isIOSDetected);
      
      await audioContextManager.initialize();
      setAudioContextState(audioContextManager.getState());
      
      const userInteractionCompleted = audioContextManager.getUserInteractionStatus();
      if (userInteractionCompleted) {
        setAudioRequiresUserInteraction(false);
      } else if (isIOSDetected) {
        setAudioRequiresUserInteraction(true);
      }
      
      if (isMobileDetected) {
        const hasPermission = await requestMicrophonePermission();
        setMicrophonePermission(hasPermission);
      }
      
      const [enhancedContext] = await Promise.all([
        getEnhancedCompanyContext(user),
        initializePerformance()
      ]);
      
      setEnhancedCompanyContext(enhancedContext);
      
      if (enhancedContext.websiteData) {
        setCompanyWebsiteData(enhancedContext.websiteData);
      }
      
      const sessionKey = `session_${course.id}`;
      const savedSession = localStorage.getItem(sessionKey);
      
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
            setProgress(parsed.progress || 0);
            setIsFirstSession(false);
          } else {
            initializeNewSession(enhancedContext);
          }
        } catch (error) {
          console.error('Error parsing saved session:', error);
          initializeNewSession(enhancedContext);
        }
      } else {
        initializeNewSession(enhancedContext);
      }
    };

    initializeSession();

    return () => {
      audioContextManager.cleanup();
    };
  }, [course.id, user.id]);

  useEffect(() => {
    const checkAudioState = () => {
      const newState = audioContextManager.getState();
      setAudioContextState(newState);
      
      if (newState === 'suspended' && isIOSDevice && !audioRequiresUserInteraction) {
        setShowManualPlayButton(true);
      }
    };

    const interval = setInterval(checkAudioState, 2000);
    return () => clearInterval(interval);
  }, [isIOSDevice, audioRequiresUserInteraction]);

  const initializePerformance = async () => {
    try {
      const { data: performance, error } = await supabase
        .from('user_performance')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress: 0,
          total_interactions: 0,
          session_data: { 
            started_at: new Date().toISOString(),
            company_context: companyName,
            training_goal: course.course_plan?.goal
          }
        }, {
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error initializing performance:', error);
      } else if (performance) {
        setProgress(performance.progress || 0);
      }
    } catch (error) {
      console.error('Error in initializePerformance:', error);
    }
  };

  const generateWelcomeMessage = (enhancedContext?: EnhancedCompanyContext): WelcomeMessage => {
    const baseDisplayText = `Hello ${user.full_name?.split(' ')[0] || 'there'}! I'm **${course.course_plan?.tutorPersona || (course.track_type === 'Corporate' ? 'Nia' : 'Leo')}** from **ONEGO Learning**.`;
    const baseSpeechText = `Hello ${user.full_name?.split(' ')[0] || 'there'}! I'm **${course.course_plan?.tutorPersona || (course.track_type === 'Corporate' ? 'Nia' : 'Leo')}** from **ONE GO Learning**.`;
    
    if (course.track_type === 'Corporate') {
      const goal = course.course_plan?.goal || 'workplace skills';
      
      // Build company context ONLY if we have valid website data AND company website is configured
      let companyContext = '';
      
      // DEBUG: Log enhanced context validation
      console.log('🔍 Company Context Validation:', {
        hasWebsiteData: !!enhancedContext?.websiteData,
        companyName: enhancedContext?.company_name,
        companyWebsite: enhancedContext?.company_website,
        websiteDataTitle: enhancedContext?.websiteData?.title
      });
      
      if (enhancedContext?.websiteData && enhancedContext.company_name && enhancedContext.company_website) {
        // ADDITIONAL SECURITY CHECK: Ensure no Ray White data leakage
        const websiteTitle = enhancedContext.websiteData.title || '';
        const websiteDesc = enhancedContext.websiteData.description || '';
        
        if (websiteTitle.includes('Ray White') || websiteDesc.includes('Ray White') || 
            websiteDesc.includes('Australasia') || websiteDesc.includes('12,000 property')) {
          console.error('🚨 BLOCKED: Ray White data detected in enhanced context - skipping company context');
          companyContext = '';
        } else {
          const companyBrief = buildCompanyBrief(enhancedContext.websiteData);
          if (companyBrief) {
            companyContext = `\n\nOn behalf of **${enhancedContext.company_name}**, ${companyBrief}`;
            console.log('✅ Company context created successfully');
          }
        }
      } else {
        console.log('🔍 Skipping company context - validation failed');
      }
      
      const courseDescription = course.course_plan?.courseDescription || goal;
      const learnerDescription = course.course_plan?.learnerDescription || 'workplace professionals';
      
      return {
        displayText: `${baseDisplayText}${companyContext}\n\n**Course Overview:**\n${courseDescription}\n\n**Designed for:** ${learnerDescription}\n\nWe're going to be learning about **${goal}**. I'll guide you through the key concepts and practical applications step by step.\n\n${user.full_name?.split(' ')[0] || 'there'}, are you ready to get started?`,
        speechText: `${baseSpeechText}${companyContext}\n\nCourse Overview: ${courseDescription}\n\nDesigned for: ${learnerDescription}\n\nWe're going to be learning about ${goal}. I'll guide you through the key concepts and practical applications step by step.\n\n${user.full_name?.split(' ')[0] || 'there'}, are you ready to get started?`
      };
    } else {
      const objective = course.course_plan?.objective || course.course_title;
      const courseDescription = course.course_plan?.courseDescription || objective;
      const learnerDescription = course.course_plan?.learnerDescription || 'students';
      
      return {
        displayText: `Hi ${user.full_name?.split(' ')[0] || 'there'}! I'm **${course.course_plan?.tutorPersona || 'Leo'}** from **ONEGO Learning**.\n\n**Course Overview:**\n${courseDescription}\n\n**Designed for:** ${learnerDescription}\n\nToday we're going to be learning about **${objective}**. I've prepared a structured approach to help you master this subject.\n\n${user.full_name?.split(' ')[0] || 'there'}, are you ready to get started?`,
        speechText: `Hi ${user.full_name?.split(' ')[0] || 'there'}! I'm ${course.course_plan?.tutorPersona || 'Leo'} from ONE GO Learning.\n\nCourse Overview: ${courseDescription}\n\nDesigned for: ${learnerDescription}\n\nToday we're going to be learning about ${objective}. I've prepared a structured approach to help you master this subject.\n\n${user.full_name?.split(' ')[0] || 'there'}, are you ready to get started?`
      };
    }
  };

  const initializeNewSession = (enhancedContext?: EnhancedCompanyContext) => {
    const welcomeMessageData = generateWelcomeMessage(enhancedContext);
    
    const welcomeMessage: Message = {
      role: 'assistant',
      content: welcomeMessageData.displayText,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    if (audioEnabled) {
      speakMessage(welcomeMessageData.displayText, welcomeMessageData.speechText, 0);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    if (messages.length > 0) {
      const sessionData = {
        messages,
        progress,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`session_${course.id}`, JSON.stringify(sessionData));
    }
  }, [messages, progress, course.id]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAudioToggle = () => {
    console.log('Audio toggle clicked - current state:', { audioEnabled, isMuted, isSpeaking });
    
    if (audioEnabled && !isMuted) {
      // Muting: pause current audio and set muted state
      console.log('Muting audio');
      setIsMuted(true);
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        console.log('Audio paused');
      }
      
      setIsSpeaking(false);
      setIsGeneratingVoice(false);
      
      // Clear streaming but don't restart
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
      
    } else if (audioEnabled && isMuted) {
      // Unmuting: resume muted state but don't restart current audio
      console.log('Unmuting audio');
      setIsMuted(false);
      
      // Don't automatically restart audio - just enable it for future messages
      
    } else {
      // Enabling audio from disabled state
      console.log('Enabling audio from disabled state');
      setAudioEnabled(true);
      setIsMuted(false);
    }
  };

  const handleMicClick = () => {
    if (inputsDisabled || (isMobileDevice && microphonePermission === false)) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startTextStreaming = (text: string, audioDuration?: number) => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    const words = text.split(' ');
    const totalWords = words.length;
    let currentWordIndex = 0;
    
    const baseWordTime = audioDuration ? (audioDuration * 1000) / totalWords : 120;
    
    setCanClickToReveal(true);
    
    const streamInterval = setInterval(() => {
      if (currentWordIndex < words.length) {
        const wordsToShow = words.slice(0, currentWordIndex + 1);
        const currentText = wordsToShow.join(' ');
        
        const currentWord = words[currentWordIndex];
        let wordDelay = baseWordTime;
        
        if (currentWord.includes('.') || currentWord.includes('!') || currentWord.includes('?')) {
          wordDelay *= 1.5;
        } else if (currentWord.includes(',') || currentWord.includes(';')) {
          wordDelay *= 1.2;
        }
        
        setStreamingText(currentText);
        currentWordIndex++;
        
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = setTimeout(() => {
            const newInterval = setInterval(() => {
              if (currentWordIndex < words.length) {
                const wordsToShow = words.slice(0, currentWordIndex + 1);
                setStreamingText(wordsToShow.join(' '));
                currentWordIndex++;
              } else {
                if (streamingIntervalRef.current) {
                  clearInterval(streamingIntervalRef.current);
                  streamingIntervalRef.current = null;
                }
                setCanClickToReveal(false);
              }
            }, baseWordTime);
            streamingIntervalRef.current = newInterval;
          }, wordDelay - baseWordTime);
        }
      } else {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setCanClickToReveal(false);
      }
    }, baseWordTime);
    
    streamingIntervalRef.current = streamInterval;
  };

  const handleTextClick = (messageIndex: number, fullText: string) => {
    if (canClickToReveal && messageIndex === streamingMessageIndex) {
      setStreamingText(fullText);
      setCanClickToReveal(false);
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
    }
  };

  const speakMessage = async (text: string, speechText: string | undefined, messageIndex: number) => {
    // Add guards to prevent execution when muted or audio disabled
    if (!audioEnabled || isMuted) {
      console.log('Audio disabled or muted, only showing text streaming');
      setStreamingMessageIndex(messageIndex);
      startTextStreaming(text);
      return;
    }
    
    console.log(`Speaking message ${messageIndex}, audio context state:`, audioContextManager.getState());
    
    if (isAudioContextSuspended() && isIOSDevice) {
      console.log('Audio context suspended, storing audio for manual playback');
      setPendingAudioData({ text, speechText, messageIndex });
      setShowManualPlayButton(true);
      setStreamingMessageIndex(messageIndex);
      startTextStreaming(text);
      return;
    }
    
    if (isSpeaking) {
      console.log('Already speaking, skipping');
      return;
    }
    
    setIsGeneratingVoice(true);
    setStreamingMessageIndex(messageIndex);
    setShowManualPlayButton(false);
    
    try {
      const textForSpeech = speechText || text;
      
      // Clean the text using our new sanitization function
      const cleanText = sanitizeForTTS(textForSpeech)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^\* /gm, '')
        .replace(/\n\s*\* /g, ', ')
        .replace(/\* ([^\n]+)\n\* ([^\n]+)\n\* ([^\n]+)/g, '$1, $2, and $3')
        .replace(/\* ([^\n]+)\n\* ([^\n]+)/g, '$1 and $2')
        .replace(/\s\*\s*/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('Original text for TTS:', textForSpeech);
      console.log('Cleaned text for TTS:', cleanText);
      
      const response = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: cleanText,
          voice: isNia ? 'nova' : 'alloy'
        }
      });

      setIsGeneratingVoice(false);

      // Check again if audio is still enabled/unmuted after async operation
      if (!audioEnabled || isMuted) {
        console.log('Audio was disabled/muted during generation, not playing');
        startTextStreaming(text);
        return;
      }

      if (response.data?.audioContent) {
        setPendingAudioData({ 
          text, 
          speechText, 
          messageIndex, 
          audioData: response.data.audioContent 
        });

        const audio = createCompatibleAudio(response.data.audioContent, 'audio/mp3');
        currentAudioRef.current = audio;
        
        audio.oncanplaythrough = async () => {
          console.log('Audio ready to play');
          
          // Final check before playing
          if (!audioEnabled || isMuted) {
            console.log('Audio disabled/muted, not playing');
            startTextStreaming(text);
            return;
          }
          
          try {
            const playbackSuccess = await playAudioWithContext(audio);
            
            if (playbackSuccess) {
              setIsSpeaking(true);
              const estimatedDuration = audio.duration || (cleanText.length * 0.05);
              startTextStreaming(text, estimatedDuration);
              setShowManualPlayButton(false);
            } else {
              console.log('Automatic playback failed, showing manual button');
              setShowManualPlayButton(true);
              startTextStreaming(text);
            }
          } catch (error) {
            console.error('Playback error:', error);
            setShowManualPlayButton(true);
            startTextStreaming(text);
          }
        };
        
        audio.onended = () => {
          console.log('Audio playback ended');
          setIsSpeaking(false);
          setStreamingText('');
          setStreamingMessageIndex(-1);
          if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }
        };
        
        audio.onerror = (error) => {
          console.error('Audio element error:', error);
          setIsSpeaking(false);
          setIsGeneratingVoice(false);
          setStreamingText('');
          setStreamingMessageIndex(-1);
          setShowManualPlayButton(true);
          startTextStreaming(text);
        };
        
        audio.volume = 0.8;
        
      } else {
        startTextStreaming(text);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
      setIsGeneratingVoice(false);
      setStreamingText('');
      setStreamingMessageIndex(-1);
      startTextStreaming(text);
    }
  };

  const handleManualAudioPlay = async () => {
    if (!pendingAudioData) return;
    
    try {
      console.log('Manual audio play triggered');
      
      const contextReady = await audioContextManager.resumeIfNeeded();
      if (contextReady) {
        audioContextManager.setUserInteractionCompleted(true);
        setAudioRequiresUserInteraction(false);
        setShowManualPlayButton(false);
      }
      
      if (pendingAudioData.audioData) {
        const audio = createCompatibleAudio(pendingAudioData.audioData, 'audio/mp3');
        currentAudioRef.current = audio;
        
        audio.oncanplaythrough = async () => {
          try {
            await audio.play();
            setIsSpeaking(true);
            console.log('Manual audio playback started');
          } catch (error) {
            console.error('Manual audio play failed:', error);
            toast({
              title: "Audio Playback Issue",
              description: "Unable to play audio. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        audio.onended = () => {
          setIsSpeaking(false);
        };
        
        audio.volume = 0.8;
      } else {
        await speakMessage(
          pendingAudioData.text, 
          pendingAudioData.speechText, 
          pendingAudioData.messageIndex
        );
      }
      
    } catch (error) {
      console.error('Manual audio play error:', error);
      toast({
        title: "Audio Error",
        description: "Unable to play audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    if (inputsDisabled || isRecording) return;
    
    if (microphonePermission === false) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mimeType = getBestMimeType();
      console.log('Using MIME type for recording:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Recording Error",
          description: "There was an error with the recording. Please try again.",
          variant: "destructive",
        });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setMicrophonePermission(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = "Could not access microphone. Please check permissions.";
      if (isIOSDevice) {
        errorMessage = "Microphone access denied. Please enable microphone permissions in your browser settings and refresh the page.";
      }
      
      toast({
        title: "Microphone Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setMicrophonePermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setLoading(true);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const response = await supabase.functions.invoke('deepgram-stt', {
          body: { audio: base64Audio }
        });

        if (response.data?.text) {
          await sendMessage(response.data.text);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Audio Processing Error",
        description: "Could not process your voice message.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || inputsDisabled) return;

    // SECURITY: Rate limiting check (temporarily disabled for testing)
    /*
    const rateLimitResult = await securityMiddleware.checkRateLimit(
      user?.id || 'anonymous', 
      tutorRateLimiter
    );
    
    if (!rateLimitResult.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: rateLimitResult.message,
        variant: "destructive",
      });
      return;
    }
    */

    // SECURITY: Input validation and sanitization
    const sanitizedMessage = sanitizeInput(message);
    
    // Check for potential SQL injection attempts
    if (containsSqlInjection(sanitizedMessage)) {
      await logSecurityEvent({
        type: 'sql_injection_attempt',
        userId: user?.id,
        details: `Potential SQL injection in message: ${message.substring(0, 100)}`,
        severity: 'critical'
      });
      toast({
        title: "Invalid Input",
        description: "Your message contains potentially harmful content.",
        variant: "destructive",
      });
      return;
    }

    // Validate message structure
    const validationResult = validateInput(chatMessageSchema, {
      message: sanitizedMessage,
      course_id: course.id,
      chat_history: messages.slice(-10) // Limit history for validation
    });

    if (!validationResult.success) {
      await logSecurityEvent({
        type: 'invalid_input',
        userId: user?.id,
        details: `Message validation failed: ${(validationResult as { success: false; error: string }).error}`,
        severity: 'medium'
      });
      toast({
        title: "Invalid Message",
        description: "Please check your message and try again.",
        variant: "destructive",
      });
      return;
    }

    const startTime = performance.now();
    
    const userMessage: Message = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    if (!timerActive) {
      setTimerActive(true);
    }

    try {
      // Simplified system prompt to avoid length issues
      const enhancedSystemPrompt = `You are ${course.course_plan?.tutorPersona || 'an expert tutor'} from ONEGO Learning.

COURSE: ${course.course_title}
GOAL: ${course.course_plan?.goal || 'Help learners understand the course content'}
TARGET: ${course.course_plan?.learnerDescription || 'Learners'}

Keep responses between 40-100 words. Be engaging and use **bold** for key points. Stay focused on the course topic.`;

      console.log('System prompt length:', enhancedSystemPrompt.length);
      console.log('Chat history length:', messages.length);
      
      console.log('Sending request to chat-with-tutor function...');
      console.log('Request body:', {
        message,
        courseId: course.id,
        userId: user.id,
        coursePlan: course.course_plan,
        trackType: course.track_type,
        companyName: companyName,
        chatHistoryLength: messages.length
      });

      // Use the same format as CourseReader (which works)
      const response = await supabase.functions.invoke('chat-with-tutor', {
        body: {
          message,
          chatHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          systemPrompt: enhancedSystemPrompt,
          courseId: course.id,
          userId: user.id,
          userName: user.full_name,
          coursePlan: course.course_plan,
          trackType: course.track_type,
          companyName: companyName,
          companyData: companyWebsiteData
        }
      });

      const responseTime = performance.now() - startTime;
      console.log(`API response time: ${responseTime.toFixed(2)}ms`);
      console.log('Response received:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(`Function error: ${response.error.message}`);
      }

      if (response.data?.reply) {
        console.log('Reply received in sendMessage:', response.data.reply);
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.reply,
          timestamp: new Date()
        };

        setMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          
          // Only speak if audio is enabled and not muted
          if (audioEnabled && !isMuted) {
            speakMessage(response.data.reply, response.data.speechReply, newMessages.length - 1);
          } else {
            // Just show text streaming without audio
            setStreamingMessageIndex(newMessages.length - 1);
            startTextStreaming(response.data.reply);
          }
          
          return newMessages;
        });
        
        // Update progress based on user interactions
        const userInteractions = messages.filter(m => m.role === 'user').length + 1;
        await updateProgress(userInteractions);

        if (isFirstSession) {
          setIsFirstSession(false);
        }
      } else if (response.data && typeof response.data === 'object') {
        // Fallback: try to extract reply from different possible formats
        const possibleReply = response.data.reply || response.data.message || response.data.content || response.data.text;
        if (possibleReply) {
          console.log('Fallback reply found:', possibleReply);
          const assistantMessage: Message = {
            role: 'assistant',
            content: possibleReply,
            timestamp: new Date()
          };

          setMessages(prev => {
            const newMessages = [...prev, assistantMessage];
            setStreamingMessageIndex(newMessages.length - 1);
            startTextStreaming(possibleReply);
            return newMessages;
          });
          
          const userInteractions = messages.filter(m => m.role === 'user').length + 1;
          await updateProgress(userInteractions);

          if (isFirstSession) {
            setIsFirstSession(false);
          }
        } else {
          console.error('No reply found in response data:', response.data);
          throw new Error('No reply received from tutor');
        }
      } else {
        console.error('Invalid response format:', response);
        throw new Error('No reply received from tutor');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Chat Error",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSessionDuration = () => {
    const now = new Date();
    const durationMs = now.getTime() - sessionStartTime.getTime();
    return Math.round(durationMs / (1000 * 60));
  };

  const resetSession = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }
    setIsSpeaking(false);
    setIsGeneratingVoice(false);
    setStreamingText('');
    setStreamingMessageIndex(-1);
    setTimerActive(false);
    
    localStorage.removeItem(`session_${course.id}`);
    setMessages([]);
    setProgress(0);
    setSessionStartTime(new Date());
    window.location.reload();
  };

  const endSession = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }
    setIsSpeaking(false);
    
    const userInteractions = messages.filter(m => m.role === 'user').length;
    const sessionData = {
      totalInteractions: userInteractions,
      progressPercentage: progress,
      sessionDurationMinutes: calculateSessionDuration(),
      messages: messages,
      companyContext: companyName,
      trainingGoal: course.course_plan?.goal
    };
    
    onShowPerformance(sessionData);
    localStorage.removeItem(`session_${course.id}`);
  };

  // Debug function to test chat
  const testChatFunction = async () => {
    try {
      console.log('Testing chat function...');
      console.log('Course data:', {
        id: course.id,
        title: course.course_title,
        system_prompt: course.system_prompt,
        course_plan: course.course_plan
      });
      
      const testResponse = await supabase.functions.invoke('chat-with-tutor', {
        body: {
          message: "Test message",
          chatHistory: [],
          systemPrompt: course.system_prompt || "You are a helpful tutor.",
          courseId: course.id,
          userId: user.id,
          userName: user.full_name,
          coursePlan: course.course_plan,
          trackType: course.track_type,
          companyName: companyName,
          companyData: companyWebsiteData
        }
      });
      
      console.log('Test response:', testResponse);
      console.log('Test response data:', testResponse.data);
      console.log('Test response error:', testResponse.error);
      
      if (testResponse.error) {
        toast({
          title: "Test Failed",
          description: `Error: ${testResponse.error.message}`,
          variant: "destructive",
        });
      } else if (testResponse.data?.reply) {
        console.log('Reply received:', testResponse.data.reply);
        toast({
          title: "Test Successful",
          description: `Chat function is working! Reply: ${testResponse.data.reply.substring(0, 50)}...`,
        });
      } else {
        console.log('No reply in data:', testResponse.data);
        toast({
          title: "Test Failed",
          description: "No reply received from function",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Show reading mode if selected
  if (mode === 'reading') {
    return (
      <CourseReader
        course={course}
        user={user}
        onEnd={onEnd}
        onShowPerformance={onShowPerformance}
        onSwitchToChat={() => setMode('chat')}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-2 sm:mr-4">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
            {course.course_title}
          </h1>
          <div className="mt-1 sm:mt-2 bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {progress}% Complete • {totalInteractions} interactions
          </p>
        </div>
        
        {/* Debug button - remove in production */}
        <button
          onClick={testChatFunction}
          className="px-2 sm:px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
          title="Test chat function"
        >
          Test Chat
        </button>
        
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('chat')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                mode === 'chat'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setMode('reading')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                mode === 'reading'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              <span className="hidden sm:inline">Read</span>
            </button>
          </div>
          
          <SessionTimer
            durationString={course.course_plan?.duration || 'No time limit (free flow)'}
            onTimeUp={handleTimeUp}
            isActive={timerActive}
          />
          
          <button
            onClick={handleAudioToggle}
            className={`p-1.5 sm:p-2 rounded-full ${
              audioEnabled && !isMuted 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title={
              !audioEnabled 
                ? 'Audio disabled' 
                : isMuted 
                  ? 'Audio muted' 
                  : 'Audio enabled'
            }
          >
            {audioEnabled && !isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          
          <button
            onClick={resetSession}
            className="p-1.5 sm:p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          
          <button
            onClick={endSession}
            className="p-1.5 sm:p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS Audio Status Banner */}
      {isIOSDevice && (showManualPlayButton || audioRequiresUserInteraction) && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-800 text-xs sm:text-sm">
                {audioRequiresUserInteraction 
                  ? "Tap to enable audio playback" 
                  : "Audio ready - tap to play current message"
                }
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Audio Context: {audioContextState}
              </p>
            </div>
            <button
              onClick={handleManualAudioPlay}
              className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2"
            >
              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Play Audio</span>
            </button>
          </div>
        </div>
      )}

      {/* Microphone Permission Banner */}
      {isMobileDevice && microphonePermission === false && (
        <div className="bg-orange-50 border-b border-orange-200 px-3 sm:px-4 py-2 sm:py-3">
          <p className="text-orange-800 text-xs sm:text-sm">
            Microphone access is required for voice input. Please enable it in your browser settings and refresh the page.
          </p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8 sm:mt-10">
            <p className="text-sm sm:text-base">Starting your session...</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-900 border'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full overflow-hidden mr-2 sm:mr-3">
                    <img 
                      src={isNia ? "/lovable-uploads/1ea99c8a-1f92-4867-8dd3-dcdadc7cdd90.png" : "/lovable-uploads/dd6e7370-e1f2-4c57-87f4-d82781703687.png"} 
                      alt={tutorPersona}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs sm:text-sm font-medium mr-1 sm:mr-2">{tutorPersona}</span>
                    {index === streamingMessageIndex && isGeneratingVoice && (
                      <div className="flex items-center text-xs text-blue-500">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse mr-1"></div>
                        <span className="hidden sm:inline">Thinking...</span>
                      </div>
                    )}
                    {index === streamingMessageIndex && isSpeaking && !isGeneratingVoice && (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                        <span className="hidden sm:inline">Speaking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {message.role === 'assistant' && index === streamingMessageIndex && isGeneratingVoice && audioEnabled ? (
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              ) : (
                <div
                  className={`whitespace-pre-line text-sm sm:text-base ${canClickToReveal && index === streamingMessageIndex ? 'cursor-pointer' : ''}`}
                  onClick={() => handleTextClick(index, message.content)}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      if (index === streamingMessageIndex && streamingText) {
                        const displayText = streamingText + (canClickToReveal ? '<span class="animate-pulse">|</span>' : '');
                        return displayText
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>');
                      }
                      return message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>');
                    })()
                  }}
                />
              )}
              
              {canClickToReveal && index === streamingMessageIndex && !isGeneratingVoice && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  Click to reveal full text
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border px-3 sm:px-4 py-2 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full overflow-hidden mr-2 sm:mr-3">
                  <img 
                    src={isNia ? "/lovable-uploads/1ea99c8a-1f92-4867-8dd3-dcdadc7cdd90.png" : "/lovable-uploads/dd6e7370-e1f2-4c57-87f4-d82781703687.png"} 
                    alt={tutorPersona}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-3 sm:p-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={handleMicClick}
              disabled={inputsDisabled || (isMobileDevice && microphonePermission === false)}
              className={`p-2.5 sm:p-3 rounded-full transition-colors ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
            {isRecording && (
              <div className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {isMobileDevice ? "Tap to Stop" : "Click to Stop"}
              </div>
            )}
          </div>
          
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !inputsDisabled && sendMessage(inputMessage)}
            placeholder={
              inputsDisabled 
                ? isSpeaking || isGeneratingVoice 
                  ? "Tutor is speaking..." 
                  : "Processing..." 
                : isMobileDevice 
                  ? "Type or tap microphone..." 
                  : "Type your message or click the microphone..."
            }
            disabled={inputsDisabled}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          />
          
          <button
            onClick={() => sendMessage(inputMessage)}
            disabled={inputsDisabled || !inputMessage.trim()}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutoringSession;
