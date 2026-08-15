-- 0004_client_lifecycle.sql  (CORRECTED — fully idempotent replacement)
-- =============================================================================
-- WHY THIS VERSION EXISTS
-- The previous file failed with:
--   ERROR: 42710: constraint "sessions_client_id_fkey" for relation "sessions" already exists
--
-- ROOT CAUSE: the `sessions` table definition declared the client_id/coach_id
-- foreign keys TWICE in the same CREATE TABLE — once implicitly via inline
-- `references profiles(id)` on the column itself, and again as an explicit
-- named `CONSTRAINT sessions_client_id_fkey FOREIGN KEY ...`. Both attempt to
-- create a constraint with the same auto-generated name, so Postgres self-
-- conflicts within the single statement. This is not a re-run/ordering
-- problem — it would fail identically on a completely fresh database too.
--
-- FIX: every foreign key in this file is now declared exactly once. Columns
-- are declared as plain typed columns with NO inline `references`; each FK
-- is then added separately via a defensive DO block that checks pg_constraint
-- before adding it. This is also what makes the file safe to run against a
-- database in ANY state — untouched, fully migrated already, or stopped
-- partway through a previous attempt.
--
-- EVERY object category is now guarded:
--   tables              → CREATE TABLE IF NOT EXISTS
--   columns             → ADD COLUMN IF NOT EXISTS
--   foreign keys        → DO $$ ... IF NOT EXISTS (pg_constraint) ... $$
--   check constraints   → bundled inside the guarded CREATE TABLE / ADD
--                          COLUMN they belong to (atomic with their parent,
--                          so no separate guard is needed or possible)
--   unique constraints  → CREATE UNIQUE INDEX IF NOT EXISTS
--   indexes             → CREATE INDEX IF NOT EXISTS
--   RLS policies        → DROP POLICY IF EXISTS + CREATE POLICY
--   triggers            → DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   functions           → CREATE OR REPLACE FUNCTION
--   grants/revokes      → naturally idempotent in Postgres (never error if
--                          the privilege state already matches)
--   realtime publication → not used by this migration; no current frontend
--                          code subscribes to postgres_changes on `sessions`
--                          (Booking loads availability with a one-time
--                          fetch, not a realtime channel), so nothing to add
--                          here. Flagging explicitly rather than silently
--                          skipping it.
--
-- SAFETY: nothing in this file drops or truncates a table, deletes rows, or
-- resets a balance. session_purchases (from 0002, already live) is not
-- touched structurally — only its credit_session_purchase() function is
-- replaced (CREATE OR REPLACE changes behavior, not data).
-- =============================================================================


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Lifecycle status on client_profiles
-- Each ADD COLUMN IF NOT EXISTS (with its inline CHECK, where present) is
-- atomic: if the column already exists, the entire clause — including any
-- constraint bundled with it — is skipped. No separate guard is needed or
-- possible for a constraint that only ever exists alongside its own column.
-- ═════════════════════════════════════════════════════════════════════════
alter table client_profiles
  add column if not exists lifecycle_status text not null default 'lead'
    check (lifecycle_status in ('lead','consultation_booked','payment_pending','active_client','inactive_client','archived')),
  add column if not exists lead_source text,
  add column if not exists low_balance_notified_2 timestamptz,
  add column if not exists low_balance_notified_1 timestamptz;


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Link consultation_requests back to the person once they sign up
-- Column and foreign key are added as two separate, independently-guarded
-- steps: if a prior partial run added the column but not yet the FK (or
-- vice versa via manual intervention), this still converges correctly.
-- ═════════════════════════════════════════════════════════════════════════
alter table consultation_requests
  add column if not exists claimed_by_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'consultation_requests_claimed_by_id_fkey'
      and conrelid = 'public.consultation_requests'::regclass
  ) then
    alter table public.consultation_requests
      add constraint consultation_requests_claimed_by_id_fkey
      foreign key (claimed_by_id) references profiles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_consultation_requests_email_lower
  on consultation_requests (lower(email));

create index if not exists idx_consultation_requests_unclaimed
  on consultation_requests (lower(email)) where claimed_by_id is null;

create or replace function link_person_on_profile_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_consult boolean;
begin
  update consultation_requests
  set claimed_by_id = NEW.id
  where lower(email) = lower(NEW.email)
    and claimed_by_id is null;

  select exists(
    select 1 from consultation_requests where claimed_by_id = NEW.id
  ) into v_has_consult;

  insert into client_profiles (id, lifecycle_status, lead_source, updated_at)
  values (
    NEW.id,
    case when v_has_consult then 'consultation_booked' else 'lead' end,
    case when v_has_consult then 'consultation' else 'direct_signup' end,
    now()
  )
  on conflict (id) do update
    set lifecycle_status = case
          when client_profiles.lifecycle_status = 'lead' and v_has_consult
            then 'consultation_booked'
          else client_profiles.lifecycle_status
        end;

  return NEW;
end;
$$;

drop trigger if exists trg_link_person_on_profile_create on profiles;
create trigger trg_link_person_on_profile_create
  after insert on profiles
  for each row execute function link_person_on_profile_create();


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 3 — Session ledger (append-only audit trail for balance moves)
-- Table created WITHOUT inline foreign keys; both FKs added via guarded DO
-- blocks immediately after, same pattern as sessions in Section 6.
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists session_ledger (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null,
  amount       integer not null,
  reason       text not null,
  source_type  text not null,
  source_id    text,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'session_ledger_client_id_fkey'
      and conrelid = 'public.session_ledger'::regclass
  ) then
    alter table public.session_ledger
      add constraint session_ledger_client_id_fkey
      foreign key (client_id) references profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_ledger_created_by_fkey'
      and conrelid = 'public.session_ledger'::regclass
  ) then
    alter table public.session_ledger
      add constraint session_ledger_created_by_fkey
      foreign key (created_by) references profiles(id);
  end if;
end $$;

create unique index if not exists uq_session_ledger_source
  on session_ledger (source_type, source_id);

create index if not exists idx_session_ledger_client on session_ledger(client_id);

alter table session_ledger enable row level security;

drop policy if exists "clients read own ledger" on session_ledger;
create policy "clients read own ledger"
  on session_ledger for select
  using (auth.uid() = client_id);

drop policy if exists "coaches read all ledger" on session_ledger;
create policy "coaches read all ledger"
  on session_ledger for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true))
  );

grant select on session_ledger to authenticated;
-- No insert/update/delete grant/policy for anyone — all writes go through
-- the SECURITY DEFINER RPCs below.


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 4 — apply_session_ledger_entry: the one function allowed to move a balance
-- ═════════════════════════════════════════════════════════════════════════
create or replace function apply_session_ledger_entry(
  p_client_id    uuid,
  p_amount       integer,
  p_reason       text,
  p_source_type  text,
  p_source_id    text,
  p_created_by   uuid,
  p_allow_negative boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance integer;
  v_new_balance      integer;
  v_inserted         boolean := true;
  v_clamped          boolean := false;
begin
  if not exists (select 1 from profiles where id = p_client_id) then
    raise exception 'apply_session_ledger_entry: no profile for client_id %', p_client_id;
  end if;

  begin
    insert into session_ledger (client_id, amount, reason, source_type, source_id, created_by)
    values (p_client_id, p_amount, p_reason, p_source_type, p_source_id, p_created_by);
  exception when unique_violation then
    v_inserted := false;
  end;

  select coalesce(sessions_balance, 0) into v_current_balance
  from client_profiles where id = p_client_id for update;

  if v_current_balance is null then
    insert into client_profiles (id, sessions_balance, lifecycle_status, updated_at)
    values (p_client_id, 0, 'lead', now())
    on conflict (id) do nothing;
    v_current_balance := 0;
  end if;

  if not v_inserted then
    return jsonb_build_object('already_processed', true, 'new_balance', v_current_balance, 'clamped', false);
  end if;

  v_new_balance := v_current_balance + p_amount;

  if v_new_balance < 0 and not p_allow_negative then
    v_new_balance := 0;
    v_clamped := true;
  end if;

  update client_profiles
  set sessions_balance = v_new_balance,
      lifecycle_status = case
        when p_source_type = 'purchase' then 'active_client'
        else lifecycle_status
      end,
      low_balance_notified_2 = case when v_new_balance > 3 then null else low_balance_notified_2 end,
      low_balance_notified_1 = case when v_new_balance > 3 then null else low_balance_notified_1 end,
      updated_at = now()
  where id = p_client_id;

  if v_new_balance = 2 then
    update client_profiles set low_balance_notified_2 = now()
    where id = p_client_id and low_balance_notified_2 is null;
    if found then
      insert into notifications (recipient_id, type, title, body, read)
      values (p_client_id, 'package_updated', '2 sessions remaining',
        'You have 2 sessions left. Consider renewing soon to keep your training on track.', false);
    end if;
  elsif v_new_balance = 1 then
    update client_profiles set low_balance_notified_1 = now()
    where id = p_client_id and low_balance_notified_1 is null;
    if found then
      insert into notifications (recipient_id, type, title, body, read)
      values (p_client_id, 'package_updated', '1 session remaining',
        'This is your last session. Renew now to avoid a gap in training.', false);
    end if;
  end if;

  return jsonb_build_object('already_processed', false, 'new_balance', v_new_balance, 'clamped', v_clamped);
end;
$$;

revoke execute on function apply_session_ledger_entry from public, anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 5 — admin_adjust_session_balance: coach/admin-facing wrapper
-- ═════════════════════════════════════════════════════════════════════════
create or replace function admin_adjust_session_balance(
  p_client_id  uuid,
  p_amount     integer,
  p_reason     text,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_is_owner    boolean;
begin
  select role, is_owner into v_caller_role, v_is_owner
  from profiles where id = auth.uid();

  if v_caller_role not in ('admin','owner') and coalesce(v_is_owner,false) is not true then
    raise exception 'admin_adjust_session_balance: caller is not authorized';
  end if;

  return apply_session_ledger_entry(
    p_client_id, p_amount, p_reason, 'coach_adjustment',
    coalesce(p_idempotency_key, gen_random_uuid()::text),
    auth.uid(), false
  );
end;
$$;

grant execute on function admin_adjust_session_balance to authenticated;


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 6 — THE sessions TABLE
-- Shape verified against src/lib/db.js: createSession({clientId, coachId,
-- date, time, notes}), getClientSessions, getCoachSessions (embeds
-- profiles!sessions_client_id_fkey — that exact constraint name is
-- required for PostgREST's embed syntax to resolve), updateSessionStatus,
-- getWeeklySessionCount, isSlotTaken, and Booking's loadAvailability
-- (raw select("date,time,status")).
--
-- `time` is TEXT, not a SQL time type — the frontend writes human labels
-- ("6:00 PM"), confirmed from Booking's confirmBook (`time: selTime`).
--
-- THE FIX: client_id/coach_id are declared as plain `uuid not null` here —
-- NO inline `references`. Both foreign keys are added exactly once, below,
-- via guarded DO blocks. This is what eliminates the duplicate-constraint
-- bug and makes table creation safe regardless of whether `sessions`
-- already exists (in which case CREATE TABLE IF NOT EXISTS no-ops
-- entirely) or exists with only some of its constraints already applied
-- (in which case each DO block independently adds only what's missing).
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists sessions (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null,
  coach_id               uuid not null,
  date                   date not null,
  time                   text not null,
  status                 text not null default 'booked'
                           check (status in ('booked','confirmed','completed','cancelled','late_cancel','no_show')),
  notes                  text,
  coach_notes            text,
  session_balance_effect integer,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_client_id_fkey'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_client_id_fkey
      foreign key (client_id) references profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_coach_id_fkey'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_coach_id_fkey
      foreign key (coach_id) references profiles(id) on delete restrict;
  end if;
end $$;

create index if not exists idx_sessions_client on sessions(client_id);
create index if not exists idx_sessions_coach on sessions(coach_id);
create index if not exists idx_sessions_date on sessions(date);
create index if not exists idx_sessions_coach_date_time on sessions(coach_id, date, time);

alter table sessions enable row level security;

drop policy if exists "clients select own sessions" on sessions;
create policy "clients select own sessions"
  on sessions for select
  using (auth.uid() = client_id);

drop policy if exists "coaches select all sessions" on sessions;
create policy "coaches select all sessions"
  on sessions for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true))
  );

drop policy if exists "clients insert own sessions" on sessions;
create policy "clients insert own sessions"
  on sessions for insert
  with check (auth.uid() = client_id);

drop policy if exists "coaches insert sessions" on sessions;
create policy "coaches insert sessions"
  on sessions for insert
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true))
  );

-- Clients may only self-service a cancellation (status -> 'cancelled').
-- All other fields on a client-initiated update are protected below by
-- trg_protect_session_fields. Reschedule/complete/no-show are coach-only.
drop policy if exists "clients cancel own sessions" on sessions;
create policy "clients cancel own sessions"
  on sessions for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id and status = 'cancelled');

drop policy if exists "coaches update all sessions" on sessions;
create policy "coaches update all sessions"
  on sessions for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true))
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and (p.role in ('admin','owner') or p.is_owner = true))
  );

-- No delete policy/grant for anyone — sessions are cancelled via status,
-- never hard-deleted, so ledger/history references never dangle.
grant select, insert, update on sessions to authenticated;

-- Column-level tamper protection: a client's own UPDATE can only ever
-- change `status` to 'cancelled'. Every other field, and every other
-- status transition, is silently reverted for a caller whose role is
-- plain 'client'. Coaches/admin/owner are unaffected.
create or replace function protect_session_fields_on_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_is_owner    boolean;
begin
  select role, is_owner into v_caller_role, v_is_owner from profiles where id = auth.uid();

  if coalesce(v_caller_role,'client') = 'client' and coalesce(v_is_owner,false) is not true then
    NEW.client_id   := OLD.client_id;
    NEW.coach_id    := OLD.coach_id;
    NEW.date        := OLD.date;
    NEW.time        := OLD.time;
    NEW.notes       := OLD.notes;
    NEW.coach_notes := OLD.coach_notes;
    if NEW.status <> 'cancelled' then
      NEW.status := OLD.status;
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_protect_session_fields on sessions;
create trigger trg_protect_session_fields
  before update on sessions
  for each row execute function protect_session_fields_on_client_update();


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 7 — Automatic, exactly-once debit on completion/no-show/late-cancel
-- Trigger-based, so it fires no matter which UI path changes the status.
-- The ledger's unique (source_type, source_id) index — already created in
-- Section 3 — makes a repeat fire for the same session row a no-op.
-- ═════════════════════════════════════════════════════════════════════════
create or replace function debit_session_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger jsonb;
begin
  if NEW.status in ('completed','late_cancel','no_show')
     and (OLD.status is distinct from NEW.status) then
    v_ledger := apply_session_ledger_entry(
      NEW.client_id, -1,
      initcap(replace(NEW.status, '_', ' ')),
      case when NEW.status = 'completed' then 'session_completed' else NEW.status end,
      NEW.id::text,
      null,
      true
    );
    update sessions
    set session_balance_effect = -1
    where id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_debit_session_on_status_change on sessions;
create trigger trg_debit_session_on_status_change
  after update of status on sessions
  for each row execute function debit_session_on_status_change();


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 8 — Column-level tamper protection on client_profiles
-- (unrelated to the sessions fix above, reproduced here because this file
-- is a full replacement, not a patch)
-- ═════════════════════════════════════════════════════════════════════════
create or replace function protect_client_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_is_owner    boolean;
begin
  select role, is_owner into v_caller_role, v_is_owner from profiles where id = auth.uid();

  if coalesce(v_caller_role,'client') = 'client' and coalesce(v_is_owner,false) is not true then
    NEW.sessions_balance     := OLD.sessions_balance;
    NEW.sessions_weekly_max  := OLD.sessions_weekly_max;
    NEW.package_plan         := OLD.package_plan;
    NEW.lifecycle_status     := OLD.lifecycle_status;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_protect_client_profile_fields on client_profiles;
create trigger trg_protect_client_profile_fields
  before update on client_profiles
  for each row execute function protect_client_profile_fields();


-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 9 — Route Stripe purchases through the ledger
-- Supersedes the version already live from 0002_session_purchases.sql.
-- session_purchases itself (the table) is untouched — this only replaces
-- the function body, so existing purchase rows are unaffected.
-- ═════════════════════════════════════════════════════════════════════════
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
  v_inserted boolean := true;
  v_ledger   jsonb;
begin
  if not exists (select 1 from profiles where id = p_client_id) then
    raise exception 'credit_session_purchase: no profile for client_id %', p_client_id;
  end if;

  begin
    insert into session_purchases (
      stripe_event_id, stripe_session_id, client_id,
      package_id, sessions_added, amount_total, currency
    ) values (
      p_stripe_event_id, p_stripe_session_id, p_client_id,
      p_package_id, p_sessions_added, p_amount_total, p_currency
    );
  exception when unique_violation then
    v_inserted := false;
  end;

  if not v_inserted then
    return jsonb_build_object(
      'already_processed', true,
      'new_balance', (select sessions_balance from client_profiles where id = p_client_id)
    );
  end if;

  v_ledger := apply_session_ledger_entry(
    p_client_id, p_sessions_added,
    'Package purchased: ' || p_package_id,
    'purchase', p_stripe_event_id, null, false
  );

  return jsonb_build_object(
    'already_processed', false,
    'new_balance', v_ledger->>'new_balance'
  );
end;
$$;

revoke execute on function credit_session_purchase from public, anon, authenticated;
