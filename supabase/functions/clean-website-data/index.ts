
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
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Cleaning website data for user: ${userId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete records that contain parking page content
    const { error: deleteError } = await supabase
      .from('company_website_data')
      .delete()
      .eq('user_id', userId)
      .like('scraped_content->mainContent', '%This domain may be for sale%');

    if (deleteError) {
      console.error('Error cleaning up parking page records:', deleteError);
    } else {
      console.log('Successfully cleaned up parking page records');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Website data cleaned successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in clean-website-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to clean website data'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
