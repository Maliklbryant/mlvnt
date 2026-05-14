/**
 * MLVNT Data Layer (db.js)
 * ------------------------
 * All Supabase database operations live here.
 * App.jsx imports from this file — no supabase calls scattered elsewhere.
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
        package_plan, sessions_balance, sessions_weekly_max
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

/** Programs for a specific client. */
export async function getPrograms(clientId) {
  const { data, error } = await supabase
    .from("programs").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) { console.error("getPrograms:", error.message); return []; }
  return data || [];
}

/** Single active program for a client. */
export async function getActiveProgram(clientId) {
  const { data, error } = await supabase
    .from("programs").select("*").eq("client_id", clientId).eq("status", "active").maybeSingle();
  if (error) { console.error("getActiveProgram:", error.message); return null; }
  return data;
}

/**
 * All programs across all clients AND unassigned templates (client_id IS NULL).
 * Includes joined client name/email when assigned.
 */
export async function getAllPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAllPrograms:", error.message); return []; }
  return data || [];
}

/**
 * Create a new program draft.
 * clientId = null creates an unassigned template (no client required).
 */
export async function createProgram(clientId, coachId, overrides = {}) {
  const program = {
    client_id:   clientId || null,
    coach_id:    coachId  || null,
    name:        "New Program",
    block:       "Block 1",
    phase:       "",
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

/** Save full program (camelCase UI → snake_case DB). */
export async function saveProgram(program) {
  const { id, ...fields } = program;
  const payload = {
    name:        fields.name,
    block:       fields.block,
    phase:       fields.phase       ?? "",
    status:      fields.status,
    start_date:  fields.startDate   || null,
    end_date:    fields.endDate     || null,
    week:        fields.week        ?? 1,
    total_weeks: fields.totalWeeks  ?? 8,
    coach_note:  fields.coachNote   ?? "",
    days:        fields.days        ?? [],
    updated_at:  new Date().toISOString(),
  };
  const { data, error } = await supabase.from("programs").update(payload).eq("id", id).select().single();
  if (error) { console.error("saveProgram:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, program: data };
}

/** Duplicate a program as a draft copy. */
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

/**
 * Assign and publish a program to a client.
 * Works for both already-assigned drafts and unassigned templates.
 * Sets client_id, archives any existing active program, sets status=active.
 * clientId is required.
 */
export async function publishProgram(programId, clientId) {
  if (!clientId) return { ok: false, error: "A client must be selected before publishing." };
  // Archive existing active for this client
  await supabase.from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("client_id", clientId).eq("status", "active");
  // Assign + activate
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
  const { firstName, lastName, phone, birthday, age, height, weight, emergencyContact,
    goals, level, hadCoach, trainDays, trainTimes, sleep, stress, accountability } = data;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) await saveProfileName(userId, fullName);
  const profilePayload = {
    id: userId,
    phone: phone || null, birthday: birthday || null,
    age: age ? parseInt(age) : null, height: height || null, weight: weight || null,
    emergency_contact: emergencyContact || null, goals: goals || [],
    fitness_level: level || null, had_coach: hadCoach || null,
    train_days: trainDays || [], train_times: trainTimes || [],
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

export async function saveConsultationRequest(data) {
  const payload = {
    first_name:       data.firstName        || null,
    last_name:        data.lastName         || null,
    email:            data.email            || null,
    phone:            data.phone            || null,
    age:              data.age ? parseInt(data.age) : null,
    goals:            data.goals            || [],
    custom_goal:      data.customGoal       || null,
    experience_level: data.level            || null,
    had_coach:        data.hadCoach         || null,
    train_frequency:  data.trainFreq        || null,
    gym_access:       data.gymAccess        || null,
    location:         data.location         || null,
    injuries:         data.injuries         || null,
    surgeries:        data.surgeries        || null,
    conditions:       data.conditions       || null,
    medications:      data.medications      || null,
    restrictions:     data.restrictions     || null,
    parq_answers:     data.parqAnswers      || {},
    parq_any_yes:     data.anyParqYes       || false,
    agreed_risk:      data.agreedRisk       || false,
    agreed_medical:   data.agreedMed        || false,
    agreed_comms:     data.agreedComms      || false,
    requested_date:   data.selDate          || null,
    requested_time:   data.selTime          || null,
    status:           "pending",
    created_at:       new Date().toISOString(),
  };
  const { data: row, error } = await supabase
    .from("consultation_requests").insert(payload).select().single();
  if (error) { console.error("saveConsultationRequest:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, request: row };
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

/** Load conversation between two users, ordered oldest-first. */
export async function getMessages(userId, otherId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) { console.error("getMessages:", error.message); return []; }
  return data || [];
}

/** Send a message from sender to receiver. */
export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content, read: false })
    .select().single();
  if (error) { console.error("sendMessage:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, message: data };
}

/** Count unread messages for a user (messages sent TO them that are unread). */
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

/** Mark all messages in a conversation as read. */
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

/** Get the coach/owner's user ID (for clients to send messages to). */
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

/** Subscribe to new messages in real time. Returns the subscription object. */
export function subscribeToMessages(userId, callback) {
  return supabase
    .channel(`messages:${userId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `receiver_id=eq.${userId}`,
    }, payload => callback(payload.new))
    .subscribe();
}
