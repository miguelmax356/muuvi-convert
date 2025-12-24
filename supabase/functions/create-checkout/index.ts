import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id, email, plan } = await req.json();

    if (!user_id || !email || !plan) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const priceId = plan === "premium_monthly" 
      ? Deno.env.get("STRIPE_PRICE_MONTHLY")
      : Deno.env.get("STRIPE_PRICE_YEARLY");

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const checkoutSession = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "customer_email": email,
        "client_reference_id": user_id,
        "payment_method_types.0": "card",
        "line_items.0.price": priceId,
        "line_items.0.quantity": "1",
        "mode": "subscription",
        "success_url": `${Deno.env.get("SUPABASE_URL")}/success?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${Deno.env.get("SUPABASE_URL")}/cancel`,
      }).toString(),
    });

    const session = await checkoutSession.json();

    if (!checkoutSession.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
