import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteContext } from '@/hooks/useWebsiteContext';
import { 
  BookOpen, 
  MessageCircle, 
  CheckCircle, 
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import CourseContentRenderer from './content/CourseContentRenderer';

interface CourseReaderProps {
  course: any;
  user: any;
  onEnd: () => void;
  onShowPerformance: (sessionData: any) => void;
  onSwitchToChat: () => void;
}

interface CourseSection {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  duration: number;
  isCompleted: boolean;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  isCompleted: boolean;
  score?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface EnhancedCompanyContext {
  company_name: string;
  company_website: string | null;
  company_logo: string | null;
  websiteData: any;
  contextSummary: string;
}

const CourseReader: React.FC<CourseReaderProps> = ({ 
  course, 
  user, 
  onEnd, 
  onShowPerformance, 
  onSwitchToChat 
}) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: number}>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  // Removed timer; no time limit in reading mode
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [enhancedCompanyContext, setEnhancedCompanyContext] = useState<EnhancedCompanyContext | null>(null);
  const { getEnhancedCompanyContext } = useWebsiteContext();

  useEffect(() => {
    initializeCourse();
  }, [course]);

  const initializeCourse = async () => {
    setLoading(true);
    try {
      // Get enhanced company context if available
      if (user?.group_id) {
        const context = await getEnhancedCompanyContext(user.group_id);
        setEnhancedCompanyContext(context);
      }

      // Use the course modules that were already created in CourseCreator
      if (course.course_plan?.modules && Array.isArray(course.course_plan.modules)) {
        const courseSections = course.course_plan.modules.map((module: any, index: number) => ({
          id: `section-${index + 1}`,
          title: module.title,
          content: module.content,
          keyPoints: module.keyPoints || [],
          duration: 0,
          isCompleted: false
        }));
        setSections(courseSections);
        console.log('Using existing course modules:', courseSections);
        
        // If quizzes are already saved in course_plan, use them
        if (course.course_plan?.quizzes && Array.isArray(course.course_plan.quizzes)) {
          setQuizzes(course.course_plan.quizzes);
          console.log('Loaded persisted quizzes from course_plan');
        } else {
          // Generate quizzes based on course content
          const generatedQuizzes = await generateQuizzes(courseSections, course.course_plan?.numberOfQuizzes || 1);
          setQuizzes(generatedQuizzes);
          console.log('Generated quizzes:', generatedQuizzes);
          // Persist generated quizzes so they appear in editor later
          await persistQuizzes(generatedQuizzes, true);
        }
      } else {
        // Fallback to generating sections if modules don't exist
        const generatedSections = await generateCourseSections();
        setSections(generatedSections);
        console.log('Generated new course sections:', generatedSections);
        
        // Generate quizzes for fallback sections
        const generatedQuizzes = await generateQuizzes(generatedSections, 2);
        setQuizzes(generatedQuizzes);
        await persistQuizzes(generatedQuizzes, true);
      }
      
      // No timer; just record session start time locally
      setSessionStartTime(new Date());
      
      toast({
        title: "Course Ready",
        description: "You can now read through the course content at your own pace.",
      });
    } catch (error) {
      console.error('Error initializing course:', error);
      toast({
        title: "Error",
        description: "Failed to load course content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCourseSections = async (): Promise<CourseSection[]> => {
    const coursePlan = course.course_plan;
    const trackType = course.track_type;
    
    // Generate comprehensive course content using AI
    const systemPrompt = `You are an expert course content creator. Create a comprehensive, readable course structure for:

Course: ${course.course_title}
Track: ${trackType}
Goal: ${coursePlan?.goal || coursePlan?.objective}
Industry: ${coursePlan?.industry}
Duration: ${coursePlan?.duration || '30'} minutes

Create 3-5 sections with:
1. Clear, engaging titles
2. Detailed content (200-400 words per section)
3. 3-5 key points per section
4. Estimated reading time (2-5 minutes per section)

Format as JSON with sections array containing: id, title, content, keyPoints, duration, isCompleted.`;

    try {
      const response = await supabase.functions.invoke('chat-with-tutor', {
        body: {
          message: "Generate course content structure",
          chatHistory: [],
          systemPrompt: systemPrompt,
          courseId: course.id,
          userId: user.id,
          userName: user.full_name,
          coursePlan: course.course_plan,
          trackType: course.track_type,
          companyName: enhancedCompanyContext?.company_name || 'General',
          companyData: enhancedCompanyContext?.websiteData
        }
      });

      if (response.error) throw new Error(response.error);

      // Parse the AI response to extract course sections
      const aiResponse = response.data.reply;
      const sections = parseCourseSections(aiResponse, coursePlan);
      
      return sections;
    } catch (error) {
      console.error('Error generating course sections:', error);
      // Fallback to basic sections
      return generateFallbackSections(coursePlan, trackType);
    }
  };

  const parseCourseSections = (aiResponse: string, coursePlan: any): CourseSection[] => {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          return parsed.sections.map((section: any, index: number) => ({
            id: section.id || `section-${index + 1}`,
            title: section.title || `Section ${index + 1}`,
            content: section.content || '',
            keyPoints: section.keyPoints || [],
            duration: 0,
            isCompleted: false
          }));
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }
    
    // Fallback if parsing fails
    return generateFallbackSections(coursePlan, course.track_type);
  };

  const generateFallbackSections = (coursePlan: any, trackType: string): CourseSection[] => {
    const numberOfTopics = coursePlan.numberOfTopics || 3;
    const topicDuration = 0;
    
    return Array.from({ length: numberOfTopics }, (_, index) => ({
      id: `section-${index + 1}`,
      title: `Topic ${index + 1}`,
      content: `This is the content for topic ${index + 1}. It covers essential concepts and provides practical examples.`,
      keyPoints: [
        `Key point 1 for topic ${index + 1}`,
        `Key point 2 for topic ${index + 1}`,
        `Key point 3 for topic ${index + 1}`
      ],
      duration: topicDuration,
      isCompleted: false
    }));
  };

  const generateQuizzes = async (sections: CourseSection[], numberOfQuizzes: number): Promise<Quiz[]> => {
    const quizzes: Quiz[] = [];
    
    for (let i = 0; i < numberOfQuizzes; i++) {
      const quizSections = sections.slice(i * Math.ceil(sections.length / numberOfQuizzes), (i + 1) * Math.ceil(sections.length / numberOfQuizzes));
      const quizTitle = `Knowledge Check ${i + 1}`;
      const questions: QuizQuestion[] = [];

      // Generate AI-powered questions for each section
      for (const section of quizSections) {
        try {
          console.log(`Generating AI quiz questions for section: ${section.title}`);
          
          const response = await fetch('https://yzgxmmgghoiiyddebwrr.supabase.co/functions/v1/generate-quiz', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Z3htbWdnaG9paXlkZGVid3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE3MzMsImV4cCI6MjA2OTc3NzczM30.gzI5CAdCdCbcc-jbRcJe2hjXWnQX7Yc8KqWWKFypZdU`,
            },
            body: JSON.stringify({
              sectionTitle: section.title,
              sectionContent: section.content,
              keyPoints: section.keyPoints,
              numberOfQuestions: 2, // 2 questions per section
              courseTopic: course.course_plan?.courseDescription || 'Course content'
            })
          });

          if (!response.ok) {
            console.error('Failed to generate AI quiz questions:', response.status);
            // Fallback to basic questions if AI generation fails
            questions.push(createFallbackQuestion(section, questions.length));
            continue;
          }

          const data = await response.json();
          
          if (data.success && data.questions) {
            console.log(`Generated ${data.questions.length} AI questions for section: ${section.title}`);
            questions.push(...data.questions);
          } else {
            console.error('Invalid response from AI quiz generation:', data);
            questions.push(createFallbackQuestion(section, questions.length));
          }
        } catch (error) {
          console.error('Error generating AI quiz questions:', error);
          questions.push(createFallbackQuestion(section, questions.length));
        }
      }

      // Ensure we have at least 3 questions per quiz
      while (questions.length < 3) {
        questions.push({
          id: `fallback-${i}-${questions.length}`,
          question: `What is the primary goal of this course?`,
          options: [
            'To provide comprehensive understanding of core concepts',
            'To offer advanced technical skills only',
            'To introduce basic concepts without depth',
            'To focus on theoretical knowledge only'
          ],
          correctAnswer: 0,
          explanation: 'The course aims to provide a comprehensive understanding of core concepts.'
        });
      }

      quizzes.push({
        id: `quiz-${i + 1}`,
        title: quizTitle,
        questions: questions.slice(0, 5), // Limit to 5 questions per quiz
        isCompleted: false
      });
    }
    
    return quizzes;
  };

  // Helper function to create fallback questions when AI generation fails
  const createFallbackQuestion = (section: CourseSection, questionIndex: number): QuizQuestion => {
    return {
      id: `fallback-${section.id}-${questionIndex}`,
      question: `What is the main concept discussed in "${section.title}"?`,
      options: [
        `Understanding ${section.title.toLowerCase()}`,
        `Advanced techniques in ${section.title.toLowerCase()}`,
        `Basic introduction to ${section.title.toLowerCase()}`,
        `Practical applications of ${section.title.toLowerCase()}`
      ],
      correctAnswer: 0,
      explanation: `This section focuses on understanding the core concept of ${section.title}.`
    };
  };

  const markSectionComplete = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isCompleted: true } 
        : section
    ));
    
    // Update progress to include both sections and quizzes
    const completedSections = sections.filter(s => s.isCompleted).length + 1; // +1 for current section
    const completedQuizzes = quizzes.filter(q => q.isCompleted).length;
    const totalItems = sections.length + quizzes.length;
    const newProgress = Math.round(((completedSections + completedQuizzes) / totalItems) * 100);
    setProgress(newProgress);

    // Save section completion to database
    saveSectionCompletion(sectionId, newProgress);
  };

  const saveSectionCompletion = async (sectionId: string, newProgress: number) => {
    try {
      // Get current performance record
      const { data: currentPerformance, error: fetchError } = await supabase
        .from('user_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching performance:', fetchError);
        return;
      }

      // Prepare session data with section completion information
      const sessionData = currentPerformance?.session_data as any || {};
      const existingSections = sessionData.completedSections || {};
      
      const sectionData = {
        ...sessionData,
        completedSections: {
          ...existingSections,
          [sectionId]: {
            completedAt: new Date().toISOString(),
            sectionTitle: sections.find(s => s.id === sectionId)?.title || 'Unknown Section'
          }
        },
        totalSectionsCompleted: Object.keys(existingSections).length + 1,
        lastSectionCompleted: new Date().toISOString()
      };

      // Calculate points based on section completion (5 points per section)
      const sectionPoints = 5;
      const totalPoints = (((currentPerformance as any)?.points as number) || 0) + sectionPoints;

      // Update performance record
      const { error: updateError } = await supabase
        .from('user_performance')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress: newProgress,
          points: totalPoints,
          total_interactions: totalInteractions + 1,
          session_data: sectionData,
          updated_at: new Date().toISOString(),
          ...(newProgress >= 100 && { completed_at: new Date().toISOString() })
        }, {
          onConflict: 'user_id,course_id'
        });

      if (updateError) {
        console.error('Error updating performance:', updateError);
      } else {
        console.log('Section completion saved successfully');
      }
    } catch (error) {
      console.error('Error saving section completion:', error);
    }
  };

  // Removed TTS play/pause controls in reader

  // No time limit
  const handleTimeUp = () => {};

  const endSession = async () => {
    try {
      const sessionDuration = Math.round((Date.now() - sessionStartTime.getTime()) / 1000);
      const completedSections = sections.filter(s => s.isCompleted).length;
      
      const sessionData = {
        courseId: course.id,
        userId: user.id,
        duration: sessionDuration,
        progress: progress,
        totalInteractions: totalInteractions,
        completedSections: completedSections,
        totalSections: sections.length,
        mode: 'reading'
      };

      // Save session data
      const { error } = await supabase
        .from('user_performance')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress: progress,
          total_interactions: totalInteractions,
          session_data: sessionData,
          completed_at: progress >= 100 ? new Date().toISOString() : null
        });

      if (error) throw error;

      onShowPerformance(sessionData);
    } catch (error) {
      console.error('Error ending session:', error);
      onEnd();
    }
  };

  const resetSession = () => {
    setSections(prev => prev.map(section => ({ ...section, isCompleted: false })));
    setQuizzes(prev => prev.map(quiz => ({ ...quiz, isCompleted: false, score: undefined })));
    setProgress(0);
    setCurrentSection(0);
    // Removed timer; no time pressure
    setSessionStartTime(new Date());
  };

  const handleQuizComplete = (quizId: string, score: number) => {
    setQuizzes(prev => prev.map(quiz => 
      quiz.id === quizId 
        ? { ...quiz, isCompleted: true, score } 
        : quiz
    ));
    setShowQuiz(false);
    setCurrentQuiz(null);
    
    // Update progress to include quiz completion
    const completedSections = sections.filter(s => s.isCompleted).length;
    const completedQuizzes = quizzes.filter(q => q.isCompleted).length + 1; // +1 for current quiz
    const totalItems = sections.length + quizzes.length;
    const newProgress = Math.round(((completedSections + completedQuizzes) / totalItems) * 100);
    setProgress(newProgress);

    // Save quiz performance to database
    saveQuizPerformance(quizId, score);
  };

  const saveQuizPerformance = async (quizId: string, score: number) => {
    try {
      // Get current performance record
      const { data: currentPerformance, error: fetchError } = await supabase
        .from('user_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching performance:', fetchError);
        return;
      }

      // Prepare session data with quiz information
      const sessionData = currentPerformance?.session_data as any || {};
      const existingQuizzes = sessionData.quizzes || {};
      
      const quizData = {
        ...sessionData,
        quizzes: {
          ...existingQuizzes,
          [quizId]: {
            score,
            completedAt: new Date().toISOString(),
            questions: quizzes.find(q => q.id === quizId)?.questions.length || 0
          }
        },
        totalQuizzesCompleted: Object.keys(existingQuizzes).length + 1,
        lastQuizCompleted: new Date().toISOString()
      };

      // Calculate points based on quiz performance
      const quizPoints = Math.round((score / 100) * 10); // 10 points max per quiz
      const totalPoints = (((currentPerformance as any)?.points as number) || 0) + quizPoints;

      // Calculate new progress
      const completedSections = sections.filter(s => s.isCompleted).length;
      const completedQuizzes = quizzes.filter(q => q.isCompleted).length + 1; // +1 for current quiz
      const totalItems = sections.length + quizzes.length;
      const newProgress = Math.round(((completedSections + completedQuizzes) / totalItems) * 100);

      // Update performance record
      const { error: updateError } = await supabase
        .from('user_performance')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          progress: newProgress,
          points: totalPoints,
          total_interactions: totalInteractions + 1,
          session_data: quizData,
          updated_at: new Date().toISOString(),
          ...(newProgress >= 100 && { completed_at: new Date().toISOString() })
        }, {
          onConflict: 'user_id,course_id'
        });

      if (updateError) {
        console.error('Error updating performance:', updateError);
      } else {
        console.log('Quiz performance saved successfully');
      }
    } catch (error) {
      console.error('Error saving quiz performance:', error);
    }
  };

  // Persist quizzes to the course's course_plan for future sessions
  const persistQuizzes = async (updatedQuizzes: Quiz[], silent: boolean = false) => {
    try {
      const updatedPlan = {
        ...course.course_plan,
        quizzes: updatedQuizzes,
      };
      const { error } = await supabase
        .from('courses')
        .update({ course_plan: updatedPlan, updated_at: new Date().toISOString() })
        .eq('id', course.id);
      if (error) throw error;
      if (!silent) {
        toast({ title: 'Quiz saved', description: 'Your quiz changes have been saved.' });
      }
    } catch (e) {
      console.error('Failed to persist quizzes:', e);
      if (!silent) {
        toast({ title: 'Save failed', description: 'Could not save quiz changes.', variant: 'destructive' });
      }
    }
  };

  // Starts the first incomplete quiz, or the first quiz if all are completed
  const startFirstAvailableQuiz = () => {
    const nextQuiz = quizzes.find(q => !q.isCompleted) || quizzes[0];
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setShowQuiz(true);
      setQuizAnswers({});
    }
  };

  // Sidebar component for course navigation
  const CourseSidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const startQuiz = (quiz: Quiz) => {
      setCurrentQuiz(quiz);
      setShowQuiz(true);
      setQuizAnswers({});
      // Close sidebar on mobile after starting quiz
      setIsSidebarOpen(false);
    };

    return (
      <>
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-20 left-4 z-40">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="bg-white p-2 rounded-lg shadow-md border border-gray-200 touch-target"
          >
            <BookOpen className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out lg:transition-none`}>
          <div className="w-80 lg:w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Course Outline</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1 text-gray-400 hover:text-gray-600 touch-target"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              
              {/* Sections */}
              <div className="mb-6">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">📚 Course Sections</h3>
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setCurrentSection(index);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-2 sm:p-3 text-left flex items-center justify-between border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors touch-target ${
                        section.isCompleted ? 'bg-green-50 border-green-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-medium ${
                          section.isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {section.isCompleted ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`text-xs sm:text-sm font-medium ${
                          section.isCompleted ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {section.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quizzes */}
              {quizzes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">🧠 Knowledge Checks</h3>
                  <div className="space-y-2">
                    {quizzes.map((quiz, index) => (
                      <div key={quiz.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => startQuiz(quiz)}
                          className={`w-full p-2 sm:p-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors touch-target ${
                            quiz.isCompleted ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-medium ${
                              quiz.isCompleted 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {quiz.isCompleted ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                'Q'
                              )}
                            </div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              quiz.isCompleted ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                              {quiz.title}
                            </span>
                          </div>
                          {quiz.score !== undefined && (
                            <span className="text-xs text-gray-500">
                              {quiz.score}%
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Summary */}
              <div className="mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <h3 className="text-xs sm:text-sm font-semibold text-blue-800 mb-2">Progress</h3>
                <div className="text-xs sm:text-sm text-blue-700">
                  {sections.filter(s => s.isCompleted).length} of {sections.length} sections completed
                </div>
                {quizzes.length > 0 && (
                  <div className="text-xs sm:text-sm text-blue-700 mt-1">
                    {quizzes.filter(q => q.isCompleted).length} of {quizzes.length} quizzes completed
                  </div>
                )}
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Quiz component
  const QuizComponent = ({ quiz, onComplete }: { quiz: Quiz; onComplete: (score: number) => void }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{[key: string]: number}>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editableQuiz, setEditableQuiz] = useState<Quiz>({ ...quiz, questions: quiz.questions.map(q => ({ ...q, options: [...q.options] })) });

    const currentQuestion = quiz.questions[currentQuestionIndex];

    const handleAnswerSelect = (answerIndex: number) => {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answerIndex
      }));
    };

    const handleNext = () => {
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        let correctAnswers = 0;
        quiz.questions.forEach(question => {
          if (answers[question.id] === question.correctAnswer) {
            correctAnswers++;
          }
        });
        const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
        setScore(finalScore);
        setShowResults(true);
      }
    };

    const handleComplete = () => {
      onComplete(score);
    };

    const updateQuizInState = (updated: Quiz) => {
      setQuizzes(prev => {
        const next = prev.map(q => (q.id === updated.id ? updated : q));
        // Persist full quizzes set
        persistQuizzes(next);
        return next;
      });
    };

    const addQuestion = () => {
      const newQuestion: QuizQuestion = {
        id: `custom-${Date.now()}`,
        question: 'New question',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 0,
        explanation: ''
      };
      setEditableQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    };

    const removeQuestion = (qid: string) => {
      setEditableQuiz(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== qid) }));
    };

    const updateQuestionText = (qid: string, text: string) => {
      setEditableQuiz(prev => ({
        ...prev,
        questions: prev.questions.map(q => (q.id === qid ? { ...q, question: text } : q))
      }));
    };

    const addOption = (qid: string) => {
      setEditableQuiz(prev => ({
        ...prev,
        questions: prev.questions.map(q => (q.id === qid ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q))
      }));
    };

    const removeOption = (qid: string, index: number) => {
      setEditableQuiz(prev => ({
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id !== qid) return q;
          const newOptions = q.options.filter((_, i) => i !== index);
          const newCorrect = Math.min(q.correctAnswer, newOptions.length - 1);
          return { ...q, options: newOptions, correctAnswer: Math.max(0, newCorrect) };
        })
      }));
    };

    const updateOptionText = (qid: string, index: number, text: string) => {
      setEditableQuiz(prev => ({
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id !== qid) return q;
          const newOptions = [...q.options];
          newOptions[index] = text;
          return { ...q, options: newOptions };
        })
      }));
    };

    const setCorrect = (qid: string, index: number) => {
      setEditableQuiz(prev => ({
        ...prev,
        questions: prev.questions.map(q => (q.id === qid ? { ...q, correctAnswer: index } : q))
      }));
    };

    const saveEdits = () => {
      updateQuizInState(editableQuiz);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="bg-white rounded-lg shadow-md border p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Quiz</h2>
            <div className="space-x-2">
              <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-sm rounded-md border">Cancel</button>
              <button onClick={saveEdits} className="px-3 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600">Save Changes</button>
            </div>
          </div>
          <div className="space-y-6">
            {editableQuiz.questions.map((q, qi) => (
              <div key={q.id} className="border rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-3">
                    <label className="text-xs font-medium text-gray-700">Question {qi + 1}</label>
                    <input
                      value={q.question}
                      onChange={(e) => updateQuestionText(q.id, e.target.value)}
                      className="w-full mt-1 p-2 border rounded"
                    />
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-red-600 text-sm">Remove</button>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-700">Options</label>
                  <div className="mt-2 space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === oi}
                          onChange={() => setCorrect(q.id, oi)}
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateOptionText(q.id, oi, e.target.value)}
                          className="flex-1 p-2 border rounded"
                        />
                        <button onClick={() => removeOption(q.id, oi)} className="text-red-600 text-sm">Delete</button>
                      </div>
                    ))}
                    <button onClick={() => addOption(q.id)} className="text-green-600 text-sm">+ Add Option</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addQuestion} className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600">+ Add Question</button>
          </div>
        </div>
      );
    }

    if (showResults) {
      return (
        <div className="bg-white rounded-lg shadow-md border p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Quiz Results</h2>
            <div className="text-4xl sm:text-6xl font-bold text-blue-600 mb-3 sm:mb-4">{score}%</div>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              You got {Math.round((score / 100) * quiz.questions.length)} out of {quiz.questions.length} questions correct!
            </p>
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="text-left p-3 sm:p-4 border rounded-lg">
                  <p className="font-medium text-sm sm:text-base text-gray-900 mb-2">
                    {index + 1}. {question.question}
                  </p>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 sm:p-3 rounded text-sm sm:text-base ${
                          optionIndex === question.correctAnswer
                            ? 'bg-green-100 text-green-800'
                            : answers[question.id] === optionIndex && optionIndex !== question.correctAnswer
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {option}
                        {optionIndex === question.correctAnswer && (
                          <span className="ml-2 text-green-600">✓ Correct</span>
                        )}
                        {answers[question.id] === optionIndex && optionIndex !== question.correctAnswer && (
                          <span className="ml-2 text-red-600">✗ Incorrect</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleComplete}
              className="bg-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base touch-target w-full sm:w-auto"
            >
              Complete Quiz
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md border p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          {user?.role === 'Admin' && (
            <button onClick={() => setIsEditing(true)} className="px-3 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600">Edit Quiz</button>
          )}
        </div>
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
            {currentQuestion.question}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-3 sm:p-4 text-left border rounded-lg transition-colors text-sm sm:text-base touch-target ${
                  answers[currentQuestion.id] === index
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-target"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={answers[currentQuestion.id] === undefined}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base touch-target ${
              answers[currentQuestion.id] !== undefined
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={onEnd}
                className="flex items-center text-gray-600 hover:text-gray-800 text-sm sm:text-base touch-target"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Courses</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate max-w-32 sm:max-w-none">
                  {course.course_title}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* No session timer; free-flow reading */}
              
              <button
                onClick={onSwitchToChat}
                className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-green-600 hover:text-green-700 touch-target"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Switch to Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>
              
              
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Progress: {progress}% ({sections.filter(s => s.isCompleted).length}/{sections.length} sections)
            </span>
            <button
              onClick={resetSession}
              className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-gray-800 touch-target"
            >
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <CourseSidebar />
        
        {/* Course Content */}
        <div className="flex-1 overflow-y-auto lg:ml-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {showQuiz && currentQuiz ? (
              <QuizComponent 
                quiz={currentQuiz} 
                onComplete={(score) => handleQuizComplete(currentQuiz.id, score)} 
              />
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {sections[currentSection] && (() => {
                  const section = sections[currentSection];
                  return (
                    <div 
                      key={section.id}
                      id={section.id}
                      className={`bg-white rounded-lg shadow-md border transition-all duration-300 ${
                        section.isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                      style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        maxWidth: '800px',
                        margin: '0 auto'
                      }}
                    >
                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-0">
                            <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium ${
                              section.isCompleted 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {section.isCompleted ? (
                                <CheckCircle className="h-3 w-3 sm:h-5 sm:w-5" />
                              ) : (
                                currentSection + 1
                              )}
                            </div>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                              {section.title?.replace(/^[⭐🌟★☆•\-\s]+/, '')}
                            </h2>
                          </div>
                          
                          <div className="flex items-center space-x-2"></div>
                        </div>

                        <div className="mb-4 sm:mb-6">
                          <CourseContentRenderer content={section.content} />
                        </div>

                        {/* Key Points */}
                        <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                          <h3 className="text-xs sm:text-sm font-semibold text-blue-800 mb-2 sm:mb-3">
                            Key Points:
                          </h3>
                          <ul className="space-y-1 sm:space-y-2">
                            {section.keyPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="flex items-start space-x-2">
                                <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-blue-700">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Navigation */}
                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-between gap-3">
                          <button
                            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                            disabled={currentSection === 0}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-target"
                          >
                            Previous Module
                          </button>

                          {!section.isCompleted && (
                            <button
                              onClick={() => markSectionComplete(section.id)}
                              className="flex-1 sm:flex-none bg-green-500 text-white py-2 sm:py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm sm:text-base touch-target"
                            >
                              Mark as Complete
                            </button>
                          )}

                          {currentSection === sections.length - 1 && quizzes.length > 0 && (
                            <button
                              onClick={startFirstAvailableQuiz}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm sm:text-base touch-target"
                            >
                              Move to Quiz
                            </button>
                          )}

                          <button
                            onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                            disabled={currentSection === sections.length - 1}
                            className="px-4 py-2 text-white rounded-md text-sm sm:text-base touch-target disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600"
                          >
                            Next Module
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {/* Completion Message */}
                {progress >= 100 && (
                  <div className="mt-6 sm:mt-8 bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 text-center">
                    <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-2">
                      Course Completed!
                    </h3>
                    <p className="text-sm sm:text-base text-green-700 mb-3 sm:mb-4">
                      Congratulations! You've successfully completed all sections and quizzes of this course.
                    </p>
                    <button
                      onClick={endSession}
                      className="bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base touch-target"
                    >
                      View Performance
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseReader; 