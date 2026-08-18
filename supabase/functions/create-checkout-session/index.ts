// @ts-nocheck
// supabase/functions/create-checkout-session/index.ts
//
// Deploy:
//   npx supabase functions deploy create-checkout-session
//
// Secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxx
//
// WHY THIS FUNCTION EXISTS:
// The old flow opened static Stripe Payment Links directly from the browser
// (window.open(pkg.stripeUrl)). Payment Links cannot carry a
// client_reference_id set at click-time, so the webhook had no reliable way
// to know which MLVNT client to credit sessions to. This function creates a
// Checkout Session server-side, using the caller's Supabase-verified identity
// (from their JWT — never trusted from the request body) to stamp
// client_reference_id and metadata.client_id onto the session. The webhook
// then has a guaranteed, unspoofable link back to the correct client.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.20.0";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SITE_URL          = Deno.env.get("SITE_URL") ?? "https://mlvnt.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-side source of truth for package → Stripe Price ID + session count.
// MUST mirror STRIPE_PACKAGES in App.jsx. Price IDs come from the Stripe
// Dashboard (Products → the price attached to each existing Payment Link).
const PACKAGE_CATALOGUE: Record<string, { priceId: string; sessions: number; name: string }> = {
  single: { priceId: Deno.env.get("STRIPE_PRICE_SINGLE") ?? "", sessions: 1,  name: "Single Session" },
  "4x":   { priceId: Deno.env.get("STRIPE_PRICE_4X")     ?? "", sessions: 4,  name: "4 Sessions" },
  "8x":   { priceId: Deno.env.get("STRIPE_PRICE_8X")     ?? "", sessions: 8,  name: "8 Sessions" },
  "12x":  { priceId: Deno.env.get("STRIPE_PRICE_12X")    ?? "", sessions: 12, name: "12 Sessions" },
};

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY not configured");
    return new Response(JSON.stringify({ error: "Payments are not configured. Contact support." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Verify the caller's identity from their JWT — never trust a client_id
  // ── passed in the request body, or purchases could be credited to anyone.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    console.error("create-checkout-session auth error:", userErr?.message);
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const clientId    = userData.user.id;
  const clientEmail = userData.user.email ?? undefined;

  let body: { package_id?: string };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pkg = PACKAGE_CATALOGUE[body.package_id ?? ""];
  if (!pkg) {
    return new Response(JSON.stringify({ error: "Unknown package_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!pkg.priceId) {
    console.error(`No Stripe price configured for package "${body.package_id}"`);
    return new Response(JSON.stringify({ error: "This package is not currently available." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: pkg.priceId, quantity: 1 }],
      client_reference_id: clientId,
      customer_email: clientEmail,
      metadata: { client_id: clientId, package_id: body.package_id!, sessions: String(pkg.sessions) },
      success_url: `${SITE_URL}/?checkout=success`,
      cancel_url:  `${SITE_URL}/?checkout=cancelled`,
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return new Response(JSON.stringify({ error: "Could not start checkout. Please try again." }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
