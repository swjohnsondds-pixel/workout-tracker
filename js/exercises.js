// Static exercise library and day templates. This is seed data, not user data.
//
// wgerId points at a matching exercise on wger.de's open exercise database
// (https://wger.de/api/v2/exerciseinfo/<id>/) used for the in-app how-to
// video/image. It's null where no confident match exists (either nothing in
// wger's DB or the closest name match was actually a different movement) —
// the how-to modal falls back to the local `cue` text in that case.

function ex(name, region, isCompound, equipment, wgerId, primary, secondary, cue) {
  return { name, region, isCompound, equipment, wgerId, primary, secondary, cue };
}

export const EXERCISES = {
  // Upper A
  smith_bench: ex(
    "Smith Machine Bench Press", "upper", true, "barbell", 73,
    ["Chest"], ["Triceps", "Front Delts"],
    "Feet flat, shoulder blades pinched down and back, bar to lower chest, drive up without bouncing."
  ),
  db_row_single: ex(
    "Single-Arm Dumbbell Row", "upper", true, "dumbbell", null,
    ["Lats", "Mid-Back"], ["Biceps", "Rear Delts"],
    "Flat back, brace the free hand on a bench, pull the elbow straight back rather than up toward the ear."
  ),
  db_shoulder_press: ex(
    "Seated Dumbbell Shoulder Press", "upper", true, "dumbbell", null,
    ["Front/Side Delts"], ["Triceps", "Upper Chest"],
    "Back supported, press the dumbbells up and slightly in without arching the lower back."
  ),
  lat_pulldown_wide: ex(
    "Lat Pulldown (Wide Grip)", "upper", true, "cable", null,
    ["Lats"], ["Biceps", "Rear Delts", "Mid-Back"],
    "Lean back slightly, pull the bar to your upper chest by driving elbows down, avoid swinging."
  ),
  incline_db_fly: ex(
    "Incline Dumbbell Fly", "upper", false, "dumbbell", 308,
    ["Upper Chest"], ["Front Delts"],
    "Slight bend in the elbows throughout, lower until you feel a stretch, squeeze at the top — don't press."
  ),
  face_pull: ex(
    "Face Pull", "upper", false, "cable", 222,
    ["Rear Delts"], ["Rotator Cuff", "Traps"],
    "Rope to face height, pull apart and back, lead with the elbows high — great shoulder-health finisher."
  ),
  pallof_press: ex(
    "Cable Pallof Press", "core", false, "cable", 1194,
    ["Obliques", "Core"], ["Shoulders (stabilizers)"],
    "Stand perpendicular to the cable, press straight out and resist the pull rotating your torso."
  ),

  // Lower A + Arms
  box_squat: ex(
    "Box Squat (Limited Depth)", "lower", true, "barbell", 977,
    ["Quads", "Glutes"], ["Hamstrings", "Core"],
    "Sit back to the box to about parallel — not deeper — pause briefly, then drive up through the heels."
  ),
  hip_thrust: ex(
    "Barbell Hip Thrust", "lower", true, "barbell", 294,
    ["Glutes"], ["Hamstrings", "Core"],
    "Upper back on the bench, chin tucked, drive hips up to full extension and squeeze the glutes at the top."
  ),
  leg_press: ex(
    "Leg Press (Limited Depth)", "lower", true, "machine", 371,
    ["Quads"], ["Glutes", "Hamstrings"],
    "Lower only until your thighs reach about 90°, don't let your lower back round off the pad."
  ),
  single_leg_rdl: ex(
    "Single-Leg Romanian Deadlift", "lower", true, "dumbbell", 1388,
    ["Hamstrings", "Glutes"], ["Core", "Lower Back"],
    "Soft bend in the standing knee, hinge at the hip and reach the dumbbell toward the floor, back flat."
  ),
  db_curl: ex(
    "Dumbbell Bicep Curl", "arms", false, "dumbbell", 1931,
    ["Biceps"], ["Forearms"],
    "Elbows pinned to your sides, curl without swinging the torso, control the lowering phase."
  ),
  oh_tricep_ext: ex(
    "Overhead Cable Triceps Extension", "arms", false, "cable", 1513,
    ["Triceps"], ["Shoulders (stabilizers)"],
    "Elbows pointed forward and stationary, extend fully without flaring the elbows out."
  ),
  hanging_knee_raise: ex(
    "Hanging Knee Raise", "core", false, "bodyweight", 978,
    ["Lower Abs"], ["Hip Flexors"],
    "Curl the pelvis up rather than just swinging the legs — controlled tempo, no momentum."
  ),

  // Upper B
  db_bench: ex(
    "Dumbbell Bench Press", "upper", true, "dumbbell", 73,
    ["Chest"], ["Triceps", "Front Delts"],
    "Dumbbells over the chest, lower to a comfortable stretch, press up and slightly in without clanking them."
  ),
  cs_cable_row: ex(
    "Chest-Supported Cable Row", "upper", true, "cable", 1117,
    ["Mid-Back", "Lats"], ["Biceps", "Rear Delts"],
    "Chest against the pad, pull to your torso leading with the elbows, avoid using body momentum."
  ),
  db_ohp: ex(
    "Standing Dumbbell Overhead Press", "upper", true, "dumbbell", null,
    ["Front/Side Delts"], ["Triceps", "Core (stabilizer)"],
    "Brace your core, press straight overhead without leaning back excessively."
  ),
  lat_pulldown_neutral: ex(
    "Lat Pulldown (Neutral Grip)", "upper", true, "cable", 1510,
    ["Lats"], ["Biceps", "Mid-Back"],
    "Neutral-grip handle, pull to your upper chest driving the elbows down and back."
  ),
  pec_deck: ex(
    "Pec Deck / Cable Crossover", "upper", false, "machine", 1904,
    ["Chest"], ["Front Delts"],
    "Slight bend in the elbows, bring the handles together in front of your chest, squeeze and control the return."
  ),
  rear_delt_fly: ex(
    "Rear Delt Fly", "upper", false, "dumbbell", null,
    ["Rear Delts"], ["Traps", "Rhomboids"],
    "Hinge forward, soft elbow bend, raise the dumbbells out to the sides squeezing the shoulder blades together."
  ),
  cable_woodchop: ex(
    "Cable Woodchop", "core", false, "cable", 145,
    ["Obliques"], ["Core", "Shoulders"],
    "Rotate from your torso and hips together, keep arms relatively fixed relative to your chest."
  ),

  // Lower B + Arms
  hack_squat: ex(
    "Hack Squat (Limited Depth)", "lower", true, "machine", 1414,
    ["Quads"], ["Glutes"],
    "Feet mid-platform, lower to about a 90° knee bend — not deeper — and drive through the whole foot."
  ),
  barbell_rdl: ex(
    "Barbell Romanian Deadlift", "lower", true, "barbell", 507,
    ["Hamstrings", "Glutes"], ["Lower Back"],
    "Soft knees, push your hips back and lower the bar close to your legs, flat back throughout."
  ),
  bulgarian_split_squat: ex(
    "Bulgarian Split Squat (Shortened Range)", "lower", true, "dumbbell", null,
    ["Quads", "Glutes"], ["Hamstrings", "Core (balance)"],
    "Rear foot on a low bench, lower only partway to protect the front hip — no need to go deep."
  ),
  calf_raise: ex(
    "Standing Calf Raise", "lower", false, "machine", 622,
    ["Calves"], [],
    "Full stretch at the bottom, pause, then rise as high onto the toes as you can and squeeze."
  ),
  cable_curl: ex(
    "Cable Bicep Curl", "arms", false, "cable", 1531,
    ["Biceps"], ["Forearms"],
    "Constant tension from the cable, elbows fixed at your sides, avoid leaning back to cheat the weight up."
  ),
  cable_tricep_pushdown: ex(
    "Cable Triceps Pushdown", "arms", false, "cable", 1185,
    ["Triceps"], ["Forearms"],
    "Elbows pinned to your sides, push down to full extension without letting the elbows drift forward."
  ),
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
