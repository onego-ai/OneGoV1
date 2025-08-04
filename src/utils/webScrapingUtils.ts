import { supabase } from '@/integrations/supabase/client';

export interface WebsiteExtractionResult {
  success: boolean;
  extractedContent?: string;
  searchQuery?: string;
  error?: string;
  message?: string;
  creditsConsumed?: number;
  remainingCredits?: number;
  totalCredits?: number;
}

export interface WebsiteExtraction {
  id: string;
  user_id: string;
  website_url: string;
  extracted_content: string;
  prompt_used: string;
  search_query: string;
  processed_at: string;
  created_at: string;
}

/**
 * Extract content from a website using Serp API
 */
export const extractWebsiteContent = async (
  websiteUrl: string, 
  prompt: string, 
  userId: string
): Promise<WebsiteExtractionResult> => {
  try {
    // Validate URL format
    if (!isValidUrl(websiteUrl)) {
      throw new Error('Please enter a valid website URL (e.g., https://example.com)');
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('scrape-website-content', {
      body: {
        websiteUrl,
        prompt,
        userId
      }
    });

    if (error) {
      throw new Error(`Website scraping failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Website scraping failed');
    }

    return {
      success: true,
      extractedContent: data.extractedContent,
      searchQuery: data.searchQuery,
      message: data.message,
      creditsConsumed: data.creditsConsumed,
      remainingCredits: data.remainingCredits,
      totalCredits: data.totalCredits
    };

  } catch (error) {
    console.error('Error extracting website content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get default prompt for website content extraction
 */
export const getDefaultWebsitePrompt = (courseDescription: string): string => {
  return `Please extract relevant content from this website that can be used to enhance a course about: ${courseDescription}

Please focus on:
1. Key concepts and topics that align with the course description
2. Important definitions and explanations
3. Practical examples and case studies
4. Relevant statistics or data points
5. Structured content that can be integrated into course modules

Extract information that will be valuable for learners taking this course.`;
};

/**
 * Get general website extraction prompt
 */
export const getGeneralWebsitePrompt = (): string => {
  return `Please extract the key content from this website in a structured format.

Please focus on:
1. Main topics and themes
2. Key concepts and definitions
3. Important facts and data
4. Practical applications or examples
5. Summary of main points

Format the response in a clear, organized manner that maintains the website's structure and key information.`;
};

/**
 * Fetch user's website extraction history
 */
export const getWebsiteExtractionHistory = async (userId: string): Promise<WebsiteExtraction[]> => {
  try {
    const { data, error } = await supabase
      .from('website_extractions')
      .select('*')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching website extraction history:', error);
    throw error;
  }
};

/**
 * Delete a website extraction
 */
export const deleteWebsiteExtraction = async (extractionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('website_extractions')
      .delete()
      .eq('id', extractionId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting website extraction:', error);
    throw error;
  }
};

/**
 * Extract domain from URL for display purposes
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/**
 * Format extraction date for display
 */
export const formatExtractionDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 