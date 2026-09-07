import { DEFAULT_DAY_TEMPLATES, EXERCISES } from "./exercises.js";
import {
  isDeloadWeek,
  extractPerformance,
  computeNextPrescription,
  computeDeloadPrescription,
} from "./progression.js";
import { loadData, saveData } from "./storage.js";
import { uid, todayISO } from "./utils.js";

let data = null; // { program, weeks, progressionCache }

export function init() {
  data = loadData();
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

// First pending/in-progress day in week/day order.
export function getNextWorkout() {
  for (const week of data.weeks) {
    for (const day of week.days) {
      if (day.status !== "completed") {
        return { weekNumber: week.weekNumber, dayTemplateId: day.dayTemplateId, day, isDeload: week.isDeload };
      }
    }
  }
  return null; // program complete
}

function buildExerciseLog(exerciseId, slot, weekNumber) {
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

export function startDay(weekNumber, dayTemplateId) {
  const day = getDay(weekNumber, dayTemplateId);
  const template = findDayTemplate(dayTemplateId);
  if (!day.exerciseLogs) {
    const logs = [];
    for (const ss of template.supersets) {
      for (const slot of ss.exercises) {
        logs.push(buildExerciseLog(slot.exerciseId, slot, weekNumber));
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
      });
    }
  }
  sessions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  return sessions;
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
