import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SerpApiResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  knowledge_graph?: {
    title: string;
    description: string;
    attributes?: Record<string, string>;
  };
  answer_box?: {
    title: string;
    answer: string;
  };
  related_questions?: Array<{
    question: string;
    answer: string;
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, prompt, userId } = await req.json();
    
    if (!websiteUrl || !prompt || !userId) {
      throw new Error('Website URL, prompt, and user ID are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has enough credits
    const { data: creditCheck, error: creditError } = await supabase
      .rpc('check_credit_availability', { 
        user_id_param: userId, 
        credits_needed: 1 
      });

    if (creditError) {
      console.error('Error checking credit availability:', creditError);
      throw new Error('Failed to check credit availability');
    }

    if (!creditCheck || !creditCheck[0]?.has_credits) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient credits. You have ${creditCheck?.[0]?.available_credits || 0} credits available. Please purchase additional credits or wait until your credits reset.`
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Scraping website: ${websiteUrl} for user: ${userId} with ${creditCheck[0].available_credits} credits available`);

    const SERP_API_KEY = Deno.env.get('SERP_API_KEY');
    if (!SERP_API_KEY) {
      throw new Error('SERP_API_KEY environment variable is not set');
    }

    // Step 1: Extract domain and search for relevant content
    const domain = extractDomain(websiteUrl);
    const searchQuery = await generateSearchQuery(domain, prompt);
    
    // Step 2: Use Serp API to search for relevant content
    const searchResults = await searchWithSerpApi(searchQuery, SERP_API_KEY);
    
    // Step 3: Extract and process content from the website
    const extractedContent = await extractWebsiteContent(websiteUrl, searchResults, prompt);
    
    // Consume credits after successful processing
    const { data: creditConsumed, error: consumeError } = await supabase
      .rpc('consume_credits', {
        user_id_param: userId,
        action_type_param: 'web_scraping',
        credits_to_consume: 1,
        description_param: 'Website content extraction and processing',
        metadata_param: { 
          website_url: websiteUrl,
          search_query: searchQuery,
          extracted_content_length: extractedContent.length
        }
      });

    if (consumeError) {
      console.error('Error consuming credits:', consumeError);
      // Don't fail the request if credit consumption fails, but log it
    }
    
    // Step 4: Store the extracted content in database
    const { error: dbError } = await supabase
      .from('website_extractions')
      .insert({
        user_id: userId,
        website_url: websiteUrl,
        extracted_content: extractedContent,
        prompt_used: prompt,
        search_query: searchQuery,
        processed_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Get updated credit summary
    const { data: creditSummary, error: summaryError } = await supabase
      .rpc('get_user_credit_summary', { user_id_param: userId });

    return new Response(
      JSON.stringify({
        success: true,
        extractedContent,
        searchQuery,
        message: 'Website content extracted successfully',
        creditsConsumed: 1,
        remainingCredits: creditSummary?.[0]?.available_credits || 0,
        totalCredits: creditSummary?.[0]?.total_credits || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping website:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    throw new Error('Invalid URL format');
  }
}

async function generateSearchQuery(domain: string, prompt: string): Promise<string> {
  // Create a search query based on the domain and user prompt
  const domainKeywords = domain.split('.').slice(0, -1).join(' ');
  return `${domainKeywords} ${prompt}`;
}

async function searchWithSerpApi(query: string, apiKey: string): Promise<SerpApiResponse> {
  const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`;
  
  const response = await fetch(searchUrl);
  
  if (!response.ok) {
    throw new Error(`Serp API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Serp API error: ${data.error}`);
  }
  
  return data;
}

async function extractWebsiteContent(websiteUrl: string, searchResults: SerpApiResponse, prompt: string): Promise<string> {
  let extractedContent = '';
  
  // Extract content from organic search results
  if (searchResults.organic_results && searchResults.organic_results.length > 0) {
    extractedContent += '## Search Results Content\n\n';
    
    searchResults.organic_results.forEach((result, index) => {
      extractedContent += `### ${index + 1}. ${result.title}\n`;
      extractedContent += `**URL:** ${result.link}\n`;
      extractedContent += `**Summary:** ${result.snippet}\n\n`;
    });
  }
  
  // Extract content from knowledge graph
  if (searchResults.knowledge_graph) {
    extractedContent += '## Knowledge Graph Information\n\n';
    extractedContent += `**Title:** ${searchResults.knowledge_graph.title}\n`;
    extractedContent += `**Description:** ${searchResults.knowledge_graph.description}\n\n`;
    
    if (searchResults.knowledge_graph.attributes) {
      extractedContent += '**Key Attributes:**\n';
      Object.entries(searchResults.knowledge_graph.attributes).forEach(([key, value]) => {
        extractedContent += `- **${key}:** ${value}\n`;
      });
      extractedContent += '\n';
    }
  }
  
  // Extract content from answer box
  if (searchResults.answer_box) {
    extractedContent += '## Quick Answer\n\n';
    extractedContent += `**Question:** ${searchResults.answer_box.title}\n`;
    extractedContent += `**Answer:** ${searchResults.answer_box.answer}\n\n`;
  }
  
  // Extract content from related questions
  if (searchResults.related_questions && searchResults.related_questions.length > 0) {
    extractedContent += '## Related Questions\n\n';
    searchResults.related_questions.forEach((qa, index) => {
      extractedContent += `### Q${index + 1}: ${qa.question}\n`;
      extractedContent += `**A:** ${qa.answer}\n\n`;
    });
  }
  
  // Add context about the original website
  extractedContent += `## Source Information\n\n`;
  extractedContent += `**Original Website:** ${websiteUrl}\n`;
  extractedContent += `**Extraction Context:** ${prompt}\n`;
  extractedContent += `**Extracted on:** ${new Date().toISOString()}\n\n`;
  
  // Add processing instructions for course integration
  extractedContent += `## Course Integration Notes\n\n`;
  extractedContent += `This content has been extracted from ${websiteUrl} and can be integrated into your course. Consider:\n`;
  extractedContent += `- Using the key points as learning objectives\n`;
  extractedContent += `- Incorporating the knowledge graph information as foundational concepts\n`;
  extractedContent += `- Using related questions as quiz material\n`;
  extractedContent += `- Adapting the content to match your course structure and learning goals\n`;
  
  return extractedContent;
} 