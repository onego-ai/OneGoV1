
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useInvitationHandling = (user: any, licenseInfo: any, invitations: any[], onDataUpdate: () => void) => {
  const [sendingInvites, setSendingInvites] = useState(false);
  const { toast } = useToast();

  const handleInvitePeople = async (inviteEmails: string, inviteRole: string) => {
    try {
      setSendingInvites(true);
      const emails = inviteEmails.split('\n').filter(email => email.trim());
      
      if (emails.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one email address.",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate emails in existing pending invitations
      const existingEmails = invitations.map(inv => inv.invitee_email);
      const duplicateEmails = emails.filter(email => existingEmails.includes(email.trim()));
      
      if (duplicateEmails.length > 0) {
        toast({
          title: "Duplicate Invitations",
          description: `The following emails already have pending invitations: ${duplicateEmails.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Check license limits on frontend for immediate feedback
      const availableLicenses = licenseInfo.purchased - licenseInfo.used;
      if (emails.length > availableLicenses) {
        toast({
          title: "License Limit Exceeded",
          description: `You can only invite ${availableLicenses} more users. You have ${licenseInfo.purchased} licenses and ${licenseInfo.used} are already in use.`,
          variant: "destructive",
        });
        return;
      }

      // Prepare invitation data with explicit inviter_email
      const inviteData = emails.map(email => ({
        inviter_id: user.id,
        inviter_email: user.email,
        invitee_email: email.trim(),
        role: inviteRole
      }));

      console.log('Sending invitations:', inviteData);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { invitations: inviteData }
      });

      console.log('Edge function response:', data, error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to send invitations');
      }

      const successCount = data.results?.filter((r: any) => r.status === 'sent').length || 0;
      const failureCount = data.results?.filter((r: any) => r.status === 'failed').length || 0;

      if (successCount > 0) {
        toast({
          title: "Invitations Sent",
          description: `Successfully sent ${successCount} invitation(s). ${failureCount > 0 ? `${failureCount} failed.` : 'Recipients will receive email instructions to join your team.'}`,
        });
      }

      if (failureCount > 0 && successCount === 0) {
        toast({
          title: "Failed to Send Invitations",
          description: "All invitations failed to send. Please check the email addresses and try again.",
          variant: "destructive",
        });
      }

      onDataUpdate(); // Refresh data to update license usage
      return true; // Success
    } catch (error: any) {
      console.error('Error inviting people:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations. Please try again.",
        variant: "destructive",
      });
      return false; // Failure
    } finally {
      setSendingInvites(false);
    }
  };

  return {
    sendingInvites,
    handleInvitePeople
  };
};
