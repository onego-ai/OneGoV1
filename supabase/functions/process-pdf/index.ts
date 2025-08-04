import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, prompt, userId } = await req.json();
    
    if (!file || !prompt || !userId) {
      throw new Error('File, prompt, and user ID are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user can access PDF processing (Pro+ only)
    const { data: canAccess, error: accessError } = await supabase
      .rpc('can_access_pdf_processing', { user_id_param: userId });

    if (accessError) {
      console.error('Error checking PDF access:', accessError);
      throw new Error('Failed to verify user access');
    }

    if (!canAccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PDF processing is only available for Standard, Pro, Business, and Enterprise users. Please upgrade your plan to access this feature.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    console.log(`Processing PDF for user: ${userId} with ${creditCheck[0].available_credits} credits available`);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Decode base64 file
    const fileData = atob(file.split(',')[1]);
    const fileBytes = new Uint8Array(fileData.length);
    for (let i = 0; i < fileData.length; i++) {
      fileBytes[i] = fileData.charCodeAt(i);
    }

    // Prepare the request to Gemini API
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    const requestBody = {
      contents: [{
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: "application/pdf",
              data: btoa(String.fromCharCode(...fileBytes))
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const extractedContent = result.candidates[0].content.parts[0].text;

    // Consume credits after successful processing
    const { data: creditConsumed, error: consumeError } = await supabase
      .rpc('consume_credits', {
        user_id_param: userId,
        action_type_param: 'pdf_processing',
        credits_to_consume: 1,
        description_param: 'PDF content extraction and processing',
        metadata_param: { 
          file_size: fileBytes.length,
          prompt_length: prompt.length,
          extracted_content_length: extractedContent.length
        }
      });

    if (consumeError) {
      console.error('Error consuming credits:', consumeError);
      // Don't fail the request if credit consumption fails, but log it
    }

    // Store the extracted content in database
    const { error: dbError } = await supabase
      .from('pdf_extractions')
      .insert({
        user_id: userId,
        extracted_content: extractedContent,
        prompt_used: prompt,
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
        message: 'PDF content extracted successfully',
        creditsConsumed: 1,
        remainingCredits: creditSummary?.[0]?.available_credits || 0,
        totalCredits: creditSummary?.[0]?.total_credits || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
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