
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from './useCompanyContext';

interface WebsiteData {
  title: string;
  description: string;
  mainContent: string;
  businessKeywords: string[];
  companyTerms: string[];
  navigationItems: string[];
  wordCount: number;
}

interface EnhancedCompanyContext {
  company_name: string;
  company_website: string | null;
  company_logo: string | null;
  websiteData: WebsiteData | null;
  contextSummary: string;
}

export const useWebsiteContext = () => {
  const [loading, setLoading] = useState(false);
  const { getCompanyContext } = useCompanyContext();

  const getEnhancedCompanyContext = useCallback(async (profile: any): Promise<EnhancedCompanyContext> => {
    setLoading(true);
    
    try {
      // Get basic company context
      const companyContext = await getCompanyContext(profile);
      
      // DEBUG: Log user context to track data flow
      console.log('🔍 User Profile Debug:', {
        userId: profile?.id,
        companyName: companyContext.company_name,
        companyWebsite: companyContext.company_website,
        hasWebsite: !!companyContext.company_website
      });
      
      // Get website data ONLY if the user has a configured company website
      let websiteData: WebsiteData | null = null;
      
      // STRICT VALIDATION: Only proceed if user has explicitly set a company website
      if (profile?.id && companyContext.company_website && companyContext.company_website.trim() !== '') {
        const { data, error } = await supabase
          .from('company_website_data')
          .select('scraped_content, website_url')
          .eq('user_id', profile.id)
          .order('last_scraped_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error && data.scraped_content) {
          // DEBUG: Log database query results
          console.log('🔍 Database Query Debug:', {
            userId: profile.id,
            cachedWebsiteUrl: data.website_url,
            currentCompanyWebsite: companyContext.company_website,
            hasScrapedContent: !!data.scraped_content
          });
          
          // Validate that the cached website data matches the current company website
          const normalizeUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
          const cachedUrl = normalizeUrl(data.website_url || '');
          const currentUrl = normalizeUrl(companyContext.company_website);
          
          // STRICT VALIDATION: Only use website data if it exactly matches the current company website
          if (cachedUrl === currentUrl) {
            console.log('✅ Website data validation passed - URLs match');
          } else {
            console.warn('❌ Website data validation FAILED:', {
              cachedUrl,
              currentUrl,
              message: 'Cached website data does not match current company website - ignoring cached data'
            });
            // Explicitly set to null and skip using cached data
            websiteData = null;
          }
          
          if (cachedUrl === currentUrl) {
            // Safe type conversion with validation
            const scrapedContent = data.scraped_content as any;
            if (scrapedContent && typeof scrapedContent === 'object') {
              websiteData = {
                title: scrapedContent.title || '',
                description: scrapedContent.description || '',
                mainContent: scrapedContent.mainContent || '',
                businessKeywords: Array.isArray(scrapedContent.businessKeywords) ? scrapedContent.businessKeywords : [],
                companyTerms: Array.isArray(scrapedContent.companyTerms) ? scrapedContent.companyTerms : [],
                navigationItems: Array.isArray(scrapedContent.navigationItems) ? scrapedContent.navigationItems : [],
                wordCount: typeof scrapedContent.wordCount === 'number' ? scrapedContent.wordCount : 0
              };
            }
          }
        } else {
          console.log('🔍 No valid website data found in database for user');
        }
      } else {
        console.log('🔍 Skipping website data fetch - no company website configured or invalid user ID');
      }

      // Combine company context with website data
      const enhancedContext: EnhancedCompanyContext = {
        ...companyContext,
        websiteData,
        contextSummary: buildContextSummary(companyContext, websiteData)
      };

      // DEBUG: Log final enhanced context
      console.log('🔍 Final Enhanced Context:', {
        companyName: enhancedContext.company_name,
        companyWebsite: enhancedContext.company_website,
        hasWebsiteData: !!enhancedContext.websiteData,
        websiteDataTitle: enhancedContext.websiteData?.title,
        contextSummaryPreview: enhancedContext.contextSummary.substring(0, 100) + '...'
      });
      return enhancedContext;
      
    } catch (error) {
      console.error('Error fetching enhanced company context:', error);
      const fallbackContext = await getCompanyContext(profile);
      return {
        ...fallbackContext,
        websiteData: null,
        contextSummary: buildContextSummary(fallbackContext, null)
      };
    } finally {
      setLoading(false);
    }
  }, [getCompanyContext]);

  const buildContextSummary = (companyContext: any, websiteData: WebsiteData | null): string => {
    let summary = `Company: ${companyContext.company_name}`;
    
    if (companyContext.company_website) {
      summary += `\nWebsite: ${companyContext.company_website}`;
    }
    
    if (websiteData) {
      summary += `\n\nBusiness Overview: ${websiteData.description || websiteData.title}`;
      
      if (websiteData.businessKeywords?.length > 0) {
        summary += `\nKey Focus Areas: ${websiteData.businessKeywords.slice(0, 8).join(', ')}`;
      }
      
      if (websiteData.companyTerms?.length > 0) {
        summary += `\nCompany-specific Terms: ${websiteData.companyTerms.slice(0, 5).join(', ')}`;
      }
      
      if (websiteData.mainContent) {
        // Extract first meaningful paragraph
        const contentPreview = websiteData.mainContent
          .split('.')
          .slice(0, 3)
          .join('.')
          .substring(0, 300);
        
        if (contentPreview.length > 50) {
          summary += `\n\nBusiness Context: ${contentPreview}...`;
        }
      }
    }
    
    return summary;
  };

  return { getEnhancedCompanyContext, loading };
};
