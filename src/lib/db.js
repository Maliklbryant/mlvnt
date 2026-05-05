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

/**
 * Fetch a client's extended profile (client_profiles table).
 * Returns null if not found.
 */
export async function getClientProfile(userId) {
  const { data, error } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("getClientProfile:", error.message);
  }
  return data || null;
}

/**
 * Upsert a client's extended profile fields.
 * Only the fields passed in `fields` are updated.
 */
export async function saveClientProfile(userId, fields) {
  const payload = {
    id: userId,
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("saveClientProfile:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Update the display name in public.profiles.
 */
export async function saveProfileName(userId, name) {
  const trimmed = name.trim();

  const { error } = await supabase
    .from("profiles")
    .update({ name: trimmed })
    .eq("id", userId);

  if (error) {
    console.error("saveProfileName:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, name: trimmed };
}

// ─────────────────────────────────────────────────────────────
// ADMIN: CLIENTS
// ─────────────────────────────────────────────────────────────

/**
 * Admin: list all client profiles joined with their auth profile.
 */
export async function listClients() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      name,
      role,
      created_at,
      client_profiles (
        phone,
        height,
        weight,
        location_building,
        location_address,
        location_area,
        location_notes,
        emergency_contact,
        birthday,
        goals,
        fitness_level,
        injuries,
        package_plan,
        sessions_balance,
        sessions_weekly_max
      )
    `)
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listClients:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Admin: get one client's full profile.
 */
export async function getClientById(clientId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, email, name, role, created_at, client_profiles (*)`)
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("getClientById:", error.message);
    return null;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all programs for a client, newest first.
 */
export async function getPrograms(clientId) {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPrograms:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetch the single active program for a client.
 */
export async function getActiveProgram(clientId) {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("getActiveProgram:", error.message);
    return null;
  }
  return data;
}

/**
 * Admin: fetch all programs across all clients.
 */
export async function getAllPrograms() {
  const { data, error } = await supabase
    .from("programs")
    .select(`*, profiles!programs_client_id_fkey (name, email)`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getAllPrograms:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Create a new program (always starts as draft).
 */
export async function createProgram(clientId, coachId, overrides = {}) {
  const program = {
    client_id:   clientId,
    coach_id:    coachId,
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

  const { data, error } = await supabase
    .from("programs")
    .insert(program)
    .select()
    .single();

  if (error) {
    console.error("createProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

/**
 * Save (upsert) a full program object including days+exercises (JSONB).
 * Accepts the camelCase UI shape and maps to snake_case DB columns.
 */
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

  const { data, error } = await supabase
    .from("programs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("saveProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

/**
 * Duplicate a program (deep copy). New program is always a draft.
 */
export async function duplicateProgram(programId, coachId) {
  const { data: src, error: fetchErr } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single();

  if (fetchErr || !src) {
    return { ok: false, error: fetchErr?.message || "Program not found" };
  }

  const copy = {
    client_id:   src.client_id,
    coach_id:    coachId,
    name:        src.name,
    block:       `${src.block} (Copy)`,
    phase:       src.phase,
    status:      "draft",
    start_date:  null,
    end_date:    null,
    week:        1,
    total_weeks: src.total_weeks,
    coach_note:  src.coach_note,
    days:        JSON.parse(JSON.stringify(src.days || [])),
  };

  const { data, error } = await supabase
    .from("programs")
    .insert(copy)
    .select()
    .single();

  if (error) {
    console.error("duplicateProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

/**
 * Archive (complete) a program.
 */
export async function archiveProgram(programId) {
  const { error } = await supabase
    .from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("archiveProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Publish a draft program as active.
 * Marks any existing active program for this client as completed first.
 */
export async function publishProgram(programId, clientId) {
  await supabase
    .from("programs")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("programs")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", programId)
    .select()
    .single();

  if (error) {
    console.error("publishProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, program: data };
}

/**
 * Delete a program entirely.
 */
export async function deleteProgram(programId) {
  const { error } = await supabase
    .from("programs")
    .delete()
    .eq("id", programId);

  if (error) {
    console.error("deleteProgram:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// WORKOUT LOG
// ─────────────────────────────────────────────────────────────

/**
 * Get workout log for a specific program+day.
 */
export async function getWorkoutLog(programId, dayId, clientId) {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("program_id", programId)
    .eq("day_id", dayId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    console.error("getWorkoutLog:", error.message);
    return null;
  }
  return data;
}

/**
 * Save workout log (upsert).
 * sets is a plain object: { [exId]: number[] }
 */
export async function saveWorkoutLog(programId, dayId, clientId, { sets, completed, completedAt }) {
  const payload = {
    program_id:   programId,
    day_id:       dayId,
    client_id:    clientId,
    sets_data:    sets,
    completed:    !!completed,
    completed_at: completedAt || null,
    updated_at:   new Date().toISOString(),
  };

  const { error } = await supabase
    .from("workout_logs")
    .upsert(payload, { onConflict: "program_id,day_id,client_id" });

  if (error) {
    console.error("saveWorkoutLog:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Get all completed workout logs for a program.
 */
export async function getProgramLogs(programId) {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("program_id", programId)
    .eq("completed", true)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("getProgramLogs:", error.message);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────

/**
 * Save the full onboarding submission.
 */
export async function saveOnboarding(userId, email, data) {
  const {
    firstName, lastName, phone, birthday, age,
    height, weight, emergencyContact,
    goals, level, hadCoach,
    trainDays, trainTimes, sleep, stress, accountability,
  } = data;

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    await saveProfileName(userId, fullName);
  }

  const profilePayload = {
    id:                userId,
    phone:             phone             || null,
    birthday:          birthday          || null,
    age:               age ? parseInt(age) : null,
    height:            height            || null,
    weight:            weight            || null,
    emergency_contact: emergencyContact  || null,
    goals:             goals             || [],
    fitness_level:     level             || null,
    had_coach:         hadCoach          || null,
    train_days:        trainDays         || [],
    train_times:       trainTimes        || [],
    sleep_hours:       sleep             || null,
    stress_level:      stress            || null,
    accountability:    accountability    || null,
    onboarding_done:   true,
    updated_at:        new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (error) {
    console.error("saveOnboarding:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Check if a user has completed onboarding.
 */
export async function hasCompletedOnboarding(userId) {
  const { data, error } = await supabase
    .from("client_profiles")
    .select("onboarding_done")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.onboarding_done === true;
}
