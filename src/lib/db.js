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
 * Uses a left join so templates with client_id=null are never dropped.
 */
export async function getAllPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .order("updated_at", { ascending: false });
  if (error) {
    // If the FK join errors (e.g. no foreign key on null rows), fall back to plain select
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

/**
 * Create a new program draft.
 * clientId = null creates an unassigned template (no client required).
 */
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

/** Save full program (camelCase UI → snake_case DB). Preserves identity fields. */
export async function saveProgram(program) {
  const { id, ...fields } = program;

  // Guard: id must be a non-empty string (real UUID from Supabase)
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
    // Preserve identity fields — never clear them on a routine save
    client_id:    fields.clientId    ?? null,
    coach_id:     fields.coachId     ?? null,
    is_template:  fields.clientId == null,
    // template_id / assigned_by / assigned_at: set once at assignment, never touched here
  };

  console.log("[saveProgram] id:", id);
  console.log("[saveProgram] payload:", JSON.stringify(payload, null, 2));

  // 1. Attempt UPDATE
  const { data: updated, error: updateErr } = await supabase
    .from("programs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    // PGRST116 = "no rows returned" — row wasn't matched (wrong id, or RLS blocked)
    if (updateErr.code === "PGRST116") {
      console.warn("[saveProgram] UPDATE matched 0 rows (id not found or RLS blocked). Trying upsert fallback.");
      // 2. Fallback: upsert with id included in the payload
      const upsertPayload = { id, ...payload };
      const { data: upserted, error: upsertErr } = await supabase
        .from("programs")
        .upsert(upsertPayload, { onConflict: "id" })
        .select()
        .single();
      if (upsertErr) {
        console.error("[saveProgram] upsert fallback failed:", upsertErr.message, "code:", upsertErr.code);
        return { ok: false, error: `Save failed: ${upsertErr.message} (code ${upsertErr.code})` };
      }
      console.log("[saveProgram] upsert succeeded:", upserted?.id);
      return { ok: true, program: upserted };
    }
    console.error("[saveProgram] update error:", updateErr.message, "code:", updateErr.code);
    return { ok: false, error: `Save failed: ${updateErr.message} (code ${updateErr.code})` };
  }

  // 3. Re-select to confirm the row exists in DB
  const { data: confirmed, error: confirmErr } = await supabase
    .from("programs")
    .select("id, name, updated_at")
    .eq("id", id)
    .single();

  if (confirmErr || !confirmed) {
    console.error("[saveProgram] post-save confirm failed:", confirmErr?.message);
    return { ok: false, error: "Save appeared to succeed but could not confirm. Check Supabase." };
  }

  console.log("[saveProgram] confirmed in DB:", confirmed.id, "updated_at:", confirmed.updated_at);
  return { ok: true, program: updated };
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
    goals:       toArr(goals),       // text[]
    fitness_level: level || null, had_coach: hadCoach || null,
    train_days:  toArr(trainDays),   // text[]
    train_times: toArr(trainTimes),  // text[]
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
  // Helper: ensure value is always a proper array (never a string or undefined)
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") return v.trim() ? [v.trim()] : [];
    return [];
  };

  // Helper: ensure value is a plain object for jsonb columns
  const toObj = (v) => {
    if (!v) return {};
    if (typeof v === "object" && !Array.isArray(v)) return v;
    return {};
  };

  const payload = {
    first_name:       data.firstName                  || null,
    last_name:        data.lastName                   || null,
    email:            data.email                      || null,
    phone:            data.phone                      || null,
    age:              data.age ? parseInt(data.age) : null,
    goals:            toArr(data.goals),                        // text[] — always array
    custom_goal:      data.customGoal                 || null,
    experience_level: data.level                      || null,
    had_coach:        data.hadCoach                   || null,
    train_frequency:  data.trainFreq                  || null,
    gym_access:       data.gymAccess                  || null,
    location:         data.location                   || null,
    injuries:         data.injuries                   || null,
    surgeries:        data.surgeries                  || null,
    conditions:       data.conditions                 || null,
    medications:      data.medications                || null,
    restrictions:     data.restrictions               || null,
    parq_answers:     toObj(data.parqAnswers),                  // jsonb — always object
    parq_any_yes:     Boolean(data.anyParqYes),                 // boolean
    agreed_risk:      Boolean(data.agreedRisk),                 // boolean
    agreed_medical:   Boolean(data.agreedMed),                  // boolean
    agreed_comms:     Boolean(data.agreedComms),                // boolean
    requested_date:   data.selDate                    || null,  // date "YYYY-MM-DD"
    requested_time:   data.selTime                    || null,  // text "HH:mm:ss"
    status:           "pending",
    created_at:       new Date().toISOString(),
  };
  console.log("saving consultation request", payload);
  const { data: row, error } = await supabase
    .from("consultation_requests").insert(payload).select().single();
  const result = error
    ? { ok: false, error: error.message }
    : { ok: true, request: row };
  console.log("consultation save result", result);
  if (error) console.error("saveConsultationRequest:", error.message);
  return result;
}

export async function getConsultationRequests() {
  const { data, error } = await supabase
    .from("consultation_requests").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getConsultationRequests:", error.message); return []; }
  console.log("loaded consultation requests", data?.length ?? 0, "rows");
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

// ─────────────────────────────────────────────────────────────
// PROGRAM LIBRARY — Template-first flow
// ─────────────────────────────────────────────────────────────

/** All unassigned templates (client_id IS NULL, or is_template=true for older rows). */
export async function getProgramLibrary() {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .or("client_id.is.null,is_template.eq.true")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getProgramLibrary:", error.message); return []; }
  return data || [];
}

/** All programs assigned to clients (client_id NOT NULL). */
export async function getAssignedPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .not("client_id", "is", null)
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAssignedPrograms:", error.message); return []; }
  return data || [];
}

/**
 * Assign a template to a client by creating a client-specific copy.
 * The original template (client_id=null) is preserved unchanged.
 */
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

  const { data, error } = await supabase
    .from("programs").insert(copy).select().single();
  if (error) {
    console.error("assignProgramTemplate insert:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

// ─────────────────────────────────────────────────────────────
// CLIENT INVITES
// ─────────────────────────────────────────────────────────────

/**
 * Create a client invite record.
 * Used when the coach wants to add a new client from the admin dashboard.
 * The invite is stored in client_invites table.
 * When the invitee signs up with the matching email, they become a client.
 */
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
  const { data, error } = await supabase
    .from("client_invites")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createClientInvite:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, invite: data };
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create a notification for a user.
 * type: 'new_message' | 'program_assigned' | 'workout_completed' |
 *       'consultation_request' | 'session_booked' | 'check_in' | 'package_updated'
 */
export async function createNotification({ recipientId, type, title, body, relatedId }) {
  if (!recipientId) return { ok: false, error: "recipientId required" };
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: recipientId,
      type,
      title:      title || "",
      body:       body  || "",
      related_id: relatedId || null,
      read:       false,
      created_at: new Date().toISOString(),
    })
    .select().single();
  if (error) { console.error("createNotification:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, notification: data };
}

/** Fetch unread + recent notifications for a user (max 50). */
export async function getNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) { console.error("getNotifications:", error.message); return []; }
  return data || [];
}

/** Count unread notifications for a user. */
export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  if (error) { console.error("getUnreadNotificationCount:", error.message); return 0; }
  return count || 0;
}

/** Mark a single notification as read. */
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) { console.error("markNotificationRead:", error.message); return { ok: false }; }
  return { ok: true };
}

/** Mark ALL notifications for a user as read. */
export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  if (error) { console.error("markAllNotificationsRead:", error.message); return { ok: false }; }
  return { ok: true };
}

/** Subscribe to new notifications for a user in realtime. */
export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `recipient_id=eq.${userId}`,
    }, payload => callback(payload.new))
    .subscribe();
}

// ─────────────────────────────────────────────────────────────
// SESSIONS / BOOKINGS
// ─────────────────────────────────────────────────────────────

/** Create a session booking record. */
export async function createSession({ clientId, coachId, date, time, notes }) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      client_id:  clientId,
      coach_id:   coachId  || null,
      date,
      time,
      notes:      notes || null,
      status:     "booked",
      created_at: new Date().toISOString(),
    })
    .select().single();
  if (error) { console.error("createSession:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, session: data };
}

/** Get upcoming sessions for a client. */
export async function getClientSessions(clientId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: true })
    .limit(20);
  if (error) { console.error("getClientSessions:", error.message); return []; }
  return data || [];
}

/** Get all sessions for the coach (optionally filtered by date). */
export async function getCoachSessions(fromDate) {
  let q = supabase
    .from("sessions")
    .select(`*, profiles!sessions_client_id_fkey (name, email)`)
    .order("date", { ascending: true })
    .limit(100);
  if (fromDate) q = q.gte("date", fromDate);
  const { data, error } = await q;
  if (error) {
    // FK join fallback if foreign key not set
    const { data: fb, error: fbErr } = await supabase
      .from("sessions").select("*").order("date", { ascending: true }).limit(100);
    if (fbErr) { console.error("getCoachSessions:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}

/** Update session status (booked → confirmed | cancelled | completed). */
export async function updateSessionStatus(sessionId, status, coachNotes) {
  const { error } = await supabase
    .from("sessions")
    .update({ status, coach_notes: coachNotes || null, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) { console.error("updateSessionStatus:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// CLIENT WEIGHT LOGS
// ─────────────────────────────────────────────────────────────

/**
 * Save a bodyweight / lift entry for a client.
 * metricType: 'bodyweight' | 'lift' | 'measurement'
 */
export async function saveWeightLog(clientId, { metricType, value, unit, exerciseName, programId, dayId, weekNumber, notes }) {
  if (!clientId) return { ok: false, error: "clientId required" };
  const payload = {
    client_id:     clientId,
    metric_type:   metricType   || "bodyweight",
    value:         parseFloat(value) || null,
    unit:          unit          || "lbs",
    exercise_name: exerciseName  || null,
    program_id:    programId     || null,
    day_id:        dayId         || null,
    week_number:   weekNumber    || null,
    notes:         notes         || null,
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  };
  console.log("saving weight log", payload);
  const { data, error } = await supabase
    .from("client_weight_logs")
    .insert(payload)
    .select()
    .single();
  const result = error
    ? { ok: false, error: error.message }
    : { ok: true, log: data };
  console.log("weight log saved", result);
  if (error) console.error("saveWeightLog:", error.message);
  return result;
}

/** Get weight/progress log entries for a client (most recent first, max 100). */
export async function getWeightLogs(clientId, metricType) {
  if (!clientId) return [];
  let q = supabase
    .from("client_weight_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (metricType) q = q.eq("metric_type", metricType);
  const { data, error } = await q;
  if (error) { console.error("getWeightLogs:", error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// CLIENT INTAKE FORMS
// ─────────────────────────────────────────────────────────────

/**
 * Save a client intake form record.
 * Called after onboarding completes — captures full questionnaire answers.
 */
export async function saveClientIntake(clientId, coachId, data) {
  if (!clientId) return { ok: false, error: "clientId required" };
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") return v.trim() ? [v.trim()] : [];
    return [];
  };
  const payload = {
    client_id:          clientId,
    coach_id:           coachId || null,
    goals:              toArr(data.goals),          // text[]
    fitness_level:      data.level              || null,
    had_coach:          data.hadCoach           || null,
    preferred_days:     toArr(data.trainDays),      // text[]
    preferred_times:    toArr(data.trainTimes),     // text[]
    injuries:           data.injuries           || null,
    surgeries:          data.surgeries          || null,
    conditions:         data.conditions         || null,
    medications:        data.medications        || null,
    movement_limits:    data.restrictions       || null,
    sleep_quality:      data.sleep              || null,
    stress_level:       data.stress             || null,
    accountability:     data.accountability     || null,
    lifestyle_notes:    data.lifestyleNotes     || null,
    height:             data.height             || null,
    weight:             data.weight             || null,
    emergency_contact:  data.emergencyContact   || null,
    status:             "submitted",
    submitted_at:       new Date().toISOString(),
    created_at:         new Date().toISOString(),
  };
  const { data: row, error } = await supabase
    .from("client_intake_forms")
    .insert(payload)
    .select()
    .single();
  if (error) { console.error("saveClientIntake:", error.message); return { ok: false, error: error.message }; }
  return { ok: true, intake: row };
}

/**
 * Get all intake forms for the coach (ordered newest first).
 * Optional status filter: "submitted" | "reviewed" | "program_assigned" | "archived"
 */
export async function getClientIntakes(statusFilter) {
  let q = supabase
    .from("client_intake_forms")
    .select(`
      *,
      profiles!client_intake_forms_client_id_fkey (
        name, email
      )
    `)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) {
    // Fallback: query without the join if FK not wired yet
    const { data: fb, error: fbErr } = await supabase
      .from("client_intake_forms")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (fbErr) { console.error("getClientIntakes:", fbErr.message); return []; }
    return fb || [];
  }
  return data || [];
}

/**
 * Update intake status (reviewed / program_assigned / archived).
 * Also records who reviewed and when.
 */
export async function updateIntakeStatus(intakeId, status, reviewedBy) {
  const updates = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy || null,
  };
  const { error } = await supabase
    .from("client_intake_forms")
    .update(updates)
    .eq("id", intakeId);
  if (error) { console.error("updateIntakeStatus:", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

/** Count unreviewed (status=submitted) intakes. */
export async function getUnreviewedIntakeCount() {
  const { count, error } = await supabase
    .from("client_intake_forms")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if (error) return 0;
  return count || 0;
}
