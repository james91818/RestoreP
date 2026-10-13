import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.3.1?target=deno";

// Public endpoint — Stripe POSTs without auth. Signature verification below.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

// Resolve which staff should be notified about a Stripe payment based on the
// payer's email. Returns the set of user_ids who have access to that lead/client:
// the assigned agent and the FTD agent. If no profile matches the email, returns
// an empty set (no notification — payment is still visible in Stripe).
async function resolveRecipientsByEmail(
  supabase: any,
  email: string,
): Promise<Set<string>> {
  const recipients = new Set<string>();
  if (!email) return recipients;

  const { data: profile } = await supabase
    .from("profiles")
    .select("assigned_agent, ftd_agent")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!profile) return recipients;
  if (profile.assigned_agent) recipients.add(profile.assigned_agent as string);
  if (profile.ftd_agent) recipients.add(profile.ftd_agent as string);
  return recipients;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" as any });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Invalid signature: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const amountEur = Number(
        session.metadata?.amount_eur ||
          (session.amount_total ? session.amount_total / 100 : 0),
      );
      const intentId = session.metadata?.intent_id;

      // === EXTERNAL / UNKNOWN STRIPE PAYMENT ===
      // Payment landed in the Stripe account but was NOT initiated from our app
      // (no user_id metadata). Notify ONLY staff who have access to a lead/client
      // matching the payer's email (assigned agent / ftd agent). If no match,
      // no notification is sent — payment can still be reviewed in Stripe.
      if (!userId) {
        const customerEmail =
          session.customer_details?.email || session.customer_email || "";
        const customerName = session.customer_details?.name || "Unknown customer";
        const currency = (session.currency || "eur").toUpperCase();
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        const recipients = await resolveRecipientsByEmail(supabase, customerEmail);

        if (recipients.size > 0) {
          await supabase.from("notifications").insert(
            Array.from(recipients).map((uid) => ({
              user_id: uid,
              title: "💳 New Stripe Payment Received (External)",
              message: `${customerName} (${customerEmail || "unknown email"}) paid ${currency} ${amount} via Stripe. This payment was NOT initiated from the platform — review in Stripe dashboard. Session: ${session.id}`,
              type: "deposit",
            })),
          );
        }

        console.log(`External Stripe payment notified: session=${session.id} amount=${amount} recipients=${recipients.size}`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update intent → paid and read source
      let source: string | null = null;
      if (intentId) {
        const { data: intentRow } = await supabase
          .from("stripe_checkout_intents")
          .update({ status: "paid", completed_at: new Date().toISOString() })
          .eq("id", intentId)
          .select("source")
          .maybeSingle();
        source = intentRow?.source ?? null;
      } else {
        const { data: intentRow } = await supabase
          .from("stripe_checkout_intents")
          .update({ status: "paid", completed_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id)
          .select("source")
          .maybeSingle();
        source = intentRow?.source ?? null;
      }

      const isWelcome = source === "welcome_page";
      const sourceLabel = isWelcome ? "Welcome Page (Self-Service)" : (source || "Stripe Checkout");

      // Insert PENDING deposit — agent must manually approve before the
      // wallet is credited and the lead converts to depositor.
      const { error: depErr } = await supabase.from("deposits").insert({
        user_id: userId,
        amount: amountEur,
        currency: "EUR",
        method: "stripe",
        status: "pending",
        admin_notes: `🟡 PENDING APPROVAL — Client self-paid via Stripe from ${sourceLabel}. Session: ${session.id}. Wallet will NOT be credited until an agent approves this deposit.`,
      });

      if (depErr) {
        console.error("Failed to insert deposit:", depErr);
        return new Response(`DB error: ${depErr.message}`, { status: 500 });
      }

      // Notify the client — payment received, awaiting activation
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Zahlung empfangen",
        message: `Ihre Zahlung von €${amountEur} wurde empfangen und wird in Kürze von unserem Team bestätigt.`,
        type: "deposit",
      });

      // Notify staff (Admin / Manager + assigned agent) — payment ready for approval
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, assigned_agent")
        .eq("id", userId)
        .single();
      const clientLabel = profile?.full_name || profile?.email || "Ein Client";

      const { data: staff } = await supabase
        .from("user_roles")
        .select("user_id, roles!inner(name)")
        .in("roles.name" as any, ["Admin", "Manager", "Manager Conversion"]);
      const recipients = new Set<string>(
        (staff || []).map((s: any) => s.user_id as string),
      );
      if (profile?.assigned_agent) recipients.add(profile.assigned_agent);

      if (recipients.size > 0) {
        await supabase.from("notifications").insert(
          Array.from(recipients).map((uid) => ({
            user_id: uid,
            title: isWelcome
              ? "✅ Welcome Page Stripe Payment — Approval Required"
              : "✅ Stripe Payment Received — Approval Required",
            message: `${clientLabel} self-paid €${amountEur} via Stripe${isWelcome ? " from the Welcome Page" : ""}. Deposit is PENDING — wallet not yet credited. Please review and approve in the backoffice.`,
            type: "deposit",
          })),
        );
      }

      console.log(`Stripe deposit pending approval: user=${userId} amount=${amountEur}`);
    }

    // Catch-all: any successful charge in the Stripe account (payment links,
    // invoices, manual charges, terminal, etc.) that isn't tied to one of our
    // Checkout sessions. We dedupe by skipping payment_intents that came from
    // a checkout.session (those are already handled above).
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;

      // If this payment_intent was created by a Checkout Session, skip — already handled
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
        });
        if (sessions.data.length > 0) {
          return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (_) {
        // ignore lookup failure, still notify
      }

      const amount = pi.amount_received ? pi.amount_received / 100 : (pi.amount || 0) / 100;
      const currency = (pi.currency || "eur").toUpperCase();
      const customerEmail =
        (pi.receipt_email as string) ||
        (typeof pi.customer === "string" ? "" : (pi.customer as any)?.email) ||
        "";
      const description = pi.description || "Direct Stripe charge";

      const recipients = await resolveRecipientsByEmail(supabase, customerEmail);

      if (recipients.size > 0) {
        await supabase.from("notifications").insert(
          Array.from(recipients).map((uid) => ({
            user_id: uid,
            title: "💳 New Stripe Payment Received",
            message: `${currency} ${amount} received via Stripe (${description}). Customer: ${customerEmail || "unknown email"}. Payment ID: ${pi.id}`,
            type: "deposit",
          })),
        );
      }

      console.log(`Stripe payment_intent notified: ${pi.id} amount=${amount} recipients=${recipients.size}`);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await supabase
        .from("stripe_checkout_intents")
        .update({ status: "expired", cancelled_at: new Date().toISOString() })
        .eq("stripe_session_id", session.id);
      console.log(`Stripe checkout expired: ${session.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response(`Error: ${(e as Error).message}`, { status: 500 });
  }
});
