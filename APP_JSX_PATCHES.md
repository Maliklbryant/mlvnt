# App.jsx — Complete Patch Set (Phase 1 + Phase B)

This is delivered as a patch set, not a full re-paste of App.jsx, because the
file is ~6,000 lines and only these regions changed — pasting the whole file
would bury the real changes in thousands of unchanged lines. Every hunk below
is the COMPLETE code for that region (nothing abbreviated inside a hunk).
Each is anchored with exact, unique text from your original file so you can
locate it with your editor's find function.

Apply in order. After all patches, run the verification block at the bottom.

---

## Patch 1 — `Booking` component signature

**Find:**
```jsx
function Booking({ setView, profileData, onBack }) {
```

**Replace with:**
```jsx
function Booking({ setView, profileData, session, onBack }) {
```

---

## Patch 2 — Top-level `checkBookingEligibility` / `getInventoryWarning`

**Find** the two function definitions starting with:
```jsx
function checkBookingEligibility(profileData) {
```
...through the end of...
```jsx
function getInventoryWarning(profileData) {
  const bal = profileData?.sessions_balance    ?? 0;
  const wm  = profileData?.sessions_weekly_max ?? 2;
  const plan= profileData?.package_plan        || "—";
  const wu  = 0; // weekly_used not yet in client_profiles

  if (bal === 0) return { level:"critical", msg:"No sessions available. Add sessions to your account to book." };
  if (bal === 1) return { level:"critical", msg:"You have 1 session remaining in your account." };
  if (wu >= wm)  return { level:"low",      msg:`Weekly limit reached (${wm}/${wm} used). You can book again from next week.` };
  if (bal <= 3)  return { level:"low",      msg:`${bal} sessions in your account. Consider topping up soon.` };
  return null;
}
```

**Replace the entire block with:**
```jsx
async function checkBookingEligibility(clientId, profileData) {
  const balance   = profileData?.sessions_balance    ?? 0;
  const weeklyMax = profileData?.sessions_weekly_max ?? 2;
  const plan      = profileData?.package_plan        || "—";

  if (balance <= 0) {
    return {
      blocked: true,
      type:    "no_sessions",
      reason:  "Booking Unavailable",
      detail:  "Your current package has no remaining sessions available for scheduling. Please add sessions to your account to continue booking.",
    };
  }

  const weeklyUsed = await getWeeklySessionCount(clientId);
  if (weeklyUsed === null) {
    // Fail CLOSED — if we can't verify the weekly limit, don't let a
    // booking through unchecked.
    return {
      blocked: true,
      type:    "check_failed",
      reason:  "Couldn't Verify Availability",
      detail:  "We couldn't confirm your weekly booking limit right now. Please try again in a moment.",
    };
  }

  if (weeklyUsed >= weeklyMax) {
    return {
      blocked: true,
      type:    "weekly_limit",
      reason:  "Weekly Limit Reached",
      detail:  `Your ${plan} plan includes ${weeklyMax} session${weeklyMax!==1?"s":""} per week. You've used all ${weeklyMax} this week. Additional sessions can be scheduled from next week onward.`,
    };
  }

  const weeklyRemaining = Math.max(0, weeklyMax - weeklyUsed);
  return { blocked: false, weeklyRemaining, weeklyUsed, weeklyMax };
}

async function getInventoryWarning(clientId, profileData) {
  const bal = profileData?.sessions_balance    ?? 0;
  const wm  = profileData?.sessions_weekly_max ?? 2;
  const plan= profileData?.package_plan        || "—";

  if (bal === 0) return { level:"critical", msg:"No sessions available. Add sessions to your account to book." };
  if (bal === 1) return { level:"critical", msg:"You have 1 session remaining in your account." };

  const wu = await getWeeklySessionCount(clientId);
  if (wu !== null && wu >= wm) return { level:"low", msg:`Weekly limit reached (${wm}/${wm} used). You can book again from next week.` };
  if (bal <= 3)  return { level:"low", msg:`${bal} sessions in your account. Consider topping up soon.` };
  return null;
}
```

**Also add**, right after these two functions (new code, no anchor needed — just place it here):
```jsx
async function isSlotTakenCheck(coachId, isoDate, timeLabel) {
  return isSlotTaken(coachId, isoDate, timeLabel);
}

function parseSlotDateTimeLocal(isoDate, timeLabel) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [timePart, ampm] = timeLabel.split(" ");
  let [h, min] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return new Date(y, m - 1, d, h, min, 0);
}
```
And add this import at the top of App.jsx, in the existing `import { ... } from "./lib/db.js"` block:
```jsx
  getWeeklySessionCount,
  isSlotTaken,
  createCheckoutSession,
  adjustSessionBalance,
```

---

## Patch 3 — Inside `Booking`: eligibility/warning state + effect

**Find:**
```jsx
  // ── Inventory gate — reads from real Supabase profileData ────────────────
  const eligibility = checkBookingEligibility(profileData);
  const warning     = getInventoryWarning(profileData);
```

**Replace with:**
```jsx
  // ── Inventory gate — reads from real Supabase profileData, verified
  // ── against a live DB query (weekly booking count) on each mount/change.
  const [eligibility, setEligibility] = useState({ blocked: true, type: "checking", reason: "Checking availability…", detail: "" });
  const [warning, setWarning] = useState(null);
  const [eligLoading, setEligLoading] = useState(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setEligLoading(true);
    Promise.all([
      checkBookingEligibility(session?.id, profileData),
      getInventoryWarning(session?.id, profileData),
    ]).then(([elig, warn]) => {
      if (!alive) return;
      setEligibility(elig);
      setWarning(warn);
      setEligLoading(false);
    });
    return () => { alive = false; };
  }, [session?.id, profileData?.sessions_balance, profileData?.sessions_weekly_max]);
```

---

## Patch 4 — `confirmBook` (the core Phase 1 fix)

**Find** the entire existing function:
```jsx
  const confirmBook = async () => {
    if (!c1 || !c2) return;
    const gate = checkBookingEligibility(profileData);
    if (gate.blocked) {
      setBookErr(gate.reason || "Booking not available.");
      return;
    }
    setLoad(true); setBookErr("");
    const coachId = await getCoachId().catch(() => null);
    const result = await createSession({
      clientId: session?.id,
      coachId,
      date: `${yr}-${String(now.getMonth()+1).padStart(2,'0')}-${String(c1).padStart(2,'0')}`,
      time: c2,
      notes: "",
    });
    setLoad(false);
    if (!result.ok) {
      setBookErr(result.error || "Booking failed. Please try again.");
      return;
    }
    // Notify coach of new booking
    if (coachId) {
      createNotification({
        recipientId: coachId,
        type: "session_booked",
        title: "Session booked",
        body: `${session?.name || "A client"} booked a session.`,
        relatedId: result.session?.id || null,
      }).catch(() => {});
    }
    setBooked(true);
  };
```

**Replace with:**
```jsx
  const confirmBook = async () => {
    if (!c1 || !c2) return;
    if (!selDate || !selTime) { setBookErr("Please select a date and time."); return; }
    if (submittingRef.current) return; // duplicate-submit guard (double-tap / double-click)
    submittingRef.current = true;
    setLoad(true); setBookErr("");

    if (!session?.id) {
      setBookErr("Your session has expired. Please sign in again.");
      setLoad(false); submittingRef.current = false;
      return;
    }

    // Re-validate against the live DB right before writing — the eligibility
    // shown on screen may be stale if time has passed since it loaded.
    const freshGate = await checkBookingEligibility(session.id, profileData);
    if (freshGate.blocked) {
      setBookErr(freshGate.reason || "Booking not available.");
      setLoad(false); submittingRef.current = false;
      return;
    }

    const isoDate = `${yr}-${String(now.getMonth()+1).padStart(2,'0')}-${String(selDate).padStart(2,'0')}`;

    if (parseSlotDateTimeLocal(isoDate, selTime).getTime() <= Date.now()) {
      setBookErr("That time has already passed. Please choose a future time.");
      setLoad(false); submittingRef.current = false;
      return;
    }

    const coachId = await getCoachId().catch(() => null);
    if (!coachId) {
      setBookErr("Could not reach your coach's account. Please try again or message support.");
      setLoad(false); submittingRef.current = false;
      return;
    }

    // Last-instant collision check — the calendar grid may be a few
    // seconds stale (another client could have just booked this slot).
    const taken = await isSlotTakenCheck(coachId, isoDate, selTime);
    if (taken === null) {
      setBookErr("Couldn't confirm slot availability. Please try again.");
      setLoad(false); submittingRef.current = false;
      return;
    }
    if (taken) {
      setBookErr("That time was just booked by someone else. Please choose another slot.");
      setLoad(false); submittingRef.current = false;
      loadAvailability();
      return;
    }

    const result = await createSession({
      clientId: session.id,
      coachId,
      date: isoDate,
      time: selTime,
      notes: "",
    });

    setLoad(false);
    submittingRef.current = false;

    if (!result.ok) {
      setBookErr(result.error || "Booking failed. Please try again.");
      return;
    }

    createNotification({
      recipientId: coachId,
      type: "session_booked",
      title: "Session booked",
      body: `${session?.name || "A client"} booked a session for ${isoDate} at ${selTime}.`,
      relatedId: result.session?.id || null,
    }).catch(() => {});

    setBooked(true);
  };
```

---

## Patch 5 — Confirm Booking button: real `disabled`

**Find:**
```jsx
                    <button
                      className={`btn btn-full mt-16${c1&&c2?" btn-p":" btn-s"}${loading?" btn-loading":""}`}
                      style={{opacity:c1&&c2?1:0.45}}
                      onClick={confirmBook}
                    >
                      {loading ? <><Spinner />Booking…</> : "Confirm Booking"}
                    </button>
```

**Replace with:**
```jsx
                    <button
                      className={`btn btn-full mt-16${c1&&c2?" btn-p":" btn-s"}${loading?" btn-loading":""}`}
                      style={{opacity:c1&&c2?1:0.45}}
                      disabled={!c1||!c2||loading||eligLoading}
                      onClick={confirmBook}
                    >
                      {loading ? <><Spinner />Booking…</> : "Confirm Booking"}
                    </button>
```

---

## Patch 6 — `AppShell` views map: pass `session` into `Booking`

**Find:**
```jsx
    book:           <Booking setView={navigate} profileData={profileData} onBack={goBack} />,
```

**Replace with:**
```jsx
    book:           <Booking setView={navigate} profileData={profileData} session={session} onBack={goBack} />,
```

---

## Patch 7 — Weight-log debounce (dead-code fix)

**Find:**
```jsx
    if (savingRef.current) return;  // debounce: already saving    savingRef.current = true;
    setSavingWeight(true); setWeightErr("");
```

**Replace with:**
```jsx
    if (savingRef.current) return;  // debounce: already saving
    savingRef.current = true;
    setSavingWeight(true); setWeightErr("");
```

---

## Patch 8 — Consultation booking: duplicate-submit guard

**Find**, inside `ConsultationFlow`:
```jsx
  const [submitErr, setSubmitErr] = useState("");

  const submit = async () => {
    setSaving(true);
    setSubmitErr("");
```

**Replace with:**
```jsx
  const [submitErr, setSubmitErr] = useState("");
  const submittingRef = useRef(false);

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setSubmitErr("");
```

**Then find**, later in the same function, both early-return paths after a
failed save/network error (there is one after the past-time re-validation
and one after `saveConsultationRequest`):
```jsx
    if (!result.ok) {
      setSubmitErr(result.error || "Failed to submit. Please try again.");
      setSaving(false);
      return;
    }
```

**Replace with:**
```jsx
    if (!result.ok) {
      setSubmitErr(result.error || "Failed to submit. Please try again.");
      setSaving(false);
      submittingRef.current = false; // allow retry after a real failure
      return;
    }
```

**Find** the Continue/Confirm button in the same component:
```jsx
              <button
                className={`btn btn-p btn-full${saving?" btn-loading":""}`}
                disabled={!canNext[step] || saving}
```
This line is unchanged (it already has `disabled` correctly wired) — no
edit needed here; confirming it stays as-is.

---

## Patch 9 — Stripe purchase call sites: replace static Payment Links

**Add this helper** once, near the top of App.jsx (after the `STRIPE_PACKAGES`
constant definition):
```jsx
async function startCheckout(packageId, onError) {
  const result = await createCheckoutSession(packageId);
  if (!result.ok) {
    if (onError) onError(result.error || "Could not start checkout. Please try again, or contact your coach.");
    else alert(result.error || "Could not start checkout. Please try again, or contact your coach.");
    return;
  }
  window.open(result.url, "_blank", "noopener,noreferrer");
}
```

**In `PackagePricing`, find:**
```jsx
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
```
...and every call site that does `open(pkg.stripeUrl)` — **replace each with**
`startCheckout(pkg.id)`.

**In `SessionAlert`'s renewal modal, find:**
```jsx
                  <button className="btn btn-p btn-full btn-sm" onClick={()=>{
                    const opt=RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1];
                    window.open(opt.stripeUrl,"_blank","noopener,noreferrer");
                    setShowRenew(false); setRenewStep(0);
                  }}>Get Started — {(RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1]).name}</button>
```
**Replace with:**
```jsx
                  <button className="btn btn-p btn-full btn-sm" onClick={()=>{
                    const opt=RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1];
                    startCheckout(opt.id);
                    setShowRenew(false); setRenewStep(0);
                  }}>Get Started — {(RENEW_OPTIONS.find(o=>o.name===selPlan)||RENEW_OPTIONS[1]).name}</button>
```
(Note: `RENEW_OPTIONS` is built from `STRIPE_PACKAGES`, which already has an
`id` field on each entry — no data-shape change needed.)

**In `Booking`'s inv-lock block, find:**
```jsx
                <button className="btn btn-p btn-sm"
                  onClick={()=>window.open(STRIPE_PACKAGES[1].stripeUrl,"_blank","noopener,noreferrer")}>
                  Add Sessions
                </button>
```
**Replace with:**
```jsx
                <button className="btn btn-p btn-sm"
                  onClick={()=>startCheckout(STRIPE_PACKAGES[1].id, setBookErr)}>
                  Add Sessions
                </button>
```

**In `ConsultationRecommendation`, find:**
```jsx
          <button
            className="btn btn-p btn-full"
            onClick={() => open(selected.stripeUrl)}
          >
            Get Started — {selected.name}
          </button>
```
**Replace with:**
```jsx
          <button
            className="btn btn-p btn-full"
            onClick={() => startCheckout(selected.id)}
          >
            Get Started — {selected.name}
          </button>
```

**In `PublicSite`'s plans section, find:**
```jsx
                <button
                  className="btn btn-p btn-full btn-sm"
                  onClick={()=>open(pkg.stripeUrl)}
                >
                  Get Started
                </button>
```
**Replace with:**
```jsx
                <button
                  className="btn btn-p btn-full btn-sm"
                  onClick={()=>{
                    // Public site visitors aren't authenticated yet — route
                    // them to sign up first, then to checkout, rather than
                    // failing silently on "you must be signed in".
                    if (!onLogin) return;
                    onLogin();
                  }}
                >
                  Get Started
                </button>
```
This one is intentionally different: `PublicSite` is shown to visitors who
are not signed in, and `createCheckoutSession` requires an authenticated
session (this is the deliberate identity-integrity decision from Phase 1 —
see `create-checkout-session/index.ts`'s header comment). Routing to
sign-up here, rather than attempting a checkout that will always fail for
this audience, avoids a dead-end error for every visitor who clicks this
button before creating an account.

---

## Patch 10 — `AdminPackages`: route balance edits through the ledger

**Add this import** to the `./lib/db.js` import block:
```jsx
  adjustSessionBalance,
```

**Find** the `applyAdj` function:
```jsx
  const applyAdj = async (clientId, sign) => {
    const n = parseInt(adjAmt[clientId] || "0");
    if (!n || isNaN(n)) return;
    const delta = sign * n;
    const newBal = Math.max(0, (clientInv[clientId]?.balance ?? 0) + delta);
    setClientInv(p => ({
      ...p,
      [clientId]: { ...p[clientId], balance: newBal }
    }));
    const result = await saveClientProfile(clientId, { sessions_balance: newBal })
      .catch(() => ({ ok: false, error: "Network error" }));
    if (result.ok) {
```
**...through the end of that function, replace the ENTIRE function with:**
```jsx
  const applyAdj = async (clientId, sign) => {
    const n = parseInt(adjAmt[clientId] || "0");
    if (!n || isNaN(n)) return;
    const delta = sign * n;
    const reason = adjNote[clientId]?.trim() || (sign > 0 ? "Coach adjustment (add)" : "Coach adjustment (remove)");

    const result = await adjustSessionBalance(clientId, delta, reason);
    if (!result.ok) {
      console.error("applyAdj:", result.error);
      alert(result.error || "Could not adjust session balance. Please try again.");
      return;
    }

    setClientInv(p => ({ ...p, [clientId]: { ...p[clientId], balance: result.newBalance } }));
    if (result.clamped) {
      alert("Balance couldn't go below 0 — it was set to 0 instead of going negative.");
    }
    setSaved(p => ({ ...p, [clientId]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [clientId]: false })), 2000);
    setAdjAmt(p => ({ ...p, [clientId]: "" }));
    setAdjNote(p => ({ ...p, [clientId]: "" }));

    // Low-session notifications: no longer fire from here — the
    // admin_adjust_session_balance RPC's underlying
    // apply_session_ledger_entry function (0004_client_lifecycle.sql)
    // handles the 2-remaining/1-remaining notification with proper
    // dedupe. Any client-side notification logic that used to live in
    // this function should be deleted if present.
  };
```

**Find** the "Quick Add" buttons:
```jsx
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {Object.entries(PLAN_CATALOGUE).map(([name,cfg])=>(
                            <button key={name} className="btn btn-s btn-xs"
                              onClick={()=>{
                                const newBal = (clientInv[c.id]?.balance ?? 0) + cfg.sessionsPerPurchase;
                                setClientInv(p=>({...p,[c.id]:{...p[c.id],balance:newBal}}));
                                saveClientProfile(c.id, { sessions_balance: newBal }).catch(e=>console.error("quickAdd:",e));
                                setSaved(p=>({...p,[c.id]:true}));
                                setTimeout(()=>setSaved(p=>({...p,[c.id]:false})),2000);
                              }}>
                              +{cfg.sessionsPerPurchase} ({name.split(" ")[0]})
                            </button>
                          ))}
                        </div>
```
**Replace with:**
```jsx
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {Object.entries(PLAN_CATALOGUE).map(([name,cfg])=>(
                            <button key={name} className="btn btn-s btn-xs"
                              onClick={async ()=>{
                                const result = await adjustSessionBalance(c.id, cfg.sessionsPerPurchase, `Quick add: ${name}`);
                                if (!result.ok) {
                                  alert(result.error || "Could not add sessions. Please try again.");
                                  return;
                                }
                                setClientInv(p=>({...p,[c.id]:{...p[c.id],balance:result.newBalance}}));
                                setSaved(p=>({...p,[c.id]:true}));
                                setTimeout(()=>setSaved(p=>({...p,[c.id]:false})),2000);
                              }}>
                              +{cfg.sessionsPerPurchase} ({name.split(" ")[0]})
                            </button>
                          ))}
                        </div>
```

---

## Verification after applying all 10 patches

```bash
npm install
npm run build
```
Also grep for anything now-orphaned:
```bash
grep -n "stripeUrl" src/App.jsx   # should only appear in the STRIPE_PACKAGES data definition itself, never in an onClick
grep -n "window.open.*stripeUrl" src/App.jsx   # should return NOTHING
```
