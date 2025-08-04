
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, Save, RefreshCw, Globe, AlertTriangle } from 'lucide-react';

interface CompanyBrandingSettingsProps {
  profile: any;
  onBrandingUpdate: () => void;
}

const CompanyBrandingSettings: React.FC<CompanyBrandingSettingsProps> = ({ profile, onBrandingUpdate }) => {
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scrapingWebsite, setScrapingWebsite] = useState(false);
  const [websiteData, setWebsiteData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setCompanyWebsite(profile.company_website || '');
      setCompanyLogo(profile.company_logo || null);
      loadWebsiteData();
    }
  }, [profile]);

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
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return null;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_logo_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!companyWebsite.trim()) {
      toast({
        title: "No Website URL",
        description: "Please enter a website URL first.",
        variant: "destructive",
      });
      return;
    }

    setScrapingWebsite(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: {
          websiteUrl: companyWebsite.trim(),
          userId: profile.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Website Scraped Successfully",
        description: data.finalUrl ? 
          `Website content updated. Final URL: ${data.finalUrl}` : 
          "Website content has been analyzed and stored.",
      });

      // Reload website data
      await loadWebsiteData();

      // Update the URL if there was a redirect
      if (data.finalUrl && data.finalUrl !== companyWebsite) {
        setCompanyWebsite(data.finalUrl);
      }

    } catch (error: any) {
      console.error('Error scraping website:', error);
      toast({
        title: "Website Scraping Failed",
        description: error.message || "Failed to scrape website. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setScrapingWebsite(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      let logoUrl = companyLogo;
      
      // Upload new logo if selected
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile);
      }

      // Update profile with new branding information
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: companyName.trim() || null,
          company_website: companyWebsite.trim() || null,
          company_logo: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Branding Updated",
        description: "Your company branding has been successfully updated.",
      });

      // Reset file selections
      setLogoFile(null);
      
      // Notify parent component to refresh
      onBrandingUpdate();
      
    } catch (error) {
      console.error('Error saving branding:', error);
      toast({
        title: "Save Error",
        description: "Failed to save branding changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Logo file must be smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Branding</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Website
          </label>
          <div className="space-y-2">
            <input
              type="url"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://yourcompany.com"
            />
            {companyWebsite && !isValidUrl(companyWebsite) && (
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Please enter a valid URL</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleScrapeWebsite}
                disabled={!companyWebsite || !isValidUrl(companyWebsite) || scrapingWebsite}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${scrapingWebsite ? 'animate-spin' : ''}`} />
                <span>{scrapingWebsite ? 'Analyzing...' : 'Analyze Website'}</span>
              </Button>
              {websiteData && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">
                    Last analyzed: {new Date(websiteData.last_scraped_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              We'll analyze your website to make learning content more relevant to your business
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo
          </label>
          <div className="flex items-center space-x-4">
            {companyLogo && (
              <div className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden">
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </label>
              <p className="text-xs text-gray-500 mt-1">Max 5MB, PNG/JPG recommended</p>
            </div>
          </div>
        </div>

        {websiteData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Website Analysis Summary</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Title:</strong> {websiteData.scraped_content?.title || 'N/A'}</p>
              <p><strong>Word Count:</strong> {websiteData.scraped_content?.wordCount || 0} words</p>
              <p><strong>Business Keywords:</strong> {websiteData.scraped_content?.businessKeywords?.slice(0, 5).join(', ') || 'None detected'}</p>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <Button
            onClick={handleSave}
            disabled={loading || uploading}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            {loading || uploading ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Branding Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanyBrandingSettings;
