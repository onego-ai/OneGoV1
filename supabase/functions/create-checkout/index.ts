
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
    const { plan, billing } = await req.json();

    if (!plan) {
      throw new Error('Plan is required');
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

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Define pricing for all plans
    const planPricing = {
      standard: {
        monthly: 14900, // $149.00 in cents
        yearly: 11900,  // $119.00 in cents
        name: "ONEGO Standard Plan",
        description: "Perfect for small teams"
      },
      pro: {
        monthly: 29900, // $299.00 in cents
        yearly: 23900,  // $239.00 in cents
        name: "ONEGO Pro Plan",
        description: "Perfect for growing companies"
      },
      business: {
        monthly: 69900, // $699.00 in cents
        yearly: 55900,  // $559.00 in cents
        name: "ONEGO Business Plan",
        description: "Perfect for large organizations"
      }
    };

    const selectedPlan = planPricing[plan.toLowerCase() as keyof typeof planPricing];
    if (!selectedPlan) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const unitAmount = billing === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly;
    const interval = billing === 'yearly' ? 'year' : 'month';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: selectedPlan.name,
              description: selectedPlan.description
            },
            unit_amount: unitAmount,
            recurring: { 
              interval: interval,
              interval_count: 1
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: plan.charAt(0).toUpperCase() + plan.slice(1), // Capitalize first letter
        billing: billing
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
