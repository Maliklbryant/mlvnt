// supabase/functions/send-consultation-email/index.ts
//
// Deploy:
//   npx supabase functions deploy send-consultation-email
//
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set COACH_EMAIL=mlvnt2026@gmail.com
//   supabase secrets set FROM_EMAIL="MLVNT <noreply@yourdomain.com>"
//
// FROM_EMAIL must match a verified domain in Resend.
// DNS is verified — set FROM_EMAIL to your verified domain address.
// Do NOT use onboarding@resend.dev in production.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_URL  = "https://api.resend.com/emails";
const RESEND_KEY  = Deno.env.get("RESEND_API_KEY")  ?? "";
const COACH_EMAIL = Deno.env.get("COACH_EMAIL")     ?? "mlvnt2026@gmail.com";
const FROM_EMAIL  = Deno.env.get("FROM_EMAIL")      ?? "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  consultation_id?: string;
  first_name?:  string;
  last_name?:   string;
  email?:       string;
  phone?:       string;
  age?:         string;
  goals?:       string[];
  level?:       string;
  had_coach?:   string;
  train_freq?:  string;
  gym_access?:  string;
  location?:    string;
  injuries?:    string;
  surgeries?:   string;
  conditions?:  string;
  medications?: string;
  date_display?: string;
  time_display?: string;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; status?: number; body?: string }> {

  if (!RESEND_KEY) {
    console.error("RESEND_API_KEY is not set — email cannot be sent");
    return { ok: false, body: "RESEND_API_KEY not configured" };
  }

  if (!FROM_EMAIL) {
    console.error("FROM_EMAIL is not set — email cannot be sent");
    return { ok: false, body: "FROM_EMAIL not configured" };
  }

  console.log(`sending to="${to}" from="${FROM_EMAIL}" subject="${subject}"`);

  let res: Response;
  let body: string;

  try {
    res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    body = await res.text();
  } catch (fetchErr) {
    console.error(`Resend fetch failed for ${to}:`, fetchErr);
    return { ok: false, body: String(fetchErr) };
  }

  if (res.ok) {
    console.log(`Resend success [${to}]: ${res.status} ${body}`);
  } else {
    console.error(`Resend error [${to}]: ${res.status} ${body}`);
  }

  return { ok: res.ok, status: res.status, body };
}

function clientHtml(p: Payload): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "there";
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consultation Confirmed — MLVNT</title></head>
<body style="margin:0;padding:0;background:#0A0B0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 20px;background:#0A0B0D;">
<tr><td align="center"><table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">
<tr><td style="text-align:center;padding-bottom:36px;">
  <span style="font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:0.14em;color:#ECEEF1;">MLVNT</span>
</td></tr>
<tr><td style="background:#111318;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Consultation Confirmed</p>
  <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#ECEEF1;letter-spacing:-0.02em;">You're booked, ${name}.</h1>
  <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.65;">Your free 30-minute consultation with Malik Bryant is confirmed.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:32px;">
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:13px 18px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Date</td>
      <td style="padding:13px 18px;font-size:14px;color:#ECEEF1;text-align:right;">${p.date_display ?? "—"}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:13px 18px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Time</td>
      <td style="padding:13px 18px;font-size:14px;color:#ECEEF1;text-align:right;">${p.time_display ?? "—"}</td>
    </tr>
    ${p.location ? `<tr>
      <td style="padding:13px 18px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Location</td>
      <td style="padding:13px 18px;font-size:14px;color:#ECEEF1;text-align:right;">${p.location}</td>
    </tr>` : ""}
  </table>
  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.25);">What to expect</p>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.8;">
    — Malik will review your goals before the call.<br>
    — You will receive connection details shortly.<br>
    — Come ready to talk about what you want to build.<br>
    — No pressure — this is your first step.
  </p>
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.7;">
      Questions? Reply to this email.<br>
      <em style="font-size:11px;color:rgba(255,255,255,0.18);">Time Moves. So Should You.</em>
    </p>
  </div>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">MLVNT · New York</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function coachHtml(p: Payload): string {
  const name     = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
  const goalsTxt = Array.isArray(p.goals) && p.goals.length ? p.goals.join(", ") : "—";

  const rows: [string, string][] = [
    ["Name",        name],
    ["Email",       p.email        ?? "—"],
    ["Phone",       p.phone        ?? "—"],
    ["Age",         p.age          ?? "—"],
    ["Date",        p.date_display ?? "—"],
    ["Time",        p.time_display ?? "—"],
    ["Location",    p.location     ?? "—"],
    ["Goals",       goalsTxt],
    ["Experience",  p.level        ?? "—"],
    ["Had coach",   p.had_coach    ?? "—"],
    ["Frequency",   p.train_freq   ?? "—"],
    ["Gym access",  p.gym_access   ?? "—"],
    ["Injuries",    p.injuries     ?? "None reported"],
    ["Surgeries",   p.surgeries    ?? "None reported"],
    ["Conditions",  p.conditions   ?? "None reported"],
    ["Medications", p.medications  ?? "None reported"],
  ];

  const rowsHtml = rows.map(([k, v], i) =>
    `<tr style="${i < rows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.06);" : ""}">
      <td style="padding:11px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);width:110px;">${k}</td>
      <td style="padding:11px 16px;font-size:13px;color:#ECEEF1;">${v}</td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><title>New Consultation — MLVNT</title></head>
<body style="margin:0;padding:0;background:#0A0B0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 20px;background:#0A0B0D;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="text-align:center;padding-bottom:28px;">
  <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.14em;color:#ECEEF1;">MLVNT</span>
  <span style="display:block;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-top:4px;">Coach Notification</span>
</td></tr>
<tr><td style="background:#111318;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(220,175,100,0.65);">New Consultation Booked</p>
  <h1 style="margin:0 0 28px;font-size:22px;font-weight:700;color:#ECEEF1;letter-spacing:-0.01em;">${name} · ${p.date_display ?? "—"}</h1>
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;margin-bottom:24px;">
    ${rowsHtml}
  </table>
  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);">
    Review in <strong style="color:rgba(255,255,255,0.55);">MLVNT Admin → Consultations</strong>.
  </p>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">MLVNT · Automated coach notification</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("send-consultation-email called");
  console.log("RESEND_KEY configured:", !!RESEND_KEY);
  console.log("FROM_EMAIL:", FROM_EMAIL);
  console.log("COACH_EMAIL:", COACH_EMAIL);

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    console.error("Failed to parse request body");
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("payload", JSON.stringify({
    name:  [p.first_name, p.last_name].join(" "),
    email: p.email,
    date:  p.date_display,
    time:  p.time_display,
    goals: p.goals,
  }));

  const results: Record<string, unknown> = {
    client_email_sent: false,
    coach_email_sent:  false,
  };

  if (p.email && p.email.includes("@")) {
    console.log("sending client email to", p.email);
    const r = await sendEmail(
      p.email,
      `Your MLVNT Consultation Is Confirmed — ${p.date_display ?? ""}`,
      clientHtml(p)
    );
    results.client_email_sent   = r.ok;
    results.client_email_status = r.status;
    if (!r.ok) results.client_email_error = r.body;
  } else {
    console.warn("no valid client email — skipping client email");
    results.client_email_error = "no valid client email";
  }

  console.log("sending coach email to", COACH_EMAIL);
  const r2 = await sendEmail(
    COACH_EMAIL,
    `New MLVNT Consultation: ${[p.first_name, p.last_name].filter(Boolean).join(" ")} — ${p.date_display ?? ""}`,
    coachHtml(p)
  );
  results.coach_email_sent   = r2.ok;
  results.coach_email_status = r2.status;
  if (!r2.ok) results.coach_email_error = r2.body;

  console.log("send-consultation-email complete", JSON.stringify(results));

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
