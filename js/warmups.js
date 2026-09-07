// Warm-up set calculation for compound lifts. Working weight is whatever the
// user has entered/prescribed for the exercise that session — warm-ups are
// suggestions only and are never tracked for progression.

import { roundToIncrement } from "./utils.js";

export function calculateWarmups(exerciseDef, workingWeight) {
  if (!exerciseDef.isCompound) return [];
  if (exerciseDef.equipment === "bodyweight") return [];
  if (!workingWeight || workingWeight <= 0) return [];

  return [
    { weight: roundToIncrement(workingWeight * 0.5), reps: 8 },
    { weight: roundToIncrement(workingWeight * 0.75), reps: 3 },
  ];
}
