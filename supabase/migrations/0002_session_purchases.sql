-- 0002_session_purchases.sql
-- Phase 1: Stripe → session balance automation.
--
-- WHY: The webhook can be delivered more than once for the same event
-- (Stripe's guarantee is at-least-once, not exactly-once). Without a unique
-- constraint tying a credit to a specific Stripe event id, a retried
-- webhook call would add sessions to a client's balance twice for one
-- payment. This table + RPC make crediting idempotent and atomic.

create table if not exists session_purchases (
  id                uuid primary key default gen_random_uuid(),
  stripe_event_id   text not null unique,
  stripe_session_id text,
  client_id         uuid not null references profiles(id) on delete cascade,
  package_id        text not null,
  sessions_added    integer not null check (sessions_added > 0),
  amount_total      integer,        -- cents, from Stripe
  currency          text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_session_purchases_client on session_purchases(client_id);

alter table session_purchases enable row level security;

-- Clients can read their own purchase history (receipts view).
create policy "clients read own purchases"
  on session_purchases for select
  using (auth.uid() = client_id);

-- Coaches/admins/owner can read all purchases.
create policy "coaches read all purchases"
  on session_purchases for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true)
    )
  );

-- No direct insert/update policy for any role — writes only happen through
-- the SECURITY DEFINER RPC below, called by the service-role webhook.

-- ── Atomic, idempotent credit function ──────────────────────────────────
-- Inserts the purchase row (fails silently into "already_processed" on a
-- duplicate stripe_event_id) and, only on first insert, increments the
-- client's sessions_balance in the same transaction.
create or replace function credit_session_purchase(
  p_client_id         uuid,
  p_stripe_event_id   text,
  p_package_id        text,
  p_sessions_added    integer,
  p_amount_total      integer,
  p_currency          text,
  p_stripe_session_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
  v_inserted    boolean := true;
begin
  begin
    insert into session_purchases (
      stripe_event_id, stripe_session_id, client_id,
      package_id, sessions_added, amount_total, currency
    ) values (
      p_stripe_event_id, p_stripe_session_id, p_client_id,
      p_package_id, p_sessions_added, p_amount_total, p_currency
    );
  exception when unique_violation then
    -- Same Stripe event already processed — no-op, not an error.
    v_inserted := false;
  end;

  if not v_inserted then
    select sessions_balance into v_new_balance
    from client_profiles where id = p_client_id;
    return jsonb_build_object('already_processed', true, 'new_balance', v_new_balance);
  end if;

  update client_profiles
  set sessions_balance = coalesce(sessions_balance, 0) + p_sessions_added,
      updated_at = now()
  where id = p_client_id
  returning sessions_balance into v_new_balance;

  -- If the client_profiles row doesn't exist yet, create it rather than
  -- silently dropping the credit (no orphaned payments).
  if v_new_balance is null then
    insert into client_profiles (id, sessions_balance, updated_at)
    values (p_client_id, p_sessions_added, now())
    on conflict (id) do update
      set sessions_balance = coalesce(client_profiles.sessions_balance, 0) + excluded.sessions_balance
    returning sessions_balance into v_new_balance;
  end if;

  return jsonb_build_object('already_processed', false, 'new_balance', v_new_balance);
end;
$$;

-- Only the service role (used by the webhook function) may execute this.
revoke execute on function credit_session_purchase from public, anon, authenticated;
