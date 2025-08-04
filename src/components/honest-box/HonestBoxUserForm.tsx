
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Users, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';

interface MonthlyQuestion {
  id: string;
  question: string;
  month_year: string;
  group_id: string;
}

interface Update {
  id: string;
  title: string;
  content: string;
  published_at: string;
  published_by: string;
  group_id: string;
}

const HonestBoxUserForm: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState<MonthlyQuestion | null>(null);
  const [monthlyResponse, setMonthlyResponse] = useState('');
  const [openFeedback, setOpenFeedback] = useState('');
  const [updates, setUpdates] = useState<Update[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Get current month/year for question lookup
  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    if (profile?.group_id) {
      fetchCurrentQuestion();
      fetchUpdates();
    }
  }, [profile?.group_id]);

  const fetchCurrentQuestion = async () => {
    if (!profile?.group_id) return;
    
    try {
      const currentMonthYear = getCurrentMonthYear();
      
      const { data, error } = await supabase
        .from('honest_box_monthly_questions')
        .select('*')
        .eq('month_year', currentMonthYear)
        .eq('group_id', profile.group_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching monthly question:', error);
        return;
      }

      setCurrentQuestion(data);
    } catch (error) {
      console.error('Error fetching monthly question:', error);
    }
  };

  const fetchUpdates = async () => {
    if (!profile?.group_id) return;
    
    try {
      const { data, error } = await supabase
        .from('honest_box_updates')
        .select('*')
        .eq('group_id', profile.group_id)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching updates:', error);
        return;
      }

      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleSubmit = async () => {
    if (!monthlyResponse.trim() && !openFeedback.trim()) {
      toast({
        title: "No feedback provided",
        description: "Please provide some feedback before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.group_id) {
      toast({
        title: "Error",
        description: "Unable to determine your company. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('honest_box_feedback')
        .insert({
          monthly_question: currentQuestion?.question || null,
          monthly_response: monthlyResponse.trim() || null,
          open_feedback: openFeedback.trim() || null,
          month_year: getCurrentMonthYear(),
          group_id: profile.group_id
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        toast({
          title: "Error",
          description: "There was an error submitting your feedback. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Success animation and reset
      toast({
        title: "Feedback submitted! 🚀",
        description: "Your anonymous feedback has been sent. Thank you for your voice!",
      });

      setMonthlyResponse('');
      setOpenFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // If user doesn't have a group_id, show error message
  if (!profile?.group_id) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">
              Unable to access HonestBox. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Anonymous Guarantee Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">
            Your voice, 100% anonymous. No names, no specific dates, just your ideas.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HonestBox</h1>
        <p className="text-gray-600">
          A safe space for honest feedback that drives real improvement
        </p>
      </div>

      {/* Monthly Question Section */}
      {currentQuestion && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>This Month's Question</span>
              <Badge variant="outline">{currentQuestion.month_year}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-900 font-medium">{currentQuestion.question}</p>
            </div>
            <Textarea
              placeholder="Share your thoughts on this month's question..."
              value={monthlyResponse}
              onChange={(e) => setMonthlyResponse(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Open Feedback Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <span>Open Feedback</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Have something else on your mind? Share any other ideas or thoughts here.
          </p>
          <Textarea
            placeholder="What's on your mind? Ideas, suggestions, observations..."
            value={openFeedback}
            onChange={(e) => setOpenFeedback(e.target.value)}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="text-center">
        <Button
          onClick={handleSubmit}
          disabled={submitting || (!monthlyResponse.trim() && !openFeedback.trim())}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Sending...' : 'Submit Anonymously'}
        </Button>
      </div>

      {/* You Spoke, We Listened Section */}
      {updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>You Spoke, We Listened</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-900 mb-1">{update.title}</h4>
                <p className="text-gray-700 mb-2">{update.content}</p>
                <p className="text-sm text-gray-500">
                  Published {new Date(update.published_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HonestBoxUserForm;
