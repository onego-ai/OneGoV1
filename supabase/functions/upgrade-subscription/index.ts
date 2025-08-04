
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { additionalUsers } = await req.json();

    if (!additionalUsers || additionalUsers < 1) {
      throw new Error('Invalid number of additional users');
    }

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get current subscription info
    const { data: subData } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subData || !subData.stripe_customer_id) {
      throw new Error('No existing subscription found');
    }

    // Get customer's active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: subData.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscription found');
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];
    
    // Calculate new quantity (current + additional)
    const currentQuantity = subscriptionItem.quantity || 1;
    const newQuantity = currentQuantity + additionalUsers;

    // Update the subscription
    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscriptionItem.id,
        quantity: newQuantity,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update our database
    await supabaseClient
      .from('subscribers')
      .update({
        licenses_purchased: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      newQuantity,
      additionalUsers 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in upgrade-subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
