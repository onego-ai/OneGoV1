
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerId = session.customer;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || "Pro";
        const billing = session.metadata?.billing || "monthly";

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = (customer as any).email;

        // Update or create subscriber record
        const { error: upsertError } = await supabaseClient
          .from("subscribers")
          .upsert({
            user_id: userId,
            email: customerEmail,
            stripe_customer_id: customerId,
            subscribed: true,
            subscription_tier: plan,
            licenses_purchased: 1, // Single user subscription
            licenses_used: 1, // Admin counts as 1 used license
            updated_at: new Date().toISOString(),
          });

        if (upsertError) {
          console.error("Error upserting subscriber:", upsertError);
          break;
        }

        // Update user profile with the correct plan
        const { error: profileError } = await supabaseClient
          .from("profiles")
          .update({ plan: plan })
          .eq("id", userId);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }

        console.log("Subscription activated for user:", userId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        // Find subscriber by customer ID
        const { data: subscriber, error: findError } = await supabaseClient
          .from("subscribers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (findError || !subscriber) {
          console.error("Subscriber not found for customer:", customerId);
          break;
        }

        const isActive = subscription.status === "active";
        
        // Update subscriber status
        const { error: updateError } = await supabaseClient
          .from("subscribers")
          .update({
            subscribed: isActive,
            subscription_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Error updating subscriber:", updateError);
          break;
        }

        // Update profile plan
        const newPlan = isActive ? "Pro" : "Free";
        const { error: profileError } = await supabaseClient
          .from("profiles")
          .update({ plan: newPlan })
          .eq("id", subscriber.user_id);

        if (profileError) {
          console.error("Error updating profile plan:", profileError);
        }

        console.log("Subscription updated for customer:", customerId, "Status:", subscription.status);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
