-- 0003_consultation_dedupe.sql
-- Phase 1: prevent duplicate consultation submissions at the DB level.
--
-- The client-side fix (submittingRef guard + disabled button) stops the
-- common case — a double-tap or slow-network double-click. This index is
-- the defense-in-depth backstop for anything that gets past the UI guard
-- (two tabs open, a retried network request, etc.): the same email cannot
-- book the exact same date+time slot twice. It intentionally does NOT
-- block the same person booking a different slot later.
create unique index if not exists uq_consultation_email_slot
  on consultation_requests (lower(email), requested_date, requested_time)
  where status <> 'cancelled';

-- NOTE: this makes a duplicate INSERT raise a unique_violation (Postgres
-- error code 23505) rather than silently creating a second row. The RPC
-- `submit_consultation_request` and the client's saveConsultationRequest()
-- (src/lib/db.js) both need to treat 23505 as "you already booked this
-- slot" rather than a generic failure — see the db.js patch in the same
-- change set.
