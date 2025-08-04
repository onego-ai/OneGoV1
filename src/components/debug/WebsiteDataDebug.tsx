
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const WebsiteDataDebug: React.FC = () => {
  const { profile } = useAuth();
  const [websiteData, setWebsiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadWebsiteData();
    }
  }, [profile?.id]);

  const loadWebsiteData = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('company_website_data')
        .select('*')
        .eq('user_id', profile.id)
        .order('last_scraped_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading website data:', error);
        return;
      }

      setWebsiteData(data);
    } catch (error) {
      console.error('Error loading website data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="text-sm text-gray-500">Loading website data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Globe className="h-4 w-4" />
          <span>Website Data Integration Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {websiteData ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Website data available</span>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <p><strong>URL:</strong> {websiteData.website_url}</p>
              <p><strong>Last Scraped:</strong> {new Date(websiteData.last_scraped_at).toLocaleString()}</p>
              <p><strong>Content Length:</strong> {websiteData.scraped_content?.wordCount || 0} words</p>
              <p><strong>Business Keywords:</strong> {websiteData.scraped_content?.businessKeywords?.length || 0} detected</p>
            </div>
            {websiteData.scraped_content?.businessKeywords?.length > 0 && (
              <div className="bg-blue-50 p-2 rounded text-xs">
                <strong>Keywords:</strong> {websiteData.scraped_content.businessKeywords.slice(0, 5).join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No website data found</span>
            </div>
            <p className="text-xs text-gray-600">
              Go to Account Settings → Company Branding to add and analyze your website
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebsiteDataDebug;
