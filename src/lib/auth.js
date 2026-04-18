/**
 * MLVNT Auth Helpers
 * ------------------
 * All Supabase auth operations live here.
 * App.jsx imports from this file so no Supabase calls are scattered.
 *
 * Role system:
 *   - Roles are stored in public.profiles (role TEXT, is_owner BOOLEAN)
 *   - mlvnt2026@gmail.com is seeded as role="owner" by the SQL below
 *   - Every other sign-up defaults to role="client"
 *   - Role is NEVER accepted from the browser — always read from the DB
 */

import { supabase } from "./supabase.js";

const OWNER_EMAIL = "mlvnt2026@gmail.com";

// ─────────────────────────────────────────────────────────────
// Internal: fetch role row from public.profiles
// ─────────────────────────────────────────────────────────────
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_owner, name, mfa_setup_done")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Internal: build the session shape the rest of the app expects
// ─────────────────────────────────────────────────────────────
function buildSession(supaUser, profile) {
  const name     = profile?.name    || supaUser.user_metadata?.full_name || "";
  const role     = profile?.role    || "client";
  const isOwner  = profile?.is_owner ?? false;
  const initials = name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  return {
    id:            supaUser.id,
    email:         supaUser.email,
    name,
    init:          initials,
    role,
    isOwner,
    emailVerified: !!supaUser.email_confirmed_at,
    mfaRequired:   role === "owner" || role === "admin",
    mfaSetupDone:  profile?.mfa_setup_done ?? false,
    sessionId:     supaUser.id,  // keep legacy shape
  };
}

// ─────────────────────────────────────────────────────────────
// GET SESSION — call on app boot to restore persisted session
// ─────────────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const profile = await fetchProfile(session.user.id);
  return buildSession(session.user, profile);
}

// ─────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    // Map Supabase error messages to user-friendly copy
    if (error.message.includes("Invalid login credentials")) {
      return { ok: false, error: "Incorrect email or password." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { ok: false, error: "Please verify your email before signing in. Check your inbox." };
    }
    return { ok: false, error: error.message };
  }

  const profile = await fetchProfile(data.user.id);
  return { ok: true, session: buildSession(data.user, profile) };
}

// ─────────────────────────────────────────────────────────────
// SIGN UP
// ─────────────────────────────────────────────────────────────
export async function signUp(email, password, name) {
  const norm = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: norm,
    password,
    options: {
      data: { full_name: name },          // stored in auth.users.user_metadata
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: error.message };
  }

  // Profile row is created by a Supabase DB trigger (see SQL below).
  // Role defaults to "client" — owner is pre-seeded separately.
  return {
    ok: true,
    needsEmailVerification: !data.user?.email_confirmed_at,
    email: norm,
    // Role from profile (trigger may not have run yet — use client as safe default)
    role: norm === OWNER_EMAIL ? "owner" : "client",
  };
}

// ─────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
}

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD — sends real email via Supabase
// ─────────────────────────────────────────────────────────────
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/?reset=1` }
  );

  // Always return ok:true to avoid leaking which emails exist
  // (Supabase silently drops the request if email is unknown)
  if (error) console.error("resetPasswordForEmail:", error.message);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// UPDATE PASSWORD — called after user clicks the email link
// The link sets a session automatically; just call updateUser.
// ─────────────────────────────────────────────────────────────
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// MARK MFA SETUP DONE — write to profiles table
// ─────────────────────────────────────────────────────────────
export async function markMfaSetupDone(userId) {
  await supabase
    .from("profiles")
    .update({ mfa_setup_done: true })
    .eq("id", userId);
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIBE TO AUTH CHANGES — for session persistence on reload
// ─────────────────────────────────────────────────────────────
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session) {
        const profile = await fetchProfile(session.user.id);
        callback(event, buildSession(session.user, profile));
      } else {
        callback(event, null);
      }
    }
  );
  return subscription; // call subscription.unsubscribe() to clean up
}
