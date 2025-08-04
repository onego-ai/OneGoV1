
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useInvitationSync = (user: any, onDataChange: () => void) => {
  const { toast } = useToast();

  const syncInvitationStatuses = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;

    console.log('🔄 Syncing invitation statuses...');

    try {
      // Get all pending invitations sent by this admin
      const { data: pendingInvitations, error: invitesError } = await supabase
        .from('invitations')
        .select('*')
        .eq('inviter_id', user.id)
        .eq('status', 'pending');

      if (invitesError) {
        console.error('Error fetching pending invitations:', invitesError);
        return;
      }

      if (!pendingInvitations || pendingInvitations.length === 0) {
        console.log('✅ No pending invitations to sync');
        return;
      }

      console.log(`📋 Found ${pendingInvitations.length} pending invitations to check`);

      // Check if any of these invited users are now in the group
      for (const invitation of pendingInvitations) {
        // Look for a user with this email in the same group
        const { data: existingUser, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('group_id', invitation.group_id)
          .limit(1)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error checking for existing user:', userError);
          continue;
        }

        if (existingUser) {
          console.log(`✅ Found user in group for invitation ${invitation.id}, marking as accepted`);
          
          // Update the invitation status to accepted
          const { error: updateError } = await supabase
            .from('invitations')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          if (updateError) {
            console.error('Error updating invitation status:', updateError);
          } else {
            console.log(`✅ Successfully marked invitation ${invitation.id} as accepted`);
          }
        }
      }

      // Trigger a data refresh after sync
      onDataChange();

    } catch (error) {
      console.error('Error in invitation sync:', error);
    }
  }, [user, onDataChange]);

  // Run sync on mount and then periodically
  useEffect(() => {
    if (user?.role === 'Admin') {
      // Initial sync
      syncInvitationStatuses();

      // Periodic sync every 2 minutes
      const intervalId = setInterval(syncInvitationStatuses, 120000);

      return () => clearInterval(intervalId);
    }
  }, [user, syncInvitationStatuses]);

  return { syncInvitationStatuses };
};
