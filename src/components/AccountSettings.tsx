import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import CompanyBrandingSettings from './branding/CompanyBrandingSettings';
import CreditUsageCard from './CreditUsageCard';

const AccountSettings: React.FC = () => {
  const { user, profile, session } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<{ purchased: number; used: number } | null>(null);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    if (user && session) {
      loadSubscriptionData();
      loadLicenseInfo();
      loadAdminInfo();
    }
  }, [user, session, refreshKey]);

  const loadAdminInfo = async () => {
    if (!profile?.group_id) return;

    try {
      const { data: groupData, error } = await supabase
        .from('groups')
        .select(`
          *,
          admin:profiles!groups_admin_id_fkey(*)
        `)
        .eq('id', profile.group_id)
        .single();

      if (error) {
        console.error('Error loading admin info:', error);
        return;
      }

      setAdminInfo(groupData?.admin);
    } catch (error) {
      console.error('Error in loadAdminInfo:', error);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching subscription data:', error);
        return;
      }

      setSubscriptionData(data);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLicenseInfo = async () => {
    try {
      const { data: subData, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading subscription:', error);
        return;
      }

      if (subData) {
        // Fix: Count all group members including admin
        const { data: groupMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', profile?.group_id);

        const actualUsedLicenses = groupMembers?.length || 1;

        setLicenseInfo({
          purchased: subData.licenses_purchased || 10,
          used: actualUsedLicenses
        });

        // Update the database with correct count
        if (actualUsedLicenses !== subData.licenses_used) {
          await supabase
            .from('subscribers')
            .update({ licenses_used: actualUsedLicenses })
            .eq('user_id', user?.id);
        }
      }
    } catch (error: any) {
      console.error('❌ Error in loadLicenseInfo:', error);
    }
  };

  const handleBrandingUpdate = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Branding Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  if (loading) {
    return <div className="p-8">Loading account settings...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Credit Usage Card - All Users */}
        <CreditUsageCard />
        
        {/* Company Branding Settings - Admin Only */}
        {profile?.role === 'Admin' && (
          <CompanyBrandingSettings 
            profile={profile} 
            onBrandingUpdate={handleBrandingUpdate}
          />
        )}

        {/* Simplified Subscription Section - Admin Only */}
        {profile?.role === 'Admin' && subscriptionData && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Subscription Details</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscriptionData.subscribed 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {subscriptionData.subscribed ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Plan</label>
                <p className="text-gray-900">{subscriptionData.subscription_tier || 'Free'}</p>
              </div>
              
              {subscriptionData.subscription_end && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Next Billing Date</label>
                  <p className="text-gray-900">
                    {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">License Usage</label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {licenseInfo?.purchased || 0} licenses purchased
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {licenseInfo?.used || 0}/{licenseInfo?.purchased || 0} licenses in use
                  </p>
                  
                  <div className="bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(((licenseInfo?.used || 0) / (licenseInfo?.purchased || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Contact Support Button */}
              <div className="border-t pt-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Need More Licenses?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Contact our team to discuss increasing your license count. We'll help you find the right plan for your needs.
                  </p>
                </div>
                <a
                  href={`mailto:hello@onego.ai?subject=License Increase Request&body=Hi,

I would like to discuss increasing the license count for my account.

Current Details:
- Email: ${user?.email || 'Not provided'}
- Company: ${adminInfo?.company_name || profile?.company_name || 'Not provided'}
- Current Licenses: ${licenseInfo?.purchased || 0}
- Licenses in Use: ${licenseInfo?.used || 0}

Please contact me to discuss our options.

Thank you!`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Mail size={16} />
                  Contact Us to Add More Users
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
