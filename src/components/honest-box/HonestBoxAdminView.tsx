import React, { useState, useEffect } from 'react';
import { MessageSquare, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import AdminStats from './AdminStats';
import FeedbackFilters from './FeedbackFilters';
import FeedbackItem from './FeedbackItem';
import PublishUpdateDialog from './PublishUpdateDialog';
import UpdatesList from './UpdatesList';
import HonestBoxUserForm from './HonestBoxUserForm';
import MonthlyQuestionsManager from './MonthlyQuestionsManager';

interface Feedback {
  id: string;
  monthly_question: string | null;
  monthly_response: string | null;
  open_feedback: string | null;
  submitted_at: string;
  month_year: string;
  status: string;
  priority: string;
  flagged_inappropriate: boolean;
  admin_notes: string | null;
  group_id: string;
}

interface Update {
  id: string;
  title: string;
  content: string;
  published_at: string;
  group_id: string;
}

const HonestBoxAdminView: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showUserView, setShowUserView] = useState(false);
  
  // New update form
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [showNewUpdateDialog, setShowNewUpdateDialog] = useState(false);

  useEffect(() => {
    if (profile?.group_id) {
      fetchFeedback();
      fetchUpdates();
    }
  }, [profile?.group_id]);

  const fetchFeedback = async () => {
    if (!profile?.group_id) return;
    
    try {
      const { data, error } = await supabase
        .from('honest_box_feedback')
        .select('*')
        .eq('group_id', profile.group_id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching feedback:', error);
        return;
      }

      setFeedback(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    if (!profile?.group_id) return;
    
    try {
      const { data, error } = await supabase
        .from('honest_box_updates')
        .select('*')
        .eq('group_id', profile.group_id)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching updates:', error);
        return;
      }

      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const updateFeedbackStatus = async (id: string, status: string, priority?: string) => {
    try {
      const updateData: any = { status };
      if (priority) updateData.priority = priority;

      const { error } = await supabase
        .from('honest_box_feedback')
        .update(updateData)
        .eq('id', id)
        .eq('group_id', profile?.group_id || '');

      if (error) {
        console.error('Error updating feedback:', error);
        toast({
          title: "Error",
          description: "Failed to update feedback status.",
          variant: "destructive"
        });
        return;
      }

      fetchFeedback();
      toast({
        title: "Updated",
        description: "Feedback status updated successfully.",
      });
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const flagFeedback = async (id: string, flagged: boolean) => {
    try {
      const { error } = await supabase
        .from('honest_box_feedback')
        .update({ flagged_inappropriate: flagged })
        .eq('id', id)
        .eq('group_id', profile?.group_id || '');

      if (error) {
        console.error('Error flagging feedback:', error);
        toast({
          title: "Error",
          description: "Failed to flag feedback.",
          variant: "destructive"
        });
        return;
      }

      fetchFeedback();
      toast({
        title: flagged ? "Flagged" : "Unflagged",
        description: `Feedback has been ${flagged ? 'flagged as inappropriate' : 'unflagged'}.`,
      });
    } catch (error) {
      console.error('Error flagging feedback:', error);
    }
  };

  const publishUpdate = async () => {
    if (!newUpdateTitle.trim() || !newUpdateContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content for the update.",
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('honest_box_updates')
        .insert({
          title: newUpdateTitle.trim(),
          content: newUpdateContent.trim(),
          published_by: user?.id,
          group_id: profile.group_id
        });

      if (error) {
        console.error('Error publishing update:', error);
        toast({
          title: "Error",
          description: "Failed to publish update.",
          variant: "destructive"
        });
        return;
      }

      setNewUpdateTitle('');
      setNewUpdateContent('');
      setShowNewUpdateDialog(false);
      fetchUpdates();
      
      toast({
        title: "Published!",
        description: "Your update has been published successfully.",
      });
    } catch (error) {
      console.error('Error publishing update:', error);
    }
  };

  // Filter feedback based on selected filters
  const filteredFeedback = feedback.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    if (monthFilter !== 'all' && item.month_year !== monthFilter) return false;
    return true;
  });

  // Get unique months for filter
  const uniqueMonths = [...new Set(feedback.map(item => item.month_year))];

  // If user doesn't have a group_id, show error message
  if (!profile?.group_id) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium text-sm sm:text-base">
              Unable to access HonestBox admin. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading feedback...</div>
      </div>
    );
  }

  // If showing user view, render the user form component
  if (showUserView) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HonestBox - User View</h1>
            <p className="text-gray-600 text-sm sm:text-base">This is how standard users see HonestBox</p>
          </div>
          <Button
            onClick={() => setShowUserView(false)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Back to Admin View
          </Button>
        </div>
        <HonestBoxUserForm />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HonestBox Admin</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage anonymous feedback and publish updates</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button
            onClick={() => setShowUserView(true)}
            variant="outline"
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Eye className="h-4 w-4" />
            <span>Page View for Users</span>
          </Button>
          
          <PublishUpdateDialog
            showDialog={showNewUpdateDialog}
            setShowDialog={setShowNewUpdateDialog}
            title={newUpdateTitle}
            setTitle={setNewUpdateTitle}
            content={newUpdateContent}
            setContent={setNewUpdateContent}
            onPublish={publishUpdate}
          />
        </div>
      </div>

      {/* Stats */}
      <AdminStats feedback={feedback} />

      {/* Monthly Questions Manager */}
      <MonthlyQuestionsManager />

      {/* Filters */}
      <FeedbackFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        monthFilter={monthFilter}
        uniqueMonths={uniqueMonths}
        setStatusFilter={setStatusFilter}
        setPriorityFilter={setPriorityFilter}
        setMonthFilter={setMonthFilter}
      />

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.map((item) => (
          <FeedbackItem
            key={item.id}
            item={item}
            onUpdateStatus={updateFeedbackStatus}
            onFlagFeedback={flagFeedback}
          />
        ))}

        {filteredFeedback.length === 0 && (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">No feedback matches your current filters.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Published Updates Section */}
      <UpdatesList 
        updates={updates} 
        onUpdateDeleted={fetchUpdates}
        onUpdateEdited={fetchUpdates}
      />
    </div>
  );
};

export default HonestBoxAdminView;
