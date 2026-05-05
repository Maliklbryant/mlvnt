import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    "Missing Supabase env vars. " +
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,   // sessions survive page reload
    autoRefreshToken:  true,   // silently refreshes JWTs
    detectSessionInUrl:true,   // handles email-confirm + password-reset links
    storageKey:        "mlvnt-auth",
  },
});
