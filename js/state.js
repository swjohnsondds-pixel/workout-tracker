import { DAY_TEMPLATES, EXERCISES } from "./exercises.js";
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
  return DAY_TEMPLATES.find((t) => t.id === dayTemplateId);
}

function findSlot(dayTemplate, exerciseId) {
  for (const ss of dayTemplate.supersets) {
    const found = ss.exercises.find((e) => e.exerciseId === exerciseId);
    if (found) return found;
  }
  return null;
}

export function createProgram(totalWeeks, deloadEveryNWeeks = 4, units = "lb") {
  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    weeks.push({
      weekNumber: w,
      isDeload: isDeloadWeek(w, deloadEveryNWeeks),
      days: DAY_TEMPLATES.map((t) => ({
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
  const deload = isDeloadWeek(weekNumber, data.program.deloadEveryNWeeks);
  const cached = data.progressionCache[exerciseId];

  let prescribedWeight = null;
  let targetReps = null;
  let sets = slot.sets;
  let targetRIR = slot.targetRIR;

  if (weekNumber === 1) {
    // Baseline week: no prescription, user logs whatever they do.
  } else if (cached) {
    if (deload) {
      const d = computeDeloadPrescription(exerciseDef, slot, cached);
      prescribedWeight = d.weight;
      targetReps = d.targetReps;
      sets = d.sets;
      targetRIR = d.targetRIR;
    } else {
      prescribedWeight = cached.weight;
      targetReps = cached.targetReps;
    }
  }

  return {
    exerciseId,
    repMin: slot.repMin,
    repMax: slot.repMax,
    sets,
    targetRIR,
    prescribedWeight,
    targetReps,
    warmupSets: [],
    workingSets: Array.from({ length: sets }, (_, i) => ({ setNumber: i + 1, weight: null, reps: null })),
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
  day.status = "in_progress";
  saveData(data);
  return day;
}

export function logWorkingSet(weekNumber, dayTemplateId, exerciseId, setIndex, weight, reps) {
  const day = getDay(weekNumber, dayTemplateId);
  const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
  log.workingSets[setIndex] = { setNumber: setIndex + 1, weight, reps };
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
  const deload = isDeloadWeek(weekNumber, data.program.deloadEveryNWeeks);

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
