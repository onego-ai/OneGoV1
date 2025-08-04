
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyContext {
  company_name: string;
  company_website: string | null;
  company_logo: string | null;
}

export const useCompanyContext = () => {
  const [loading, setLoading] = useState(false);

  const getCompanyContext = useCallback(async (profile: any): Promise<CompanyContext> => {
    setLoading(true);
    
    try {
      console.log('=== COMPANY CONTEXT DEBUG ===');
      console.log('Profile object:', profile);
      console.log('Profile role:', profile?.role);
      console.log('Profile group_id:', profile?.group_id);
      console.log('Profile company_name:', profile?.company_name);
      
      // If user is Admin, use their own company details
      if (profile?.role === 'Admin') {
        console.log('User is Admin, using their own company details');
        const result = {
          company_name: profile.company_name || 'your company',
          company_website: profile.company_website || null,
          company_logo: profile.company_logo || null
        };
        console.log('Admin company context result:', result);
        return result;
      }
      
      // If user is Standard, fetch admin's company details via group_id
      if (profile?.role === 'Standard' && profile?.group_id) {
        console.log('User is Standard, fetching Admin company details for group_id:', profile.group_id);
        
        // First try to get the admin directly from the groups table
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select(`
            admin_id,
            profiles!groups_admin_id_fkey (
              company_name,
              company_website,
              company_logo
            )
          `)
          .eq('id', profile.group_id)
          .single();
        
        console.log('Group lookup query result:', { groupData, groupError });
        
        if (groupData && !groupError && groupData.profiles) {
          console.log('Found Admin via groups table:', groupData.profiles);
          const adminProfile = groupData.profiles;
          const result = {
            company_name: adminProfile.company_name || 'your company',
            company_website: adminProfile.company_website || null,
            company_logo: adminProfile.company_logo || null
          };
          console.log('Standard user company context result (via groups):', result);
          return result;
        }
        
        // Fallback: try to find admin directly in profiles table
        console.log('Fallback: fetching Admin directly from profiles table');
        const { data: adminData, error: adminError } = await supabase
          .from('profiles')
          .select('company_name, company_website, company_logo, role, id')
          .eq('group_id', profile.group_id)
          .eq('role', 'Admin')
          .single();
        
        console.log('Admin direct lookup query result:', { adminData, adminError });
        
        if (adminData && !adminError) {
          console.log('Found Admin data via direct lookup:', adminData);
          const result = {
            company_name: adminData.company_name || 'your company',
            company_website: adminData.company_website || null,
            company_logo: adminData.company_logo || null
          };
          console.log('Standard user company context result (direct):', result);
          return result;
        }
        
        console.error('Failed to fetch Admin data for Standard user:', adminError);
      } else {
        console.log('No group_id found for Standard user or role is not Standard');
      }
      
      // Absolute fallback - only reached if no Admin data could be found
      console.log('Using absolute fallback company context');
      const fallbackResult = {
        company_name: 'your company',
        company_website: null,
        company_logo: null
      };
      console.log('Fallback result:', fallbackResult);
      console.log('==============================');
      return fallbackResult;
      
    } catch (error) {
      console.error('Error fetching company context:', error);
      console.log('==============================');
      return {
        company_name: 'your company',
        company_website: null,
        company_logo: null
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { getCompanyContext, loading };
};
