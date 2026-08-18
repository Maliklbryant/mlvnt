// @ts-nocheck
// supabase/functions/stripe-webhook/index.ts
//
// Deploy:
//   npx supabase functions deploy stripe-webhook --no-verify-jwt
//   (must be --no-verify-jwt: Stripe calls this directly, with no Supabase JWT)
//
// After deploying, register the endpoint in the Stripe Dashboard
// (Developers → Webhooks) pointed at:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// listening for: checkout.session.completed
//
// Secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxx
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
//
// WHY THIS MATTERS:
// This is the ONLY place session balances are credited from a real payment.
// Two failure modes it specifically guards against:
//   1. Stripe retries webhook delivery (at-least-once, not exactly-once) —
//      without idempotency, a retry would double-credit the client.
//      Fixed via a unique constraint on session_purchases.stripe_event_id;
//      the RPC below is written to swallow the resulting unique-violation
//      as a no-op rather than erroring.
//   2. Payment succeeds but the balance update fails silently — fixed by
//      always logging failures loudly (console.error) so they surface in
//      Supabase function logs / any log-based alerting, and by using a
//      single atomic RPC (increment + purchase-record insert) rather than
//      two separate writes that could get out of sync.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.20.0";

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY  = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_KEY = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Mirrors PACKAGE_CATALOGUE in create-checkout-session — sessions granted
// per package. Kept server-side only; never trust a "sessions" count from
// the client, even though we also stash it in Checkout Session metadata as
// a secondary reference.
const SESSIONS_BY_PACKAGE: Record<string, number> = {
  single: 1, "4x": 4, "8x": 8, "12x": 12,
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!STRIPE_WEBHOOK_KEY) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured — refusing to process unverified webhook");
    return new Response("Webhook not configured", { status: 500 });
  }

  const sig  = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // constructEventAsync is required in Deno (no Node crypto internals)
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_KEY);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed:", err?.message ?? err);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  console.log(`stripe-webhook: received ${event.type} (${event.id})`);

  if (event.type !== "checkout.session.completed") {
    // Ack everything else so Stripe stops retrying; we just don't act on it.
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  const clientId  = checkoutSession.client_reference_id || checkoutSession.metadata?.client_id;
  const packageId = checkoutSession.metadata?.package_id;
  const sessions  = packageId ? SESSIONS_BY_PACKAGE[packageId] : undefined;

  if (!clientId) {
    console.error(`stripe-webhook: checkout.session.completed (${event.id}) has no client_reference_id/metadata.client_id — cannot credit anyone. Payment ${checkoutSession.id} needs manual reconciliation.`);
    // Return 200 so Stripe doesn't retry forever on a session we can never
    // fix automatically — but this MUST be surfaced to the coach, since a
    // client paid and got nothing. Best effort: notify all admins.
    await notifyAdminsOfOrphanedPayment(checkoutSession, "missing client_reference_id");
    return new Response(JSON.stringify({ received: true, warning: "no client_id" }), { status: 200 });
  }

  if (!sessions) {
    console.error(`stripe-webhook: unknown package_id "${packageId}" on event ${event.id} — cannot determine sessions to credit.`);
    await notifyAdminsOfOrphanedPayment(checkoutSession, `unknown package_id "${packageId}"`);
    return new Response(JSON.stringify({ received: true, warning: "unknown package" }), { status: 200 });
  }

  // Atomic, idempotent credit. See migration 0002_session_purchases.sql —
  // the RPC inserts a row keyed on stripe_event_id (UNIQUE) and only
  // increments the balance if that insert succeeds, all inside one
  // transaction. A retried webhook for the same event.id is a guaranteed
  // no-op, not a double-credit.
  const { data: result, error } = await supabaseAdmin.rpc("credit_session_purchase", {
    p_client_id:        clientId,
    p_stripe_event_id:  event.id,
    p_package_id:        packageId,
    p_sessions_added:    sessions,
    p_amount_total:      checkoutSession.amount_total ?? null,
    p_currency:          checkoutSession.currency ?? null,
    p_stripe_session_id: checkoutSession.id,
  });

  if (error) {
    console.error(`stripe-webhook: credit_session_purchase RPC failed for event ${event.id}, client ${clientId}:`, error.message);
    // The RPC now raises (rather than silently upserting) if clientId
    // doesn't match a real profiles row — that's a genuine orphaned
    // payment, not a transient failure, so retrying won't help. Surface
    // it to the coach and ack the webhook; everything else (transient DB
    // errors, etc.) falls through to the 500-and-let-Stripe-retry path,
    // which is safe because the RPC is idempotent on event.id.
    if (error.message?.includes("no profile for client_id")) {
      await notifyAdminsOfOrphanedPayment(checkoutSession, `client_reference_id ${clientId} does not match any account`);
      return new Response(JSON.stringify({ received: true, warning: "unmatched client" }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "Failed to credit sessions" }), { status: 500 });
  }

  console.log(`stripe-webhook: credited ${sessions} sessions to client ${clientId} (event ${event.id}, already_processed=${result?.already_processed ?? false})`);

  // Notify the client + coach — best-effort, never blocks the webhook ack.
  if (!result?.already_processed) {
    await supabaseAdmin.from("notifications").insert({
      recipient_id: clientId,
      type:  "package_updated",
      title: "Sessions added",
      body:  `${sessions} session${sessions !== 1 ? "s" : ""} were added to your account. New balance: ${result?.new_balance ?? "—"}.`,
      read:  false,
    }).then(({ error: e }) => { if (e) console.error("stripe-webhook: client notification failed:", e.message); });

    const { data: coach } = await supabaseAdmin
      .from("profiles").select("id").or("role.eq.owner,role.eq.admin,is_owner.eq.true").limit(1).maybeSingle();
    if (coach?.id) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: coach.id,
        type:  "package_updated",
        title: "New payment received",
        body:  `A client purchased ${sessions} session${sessions !== 1 ? "s" : ""} (${packageId}).`,
        related_id: clientId,
        read: false,
      }).then(({ error: e }) => { if (e) console.error("stripe-webhook: coach notification failed:", e.message); });
    }
  }

  return new Response(JSON.stringify({ received: true, processed: true }), { status: 200 });
});

async function notifyAdminsOfOrphanedPayment(checkoutSession: Stripe.Checkout.Session, reason: string) {
  try {
    const { data: coach } = await supabaseAdmin
      .from("profiles").select("id").or("role.eq.owner,role.eq.admin,is_owner.eq.true").limit(1).maybeSingle();
    if (!coach?.id) return;
    await supabaseAdmin.from("notifications").insert({
      recipient_id: coach.id,
      type:  "package_updated",
      title: "⚠ Payment needs manual review",
      body:  `A payment (${checkoutSession.id}, ${((checkoutSession.amount_total ?? 0) / 100).toFixed(2)} ${checkoutSession.currency}) could not be auto-credited: ${reason}.`,
      read:  false,
    });
  } catch (e) {
    console.error("notifyAdminsOfOrphanedPayment failed:", e);
  }
}
