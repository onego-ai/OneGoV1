import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Clock, MessageCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatFeedbackText } from '@/utils/feedbackUtils';

interface SessionPerformanceAnalysisProps {
  course: any;
  user: any;
  sessionData: {
    totalInteractions: number;
    progressPercentage: number;
    sessionDurationMinutes: number;
    messages: any[];
  };
  onComplete: () => void;
}

const SessionPerformanceAnalysis: React.FC<SessionPerformanceAnalysisProps> = ({
  course,
  user,
  sessionData,
  onComplete
}) => {
  const [usefulnessRating, setUsefulnessRating] = useState(0);
  const [challengeRating, setChallengeRating] = useState(0);
  const [suggestions, setSuggestions] = useState('');
  const [notifyTrial, setNotifyTrial] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(true);
  const { toast } = useToast();

  const tutorPersona = course.course_plan?.tutorPersona || (course.track_type === 'Corporate' ? 'Nia' : 'Leo');
  const isNia = tutorPersona === 'Nia';

  useEffect(() => {
    generateAIFeedback();
  }, []);

  const generateAIFeedback = async () => {
    try {
      setGenerating(true);
      
      // Create conversation summary for AI analysis
      const conversationSummary = sessionData.messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' | ');

      const feedbackPrompt = `As ${tutorPersona}, provide concise personalized feedback for this learning session:

Course: ${course.course_title}
Track: ${course.track_type}
Total Interactions: ${sessionData.totalInteractions}
Progress: ${sessionData.progressPercentage}%
Duration: ${sessionData.sessionDurationMinutes} minutes

Student responses summary: ${conversationSummary}

CRITICAL: Provide feedback in EXACTLY 150 words or less, formatted as bullet points covering:
• Key strengths demonstrated (2-3 points)
• Areas for improvement (1-2 points)  
• Specific achievements this session (1-2 points)
• Next steps for continued learning (1-2 points)

Keep it personal, encouraging, and actionable. Use ${isNia ? 'professional corporate training language' : 'encouraging educational language'}.

Format as bullet points with • symbols. Maximum 150 words total.`;

      const response = await supabase.functions.invoke('chat-with-tutor', {
        body: {
          message: feedbackPrompt,
          chatHistory: [],
          systemPrompt: `You are ${tutorPersona}, providing concise post-session feedback. MAXIMUM 150 words. Use bullet points format.`,
          courseId: course.id,
          userId: user.id,
          userName: user.full_name
        }
      });

      if (response.data?.reply) {
        setAiFeedback(response.data.reply);
      } else {
        setAiFeedback(`• **Great engagement**: You completed ${sessionData.totalInteractions} interactions showing strong participation
• **Solid progress**: Achieved ${sessionData.progressPercentage}% completion in ${sessionData.sessionDurationMinutes} minutes  
• **Active learning**: Your questions and responses demonstrate genuine interest in the material
• **Next steps**: Continue building on today's concepts through practice and application
• **Keep momentum**: Your learning pace is excellent - maintain this consistency for best results`);
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      setAiFeedback(`• **Excellent session**: ${sessionData.totalInteractions} meaningful interactions completed
• **Strong progress**: ${sessionData.progressPercentage}% achievement shows dedication  
• **Engagement**: Active participation throughout the ${sessionData.sessionDurationMinutes}-minute session
• **Moving forward**: Build on today's learning with continued practice
• **Well done**: Keep up this excellent learning momentum!`);
    } finally {
      setGenerating(false);
    }
  };

  const handleStarClick = (rating: number, type: 'usefulness' | 'challenge') => {
    if (type === 'usefulness') {
      setUsefulnessRating(rating);
    } else {
      setChallengeRating(rating);
    }
  };

  const handleSubmit = async () => {
    if (usefulnessRating === 0 || challengeRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide ratings for both usefulness and challenge level.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Save feedback to database
      const { error } = await supabase
        .from('session_feedback')
        .insert({
          user_id: user.id,
          course_id: course.id,
          usefulness_rating: usefulnessRating,
          challenge_rating: challengeRating,
          suggestions: suggestions.trim() || null,
          notify_trial: notifyTrial,
          total_interactions: sessionData.totalInteractions,
          progress_percentage: sessionData.progressPercentage,
          session_duration_minutes: sessionData.sessionDurationMinutes,
          ai_feedback: aiFeedback
        });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve your learning experience.",
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ rating, onRate, label }: { rating: number; onRate: (rating: number) => void; label: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              } hover:text-yellow-400 transition-colors`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>
          <p className="text-gray-600">Here's your performance analysis for <strong>{course.course_title}</strong></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Feedback Section */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                <img 
                  src={isNia ? "/lovable-uploads/1ea99c8a-1f92-4867-8dd3-dcdadc7cdd90.png" : "/lovable-uploads/dd6e7370-e1f2-4c57-87f4-d82781703687.png"} 
                  alt={tutorPersona}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Feedback from {tutorPersona}</h2>
            </div>
            
            {generating ? (
              <div className="space-y-3">
                <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
                <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
                <div className="animate-pulse bg-gray-200 h-4 rounded w-5/6"></div>
                <p className="text-sm text-gray-500 mt-4">Generating personalized feedback...</p>
              </div>
            ) : (
              <div 
                className="text-gray-700 leading-relaxed space-y-2"
                style={{ lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{
                  __html: formatFeedbackText(aiFeedback)
                }}
              />
            )}
          </div>

          {/* Session Metrics */}
          <div className="space-y-6">
            {/* Performance Stats */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <MessageCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{sessionData.totalInteractions}</p>
                  <p className="text-sm text-gray-600">Total Interactions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{sessionData.progressPercentage}%</p>
                  <p className="text-sm text-gray-600">Progress Made</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg col-span-2">
                  <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{sessionData.sessionDurationMinutes}</p>
                  <p className="text-sm text-gray-600">Minutes Spent Learning</p>
                </div>
              </div>
            </div>

            {/* User Feedback Form */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Feedback</h3>
              
              <div className="space-y-6">
                <StarRating
                  rating={usefulnessRating}
                  onRate={(rating) => handleStarClick(rating, 'usefulness')}
                  label="How useful was this session?"
                />
                
                <StarRating
                  rating={challengeRating}
                  onRate={(rating) => handleStarClick(rating, 'challenge')}
                  label="How challenging was this session?"
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="suggestions">
                    Any suggestions?
                  </label>
                  <Textarea
                    id="suggestions"
                    placeholder="Your feedback helps us improve..."
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notify-trial"
                    checked={notifyTrial}
                    onChange={(e) => setNotifyTrial(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="notify-trial" className="text-sm text-gray-700">
                    Notify me about a free trial for future courses
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={onComplete}
            variant="outline"
            className="px-6 py-2"
          >
            Skip Feedback
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || generating}
            className="px-6 py-2 bg-green-500 hover:bg-green-600"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                Submit Feedback
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionPerformanceAnalysis;
