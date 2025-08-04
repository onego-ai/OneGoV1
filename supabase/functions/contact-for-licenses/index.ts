
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get user profile and subscription info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: subscriptionData } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const emailContent = `
      <h2>License Increase Request</h2>
      <p>A user has requested to increase their license count.</p>
      
      <h3>User Details:</h3>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Name:</strong> ${profile?.full_name || 'Not provided'}</li>
        <li><strong>Company:</strong> ${profile?.company_name || 'Not provided'}</li>
        <li><strong>Role:</strong> ${profile?.role || 'Not specified'}</li>
      </ul>
      
      <h3>Current License Usage:</h3>
      <ul>
        <li><strong>Licenses Purchased:</strong> ${subscriptionData?.licenses_purchased || 0}</li>
        <li><strong>Licenses Used:</strong> ${subscriptionData?.licenses_used || 0}</li>
        <li><strong>Subscription Tier:</strong> ${subscriptionData?.subscription_tier || 'None'}</li>
      </ul>
      
      <p>Please contact the user to discuss increasing their license count.</p>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "ONEGO AI <noreply@onego.ai>",
      to: ["hello@onego.ai"],
      subject: `License Increase Request from ${user.email}`,
      html: emailContent,
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      throw new Error('Failed to send email');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in contact-for-licenses:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
