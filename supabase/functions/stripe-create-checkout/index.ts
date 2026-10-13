import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.3.1?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_AMOUNTS = [250, 500, 750, 1000];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service-role client for staff notifications + intent tracking + user lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to identify the user from the Authorization header — but DO NOT require it.
    // Anonymous visitors on the welcome page can also pay.
    let userId: string | null = null;
    let userEmail: string | undefined = undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await supabaseUser.auth.getUser();
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || undefined;
      }
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    if (!ALLOWED_AMOUNTS.includes(amount)) {
      return new Response(
        JSON.stringify({ error: "Invalid amount. Allowed: 250, 500, 750, 1000" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Optional fields for anonymous checkout
    const guestEmail = typeof body?.email === "string" ? body.email.trim() : "";
    const guestName = typeof body?.name === "string" ? body.name.trim() : "";

    if (!userEmail && guestEmail) userEmail = guestEmail;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch client name for notification (only if logged in)
    let clientLabel = guestName || guestEmail || "Ein Gast";
    let assignedAgent: string | null = null;
    let ftdAgent: string | null = null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, assigned_agent, ftd_agent")
        .eq("id", userId)
        .single();
      clientLabel = profile?.full_name || profile?.email || clientLabel;
      assignedAgent = (profile as any)?.assigned_agent || null;
      ftdAgent = (profile as any)?.ftd_agent || null;
    }

    // 1) Record the INTENT immediately (before redirect)
    const { data: intent } = await supabaseAdmin
      .from("stripe_checkout_intents")
      .insert({
        user_id: userId,
        amount_eur: amount,
        status: "initiated",
        source: userId ? "welcome_page" : "welcome_page_guest",
      } as any)
      .select("id")
      .single();

    // Notify staff that the client clicked the unlock button on the welcome
    // page (= manual deposit attempt). The actual "payment received"
    // notification still fires separately from stripe-webhook on
    // checkout.session.completed.
    try {
      // Build recipient list: assigned agent + ftd agent + all Admins/Managers
      const recipients = new Set<string>();
      if (assignedAgent) recipients.add(assignedAgent);
      if (ftdAgent) recipients.add(ftdAgent);

      const { data: staff } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, roles!inner(name)")
        .in("roles.name" as any, ["Admin", "Manager"]);
      (staff ?? []).forEach((s: any) => s.user_id && recipients.add(s.user_id));

      const isGuest = !userId;
      const title = isGuest
        ? "💳 Guest payment attempt"
        : "💳 Client payment attempt";
      const message = `${clientLabel}${isGuest ? " (Gast)" : ""} clicked "Konto jetzt freischalten" for €${amount} on the welcome page.`;

      const rows = Array.from(recipients).map((uid) => ({
        user_id: uid,
        title,
        message,
        type: "payment_link",
        priority: 3,
      }));

      if (rows.length > 0) {
        await supabaseAdmin.from("notifications").insert(rows as any);
      }
    } catch (notifyErr) {
      console.error("payment-attempt notification failed:", notifyErr);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" as any });
    const origin = req.headers.get("origin") || "https://crypto-boerse.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Servicegebühr €${amount}`,
              description:
                "Einmalige Servicegebühr zur Freischaltung Ihres Online-Kontos.",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId || "",
        amount_eur: String(amount),
        source: userId ? "welcome_page" : "welcome_page_guest",
        intent_id: intent?.id || "",
        guest_email: userId ? "" : (guestEmail || ""),
        guest_name: userId ? "" : (guestName || ""),
      },
      success_url: `${origin}/welcome?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/welcome?payment=cancelled&intent_id=${intent?.id || ""}`,
    });

    // 3) Update intent with Stripe session ID + redirected status
    if (intent?.id) {
      await supabaseAdmin
        .from("stripe_checkout_intents")
        .update({
          stripe_session_id: session.id,
          status: "redirected",
        })
        .eq("id", intent.id);
    }

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("stripe-create-checkout error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
