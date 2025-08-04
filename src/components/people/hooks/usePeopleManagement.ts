
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePeopleManagement = (user: any) => {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState({ purchased: 10, used: 1 });
  const [invitations, setInvitations] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  const loadPeople = useCallback(async () => {
    if (!user?.group_id) {
      console.log('❌ No group_id found for user, skipping people load');
      setLoading(false);
      return;
    }

    try {
      console.log('👥 Loading people for group:', user.group_id);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', user.group_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading people:', error);
        throw error;
      }

      console.log('✅ Loaded people:', profiles?.length || 0);
      
      // Sort people with admins first
      const sortedProfiles = profiles?.sort((a, b) => {
        if (a.role === 'Admin' && b.role !== 'Admin') return -1;
        if (a.role !== 'Admin' && b.role === 'Admin') return 1;
        return 0;
      }) || [];
      
      setPeople(sortedProfiles);
      
    } catch (error: any) {
      console.error('❌ Error in loadPeople:', error);
      toast({
        title: "Error",
        description: "Failed to load team members. Please try again.",
        variant: "destructive",
      });
    }
  }, [user?.group_id, toast]);

  const loadInvitations = useCallback(async () => {
    if (!user?.id || user?.role !== 'Admin') return;

    try {
      console.log('📬 Loading invitations for user:', user.id);
      
      const { data: invitationsData, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('inviter_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading invitations:', error);
        throw error;
      }

      console.log('✅ Loaded invitations:', invitationsData?.length || 0);
      setInvitations(invitationsData || []);
      
    } catch (error: any) {
      console.error('❌ Error in loadInvitations:', error);
    }
  }, [user?.id, user?.role]);

  const loadSubscriptionInfo = useCallback(async () => {
    if (!user?.id || user?.role !== 'Admin') return;

    try {
      console.log('💳 Loading subscription info for user:', user.id);
      
      const { data: subData, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading subscription:', error);
        return;
      }

      if (subData) {
        console.log('✅ Loaded subscription data:', subData);
        setLicenseInfo({
          purchased: subData.licenses_purchased || 10,
          used: subData.licenses_used || 1
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error in loadSubscriptionInfo:', error);
    }
  }, [user?.id, user?.role]);

  const loadData = useCallback(async () => {
    console.log('🔄 Starting data load...');
    setLoading(true);
    
    try {
      await Promise.all([
        loadPeople(),
        loadInvitations(),
        loadSubscriptionInfo()
      ]);
      
      setLastUpdated(new Date());
      console.log('✅ All data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadPeople, loadInvitations, loadSubscriptionInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    people,
    loading,
    licenseInfo,
    invitations,
    loadData,
    lastUpdated
  };
};
