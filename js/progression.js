// Progressive overload logic: reps-before-weight (Built from Broken style),
// a small percentage-capped weekly load increase, and RP-style deloads that
// only kick in for programs long enough to warrant one.
//
// The prescription for an upcoming (non-deload) week is derived entirely from
// the performance logged in the most recent *non-deload* week — deload weeks
// never feed back into progression.

import { roundToIncrement } from "./utils.js";

// "Small, sensible percentage" per week, per Built from Broken's conservative
// philosophy — not a target athletes should expect to hit every single week
// forever, just the ceiling on any one jump. Rounded to a real, loadable
// plate/dumbbell increment, with a floor of one increment so light isolation
// work (a 20lb curl, say) still has somewhere to go.
const PROGRESSION_PCT_CAP = 0.025;

// Programs this short or shorter never insert a deload — there isn't enough
// runway to justify one, and ending a 4-week program's last real session on
// a deliberately lightened week would be a poor use of the time available.
const MIN_WEEKS_FOR_DELOAD = 5;

export function isDeloadWeek(weekNumber, deloadEveryNWeeks, totalWeeks) {
  if (totalWeeks <= MIN_WEEKS_FOR_DELOAD) return false;
  return deloadEveryNWeeks > 0 && weekNumber % deloadEveryNWeeks === 0;
}

function weightIncrement(exerciseDef, currentWeight) {
  if (exerciseDef.equipment === "bodyweight") return 0;
  const granularity = exerciseDef.region === "lower" ? 10 : 5;
  const pctAmount = currentWeight * PROGRESSION_PCT_CAP;
  return Math.max(granularity, roundToIncrement(pctAmount, granularity));
}

// performance: { weightUsed, minReps, rir } pulled from a completed ExerciseLog
//
// Only sets explicitly checked off (`done`) count. Working sets are
// pre-filled with the prescribed weight/reps as a convenience — without this
// gate, an exercise the user never actually touched would silently read back
// as "performed exactly as prescribed" since its fields are never null.
export function extractPerformance(exerciseLog) {
  if (!exerciseLog || !exerciseLog.workingSets || exerciseLog.workingSets.length === 0) {
    return null;
  }
  const doneSets = exerciseLog.workingSets.filter((s) => s.done && Number.isFinite(s.reps));
  if (doneSets.length === 0) return null;
  return {
    weightUsed: doneSets[0].weight ?? null,
    minReps: Math.min(...doneSets.map((s) => s.reps)),
    rir: Number.isFinite(exerciseLog.rir) ? exerciseLog.rir : null,
  };
}

// Returns { weight, targetReps, action } for the next non-deload week.
// action is one of:
//   "increase_weight" — reps maxed out at a comfortable RIR, load went up, reps reset low
//   "increase_reps"   — under the rep cap, add a rep at the same weight
//   "hold"            — reps maxed out but RIR came in too low to load further safely
//   "maxed_bodyweight"— bodyweight move capped at its rep ceiling (no load to add)
export function computeNextPrescription(exerciseDef, slot, performance) {
  const { repMin, repMax, targetRIR } = slot;

  if (exerciseDef.equipment === "bodyweight") {
    const hitTop = performance.minReps >= repMax;
    return {
      weight: null,
      targetReps: Math.min(performance.minReps + 1, repMax),
      action: hitTop ? "maxed_bodyweight" : "increase_reps",
    };
  }

  const hitTop = performance.minReps >= repMax;
  const rirOk = performance.rir == null || performance.rir >= targetRIR;

  if (hitTop && rirOk) {
    return {
      weight: roundToIncrement(performance.weightUsed + weightIncrement(exerciseDef, performance.weightUsed)),
      targetReps: repMin,
      action: "increase_weight",
    };
  }
  if (hitTop && !rirOk) {
    // Reps maxed out but last week was ground out harder than the target RIR —
    // hold steady rather than load a joint that's already at its limit.
    return { weight: performance.weightUsed, targetReps: repMax, action: "hold" };
  }
  return {
    weight: performance.weightUsed,
    targetReps: Math.min(performance.minReps + 1, repMax),
    action: "increase_reps",
  };
}

// basePrescription is the normal (non-deload) prescription that would otherwise
// apply this week — the deload backs off from it, it does not replace it.
export function computeDeloadPrescription(exerciseDef, slot, basePrescription) {
  const sets = Math.max(1, slot.sets - 1);
  const targetRIR = slot.targetRIR + 2;

  if (exerciseDef.equipment === "bodyweight" || basePrescription.weight == null) {
    return { weight: null, targetReps: slot.repMin, sets, targetRIR, action: "deload" };
  }
  return {
    weight: roundToIncrement(basePrescription.weight * 0.6),
    targetReps: slot.repMin,
    sets,
    targetRIR,
    action: "deload",
  };
}
