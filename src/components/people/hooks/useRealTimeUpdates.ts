
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealTimeUpdatesProps {
  user: any;
  onDataChange: () => void;
  enabled?: boolean;
}

export const useRealTimeUpdates = ({ user, onDataChange, enabled = true }: UseRealTimeUpdatesProps) => {
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!user || !enabled) return;

    console.log('🔄 Setting up enhanced real-time listeners for user:', user.id);
    
    // Cleanup existing channels
    channelsRef.current.forEach(channel => {
      console.log('🧹 Cleaning up existing channel:', channel.topic);
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Listen for ANY invitation changes (broader scope)
    const invitationChannel = supabase
      .channel(`invitation-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
        },
        (payload) => {
          console.log('📨 Real-time invitation change detected:', {
            event: payload.eventType,
            old: payload.old,
            new: payload.new,
            table: payload.table
          });
          
          // Check if this change is relevant to this user (either as inviter or invitee)
          const isRelevant = 
            (payload.new && typeof payload.new === 'object' && 'inviter_id' in payload.new && payload.new.inviter_id === user.id) ||
            (payload.old && typeof payload.old === 'object' && 'inviter_id' in payload.old && payload.old.inviter_id === user.id) ||
            (payload.new && typeof payload.new === 'object' && 'invitee_email' in payload.new && payload.new.invitee_email === user.email) ||
            (payload.old && typeof payload.old === 'object' && 'invitee_email' in payload.old && payload.old.invitee_email === user.email);
          
          if (isRelevant) {
            console.log('✅ Invitation change is relevant, triggering refresh');
            onDataChange();
          } else {
            console.log('⏭️ Invitation change not relevant to current user');
          }
        }
      )
      .subscribe((status) => {
        console.log('📨 Invitation channel subscription status:', status);
      });

    // Listen for profile changes in the group with enhanced logging
    const profileChannel = supabase
      .channel(`profile-changes-${user.group_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `group_id=eq.${user.group_id}`
        },
        (payload) => {
          console.log('👤 Real-time profile change detected:', {
            event: payload.eventType,
            old: payload.old,
            new: payload.new,
            table: payload.table,
            timestamp: new Date().toISOString()
          });
          
          // Always trigger refresh for profile changes in the group
          console.log('✅ Profile change in group, triggering refresh');
          onDataChange();
        }
      )
      .subscribe((status) => {
        console.log('👤 Profile channel subscription status:', status);
      });

    // Listen for subscriber changes (license updates)
    const subscriberChannel = supabase
      .channel(`subscriber-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💳 Real-time subscriber change detected:', payload);
          onDataChange();
        }
      )
      .subscribe((status) => {
        console.log('💳 Subscriber channel subscription status:', status);
      });

    // Store channels for cleanup
    channelsRef.current = [invitationChannel, profileChannel, subscriberChannel];

    // Periodic refresh as fallback (every 30 seconds)
    const intervalId = setInterval(() => {
      console.log('⏰ Periodic refresh triggered (30s interval)');
      onDataChange();
    }, 30000);

    // Page visibility change refresh
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page became visible, triggering refresh');
        onDataChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🧹 Cleaning up real-time listeners and intervals');
      
      // Clear interval
      clearInterval(intervalId);
      
      // Remove visibility listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up channels
      channelsRef.current.forEach(channel => {
        console.log('🧹 Removing channel:', channel.topic);
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user, onDataChange, enabled]);

  return {
    // Expose method to manually trigger refresh
    refresh: onDataChange
  };
};
