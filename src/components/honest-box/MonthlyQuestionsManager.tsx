
import React, { useState, useEffect } from 'react';
import { Calendar, Edit, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth/AuthProvider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MonthlyQuestion {
  id: string;
  question: string;
  month_year: string;
  group_id: string;
}

const MonthlyQuestionsManager: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<MonthlyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (profile?.group_id) {
      fetchQuestions();
    }
  }, [profile?.group_id]);

  const parseMonthYear = (monthYear: string): Date => {
    const [month, year] = monthYear.split(' ');
    const monthIndex = new Date(Date.parse(month + " 1, 2012")).getMonth();
    return new Date(parseInt(year), monthIndex);
  };

  const sortQuestionsByCurrentMonth = (questions: MonthlyQuestion[]): MonthlyQuestion[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return questions.sort((a, b) => {
      const dateA = parseMonthYear(a.month_year);
      const dateB = parseMonthYear(b.month_year);
      
      // Calculate months from current month
      const monthsFromCurrentA = (dateA.getFullYear() - currentYear) * 12 + (dateA.getMonth() - currentMonth);
      const monthsFromCurrentB = (dateB.getFullYear() - currentYear) * 12 + (dateB.getMonth() - currentMonth);
      
      // Handle negative values (past months) by adding them to the end
      const adjustedA = monthsFromCurrentA < 0 ? monthsFromCurrentA + 1000 : monthsFromCurrentA;
      const adjustedB = monthsFromCurrentB < 0 ? monthsFromCurrentB + 1000 : monthsFromCurrentB;
      
      return adjustedA - adjustedB;
    });
  };

  const fetchQuestions = async () => {
    if (!profile?.group_id) return;
    
    try {
      const { data, error } = await supabase
        .from('honest_box_monthly_questions')
        .select('*')
        .eq('group_id', profile.group_id);

      if (error) {
        console.error('Error fetching monthly questions:', error);
        return;
      }

      const sortedQuestions = sortQuestionsByCurrentMonth(data || []);
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Error fetching monthly questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthIndicator = (monthYear: string): boolean => {
    const now = new Date();
    const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return monthYear === currentMonthYear;
  };

  const startEditing = (question: MonthlyQuestion) => {
    setEditingId(question.id);
    setEditingText(question.question);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveQuestion = async (id: string) => {
    if (!editingText.trim()) {
      toast({
        title: "Error",
        description: "Question cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('honest_box_monthly_questions')
        .update({ question: editingText.trim() })
        .eq('id', id)
        .eq('group_id', profile?.group_id || '');

      if (error) {
        console.error('Error updating question:', error);
        toast({
          title: "Error",
          description: "Failed to update question.",
          variant: "destructive"
        });
        return;
      }

      fetchQuestions();
      setEditingId(null);
      setEditingText('');
      
      toast({
        title: "Updated",
        description: "Question updated successfully.",
      });
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Monthly Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">Loading questions...</div>
        </CardContent>
      </Card>
    );
  }

  const visibleQuestions = questions.slice(0, 3);
  const hiddenQuestions = questions.slice(3);

  const renderQuestion = (question: MonthlyQuestion) => (
    <div key={question.id} className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className={`font-medium ${getCurrentMonthIndicator(question.month_year) ? 'text-green-600 font-semibold' : 'text-blue-600'}`}>
          {question.month_year}
          {getCurrentMonthIndicator(question.month_year) && (
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Current Month
            </span>
          )}
        </div>
        {editingId !== question.id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startEditing(question)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {editingId === question.id ? (
        <div className="space-y-3">
          <Textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="min-h-[80px]"
            placeholder="Enter the monthly question..."
          />
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => saveQuestion(question.id)}
              className="flex items-center space-x-1"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              className="flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-gray-700">{question.question}</div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Monthly Questions</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Manage the monthly questions for your HonestBox. These will automatically change on the 1st of each month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No monthly questions found. Questions should be automatically created when your company is set up.
          </div>
        ) : (
          <>
            {/* Always visible first 3 questions */}
            {visibleQuestions.map(renderQuestion)}

            {/* Collapsible section for remaining questions */}
            {hiddenQuestions.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 mt-4"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Show Less Questions ({hiddenQuestions.length} hidden)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Show More Questions ({hiddenQuestions.length} more)</span>
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  {hiddenQuestions.map(renderQuestion)}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyQuestionsManager;
