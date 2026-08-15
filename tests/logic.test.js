import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSIONS_BY_PACKAGE, sessionsForPackage,
  formatIsoDate, parseTimeLabel, parseSlotDateTime, isSlotInPast,
  computeWeekBounds, evaluateBookingEligibility,
  computeLedgerBalance, isDuplicateLedgerEvent,
  evaluateLowBalanceNotification,
  normalizeEmail, emailsMatch, findConsultationsToClaim,
  shouldAllowSubmit,
} from "../src/lib/logic.js";

// ── Package-to-session mapping ──────────────────────────────────────────
test("sessionsForPackage: maps every known package id correctly", () => {
  assert.equal(sessionsForPackage("single"), 1);
  assert.equal(sessionsForPackage("4x"), 4);
  assert.equal(sessionsForPackage("8x"), 8);
  assert.equal(sessionsForPackage("12x"), 12);
});

test("sessionsForPackage: unknown package id returns null, not a guess", () => {
  assert.equal(sessionsForPackage("bogus"), null);
  assert.equal(sessionsForPackage(""), null);
  assert.equal(sessionsForPackage(undefined), null);
});

test("SESSIONS_BY_PACKAGE is frozen (cannot be silently mutated at runtime)", () => {
  assert.throws(() => { SESSIONS_BY_PACKAGE.single = 999; }, /read only|frozen|Cannot assign/i);
});

// ── Booking date/time formatting ────────────────────────────────────────
test("formatIsoDate: pads month and day correctly", () => {
  assert.equal(formatIsoDate(2026, 0, 5), "2026-01-05");   // January (0-indexed) 5th
  assert.equal(formatIsoDate(2026, 11, 25), "2026-12-25"); // December 25th
});

test("formatIsoDate: rejects non-integer input instead of producing garbage", () => {
  assert.throws(() => formatIsoDate(2026, 0, "5"));
  assert.throws(() => formatIsoDate("2026", 0, 5));
});

test("parseTimeLabel: converts 12h labels to 24h correctly, including noon/midnight edge cases", () => {
  assert.deepEqual(parseTimeLabel("9:00 AM"), { hour: 9, minute: 0 });
  assert.deepEqual(parseTimeLabel("12:00 PM"), { hour: 12, minute: 0 }); // noon
  assert.deepEqual(parseTimeLabel("12:00 AM"), { hour: 0, minute: 0 });  // midnight
  assert.deepEqual(parseTimeLabel("6:30 PM"), { hour: 18, minute: 30 });
});

test("parseTimeLabel: rejects malformed input (this is what the old c1/c2 bug should have caught)", () => {
  assert.throws(() => parseTimeLabel("true"));
  assert.throws(() => parseTimeLabel(""));
  assert.throws(() => parseTimeLabel("25:00 AM"));
});

test("parseSlotDateTime + isSlotInPast: correctly flags a past slot", () => {
  const past = parseSlotDateTime("2020-01-01", "9:00 AM");
  assert.equal(past.getFullYear(), 2020);
  assert.equal(isSlotInPast("2020-01-01", "9:00 AM", new Date("2026-01-01")), true);
});

test("isSlotInPast: correctly allows a future slot", () => {
  assert.equal(isSlotInPast("2099-01-01", "9:00 AM", new Date("2026-01-01")), false);
});

// ── Weekly booking limit ─────────────────────────────────────────────────
test("computeWeekBounds: a Wednesday resolves to the correct Mon–Sun window", () => {
  // 2026-08-05 is a Wednesday
  const { monday, sunday } = computeWeekBounds(new Date(2026, 7, 5));
  assert.equal(monday, "2026-08-03");
  assert.equal(sunday, "2026-08-09");
});

test("computeWeekBounds: a Sunday correctly resolves to the PRECEDING Monday, not the next one", () => {
  // 2026-08-09 is a Sunday
  const { monday, sunday } = computeWeekBounds(new Date(2026, 7, 9));
  assert.equal(monday, "2026-08-03");
  assert.equal(sunday, "2026-08-09");
});

test("evaluateBookingEligibility: zero balance blocks regardless of weekly usage", () => {
  const r = evaluateBookingEligibility({ balance: 0, weeklyMax: 3, weeklyUsed: 0 });
  assert.equal(r.blocked, true);
  assert.equal(r.type, "no_sessions");
});

test("evaluateBookingEligibility: failed weekly-count check fails CLOSED, not open", () => {
  const r = evaluateBookingEligibility({ balance: 5, weeklyMax: 2, weeklyUsed: null });
  assert.equal(r.blocked, true);
  assert.equal(r.type, "check_failed");
});

test("evaluateBookingEligibility: at the weekly cap, booking is blocked", () => {
  const r = evaluateBookingEligibility({ balance: 5, weeklyMax: 2, weeklyUsed: 2 });
  assert.equal(r.blocked, true);
  assert.equal(r.type, "weekly_limit");
});

test("evaluateBookingEligibility: under the weekly cap, booking is allowed with correct remaining count", () => {
  const r = evaluateBookingEligibility({ balance: 5, weeklyMax: 3, weeklyUsed: 1 });
  assert.equal(r.blocked, false);
  assert.equal(r.weeklyRemaining, 2);
});

// ── Session ledger balance math ──────────────────────────────────────────
test("computeLedgerBalance: simple credit", () => {
  assert.deepEqual(computeLedgerBalance(3, 8), { newBalance: 11, clamped: false });
});

test("computeLedgerBalance: debit that would go negative clamps to 0 by default", () => {
  assert.deepEqual(computeLedgerBalance(0, -1), { newBalance: 0, clamped: true });
});

test("computeLedgerBalance: debit allowed to go negative when explicitly permitted", () => {
  assert.deepEqual(computeLedgerBalance(0, -1, true), { newBalance: -1, clamped: false });
});

test("computeLedgerBalance: debit that stays non-negative is not clamped", () => {
  assert.deepEqual(computeLedgerBalance(5, -2), { newBalance: 3, clamped: false });
});

test("isDuplicateLedgerEvent: a Stripe event id seen before IS a duplicate", () => {
  const seen = new Set(["purchase:evt_123"]);
  assert.equal(isDuplicateLedgerEvent(seen, "purchase", "evt_123"), true);
});

test("isDuplicateLedgerEvent: an unseen event id is NOT a duplicate", () => {
  const seen = new Set(["purchase:evt_123"]);
  assert.equal(isDuplicateLedgerEvent(seen, "purchase", "evt_999"), false);
});

test("isDuplicateLedgerEvent: null source_id is never treated as a duplicate (matches Postgres NULL semantics)", () => {
  const seen = new Set(["coach_adjustment:null"]); // even if literally stored this way elsewhere
  assert.equal(isDuplicateLedgerEvent(seen, "coach_adjustment", null), false);
  assert.equal(isDuplicateLedgerEvent(seen, "coach_adjustment", undefined), false);
});

test("simulated webhook replay: crediting the same Stripe event twice only applies once", () => {
  let balance = 0;
  const seen = new Set();
  function processWebhook(eventId, sessionsToAdd) {
    if (isDuplicateLedgerEvent(seen, "purchase", eventId)) {
      return { alreadyProcessed: true, balance };
    }
    seen.add(`purchase:${eventId}`);
    const { newBalance } = computeLedgerBalance(balance, sessionsToAdd);
    balance = newBalance;
    return { alreadyProcessed: false, balance };
  }
  const first  = processWebhook("evt_abc", 8);
  const replay = processWebhook("evt_abc", 8); // Stripe retries the same event
  assert.equal(first.alreadyProcessed, false);
  assert.equal(first.balance, 8);
  assert.equal(replay.alreadyProcessed, true);
  assert.equal(replay.balance, 8); // NOT 16 — this is the exact bug class being guarded against
});

// ── Low-session notification dedupe ──────────────────────────────────────
test("evaluateLowBalanceNotification: first drop to 2 fires exactly one notification", () => {
  const r = evaluateLowBalanceNotification({ newBalance: 2, notified2At: null, notified1At: null });
  assert.equal(r.fire, "2_remaining");
  assert.equal(r.notified2At, "NOW");
});

test("evaluateLowBalanceNotification: staying at 2 (re-evaluated again) does NOT fire a second time", () => {
  const r = evaluateLowBalanceNotification({ newBalance: 2, notified2At: "2026-08-01T00:00:00Z", notified1At: null });
  assert.equal(r.fire, null);
});

test("evaluateLowBalanceNotification: dropping from 2 to 1 fires the 1-remaining notification", () => {
  const r = evaluateLowBalanceNotification({ newBalance: 1, notified2At: "2026-08-01T00:00:00Z", notified1At: null });
  assert.equal(r.fire, "1_remaining");
});

test("evaluateLowBalanceNotification: renewal above 3 resets both flags so a future drop notifies again", () => {
  const r = evaluateLowBalanceNotification({ newBalance: 8, notified2At: "2026-08-01T00:00:00Z", notified1At: "2026-08-02T00:00:00Z" });
  assert.equal(r.fire, null);
  assert.equal(r.notified2At, null);
  assert.equal(r.notified1At, null);
});

test("evaluateLowBalanceNotification: full lifecycle — 3 remains silent, 2 fires, 2 again stays silent, 1 fires, renewal resets, 2 fires again", () => {
  let state = { notified2At: null, notified1At: null };
  const fires = [];
  for (const balance of [3, 2, 2, 1, 8, 2]) {
    const r = evaluateLowBalanceNotification({ newBalance: balance, ...state });
    if (r.fire) fires.push(r.fire);
    state = { notified2At: r.notified2At, notified1At: r.notified1At };
  }
  assert.deepEqual(fires, ["2_remaining", "1_remaining", "2_remaining"]);
});

// ── Lead → client identity matching ──────────────────────────────────────
test("emailsMatch: case-insensitive and whitespace-tolerant", () => {
  assert.equal(emailsMatch("Jordan@Email.com", "jordan@email.com "), true);
  assert.equal(emailsMatch(" jordan@email.com", "jordan@email.com"), true);
});

test("emailsMatch: different people never match", () => {
  assert.equal(emailsMatch("jordan@email.com", "taylor@email.com"), false);
});

test("emailsMatch: two empty/missing emails do not falsely match each other", () => {
  assert.equal(emailsMatch("", ""), false);
  assert.equal(emailsMatch(null, null), false);
  assert.equal(emailsMatch(undefined, ""), false);
});

test("findConsultationsToClaim: matches only unclaimed requests for the same (normalized) email", () => {
  const requests = [
    { id: "c1", email: "Jordan@Email.com", claimed_by_id: null },
    { id: "c2", email: "jordan@email.com", claimed_by_id: "already-claimed-uuid" }, // already linked — must be skipped
    { id: "c3", email: "someone-else@email.com", claimed_by_id: null },
  ];
  const claimed = findConsultationsToClaim(requests, "jordan@email.com");
  assert.deepEqual(claimed.map(r => r.id), ["c1"]);
});

test("findConsultationsToClaim: no matches returns an empty array, never throws", () => {
  assert.deepEqual(findConsultationsToClaim([], "nobody@email.com"), []);
  assert.deepEqual(findConsultationsToClaim([{ email: "a@b.com", claimed_by_id: null }], ""), []);
});

// ── Duplicate-submit guard (booking / consultation / weight log) ─────────
test("shouldAllowSubmit: first call is allowed and locks", () => {
  const r = shouldAllowSubmit(false);
  assert.equal(r.allow, true);
  assert.equal(r.nextLocked, true);
});

test("shouldAllowSubmit: a call while already locked is rejected (this is the double-tap guard)", () => {
  const r = shouldAllowSubmit(true);
  assert.equal(r.allow, false);
});

test("simulated double-click: two near-simultaneous submits only let one through", () => {
  let locked = false;
  let submitCount = 0;
  function attemptSubmit() {
    const { allow, nextLocked } = shouldAllowSubmit(locked);
    if (!allow) return false;
    locked = nextLocked;
    submitCount++;
    return true;
  }
  const firstClick  = attemptSubmit();
  const secondClick = attemptSubmit(); // fired before the first "request" resolved and reset the lock
  assert.equal(firstClick, true);
  assert.equal(secondClick, false);
  assert.equal(submitCount, 1);
});
