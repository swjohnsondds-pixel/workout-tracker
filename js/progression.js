// Progressive overload logic: reps-before-weight (Built from Broken style),
// capped weekly load increases, fixed-cadence deloads.
//
// The prescription for an upcoming (non-deload) week is derived entirely from
// the performance logged in the most recent *non-deload* week — deload weeks
// never feed back into progression.

import { roundToIncrement } from "./utils.js";

export function isDeloadWeek(weekNumber, deloadEveryNWeeks) {
  return deloadEveryNWeeks > 0 && weekNumber % deloadEveryNWeeks === 0;
}

function weightIncrement(exerciseDef) {
  if (exerciseDef.equipment === "bodyweight") return 0;
  return exerciseDef.region === "lower" ? 10 : 5;
}

// performance: { weightUsed, minReps, rir } pulled from a completed ExerciseLog
export function extractPerformance(exerciseLog) {
  if (!exerciseLog || !exerciseLog.workingSets || exerciseLog.workingSets.length === 0) {
    return null;
  }
  const loggedReps = exerciseLog.workingSets.map((s) => s.reps).filter((r) => Number.isFinite(r));
  if (loggedReps.length === 0) return null;
  return {
    weightUsed: exerciseLog.workingSets[0].weight ?? null,
    minReps: Math.min(...loggedReps),
    rir: Number.isFinite(exerciseLog.rir) ? exerciseLog.rir : null,
  };
}

// Returns { weight, targetReps } for the next non-deload week.
export function computeNextPrescription(exerciseDef, slot, performance) {
  const { repMin, repMax, targetRIR } = slot;

  if (exerciseDef.equipment === "bodyweight") {
    return { weight: null, targetReps: Math.min(performance.minReps + 1, repMax) };
  }

  const hitTop = performance.minReps >= repMax;
  const rirOk = performance.rir == null || performance.rir >= targetRIR;

  if (hitTop && rirOk) {
    return {
      weight: roundToIncrement(performance.weightUsed + weightIncrement(exerciseDef)),
      targetReps: repMin,
    };
  }
  if (hitTop && !rirOk) {
    // Reps maxed out but last week was ground out harder than the target RIR —
    // hold steady rather than load a joint that's already at its limit.
    return { weight: performance.weightUsed, targetReps: repMax };
  }
  return {
    weight: performance.weightUsed,
    targetReps: Math.min(performance.minReps + 1, repMax),
  };
}

// basePrescription is the normal (non-deload) prescription that would otherwise
// apply this week — the deload backs off from it, it does not replace it.
export function computeDeloadPrescription(exerciseDef, slot, basePrescription) {
  const sets = Math.max(1, slot.sets - 1);
  const targetRIR = slot.targetRIR + 2;

  if (exerciseDef.equipment === "bodyweight" || basePrescription.weight == null) {
    return { weight: null, targetReps: slot.repMin, sets, targetRIR };
  }
  return {
    weight: roundToIncrement(basePrescription.weight * 0.6),
    targetReps: slot.repMin,
    sets,
    targetRIR,
  };
}
