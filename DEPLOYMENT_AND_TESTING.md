# MLVNT Phase 1 + Phase B — Deployment & Owner Acceptance Testing

## 4. Required environment variables

**Vercel (frontend build):**
| Variable | Where used |
|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` |

**Supabase Edge Function secrets** (`supabase secrets set KEY=value`):
| Variable | Used by | Notes |
|---|---|---|
| `RESEND_API_KEY` | `send-consultation-email` | |
| `COACH_EMAIL` | `send-consultation-email` | defaults to `mlvnt2026@gmail.com` if unset |
| `FROM_EMAIL` | `send-consultation-email` | **must** be a Resend-verified domain address; do not leave unset (falls back to `onboarding@resend.dev`, a real production issue flagged earlier and still open) |
| `STRIPE_SECRET_KEY` | `create-checkout-session`, `stripe-webhook` | |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | from the Stripe Dashboard webhook endpoint you create in step 5 |
| `STRIPE_PRICE_SINGLE` | `create-checkout-session` | Price ID for the "Single Session" product |
| `STRIPE_PRICE_4X` | `create-checkout-session` | Price ID for "4 Sessions" |
| `STRIPE_PRICE_8X` | `create-checkout-session` | Price ID for "8 Sessions" |
| `STRIPE_PRICE_12X` | `create-checkout-session` | Price ID for "12 Sessions" |
| `SITE_URL` | `create-checkout-session` | e.g. `https://mlvnt.com` — used for Checkout success/cancel redirect |
| `SUPABASE_URL` | both new functions | Supabase auto-injects this — you don't set it manually |
| `SUPABASE_SERVICE_ROLE_KEY` | both new functions | Supabase auto-injects this — you don't set it manually |

I am not providing values for any secret — only names. Never commit real values to source control.

---

## 5. Exact Stripe webhook configuration

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://<your-project-ref>.functions.supabase.co/stripe-webhook`
3. Events to send: select only **`checkout.session.completed`**.
4. After creating it, copy the **Signing secret** (`whsec_...`) shown on the endpoint's detail page → set it as `STRIPE_WEBHOOK_SECRET`.
5. For local/staging testing before going live, use the Stripe CLI instead of the Dashboard:
   ```bash
   stripe listen --forward-to https://<project-ref>.functions.supabase.co/stripe-webhook
   stripe trigger checkout.session.completed
   ```

---

## 6. Exact Supabase deployment steps

Run against a **staging project first**, not production.

```bash
# 1. Apply migrations, in this exact order (0001 = your pre-existing schema, already applied)
supabase link --project-ref <staging-project-ref>
supabase db push
# This applies 0002_session_purchases.sql, 0003_consultation_dedupe.sql,
# 0004_client_lifecycle.sql in filename order automatically.

# 2. Deploy edge functions
supabase functions deploy send-consultation-email
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
# --no-verify-jwt is required on stripe-webhook: Stripe calls it directly
# with a Stripe signature header, not a Supabase JWT.

# 3. Set secrets (see table in section 4)
supabase secrets set RESEND_API_KEY=... COACH_EMAIL=... FROM_EMAIL="MLVNT <noreply@yourdomain.com>"
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... SITE_URL=https://staging.mlvnt.com
supabase secrets set STRIPE_PRICE_SINGLE=... STRIPE_PRICE_4X=... STRIPE_PRICE_8X=... STRIPE_PRICE_12X=...

# 4. Confirm deployment
supabase functions list
supabase secrets list   # confirms names are set, does not print values
```

---

## 7. Exact Vercel deployment steps

```bash
# 1. Set environment variables (Project → Settings → Environment Variables),
#    or via CLI:
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# repeat for "preview" and "development" environments if you want the same
# staging Supabase project available on preview deploys

# 2. Apply the App.jsx patches from APP_JSX_PATCHES.md and replace db.js
#    with the file in this package, then:
npm install
npm run build   # must pass locally before deploying

# 3. Deploy
vercel --prod
# or: git push to the branch connected to your Vercel project, if using
# Vercel's Git integration (recommended, since it re-runs the build)
```

---

## 8–11. Owner Acceptance Test Checklist — numbered, with expected results, DB verification, and log locations

Run in this order. Each test lists: **Steps → Expected Result → DB Rows/Columns to Check → Where to Look on Failure.**

### Potential Client

**T1 — Public site loads**
- Steps: open the deployed URL, unauthenticated.
- Expected: hero, plans, "Book a Free Consultation" CTA render; no console errors.
- DB check: none.
- On failure: browser console; Vercel → Deployments → Functions/Build logs.

**T2 — Book a consultation, new email**
- Steps: fill the consultation form with an email you don't already have an account for; submit.
- Expected: success screen appears **only after** save confirms; no "booking failed" flash.
- DB check: `consultation_requests` — new row, `email` matches, `claimed_by_id IS NULL`, `requested_date`/`requested_time` match what you selected exactly.
- On failure: Supabase Dashboard → Logs → Postgres Logs (RPC error); browser Network tab on the `submit_consultation_request` RPC call.

**T3 — Past-time booking is blocked**
- Steps: attempt to pick a time slot earlier than "now" (only reachable by manipulating the client clock or via direct API call, since the UI hides past slots — try via `curl`/Postman calling the RPC directly with a past date).
- Expected: rejected with a clear error, not silently accepted.
- DB check: no new row in `consultation_requests` for that attempt.
- On failure: Postgres Logs.

**T4 — Duplicate submission is prevented**
- Steps: submit the exact same consultation (same email, date, time) twice in a row (double-click the Confirm button rapidly, and/or resubmit the same form after refresh).
- Expected: second attempt returns "You already have a consultation request for that date and time," not a duplicate success.
- DB check: only **one** `consultation_requests` row for that (email, date, time) triple — confirms `uq_consultation_email_slot` is enforced.
- On failure: check the error code in Network tab is `23505`; check Postgres Logs for the constraint name.

**T5 — Coach notification created**
- Expected: after T2, a row exists in `notifications` with `recipient_id` = the coach's `profiles.id`, `type = 'consultation_request'`.
- On failure: Supabase Table Editor → `notifications`, filter by `created_at` around your test time.

**T6 — Emails delivered**
- Expected: both the client inbox and coach inbox (`mlvnt2026@gmail.com` or your configured `COACH_EMAIL`) receive an email within ~1 minute.
- On failure: `supabase functions logs send-consultation-email`; Resend Dashboard → Logs, filter by recipient.

---

### Lead → Client Conversion

**T7 — Consultation links to account on signup**
- Steps: using the **same email** from T2, create an account via the normal signup flow.
- Expected: no error; login proceeds normally.
- DB check: `profiles` — new row for that email; `consultation_requests` row from T2 now has `claimed_by_id` = the new profile's `id`; `client_profiles` — new row with `lifecycle_status = 'consultation_booked'`.
- On failure: Postgres Logs (trigger `trg_link_person_on_profile_create` errors would appear here); confirm the trigger exists via `\df link_person_on_profile_create` in the SQL editor.

**T8 — Stripe test payment converts lead to active client**
- Steps: while signed in as the T7 account, purchase a package using a Stripe **test-mode** card (`4242 4242 4242 4242`).
- Expected: redirected to Stripe Checkout (not a static payment link — confirm the URL is `checkout.stripe.com/c/pay/...`), payment succeeds, redirected back to `SITE_URL/?checkout=success`.
- DB check (allow a few seconds for the webhook): `session_purchases` — new row, `stripe_event_id` populated, `sessions_added` matches the package; `session_ledger` — new row, `source_type='purchase'`, `amount` = sessions added; `client_profiles.sessions_balance` increased by exactly that amount; `client_profiles.lifecycle_status = 'active_client'`.
- On failure: Stripe Dashboard → Webhooks → your endpoint → check delivery attempts/response codes; `supabase functions logs stripe-webhook`.

**T9 — Duplicate webhook delivery does not double-credit**
- Steps: in Stripe Dashboard, find the `checkout.session.completed` event from T8 → **Resend**. (Or via CLI: `stripe events resend <event_id>`.)
- Expected: `client_profiles.sessions_balance` is **unchanged** after the resend.
- DB check: `session_ledger` still has exactly **one** row for that `source_id` (the Stripe event id) — confirms `uq_session_ledger_source` held; `session_purchases` still has exactly one row for that `stripe_event_id`.
- On failure: if balance doubled, the idempotency constraint didn't fire — check `supabase functions logs stripe-webhook` for `already_processed` in the response; check the migration applied correctly (`\d session_purchases` should show the unique index).

**T10 — Intake and consultation history preserved**
- Expected: the coach can open this client's profile and see the original consultation goals/answers from T2 still attached — nothing was lost or duplicated across the lead→client transition.
- DB check: `consultation_requests.claimed_by_id` still points to this client; no second `profiles` row exists for the same email (`select count(*) from profiles where lower(email) = 'test@...'` returns 1).

**T11 — Client appears in coach Clients section**
- Steps: log in as coach → Clients.
- Expected: the T7/T8 client appears with correct package/balance.
- On failure: check `listClients()` query in `db.js` isn't silently erroring — browser console.

---

### Coach Experience

**T12 — View leads/consultations**
- Expected: T2's submission appears in the coach's consultation queue with correct data.

**T13 — Open client profile, review intake**
- Expected: intake answers from onboarding (separate from the consultation form) also display correctly for this client.

**T14 — Assign a program**
- Expected: program appears under the client; `programs.client_id` = this client's id.

**T15 — Schedule / reschedule / cancel a session**
- Note: as flagged at the end of Phase B, no "mark complete/no-show" UI exists yet in the coach dashboard — this is Phase C work. You can currently create a session via the client booking flow; reschedule/cancel UI in the admin schedule screen should be verified against whatever exists today, independent of this package.

**T16 — Mark session complete → balance deducts exactly once**
- Prerequisite: this requires calling `updateSessionStatus(sessionId, "completed")` — either via a coach-facing button if one exists in your current build, or directly via the Supabase Table Editor (set a test session's `status` to `completed`) for verification purposes until Phase C adds the UI.
- Expected: `client_profiles.sessions_balance` decreases by exactly 1.
- DB check: `session_ledger` — new row, `source_type='session_completed'`, `source_id` = the session's id, `amount=-1`.
- Re-run the same status update again (or re-save the same row) — expected: balance does **not** decrease a second time (idempotent via the same unique index).
- On failure: Postgres Logs — check trigger `trg_debit_session_on_status_change` fired (`select * from session_ledger where source_id = '<session-id>'`).

**T17 — Coach adjustment recorded in ledger**
- Steps: coach uses "+ Add" / "− Remove" in the Packages/Session Inventory admin screen.
- Expected: balance changes correctly; `session_ledger` gets a `source_type='coach_adjustment'` row with `created_by` = the coach's `profiles.id`.
- On failure: confirm `AdminPackages`'s `applyAdj`/quick-add buttons were updated per Patch 10 in `APP_JSX_PATCHES.md` — if they still call `saveClientProfile` directly, no ledger row will appear (and, separately, the tamper-protection trigger will silently revert the write if the caller isn't recognized as admin/owner — check `client_profiles.sessions_balance` didn't change at all, which would indicate that).

**T18 — Client cannot alter their own protected balance fields**
- Steps: while signed in as a **client** (not coach), attempt a direct Supabase client call: `supabase.from('client_profiles').update({ sessions_balance: 999 }).eq('id', <own id>)`.
- Expected: the call may return success (RLS allows the UPDATE for own-row edits like phone/location) but `sessions_balance` is silently reverted to its prior value by `trg_protect_client_profile_fields`.
- DB check: `client_profiles.sessions_balance` unchanged after the attempt.
- On failure: this is a real security gap — check the trigger exists and is enabled (`\d client_profiles` should list it).

---

### Client Experience

**T19 — Log in / view program / complete workout / save reps+weights**
- Expected: standard flow works; `workout_logs` row created/updated correctly.

**T20 — Log bodyweight exactly once**
- Steps: rapidly double-click "Log Weight."
- Expected: only **one** `client_weight_logs` row created for that click, not two.
- On failure: confirm the weight-log debounce fix (Patch 7 in `APP_JSX_PATCHES.md`) was applied — check for the exact broken line `if (savingRef.current) return;  // debounce: already saving    savingRef.current = true;` still being present (all on one line, after the comment) as the smoking gun if this test fails.

**T21 — View schedule / remaining sessions / messages**
- Expected: no crashes on an account with zero sessions booked, zero messages (empty states should render, not blank screens).

**T22 — Navigate back from every screen**
- Expected: every screen reachable from the dashboard has a working back action, no dead ends.

**T23 — Sign out / sign out of all devices**
- Expected: session actually invalidates; a second device/tab signed in as the same user is also signed out for "all devices."

---

### Mobile

**T24 — iPhone Safari / Android Chrome / tablet / desktop viewports**
- Expected: no clipped controls, safe-area respected (notch/home-indicator), bottom nav doesn't overlap content, touch targets ≥ ~40px, keyboard doesn't obscure active input, no blank black screens during any loading state.
- No DB check — visual/interaction only.

---

## 12. Rollback plan

**Migrations** (each is additive — no destructive `DROP`/`ALTER ... DROP COLUMN` was used anywhere in 0002–0004 — but here's the exact reversal if needed):

```sql
-- Rollback 0004_client_lifecycle.sql
drop trigger if exists trg_protect_client_profile_fields on client_profiles;
drop function if exists protect_client_profile_fields();
drop trigger if exists trg_debit_session_on_status_change on sessions;
drop function if exists debit_session_on_status_change();
drop function if exists admin_adjust_session_balance(uuid, integer, text, text);
drop function if exists apply_session_ledger_entry(uuid, integer, text, text, text, uuid, boolean);
drop table if exists session_ledger;
drop trigger if exists trg_link_person_on_profile_create on profiles;
drop function if exists link_person_on_profile_create();
alter table consultation_requests drop column if exists claimed_by_id;
alter table client_profiles
  drop column if exists lifecycle_status,
  drop column if exists lead_source,
  drop column if exists low_balance_notified_2,
  drop column if exists low_balance_notified_1;
-- NOTE: this also drops the ledger-aware credit_session_purchase override.
-- Re-apply 0002's original version of that function if rolling back 0004
-- but keeping 0002/0003.

-- Rollback 0003_consultation_dedupe.sql
drop index if exists uq_consultation_email_slot;

-- Rollback 0002_session_purchases.sql
drop function if exists credit_session_purchase(uuid, text, text, integer, integer, text, text);
drop table if exists session_purchases;
```
Run rollbacks in **reverse order** (0004 → 0003 → 0002) if reverting all three.

**Edge Functions:**
```bash
supabase functions delete stripe-webhook
supabase functions delete create-checkout-session
# send-consultation-email is unchanged from before this work — no need to remove it.
```
Also remove the webhook endpoint in the Stripe Dashboard so it stops sending events to a deleted function.

**Frontend (Vercel):** use Vercel's "Instant Rollback" to the previous deployment, or `git revert` the commit containing the `App.jsx`/`db.js` changes and redeploy.

**Data safety note:** rolling back 0004 drops the `session_ledger` table, which deletes its audit history. If any real purchases/adjustments have been recorded by the time you'd roll back, export `session_ledger` and `session_purchases` first:
```bash
supabase db dump --data-only -t session_ledger -t session_purchases -f pre_rollback_backup.sql
```
