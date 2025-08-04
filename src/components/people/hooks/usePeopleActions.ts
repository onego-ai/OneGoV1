
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePeopleActions = (currentUser: any, onPeopleUpdate?: () => void) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const isAdmin = currentUser?.role === 'Admin';

  const handleRoleChange = async (userId: string, newRole: "Admin" | "Standard") => {
    if (!isAdmin) return;
    
    setLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `Successfully updated user role to ${newRole}.`,
      });

      onPeopleUpdate?.();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!isAdmin) return;
    
    setLoading(userId);
    try {
      // Call the database function to remove user and cleanup
      const { error } = await supabase.rpc('remove_user_and_cleanup', {
        user_id_to_remove: userId
      });

      if (error) throw error;

      toast({
        title: "User Removed",
        description: `${userName} has been successfully removed from the team and all their data has been cleaned up.`,
      });

      onPeopleUpdate?.();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    isAdmin,
    handleRoleChange,
    handleRemoveUser
  };
};
