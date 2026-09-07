import { DEFAULT_DAY_TEMPLATES, EXERCISES } from "./exercises.js";
import {
  isDeloadWeek,
  extractPerformance,
  computeNextPrescription,
  computeDeloadPrescription,
} from "./progression.js";
import { loadData, saveData, loadPersistent, savePersistent } from "./storage.js";
import { uid, todayISO } from "./utils.js";

let data = null; // { program, weeks, progressionCache }
let persistent = null; // { bodyEntries, painFlags } — survives across programs

export function init() {
  data = loadData();
  persistent = loadPersistent();
  return data;
}

export function hasActiveProgram() {
  return !!(data && data.program && data.program.status === "active");
}

export function getData() {
  return data;
}

function findDayTemplate(dayTemplateId) {
  return data.dayTemplates.find((t) => t.id === dayTemplateId);
}

export function getDayTemplates() {
  return data.dayTemplates;
}

function findSlot(dayTemplate, exerciseId) {
  for (const ss of dayTemplate.supersets) {
    const found = ss.exercises.find((e) => e.exerciseId === exerciseId);
    if (found) return found;
  }
  return null;
}

export function createProgram(totalWeeks, deloadEveryNWeeks = 4, units = "lb", dayTemplates = DEFAULT_DAY_TEMPLATES) {
  // Deep-clone so this program owns its own copy — later edits to the
  // default templates (or to another program's customized copy) can never
  // leak into an already-created program.
  const ownedTemplates = JSON.parse(JSON.stringify(dayTemplates));

  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    weeks.push({
      weekNumber: w,
      isDeload: isDeloadWeek(w, deloadEveryNWeeks, totalWeeks),
      days: ownedTemplates.map((t) => ({
        dayTemplateId: t.id,
        status: "pending", // pending | in_progress | completed
        completedAt: null,
        exerciseLogs: null, // generated lazily when the day is started
      })),
    });
  }

  data = {
    program: {
      id: uid(),
      startDate: todayISO(),
      totalWeeks,
      deloadEveryNWeeks,
      units,
      status: "active",
    },
    dayTemplates: ownedTemplates,
    weeks,
    progressionCache: {}, // exerciseId -> { weight, targetReps }
  };
  saveData(data);
  return data;
}

export function getWeek(weekNumber) {
  return data.weeks.find((w) => w.weekNumber === weekNumber);
}

export function getDay(weekNumber, dayTemplateId) {
  const week = getWeek(weekNumber);
  return week ? week.days.find((d) => d.dayTemplateId === dayTemplateId) : null;
}

// First pending/in-progress day in week/day order. Skipped days (see
// skipNextDay) are treated like completed ones for this purpose — they're
// done being "next", they just didn't happen.
export function getNextWorkout() {
  for (const week of data.weeks) {
    for (const day of week.days) {
      if (day.status !== "completed" && day.status !== "skipped") {
        return { weekNumber: week.weekNumber, dayTemplateId: day.dayTemplateId, day, isDeload: week.isDeload };
      }
    }
  }
  return null; // program complete
}

function buildExerciseLog(exerciseId, slot, weekNumber, trimVolume) {
  const exerciseDef = EXERCISES[exerciseId];
  const deload = isDeloadWeek(weekNumber, data.program.deloadEveryNWeeks, data.program.totalWeeks);
  const cached = data.progressionCache[exerciseId];

  let prescribedWeight = null;
  let targetReps = null;
  let sets = slot.sets;
  let targetRIR = slot.targetRIR;
  let prescriptionAction = null;

  if (weekNumber === 1) {
    // Baseline week: no prescription, user logs whatever they do.
  } else if (cached) {
    if (deload) {
      const d = computeDeloadPrescription(exerciseDef, slot, cached);
      prescribedWeight = d.weight;
      targetReps = d.targetReps;
      sets = d.sets;
      targetRIR = d.targetRIR;
      prescriptionAction = d.action;
    } else {
      prescribedWeight = cached.weight;
      targetReps = cached.targetReps;
      prescriptionAction = cached.action;
    }
  }

  // Pre-workout check-in came back "sore/tired" — trim a set off the
  // prescribed volume rather than pushing full volume on a rough day.
  // Deload weeks are already intentionally light, so this doesn't stack
  // with that reduction.
  if (trimVolume && !deload) {
    sets = Math.max(1, sets - 1);
  }

  // Pre-fill each working set with the prescription so the session screen
  // shows real, editable values rather than just placeholder text — you
  // only need to touch a field if you actually did something different.
  const workingSets = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    weight: prescribedWeight,
    reps: targetReps,
    done: false,
  }));

  return {
    exerciseId,
    repMin: slot.repMin,
    repMax: slot.repMax,
    sets,
    targetRIR,
    prescribedWeight,
    targetReps,
    prescriptionAction,
    warmupSets: [],
    workingSets,
    rir: null,
  };
}

// level: "sore" | "okay" | "great" — set before the first startDay() call
// for a given day so its exercise logs get built with volume trimmed if sore.
export function setCheckIn(weekNumber, dayTemplateId, level) {
  const day = getDay(weekNumber, dayTemplateId);
  day.checkIn = level;
  saveData(data);
}

export function startDay(weekNumber, dayTemplateId) {
  const day = getDay(weekNumber, dayTemplateId);
  const template = findDayTemplate(dayTemplateId);
  if (!day.exerciseLogs) {
    const trimVolume = day.checkIn === "sore";
    const logs = [];
    for (const ss of template.supersets) {
      for (const slot of ss.exercises) {
        logs.push(buildExerciseLog(slot.exerciseId, slot, weekNumber, trimVolume));
      }
    }
    day.exerciseLogs = logs;
  }
  if (!day.startedAt) day.startedAt = new Date().toISOString();
  day.status = "in_progress";
  saveData(data);
  return day;
}

export function logWorkingSet(weekNumber, dayTemplateId, exerciseId, setIndex, weight, reps) {
  const day = getDay(weekNumber, dayTemplateId);
  const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
  const done = log.workingSets[setIndex].done;
  log.workingSets[setIndex] = { setNumber: setIndex + 1, weight, reps, done };
  saveData(data);
}

export function markSetDone(weekNumber, dayTemplateId, exerciseId, setIndex, done) {
  const day = getDay(weekNumber, dayTemplateId);
  const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
  log.workingSets[setIndex].done = done;
  saveData(data);
}

export function setWarmups(weekNumber, dayTemplateId, exerciseId, warmupSets) {
  const day = getDay(weekNumber, dayTemplateId);
  const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
  log.warmupSets = warmupSets;
  saveData(data);
}

export function logRIR(weekNumber, dayTemplateId, exerciseId, rir) {
  const day = getDay(weekNumber, dayTemplateId);
  const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
  log.rir = rir;
  saveData(data);
}

export function setSessionNotes(weekNumber, dayTemplateId, notes) {
  const day = getDay(weekNumber, dayTemplateId);
  day.notes = notes;
  saveData(data);
}

export function finishDay(weekNumber, dayTemplateId) {
  const day = getDay(weekNumber, dayTemplateId);
  const template = findDayTemplate(dayTemplateId);
  const deload = isDeloadWeek(weekNumber, data.program.deloadEveryNWeeks, data.program.totalWeeks);

  day.status = "completed";
  day.completedAt = new Date().toISOString();

  if (!deload) {
    for (const log of day.exerciseLogs) {
      const performance = extractPerformance(log);
      if (!performance) continue;
      const slot = findSlot(template, log.exerciseId);
      const exerciseDef = EXERCISES[log.exerciseId];
      data.progressionCache[log.exerciseId] = computeNextPrescription(exerciseDef, slot, performance);
    }
  }

  const allDone = data.weeks.every((w) => w.days.every((d) => d.status === "completed"));
  if (allDone) data.program.status = "completed";

  saveData(data);
  return day;
}

// Manual Apple Watch stats (true HealthKit sync isn't reachable from a
// PWA — see js/screens/sessionSummary.js). Any field can be null if you
// don't have that number handy.
export function saveWatchStats(weekNumber, dayTemplateId, { avgHR, activeCalories, durationMinutes }) {
  const day = getDay(weekNumber, dayTemplateId);
  day.watchStats = { avgHR: avgHR ?? null, activeCalories: activeCalories ?? null, durationMinutes: durationMinutes ?? null };
  saveData(data);
}

// Full history of a single exercise across every completed session, oldest first.
export function getExerciseHistory(exerciseId) {
  const history = [];
  for (const week of data.weeks) {
    for (const day of week.days) {
      if (day.status !== "completed" || !day.exerciseLogs) continue;
      const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
      if (!log) continue;
      const performance = extractPerformance(log);
      if (!performance) continue;
      history.push({
        weekNumber: week.weekNumber,
        isDeload: week.isDeload,
        weight: performance.weightUsed,
        minReps: performance.minReps,
        rir: performance.rir,
      });
    }
  }
  return history;
}

// Simple PR: the heaviest weight ever confirmed for a weighted exercise
// (ties broken by reps), or the most reps ever for a bodyweight one.
export function getPR(exerciseId) {
  const hist = getExerciseHistory(exerciseId);
  if (hist.length === 0) return null;
  let best = hist[0];
  for (const h of hist) {
    if (h.weight != null && best.weight != null) {
      if (h.weight > best.weight || (h.weight === best.weight && h.minReps > best.minReps)) best = h;
    } else if (h.weight == null && best.weight == null) {
      if (h.minReps > best.minReps) best = h;
    }
  }
  return best;
}

// Every completed session (any exercise), most recent first — the "past
// sessions" view, as opposed to getExerciseHistory's per-exercise view.
export function getCompletedSessions() {
  const sessions = [];
  for (const week of data.weeks) {
    for (const day of week.days) {
      if (day.status !== "completed") continue;
      const template = findDayTemplate(day.dayTemplateId);
      sessions.push({
        weekNumber: week.weekNumber,
        isDeload: week.isDeload,
        dayTemplateId: day.dayTemplateId,
        dayLabel: template ? template.label : day.dayTemplateId,
        completedAt: day.completedAt,
        exerciseLogs: day.exerciseLogs,
        watchStats: day.watchStats || null,
        notes: day.notes || "",
      });
    }
  }
  sessions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  return sessions;
}

// Confirmed (checked-off) sets this week, attributed to each exercise's
// primary muscle group(s). An exercise with two primary muscles (e.g. Box
// Squat -> Quads + Glutes) counts its full set total toward each — a rough
// volume gauge, not a precise per-muscle accounting.
export function getWeeklyVolumeByMuscleGroup(weekNumber) {
  const week = getWeek(weekNumber);
  const totals = {};
  if (!week) return totals;
  for (const day of week.days) {
    if (!day.exerciseLogs) continue;
    for (const log of day.exerciseLogs) {
      const doneSets = log.workingSets.filter((s) => s.done).length;
      if (doneSets === 0) continue;
      const def = EXERCISES[log.exerciseId];
      for (const muscle of def.primary) {
        totals[muscle] = (totals[muscle] || 0) + doneSets;
      }
    }
  }
  return totals; // { "Quads": 9, "Chest": 6, ... }
}

export function getWeeksRemaining() {
  const next = getNextWorkout();
  if (!next) return 0;
  return data.program.totalWeeks - next.weekNumber + 1;
}

// One entry per unique exercise in the program's current day templates,
// with whatever is currently cached as its next prescription (null if the
// exercise hasn't completed a non-deload week yet, e.g. still in week 1).
export function getUpcomingPrescriptions() {
  const ids = new Set();
  data.dayTemplates.forEach((t) => t.supersets.forEach((ss) => ss.exercises.forEach((s) => ids.add(s.exerciseId))));
  return Array.from(ids).map((exerciseId) => ({
    exerciseId,
    prescription: data.progressionCache[exerciseId] || null,
  }));
}

// Lets you have the final say over what the algorithm prescribes for next
// time — e.g. you know you're actually ready for more than it calculated.
export function overridePrescription(exerciseId, weight, targetReps) {
  data.progressionCache[exerciseId] = { weight, targetReps, action: "manual_override" };
  saveData(data);
}

// Extends or shortens the program. Extending appends fresh pending weeks;
// shortening is refused if it would delete a week you've already started or
// completed. Deload scheduling is re-derived for any week not yet fully
// completed — completed weeks keep whatever actually happened, since that's
// historical fact, not a plan to be revised after the fact.
export function adjustProgramLength(newTotalWeeks) {
  if (!Number.isFinite(newTotalWeeks) || newTotalWeeks < 2 || newTotalWeeks > 52) {
    return { ok: false, reason: "Program length must be between 2 and 52 weeks." };
  }
  const current = data.program.totalWeeks;
  if (newTotalWeeks === current) return { ok: true };

  if (newTotalWeeks > current) {
    for (let w = current + 1; w <= newTotalWeeks; w++) {
      data.weeks.push({
        weekNumber: w,
        isDeload: isDeloadWeek(w, data.program.deloadEveryNWeeks, newTotalWeeks),
        days: data.dayTemplates.map((t) => ({
          dayTemplateId: t.id,
          status: "pending",
          completedAt: null,
          exerciseLogs: null,
        })),
      });
    }
  } else {
    const wouldRemove = data.weeks.filter((w) => w.weekNumber > newTotalWeeks);
    const hasProgress = wouldRemove.some((w) => w.days.some((d) => d.status !== "pending"));
    if (hasProgress) {
      return { ok: false, reason: "Can't shorten below a week you've already started or completed." };
    }
    data.weeks = data.weeks.filter((w) => w.weekNumber <= newTotalWeeks);
  }

  data.weeks.forEach((w) => {
    // A week where any day has been touched (in progress or completed) is
    // already "happening" under its original deload designation — only a
    // fully untouched week is fair game to recompute under the new length.
    const anyStarted = w.days.some((d) => d.status !== "pending");
    if (!anyStarted) {
      w.isDeload = isDeloadWeek(w.weekNumber, data.program.deloadEveryNWeeks, newTotalWeeks);
    }
  });

  data.program.totalWeeks = newTotalWeeks;
  if (data.program.status === "completed" && getNextWorkout()) {
    data.program.status = "active";
  }
  saveData(data);
  return { ok: true };
}

// ============================================================
// Missed-session handling
// ============================================================
// This program is self-paced by design — weeks aren't bound to calendar
// dates, so "missed" only means "it's been a while." When that happens we
// ask once (then stay quiet for a while) whether to skip the queued day and
// move on, or just leave it queued for whenever you get back to it.

const MISSED_GAP_DAYS = 4; // heuristic for a program built around 4x/week
const RENOTIFY_HOURS = 20; // don't re-ask every single time the app opens

function lastActivityISO() {
  let last = data.program.startDate;
  for (const week of data.weeks) {
    for (const day of week.days) {
      const stamp = day.completedAt || day.skippedAt;
      if (stamp && (!last || new Date(stamp) > new Date(last))) last = stamp;
    }
  }
  return last;
}

// Exposed for the training-reminder notification (js/notifications.js),
// which uses a much shorter threshold than the missed-session prompt above.
export function getDaysSinceLastActivity() {
  if (!data || !data.program) return Infinity;
  return (Date.now() - new Date(lastActivityISO()).getTime()) / 86400000;
}

// Returns { daysSince, next } if a missed-session prompt should be shown
// right now, else null.
export function checkMissedSession() {
  const next = getNextWorkout();
  if (!next) return null;

  const daysSince = (Date.now() - new Date(lastActivityISO()).getTime()) / 86400000;
  if (daysSince < MISSED_GAP_DAYS) return null;

  const lastPrompt = data.program.lastMissedPromptAt;
  if (lastPrompt) {
    const hoursSince = (Date.now() - new Date(lastPrompt).getTime()) / 3600000;
    if (hoursSince < RENOTIFY_HOURS) return null;
  }

  return { daysSince: Math.floor(daysSince), next };
}

// Dismiss without changing anything — the queued day stays queued
// (effectively "push everything back" since nothing here is date-locked).
export function acknowledgeMissedSession() {
  data.program.lastMissedPromptAt = new Date().toISOString();
  saveData(data);
}

// Mark the currently-queued day as skipped and move on — "stay on schedule."
export function skipNextDay() {
  const next = getNextWorkout();
  if (!next) return;
  const day = getDay(next.weekNumber, next.dayTemplateId);
  day.status = "skipped";
  day.skippedAt = new Date().toISOString();
  data.program.lastMissedPromptAt = new Date().toISOString();
  saveData(data);
}

// ============================================================
// General pain flag (any exercise, any joint — not hardcoded)
// ============================================================

export function flagPain(exerciseId, joint, note) {
  persistent.painFlags.push({
    id: uid(),
    exerciseId,
    joint,
    note: note || "",
    loggedAt: new Date().toISOString(),
    resolved: false,
  });
  savePersistent(persistent);
}

// Most recent unresolved flag for this exercise, or null.
export function getActivePainFlag(exerciseId) {
  const active = persistent.painFlags.filter((f) => f.exerciseId === exerciseId && !f.resolved);
  return active.length ? active[active.length - 1] : null;
}

export function resolvePainFlag(id) {
  const flag = persistent.painFlags.find((f) => f.id === id);
  if (flag) flag.resolved = true;
  savePersistent(persistent);
}

export function getAllPainFlags() {
  return persistent.painFlags;
}

// Swaps an exercise going forward for every future occurrence of this day
// (used when a pain-flag nudge leads to picking an alternative). Already-
// completed history stays keyed to the old exercise, which is correct —
// that's what you actually did.
export function swapExerciseInProgram(dayTemplateId, oldExerciseId, newExerciseId) {
  const template = findDayTemplate(dayTemplateId);
  const slot = findSlot(template, oldExerciseId);
  if (slot) slot.exerciseId = newExerciseId;
  saveData(data);
}

// ============================================================
// Body composition (weight/measurements + optional progress photo)
// ============================================================
// Photo binaries live in IndexedDB (see photoStore.js); entries here only
// hold a photoId reference plus the lightweight metadata.

export function addBodyEntry({
  dateISO,
  weight,
  bodyFatPct,
  muscleMassLb,
  waterPct,
  boneMassLb,
  visceralFat,
  metabolicAge,
  notes,
  photoId,
}) {
  persistent.bodyEntries.push({
    id: uid(),
    dateISO,
    weight: weight ?? null,
    bodyFatPct: bodyFatPct ?? null,
    muscleMassLb: muscleMassLb ?? null,
    waterPct: waterPct ?? null,
    boneMassLb: boneMassLb ?? null,
    visceralFat: visceralFat ?? null,
    metabolicAge: metabolicAge ?? null,
    notes: notes || "",
    photoId: photoId || null,
  });
  persistent.bodyEntries.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  savePersistent(persistent);
}

export function getBodyEntries() {
  return persistent.bodyEntries;
}

export function deleteBodyEntry(id) {
  persistent.bodyEntries = persistent.bodyEntries.filter((e) => e.id !== id);
  savePersistent(persistent);
}
