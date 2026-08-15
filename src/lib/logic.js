/**
 * src/lib/logic.js
 * -----------------
 * Pure, side-effect-free business logic extracted from App.jsx / db.js /
 * the Postgres RPCs and Stripe webhook, so it can be unit tested without
 * a browser, a database, or a network connection.
 *
 * IMPORTANT: this module is the executable spec for these rules. The
 * Postgres functions in supabase/migrations/0004_client_lifecycle.sql
 * implement the same rules server-side (since JS can't run inside
 * Postgres) and MUST be kept in sync with this file by hand. If you
 * change a rule here, change it there too, and vice versa.
 */

// ── Package → sessions mapping ──────────────────────────────────────────
// Mirrors PACKAGE_CATALOGUE in create-checkout-session/index.ts and
// SESSIONS_BY_PACKAGE in stripe-webhook/index.ts. Single source of truth
// for the client-side STRIPE_PACKAGES array in App.jsx.
export const SESSIONS_BY_PACKAGE = Object.freeze({
  single: 1,
  "4x": 4,
  "8x": 8,
  "12x": 12,
});

export function sessionsForPackage(packageId) {
  return SESSIONS_BY_PACKAGE[packageId] ?? null;
}

// ── Booking date/time formatting ────────────────────────────────────────
/** Build an ISO "YYYY-MM-DD" string from a calendar year/month(0-based)/day. */
export function formatIsoDate(year, monthIndex0, day) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex0) || !Number.isInteger(day)) {
    throw new TypeError("formatIsoDate requires integer year, monthIndex0, day");
  }
  const mm = String(monthIndex0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Parse a "9:00 AM" style label into 24h { hour, minute }. */
export function parseTimeLabel(timeLabel) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeLabel || "").trim());
  if (!m) throw new Error(`parseTimeLabel: unrecognized time format "${timeLabel}"`);
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (hour < 1 || hour > 12) throw new Error(`parseTimeLabel: hour out of 1-12 range in "${timeLabel}"`);
  if (minute < 0 || minute > 59) throw new Error(`parseTimeLabel: minute out of 0-59 range in "${timeLabel}"`);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

/** Combine an ISO date string + a "9:00 AM" label into a real Date. */
export function parseSlotDateTime(isoDate, timeLabel) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const { hour, minute } = parseTimeLabel(timeLabel);
  return new Date(y, m - 1, d, hour, minute, 0);
}

/** Is this date/time slot already in the past relative to `now`? */
export function isSlotInPast(isoDate, timeLabel, now = new Date()) {
  return parseSlotDateTime(isoDate, timeLabel).getTime() <= now.getTime();
}

// ── Weekly booking limit ────────────────────────────────────────────────
/** Monday–Sunday week bounds (as ISO date strings) containing refDate. */
export function computeWeekBounds(refDate) {
  const ref = new Date(refDate);
  const day = ref.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    monday: formatIsoDate(monday.getFullYear(), monday.getMonth(), monday.getDate()),
    sunday: formatIsoDate(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
  };
}

/**
 * Pure decision function mirroring checkBookingEligibility()'s branching
 * (App.jsx) and the equivalent guard implied by apply_session_ledger_entry
 * / the weekly count query. Takes already-fetched numbers rather than
 * doing the DB query itself, so the *decision logic* is unit-testable
 * even though the *data fetch* is not.
 */
export function evaluateBookingEligibility({ balance, weeklyMax, weeklyUsed, plan = "—" }) {
  if (balance <= 0) {
    return {
      blocked: true, type: "no_sessions", reason: "Booking Unavailable",
      detail: "Your current package has no remaining sessions available for scheduling. Please add sessions to your account to continue booking.",
    };
  }
  if (weeklyUsed === null || weeklyUsed === undefined) {
    return {
      blocked: true, type: "check_failed", reason: "Couldn't Verify Availability",
      detail: "We couldn't confirm your weekly booking limit right now. Please try again in a moment.",
    };
  }
  if (weeklyUsed >= weeklyMax) {
    return {
      blocked: true, type: "weekly_limit", reason: "Weekly Limit Reached",
      detail: `Your ${plan} plan includes ${weeklyMax} session${weeklyMax !== 1 ? "s" : ""} per week. You've used all ${weeklyMax} this week. Additional sessions can be scheduled from next week onward.`,
    };
  }
  return { blocked: false, weeklyRemaining: Math.max(0, weeklyMax - weeklyUsed), weeklyUsed, weeklyMax };
}

// ── Session ledger math ──────────────────────────────────────────────────
/**
 * Pure mirror of apply_session_ledger_entry's balance arithmetic
 * (0004_client_lifecycle.sql). Given a starting balance and a proposed
 * delta, returns the new balance and whether it was clamped at zero.
 */
export function computeLedgerBalance(currentBalance, amount, allowNegative = false) {
  const proposed = (currentBalance ?? 0) + amount;
  if (proposed < 0 && !allowNegative) {
    return { newBalance: 0, clamped: true };
  }
  return { newBalance: proposed, clamped: false };
}

/**
 * Idempotency check mirroring the (source_type, source_id) UNIQUE index
 * on session_ledger. `seenEvents` models the set of (source_type,source_id)
 * pairs already present in the table.
 */
export function isDuplicateLedgerEvent(seenEvents, sourceType, sourceId) {
  if (sourceId === null || sourceId === undefined) return false; // NULLs are never "duplicates" (Postgres semantics)
  return seenEvents.has(`${sourceType}:${sourceId}`);
}

// ── Low-balance notification dedupe ─────────────────────────────────────
/**
 * Pure mirror of the low-balance-notification branch in
 * apply_session_ledger_entry. Given the client's current notified-flags
 * and the new balance, decides whether a NEW notification should fire,
 * and what the updated flags should be.
 */
export function evaluateLowBalanceNotification({ newBalance, notified2At, notified1At }) {
  let nextNotified2At = notified2At ?? null;
  let nextNotified1At = notified1At ?? null;
  let fire = null;

  if (newBalance > 3) {
    // Reset — a future drop back to 2/1 should notify again.
    nextNotified2At = null;
    nextNotified1At = null;
  } else if (newBalance === 2 && !notified2At) {
    nextNotified2At = "NOW";
    fire = "2_remaining";
  } else if (newBalance === 1 && !notified1At) {
    nextNotified1At = "NOW";
    fire = "1_remaining";
  }

  return { fire, notified2At: nextNotified2At, notified1At: nextNotified1At };
}

// ── Lead → client identity matching ─────────────────────────────────────
/** Case-insensitive, whitespace-trimmed email match — the only identity key used for lead linking. */
export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export function emailsMatch(a, b) {
  return normalizeEmail(a) === normalizeEmail(b) && normalizeEmail(a) !== "";
}

/**
 * Pure mirror of link_person_on_profile_create()'s matching rule: given a
 * list of existing (unclaimed) consultation requests and a newly created
 * profile's email, return which requests should be claimed by that
 * profile. Does not mutate anything — caller applies the result.
 */
export function findConsultationsToClaim(consultationRequests, newProfileEmail) {
  const target = normalizeEmail(newProfileEmail);
  if (!target) return [];
  return consultationRequests.filter(
    r => r.claimed_by_id == null && normalizeEmail(r.email) === target
  );
}

// ── Duplicate-submit guards (weight log, booking, consultation) ─────────
/**
 * Models the `submittingRef` pattern used in Booking/ConsultationFlow/
 * weight-log: a simple non-reentrant lock. Returns whether this call
 * should proceed, and the next lock state.
 */
export function shouldAllowSubmit(isLocked) {
  return { allow: !isLocked, nextLocked: true };
}
