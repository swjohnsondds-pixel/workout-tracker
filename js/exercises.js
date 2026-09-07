// Static exercise library and day templates. This is seed data, not user data.

export const EXERCISES = {
  // Upper A
  smith_bench:        { name: "Smith Machine Bench Press",        region: "upper", isCompound: true,  equipment: "barbell" },
  db_row_single:       { name: "Single-Arm Dumbbell Row",          region: "upper", isCompound: true,  equipment: "dumbbell" },
  db_shoulder_press:   { name: "Seated Dumbbell Shoulder Press",   region: "upper", isCompound: true,  equipment: "dumbbell" },
  lat_pulldown_wide:   { name: "Lat Pulldown (Wide Grip)",         region: "upper", isCompound: true,  equipment: "cable" },
  incline_db_fly:      { name: "Incline Dumbbell Fly",             region: "upper", isCompound: false, equipment: "dumbbell" },
  face_pull:           { name: "Face Pull",                        region: "upper", isCompound: false, equipment: "cable" },
  pallof_press:        { name: "Cable Pallof Press",                region: "core",  isCompound: false, equipment: "cable" },

  // Lower A + Arms
  box_squat:           { name: "Box Squat (Limited Depth)",        region: "lower", isCompound: true,  equipment: "barbell" },
  hip_thrust:          { name: "Barbell Hip Thrust",                region: "lower", isCompound: true,  equipment: "barbell" },
  leg_press:           { name: "Leg Press (Limited Depth)",         region: "lower", isCompound: true,  equipment: "machine" },
  single_leg_rdl:      { name: "Single-Leg Romanian Deadlift",      region: "lower", isCompound: true,  equipment: "dumbbell" },
  db_curl:             { name: "Dumbbell Bicep Curl",               region: "arms",  isCompound: false, equipment: "dumbbell" },
  oh_tricep_ext:       { name: "Overhead Cable Triceps Extension",  region: "arms",  isCompound: false, equipment: "cable" },
  hanging_knee_raise:  { name: "Hanging Knee Raise",                 region: "core",  isCompound: false, equipment: "bodyweight" },

  // Upper B
  db_bench:            { name: "Dumbbell Bench Press",              region: "upper", isCompound: true,  equipment: "dumbbell" },
  cs_cable_row:        { name: "Chest-Supported Cable Row",         region: "upper", isCompound: true,  equipment: "cable" },
  db_ohp:              { name: "Standing Dumbbell Overhead Press",  region: "upper", isCompound: true,  equipment: "dumbbell" },
  lat_pulldown_neutral:{ name: "Lat Pulldown (Neutral Grip)",       region: "upper", isCompound: true,  equipment: "cable" },
  pec_deck:            { name: "Pec Deck / Cable Crossover",         region: "upper", isCompound: false, equipment: "machine" },
  rear_delt_fly:       { name: "Rear Delt Fly",                      region: "upper", isCompound: false, equipment: "dumbbell" },
  cable_woodchop:      { name: "Cable Woodchop",                     region: "core",  isCompound: false, equipment: "cable" },

  // Lower B + Arms
  hack_squat:          { name: "Hack Squat (Limited Depth)",        region: "lower", isCompound: true,  equipment: "machine" },
  barbell_rdl:         { name: "Barbell Romanian Deadlift",          region: "lower", isCompound: true,  equipment: "barbell" },
  bulgarian_split_squat:{ name: "Bulgarian Split Squat (Shortened Range)", region: "lower", isCompound: true, equipment: "dumbbell" },
  calf_raise:          { name: "Standing Calf Raise",                region: "lower", isCompound: false, equipment: "machine" },
  cable_curl:          { name: "Cable Bicep Curl",                   region: "arms",  isCompound: false, equipment: "cable" },
  cable_tricep_pushdown:{ name: "Cable Triceps Pushdown",            region: "arms",  isCompound: false, equipment: "cable" },
};

// slot: { exerciseId, sets, repMin, repMax, targetRIR }
function slot(exerciseId, sets, repMin, repMax, targetRIR) {
  return { exerciseId, sets, repMin, repMax, targetRIR };
}

export const DAY_TEMPLATES = [
  {
    id: "upperA",
    label: "Upper A",
    supersets: [
      { id: "ssA1", exercises: [slot("smith_bench", 3, 6, 10, 2), slot("db_row_single", 3, 6, 10, 2)] },
      { id: "ssA2", exercises: [slot("db_shoulder_press", 3, 8, 12, 2), slot("lat_pulldown_wide", 3, 8, 12, 2)] },
      { id: "ssA3", exercises: [slot("incline_db_fly", 3, 10, 15, 1), slot("face_pull", 3, 10, 15, 1)] },
      { id: "ssA4", exercises: [slot("pallof_press", 2, 12, 15, 2)] },
    ],
  },
  {
    id: "lowerA",
    label: "Lower A + Arms",
    supersets: [
      { id: "ssLA1", exercises: [slot("box_squat", 3, 6, 10, 2), slot("hip_thrust", 3, 6, 10, 2)] },
      { id: "ssLA2", exercises: [slot("leg_press", 3, 8, 12, 2), slot("single_leg_rdl", 3, 8, 12, 2)] },
      { id: "ssLA3", exercises: [slot("db_curl", 3, 10, 15, 1), slot("oh_tricep_ext", 3, 10, 15, 1)] },
      { id: "ssLA4", exercises: [slot("hanging_knee_raise", 2, 12, 15, 2)] },
    ],
  },
  {
    id: "upperB",
    label: "Upper B",
    supersets: [
      { id: "ssB1", exercises: [slot("db_bench", 3, 6, 10, 2), slot("cs_cable_row", 3, 6, 10, 2)] },
      { id: "ssB2", exercises: [slot("db_ohp", 3, 8, 12, 2), slot("lat_pulldown_neutral", 3, 8, 12, 2)] },
      { id: "ssB3", exercises: [slot("pec_deck", 3, 10, 15, 1), slot("rear_delt_fly", 3, 10, 15, 1)] },
      { id: "ssB4", exercises: [slot("cable_woodchop", 2, 12, 15, 2)] },
    ],
  },
  {
    id: "lowerB",
    label: "Lower B + Arms",
    supersets: [
      { id: "ssLB1", exercises: [slot("hack_squat", 3, 6, 10, 2), slot("barbell_rdl", 3, 6, 10, 2)] },
      { id: "ssLB2", exercises: [slot("bulgarian_split_squat", 3, 8, 12, 2), slot("calf_raise", 3, 8, 12, 1)] },
      { id: "ssLB3", exercises: [slot("cable_curl", 3, 10, 15, 1), slot("cable_tricep_pushdown", 3, 10, 15, 1)] },
      { id: "ssLB4", exercises: [slot("pallof_press", 2, 12, 15, 2)] },
    ],
  },
];
