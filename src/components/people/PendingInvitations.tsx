
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X, Clock, Loader2 } from 'lucide-react';

interface PendingInvitationsProps {
  invitations: any[];
  onInvitationUpdate: () => void;
  user: any;
}

const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  onInvitationUpdate,
  user
}) => {
  const { toast } = useToast();
  const [deletingEmails, setDeletingEmails] = useState<Set<string>>(new Set());

  const handleDeleteInvitation = async (email: string) => {
    console.log('Starting deletion for email:', email);
    setDeletingEmails(prev => new Set(prev).add(email));

    try {
      // Delete ALL pending invitations for this email address from this inviter
      const { error, count } = await supabase
        .from('invitations')
        .delete({ count: 'exact' })
        .eq('inviter_id', user.id)
        .eq('invitee_email', email)
        .eq('status', 'pending');

      console.log('Deletion result:', { error, count });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`Successfully deleted ${count} invitation(s) for ${email}`);

      toast({
        title: "Invitation Revoked",
        description: `Invitation to ${email} has been revoked successfully.`,
      });

      // Force refresh the parent component's data immediately
      console.log('Triggering data refresh...');
      onInvitationUpdate();
      
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  };

  // Filter out any duplicate invitations by email (show only unique emails)
  const uniqueInvitations = invitations.filter((invitation, index, self) => 
    index === self.findIndex(i => i.invitee_email === invitation.invitee_email)
  );

  console.log('Rendering PendingInvitations with:', {
    totalInvitations: invitations.length,
    uniqueInvitations: uniqueInvitations.length,
    deletingEmails: Array.from(deletingEmails)
  });

  if (uniqueInvitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border mb-6">
      <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-yellow-600" />
          Pending Invitations ({uniqueInvitations.length})
        </h3>
        <p className="text-sm text-yellow-700 mt-1">
          These people have been invited but haven't joined yet
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {uniqueInvitations.map((invitation) => {
          const isDeleting = deletingEmails.has(invitation.invitee_email);
          
          return (
            <div key={invitation.invitee_email} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {invitation.invitee_email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.invitee_email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Invited as {invitation.role} • {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                  Pending
                </span>
                <button
                  onClick={() => handleDeleteInvitation(invitation.invitee_email)}
                  disabled={isDeleting}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Revoke invitation"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingInvitations;
