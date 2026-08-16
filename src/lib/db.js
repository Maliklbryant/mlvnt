/**
 * MLVNT Data Layer (db.js)
 * ------------------------
 * All Supabase database operations live here.
 * App.jsx imports from this file — no supabase calls scattered elsewhere.
 *
 * PHASE 1 + PHASE B CHANGES IN THIS FILE (search these markers):
 *   [PHASE1] getWeeklySessionCount, isSlotTaken — real DB-backed booking checks
 *   [PHASE1] createCheckoutSession, getSessionPurchases — Stripe dynamic checkout
 *   [PHASE1] saveConsultationRequest — friendly duplicate-slot error (23505)
 *   [PHASE1] sendConsultationEmails — admin alert on email-send failure
 *   [PHASEB] adjustSessionBalance, getSessionLedger — all balance writes go through the ledger RPC
 */

import { supabase } from "./supabase.js";

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

export async function getClientProfile(userId) {
  const { data, error } = await supabase
    .from("client_profiles").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") console.error("getClientProfile:", error.message);
  return data || null;
}

export async function saveClientProfile(userId, fields) {
  const payload = { id: userId, ...fields, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("client_profiles").upsert(payload, { onConflict: "id" });
  if (error) { console.error("saveClientProfile:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function saveProfileName(userId, name) {
  const trimmed = name.trim();
  const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", userId);
  if (error) { console.error("saveProfileName:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, name: trimmed };
}

// ─────────────────────────────────────────────────────────────
// ADMIN: CLIENTS
// ─────────────────────────────────────────────────────────────

export async function listClients() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, email, name, role, created_at,
      client_profiles (
        phone, height, weight,
        location_building, location_address, location_area, location_notes,
        emergency_contact, birthday, goals, fitness_level, injuries,
        package_plan, sessions_balance, sessions_weekly_max, lifecycle_status
      )`)
    .eq("role", "client")
    .order("created_at", { ascending: false });
  if (error) { console.error("listClients:", error.message); return []; }
  return data || [];
}

export async function getClientById(clientId) {
  const { data, error } = await supabase
    .from("profiles").select(`id, email, name, role, created_at, client_profiles (*)`).eq("id", clientId).single();
  if (error) { console.error("getClientById:", error.message); return null; }
  return data;
}

// ─────────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────────

export async function getPrograms(clientId) {
  const { data, error } = await supabase
    .from("programs").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) { console.error("getPrograms:", error.message); return []; }
  return data || [];
}

export async function getActiveProgram(clientId) {
  const { data, error } = await supabase
    .from("programs").select("*").eq("client_id", clientId).eq("status", "active").maybeSingle();
  if (error) { console.error("getActiveProgram:", error.message); return null; }
  return data;
}

export async function getAllPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("getAllPrograms join failed, falling back:", error.message);
    const { data: fallback, error: fbErr } = await supabase
      .from("programs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (fbErr) { console.error("getAllPrograms fallback:", fbErr.message); return []; }
    return fallback || [];
  }
  return data || [];
}

export async function createProgram(clientId, coachId, overrides = {}) {
  const isTemplate = !clientId;
  const program = {
    client_id:   clientId || null,
    coach_id:    coachId  || null,
    is_template: isTemplate,
    name:        "New Program",
    block:       "Block 1",
    phase:       "",
    weekly_focus:"",
    status:      "draft",
    start_date:  null,
    end_date:    null,
    week:        1,
    total_weeks: 8,
    coach_note:  "",
    days:        [],
    ...overrides,
  };
  const { data, error } = await supabase.from("programs").insert(program).select().single();
  if (error) { console.error("createProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, program: data };
}

export async function saveProgram(program) {
  const { id, ...fields } = program;

  if (!id || typeof id !== "string") {
    console.error("saveProgram: program.id is missing or invalid:", id);
    return { ok: false, error: "Program ID is missing. Cannot save." };
  }

  const payload = {
    name:         fields.name,
    block:        fields.block,
    phase:        fields.phase       ?? "",
    status:       fields.status,
    start_date:   fields.startDate   || null,
    end_date:     fields.endDate     || null,
    week:         fields.week        ?? 1,
    total_weeks:  fields.totalWeeks  ?? 8,
    coach_note:   fields.coachNote   ?? "",
    days:         fields.days        ?? [],
    weekly_focus: fields.weeklyFocus ?? "",
    updated_at:   new Date().toISOString(),
    client_id:    fields.clientId    ?? null,
    coach_id:     fields.coachId     ?? null,
    is_template:  fields.clientId == null,
  };

  const { data: updated, error: updateErr } = await supabase
    .from("programs").update(payload).eq("id", id).select().single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      console.warn("[saveProgram] UPDATE matched 0 rows. Trying upsert fallback.");
      const upsertPayload = { id, ...payload };
      const { data: upserted, error: upsertErr } = await supabase
        .from("programs").upsert(upsertPayload, { onConflict: "id" }).select().single();
      if (upsertErr) {
        console.error("[saveProgram] upsert fallback failed:", upsertErr.message, "code:", upsertErr.code);
        return { ok: false, error: `Save failed: ${upsertErr.message} (code ${upsertErr.code})` };
      }
      return { ok: true, program: upserted };
    }
    console.error("[saveProgram] update error:", updateErr.message, "code:", updateErr.code);
    return { ok: false, error: `Save failed: ${updateErr.message} (code ${updateErr.code})` };
  }

  const { data: confirmed, error: confirmErr } = await supabase
    .from("programs").select("id, name, updated_at").eq("id", id).single();

  if (confirmErr || !confirmed) {
    console.error("[saveProgram] post-save confirm failed:", confirmErr?.message);
    return { ok: false, error: "Save appeared to succeed but could not confirm. Check Supabase." };
  }

  return { ok: true, program: updated };
}

export async function duplicateProgram(programId, coachId) {
  const { data: src, error: fetchErr } = await supabase.from("programs").select("*").eq("id", programId).single();
  if (fetchErr || !src) return { ok: false, error: fetchErr?.message || "Program not found" };
  const copy = {
    client_id: src.client_id, coach_id: coachId,
    name: src.name, block: `${src.block} (Copy)`, phase: src.phase,
    status: "draft", start_date: null, end_date: null,
    week: 1, total_weeks: src.total_weeks, coach_note: src.coach_note,
    days: JSON.parse(JSON.stringify(src.days || [])),
  };
  const { data, error } = await supabase.from("programs").insert(copy).select().single();
  if (error) { console.error("duplicateProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, program: data };
}

export async function archiveProgram(programId) {
  const { error } = await supabase.from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", programId);
  if (error) { console.error("archiveProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function publishProgram(programId, clientId) {
  if (!clientId) return { ok: false, error: "A client must be selected before publishing." };
  await supabase.from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("client_id", clientId).eq("status", "active");
  const { data, error } = await supabase.from("programs")
    .update({ client_id: clientId, status: "active", updated_at: new Date().toISOString() })
    .eq("id", programId).select().single();
  if (error) { console.error("publishProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, program: data };
}

export async function deleteProgram(programId) {
  const { error } = await supabase.from("programs").delete().eq("id", programId);
  if (error) { console.error("deleteProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// WORKOUT LOG
// ─────────────────────────────────────────────────────────────

export async function getWorkoutLog(programId, dayId, clientId) {
  const { data, error } = await supabase.from("workout_logs").select("*")
    .eq("program_id", programId).eq("day_id", dayId).eq("client_id", clientId).maybeSingle();
  if (error) { console.error("getWorkoutLog:", error.message); return null; }
  return data;
}

export async function saveWorkoutLog(programId, dayId, clientId, { sets, completed, completedAt }) {
  const payload = {
    program_id: programId, day_id: dayId, client_id: clientId,
    sets_data: sets, completed: !!completed,
    completed_at: completedAt || null, updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("workout_logs").upsert(payload, { onConflict: "program_id,day_id,client_id" });
  if (error) { console.error("saveWorkoutLog:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function getProgramLogs(programId) {
  const { data, error } = await supabase.from("workout_logs").select("*")
    .eq("program_id", programId).eq("completed", true).order("completed_at", { ascending: false });
  if (error) { console.error("getProgramLogs:", error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────

export async function saveOnboarding(userId, email, data) {
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") return v.trim() ? [v.trim()] : [];
    return [];
  };
  const { firstName, lastName, phone, birthday, age, height, weight, emergencyContact,
    goals, level, hadCoach, trainDays, trainTimes, sleep, stress, accountability } = data;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) await saveProfileName(userId, fullName);
  const profilePayload = {
    id: userId,
    phone: phone || null, birthday: birthday || null,
    age: age ? parseInt(age) : null, height: height || null, weight: weight || null,
    emergency_contact: emergencyContact || null,
    goals:       toArr(goals),
    fitness_level: level || null, had_coach: hadCoach || null,
    train_days:  toArr(trainDays),
    train_times: toArr(trainTimes),
    sleep_hours: sleep || null, stress_level: stress || null,
    accountability: accountability || null, onboarding_done: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("client_profiles").upsert(profilePayload, { onConflict: "id" });
  if (error) { console.error("saveOnboarding:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function hasCompletedOnboarding(userId) {
  const { data, error } = await supabase.from("client_profiles")
    .select("onboarding_done").eq("id", userId).maybeSingle();
  if (error || !data) return false;
  return data.onboarding_done === true;
}

// ─────────────────────────────────────────────────────────────
// CONSULTATION REQUESTS
// ─────────────────────────────────────────────────────────────

/**
 * [PHASE1] Turns a DB-level duplicate-slot violation (23505, from
 * uq_consultation_email_slot in 0003_consultation_dedupe.sql) into a
 * clear, actionable message instead of a generic "booking failed".
 */
export async function saveConsultationRequest(data) {
  const goalsArr = Array.isArray(data.goals)
    ? data.goals.filter(Boolean)
    : (data.goals && typeof data.goals === "string" && data.goals.trim())
      ? [data.goals.trim()]
      : [];

  const payload = {
    p_first_name:     data.firstName  || null,
    p_last_name:      data.lastName   || null,
    p_email:          data.email      || null,
    p_phone:          data.phone      || null,
    p_goals:          goalsArr,
    p_requested_date: data.selDate    || null,
    p_requested_time: data.selTime    || null,
  };

  const { data: result, error } = await supabase.rpc("submit_consultation_request", payload);

  if (error) {
    console.error("submit_consultation_request RPC error:", error.message, error.code);
    if (error.code === "23505") {
      return {
        ok: false,
        error: "You already have a consultation request for that date and time. Check your email for the confirmation, or pick a different slot.",
        duplicate: true,
      };
    }
    return { ok: false, error: error.message };
  }

  const id = result?.id ?? result;
  if (!id) {
    console.error("submit_consultation_request returned no id — treating as failure");
    return { ok: false, error: "Booking could not be confirmed. Please try again." };
  }

  return { ok: true, request: { id } };
}

export async function getConsultationRequests() {
  const { data, error } = await supabase
    .from("consultation_requests").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getConsultationRequests:", error.message); return []; }
  return data || [];
}

export async function updateConsultationStatus(id, status, coachNotes) {
  const { error } = await supabase.from("consultation_requests")
    .update({ status, coach_notes: coachNotes || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) { console.error("updateConsultationStatus:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// COACH AVAILABILITY
// ─────────────────────────────────────────────────────────────

export async function saveCoachAvailability(coachId, weeklySchedule, blockedWindows) {
  const payload = {
    coach_id:        coachId,
    weekly_schedule: weeklySchedule,
    blocked_windows: blockedWindows || [],
    updated_at:      new Date().toISOString(),
  };
  const { error } = await supabase
    .from("coach_availability").upsert(payload, { onConflict: "coach_id" });
  if (error) { console.error("saveCoachAvailability:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function getCoachAvailability(coachId) {
  const { data, error } = await supabase
    .from("coach_availability").select("*").eq("coach_id", coachId).maybeSingle();
  if (error) { console.error("getCoachAvailability:", error.message); return null; }
  return data;
}

// ─────────────────────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────────────────────

export async function getMessages(userId, otherId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) { console.error("getMessages:", error.message); return []; }
  return data || [];
}

export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content, read: false })
    .select().single();
  if (error) { console.error("sendMessage:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, message: data };
}

export async function getUnreadMessageCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("read", false);
  if (error) { console.error("getUnreadMessageCount:", error.message); return 0; }
  return count || 0;
}

export async function markMessagesRead(userId, senderId) {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", userId)
    .eq("sender_id", senderId)
    .eq("read", false);
  if (error) { console.error("markMessagesRead:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function getCoachId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .or("role.eq.owner,role.eq.admin,is_owner.eq.true")
    .limit(1)
    .maybeSingle();
  if (error) { console.error("getCoachId:", error.message); return null; }
  return data?.id || null;
}

export function subscribeToMessages(userId, callback) {
  return supabase
    .channel(`messages:${userId}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages",
      filter: `receiver_id=eq.${userId}`,
    }, payload => callback(payload.new))
    .subscribe();
}

// ─────────────────────────────────────────────────────────────
// PROGRAM LIBRARY
// ─────────────────────────────────────────────────────────────

export async function getProgramLibrary() {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .or("client_id.is.null,is_template.eq.true")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getProgramLibrary:", error.message); return []; }
  return data || [];
}

export async function getAssignedPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .not("client_id", "is", null)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAssignedPrograms:", error.message); return []; }
  return data || [];
}

export async function assignProgramTemplate(templateId, clientId, coachId) {
  if (!templateId || !clientId) {
    return { ok: false, error: "templateId and clientId are required." };
  }

  const { data: tmpl, error: fetchErr } = await supabase
    .from("programs").select("*").eq("id", templateId).single();
  if (fetchErr || !tmpl) {
    console.error("assignProgramTemplate fetch:", fetchErr?.message);
    return { ok: false, error: fetchErr?.message || "Template not found." };
  }

  await supabase.from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("client_id", clientId).eq("status", "active");

  const copy = {
    client_id:   clientId,
    coach_id:    coachId || null,
    template_id: templateId,
    assigned_by: coachId || null,
    assigned_at: new Date().toISOString(),
    name:        tmpl.name,
    block:       tmpl.block,
    phase:       tmpl.phase        || "",
    weekly_focus:tmpl.weekly_focus || "",
    status:      "active",
    start_date:  tmpl.start_date   || null,
    end_date:    tmpl.end_date     || null,
    week:        1,
    total_weeks: tmpl.total_weeks  || 8,
    coach_note:  tmpl.coach_note   || "",
    days:        JSON.parse(JSON.stringify(tmpl.days || [])),
    is_template: false,
  };

  const { data, error } = await supabase.from("programs").insert(copy).select().single();
  if (error) {
    console.error("assignProgramTemplate insert:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

// ─────────────────────────────────────────────────────────────
// CLIENT INVITES
// ─────────────────────────────────────────────────────────────

export async function createClientInvite({ firstName, lastName, email, phone, packagePlan, notes, coachId }) {
  if (!email || !email.trim()) {
    return { ok: false, error: "Email is required." };
  }
  const payload = {
    first_name:   firstName?.trim()  || null,
    last_name:    lastName?.trim()   || null,
    email:        email.trim().toLowerCase(),
    phone:        phone?.trim()      || null,
    package_plan: packagePlan?.trim()|| null,
    notes:        notes?.trim()      || null,
    invited_by:   coachId            || null,
    status:       "pending",
    created_at:   new Date().toISOString(),
  };
  const { data, error } = await supabase.from("client_invites").insert(payload).select().single();
  if (error) { console.error("createClientInvite:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, invite: data };
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function createNotification({ recipientId, type, title, body, relatedId }) {
  if (!recipientId) return { ok: false, error: "recipientId required" };
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: recipientId, type, title: title || "", body: body || "",
      related_id: relatedId || null, read: false, created_at: new Date().toISOString(),
    })
    .select().single();
  if (error) { console.error("createNotification:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, notification: data };
}

export async function getNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications").select("*").eq("recipient_id", userId)
    .order("created_at", { ascending: false }).limit(50);
  if (error) { console.error("getNotifications:", error.message); return []; }
  return data || [];
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from("notifications").select("id", { count: "exact", head: true })
    .eq("recipient_id", userId).eq("read", false);
  if (error) { console.error("getUnreadNotificationCount:", error.message); return 0; }
  return count || 0;
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
  if (error) { console.error("markNotificationRead:", error.message); return { ok: false }; }
  return { ok: true };
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from("notifications")
    .update({ read: true }).eq("recipient_id", userId).eq("read", false);
  if (error) { console.error("markAllNotificationsRead:", error.message); return { ok: false }; }
  return { ok: true };
}

export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "notifications",
      filter: `recipient_id=eq.${userId}`,
    }, payload => callback(payload.new))
    .subscribe();
}

// ─────────────────────────────────────────────────────────────
// SESSIONS / BOOKINGS
// ─────────────────────────────────────────────────────────────

export async function createSession({ clientId, coachId, date, time, notes }) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      client_id: clientId, coach_id: coachId || null, date, time,
      notes: notes || null, status: "booked", created_at: new Date().toISOString(),
    })
    .select().single();
  if (error) { console.error("createSession:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, session: data };
}

export async function getClientSessions(clientId) {
  const { data, error } = await supabase
    .from("sessions").select("*").eq("client_id", clientId)
    .order("date", { ascending: true }).limit(20);
  if (error) { console.error("getClientSessions:", error.message); return []; }
  return data || [];
}

export async function getCoachSessions(fromDate) {
  let q = supabase
    .from("sessions")
    .select(`*, profiles!sessions_client_id_fkey (name, email)`)
    .order("date", { ascending: true }).limit(100);
  if (fromDate) q = q.gte("date", fromDate);
  const { data, error } = await q;
  if (error) {
    const { data: fb, error: fbErr } = await supabase
      .from("sessions").select("*").order("date", { ascending: true }).limit(100);
    if (fbErr) { console.error("getCoachSessions:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}

/**
 * Update session status. NOTE (Phase B): setting status to 'completed',
 * 'late_cancel', or 'no_show' fires the trg_debit_session_on_status_change
 * trigger (0004_client_lifecycle.sql), which deducts exactly one session
 * from the client's ledger/balance automatically. Do not also manually
 * adjust the balance when calling this — that would double-deduct.
 */
export async function updateSessionStatus(sessionId, status, coachNotes) {
  const { error } = await supabase
    .from("sessions")
    .update({ status, coach_notes: coachNotes || null, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) { console.error("updateSessionStatus:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

// [PHASE1] Real DB-backed weekly booking limit — replaces the old hardcoded weeklyUsed=0 stub.
export async function getWeeklySessionCount(clientId, refDateISO) {
  if (!clientId) return 0;
  const ref = refDateISO ? new Date(refDateISO) : new Date();
  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .gte("date", toISO(monday))
    .lte("date", toISO(sunday));

  if (error) { console.error("getWeeklySessionCount:", error.message); return null; }
  return count ?? 0;
}

// [PHASE1] Last-instant slot-collision check, run immediately before insert.
export async function isSlotTaken(coachId, date, time) {
  if (!coachId || !date || !time) return null;
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId).eq("date", date).eq("time", time).neq("status", "cancelled");
  if (error) { console.error("isSlotTaken:", error.message); return null; }
  return (count ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────
// CLIENT WEIGHT LOGS
// ─────────────────────────────────────────────────────────────

export async function saveWeightLog(clientId, { metricType, value, unit, exerciseName, programId, dayId, weekNumber, notes }) {
  if (!clientId) return { ok: false, error: "clientId required" };
  const payload = {
    client_id: clientId, metric_type: metricType || "bodyweight",
    value: parseFloat(value) || null, unit: unit || "lbs",
    exercise_name: exerciseName || null, program_id: programId || null,
    day_id: dayId || null, week_number: weekNumber || null, notes: notes || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("client_weight_logs").insert(payload).select().single();
  if (error) { console.error("saveWeightLog:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, log: data };
}

export async function getWeightLogs(clientId, metricType) {
  if (!clientId) return [];
  let q = supabase
    .from("client_weight_logs").select("*").eq("client_id", clientId)
    .order("created_at", { ascending: false }).limit(100);
  if (metricType) q = q.eq("metric_type", metricType);
  const { data, error } = await q;
  if (error) { console.error("getWeightLogs:", error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// CLIENT INTAKE FORMS
// ─────────────────────────────────────────────────────────────

export async function saveClientIntake(clientId, coachId, data) {
  if (!clientId) return { ok: false, error: "clientId required" };
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") return v.trim() ? [v.trim()] : [];
    return [];
  };
  const payload = {
    client_id: clientId, coach_id: coachId || null,
    goals: toArr(data.goals), fitness_level: data.level || null, had_coach: data.hadCoach || null,
    preferred_days: toArr(data.trainDays), preferred_times: toArr(data.trainTimes),
    injuries: data.injuries || null, surgeries: data.surgeries || null,
    conditions: data.conditions || null, medications: data.medications || null,
    movement_limits: data.restrictions || null, sleep_quality: data.sleep || null,
    stress_level: data.stress || null, accountability: data.accountability || null,
    lifestyle_notes: data.lifestyleNotes || null, height: data.height || null,
    weight: data.weight || null, emergency_contact: data.emergencyContact || null,
    status: "submitted", submitted_at: new Date().toISOString(), created_at: new Date().toISOString(),
  };
  const { data: row, error } = await supabase.from("client_intake_forms").insert(payload).select().single();
  if (error) { console.error("saveClientIntake:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, intake: row };
}

export async function getClientIntakes(statusFilter) {
  let q = supabase
    .from("client_intake_forms")
    .select(`*, profiles!client_intake_forms_client_id_fkey (name, email)`)
    .order("submitted_at", { ascending: false }).limit(100);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) {
    const { data: fb, error: fbErr } = await supabase
      .from("client_intake_forms").select("*").order("submitted_at", { ascending: false }).limit(100);
    if (fbErr) { console.error("getClientIntakes:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}

export async function updateIntakeStatus(intakeId, status, reviewedBy) {
  const updates = { status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy || null };
  const { error } = await supabase.from("client_intake_forms").update(updates).eq("id", intakeId);
  if (error) { console.error("updateIntakeStatus:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function getUnreviewedIntakeCount() {
  const { count, error } = await supabase
    .from("client_intake_forms").select("id", { count: "exact", head: true }).eq("status", "submitted");
  if (error) return 0;
  return count || 0;
}

// ─────────────────────────────────────────────────────────────
// [PHASE1] CONSULTATION CONFIRMATION EMAILS
// ─────────────────────────────────────────────────────────────

function buildEmailPayload(data) {
  return {
    consultation_id: data.consultationId || null,
    first_name: data.firstName || "", last_name: data.lastName || "",
    email: data.email || "", phone: data.phone || "", age: data.age || null,
    goals: Array.isArray(data.goals) ? data.goals : [],
    level: data.level || null, had_coach: data.hadCoach || null,
    train_freq: data.trainFreq || null, gym_access: data.gymAccess || null,
    location: data.location || null, injuries: data.injuries || null,
    surgeries: data.surgeries || null, conditions: data.conditions || null,
    medications: data.medications || null,
    date_display: data.dateDisplay || "", time_display: data.timeDisplay || "",
  };
}

async function alertAdminEmailFailed(data, reason) {
  try {
    const coachId = await getCoachId();
    if (!coachId) return;
    await createNotification({
      recipientId: coachId,
      type: "consultation_request",
      title: "⚠ Consultation confirmation email failed",
      body: `Booking for ${data.firstName || ""} ${data.lastName || ""} (${data.email}) was saved, but the confirmation email failed to send: ${reason}`,
      relatedId: data.consultationId || null,
    });
  } catch (e) {
    console.error("alertAdminEmailFailed itself failed:", e);
  }
}

/**
 * [PHASE1] On failure, alerts an admin (in-app notification) instead of
 * only console.error — the booking is already saved by this point, so a
 * silent email failure would otherwise be invisible to both client and
 * coach.
 */
export async function sendConsultationEmails(data) {
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "send-consultation-email",
      { body: buildEmailPayload(data) }
    );

    if (fnError) {
      console.error("send-consultation-email error", fnError);
      await alertAdminEmailFailed(data, fnError.message);
      return { ok: false, error: fnError.message };
    }

    if (fnData?.client_email_sent === false || fnData?.coach_email_sent === false) {
      console.error("send-consultation-email partial failure", fnData);
      await alertAdminEmailFailed(data, JSON.stringify(fnData));
    }

    if (data.consultationId) {
      supabase.from("consultation_requests").update({
        client_email_sent: fnData?.client_email_sent === true,
        coach_email_sent:  fnData?.coach_email_sent  === true,
        email_sent_at:     new Date().toISOString(),
      }).eq("id", data.consultationId)
        .then(({ error: upErr }) => { if (upErr) console.error("email_sent update failed", upErr.message); });
    }

    return { ok: true, result: fnData };
  } catch (e) {
    console.error("send-consultation-email error", e?.message || e);
    await alertAdminEmailFailed(data, e?.message || String(e));
    return { ok: false, error: e?.message || "unknown error" };
  }
}

// ─────────────────────────────────────────────────────────────
// [PHASE1] STRIPE CHECKOUT — dynamic session (replaces static Payment Links)
// ─────────────────────────────────────────────────────────────

export async function createCheckoutSession(packageId) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return { ok: false, error: "You must be signed in to purchase sessions." };

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { package_id: packageId },
  });
  if (error) { console.error("createCheckoutSession:", error.message); return { ok: false, error: error.message }; }
  if (!data?.url) return { ok: false, error: "No checkout URL returned." };
  return { ok: true, url: data.url };
}

export async function getSessionPurchases(clientId) {
  if (!clientId) return [];
  const { data, error } = await supabase
    .from("session_purchases").select("*").eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getSessionPurchases:", error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// [PHASEB] SESSION LEDGER — all balance mutations route through here
// ─────────────────────────────────────────────────────────────

export async function adjustSessionBalance(clientId, amount, reason) {
  if (!clientId || !amount) return { ok: false, error: "clientId and non-zero amount are required." };
  const idempotencyKey = `${clientId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const { data, error } = await supabase.rpc("admin_adjust_session_balance", {
    p_client_id: clientId,
    p_amount: amount,
    p_reason: reason || (amount > 0 ? "Coach adjustment (add)" : "Coach adjustment (remove)"),
    p_idempotency_key: idempotencyKey,
  });
  if (error) { console.error("adjustSessionBalance:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, newBalance: data?.new_balance, clamped: data?.clamped === true };
}

export async function getSessionLedger(clientId) {
  if (!clientId) return [];
  const { data, error } = await supabase
    .from("session_ledger").select("*").eq("client_id", clientId)
    .order("created_at", { ascending: false }).limit(100);
  if (error) { console.error("getSessionLedger:", error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// ADMIN ANALYTICS — real data only, no fabricated figures
// ─────────────────────────────────────────────────────────────

/** All Stripe-backed purchases, most recent first — real revenue source. */
export async function getAllSessionPurchases() {
  const { data, error } = await supabase
    .from("session_purchases")
    .select("*, profiles!session_purchases_client_id_fkey (name, email)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("getAllSessionPurchases join failed, falling back:", error.message);
    const { data: fb, error: fbErr } = await supabase
      .from("session_purchases").select("*").order("created_at", { ascending: false }).limit(500);
    if (fbErr) { console.error("getAllSessionPurchases:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}

/** All coach-adjustment ledger entries, for a real audit-trail view. */
export async function getAllLedgerEntries() {
  const { data, error } = await supabase
    .from("session_ledger")
    .select("*, profiles!session_ledger_client_id_fkey (name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("getAllLedgerEntries join failed, falling back:", error.message);
    const { data: fb, error: fbErr } = await supabase
      .from("session_ledger").select("*").order("created_at", { ascending: false }).limit(200);
    if (fbErr) { console.error("getAllLedgerEntries:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}
