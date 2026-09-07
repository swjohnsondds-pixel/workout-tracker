// Exercise database + default program templates.
//
// Each exercise is tagged with:
//   - region: upper | lower | arms | core (which body area / which kind of day it belongs on)
//   - pattern: push | pull | hinge | squat | carry | core (movement pattern, used to find
//     sensible antagonist/compound-accessory superset pairings and swap alternatives)
//   - equipment: what's needed to perform it
//   - fitsDays: which of the 4 program day slots it can be scheduled into
//   - wgerId: matching entry on wger.de's open exercise DB for the how-to modal (null if
//     no confident match exists)
//   - primary/secondary: muscles worked, for the in-app muscle panel
//   - cue: a short, always-available local form tip

function ex({ name, region, pattern, isCompound, equipment, fitsDays, wgerId, primary, secondary, cue }) {
  return { name, region, pattern, isCompound, equipment, fitsDays, wgerId, primary, secondary, cue };
}

const UPPER_DAYS = ["upperA", "upperB"];
const LOWER_DAYS = ["lowerA", "lowerB"];
const ANY_DAY = ["upperA", "lowerA", "upperB", "lowerB"];

export const EXERCISES = {
  // ---- Upper push ----
  smith_bench: ex({
    name: "Smith Machine Bench Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "barbell", fitsDays: UPPER_DAYS, wgerId: 73,
    primary: ["Chest"], secondary: ["Triceps", "Front Delts"],
    cue: "Feet flat, shoulder blades pinched down and back, bar to lower chest, drive up without bouncing.",
  }),
  db_bench: ex({
    name: "Dumbbell Bench Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: 73,
    primary: ["Chest"], secondary: ["Triceps", "Front Delts"],
    cue: "Dumbbells over the chest, lower to a comfortable stretch, press up and slightly in without clanking them.",
  }),
  incline_smith_press: ex({
    name: "Incline Smith Machine Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "barbell", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Upper Chest"], secondary: ["Front Delts", "Triceps"],
    cue: "Bench around 30°, bar to your upper chest/collarbone line, avoid flaring elbows to 90°.",
  }),
  machine_chest_press: ex({
    name: "Machine Chest Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Chest"], secondary: ["Triceps", "Front Delts"],
    cue: "Set the seat so handles sit at mid-chest height, press without shrugging your shoulders up.",
  }),
  db_shoulder_press: ex({
    name: "Seated Dumbbell Shoulder Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Front/Side Delts"], secondary: ["Triceps", "Upper Chest"],
    cue: "Back supported, press the dumbbells up and slightly in without arching the lower back.",
  }),
  db_ohp: ex({
    name: "Standing Dumbbell Overhead Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Front/Side Delts"], secondary: ["Triceps", "Core (stabilizer)"],
    cue: "Brace your core, press straight overhead without leaning back excessively.",
  }),
  machine_shoulder_press: ex({
    name: "Machine Shoulder Press", region: "upper", pattern: "push", isCompound: true,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Front/Side Delts"], secondary: ["Triceps"],
    cue: "Handles start level with your shoulders, press up without arching away from the pad.",
  }),
  incline_db_fly: ex({
    name: "Incline Dumbbell Fly", region: "upper", pattern: "push", isCompound: false,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: 308,
    primary: ["Upper Chest"], secondary: ["Front Delts"],
    cue: "Slight bend in the elbows throughout, lower until you feel a stretch, squeeze at the top — don't press.",
  }),
  pec_deck: ex({
    name: "Pec Deck / Cable Crossover", region: "upper", pattern: "push", isCompound: false,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: 1904,
    primary: ["Chest"], secondary: ["Front Delts"],
    cue: "Slight bend in the elbows, bring the handles together in front of your chest, squeeze and control the return.",
  }),
  machine_chest_fly: ex({
    name: "Machine Chest Fly", region: "upper", pattern: "push", isCompound: false,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: 135,
    primary: ["Chest"], secondary: ["Front Delts"],
    cue: "Elbows soft and fixed, bring the pads together in an arc, don't let the weight stack slam down.",
  }),
  oh_tricep_ext: ex({
    name: "Overhead Cable Triceps Extension", region: "arms", pattern: "push", isCompound: false,
    equipment: "cable", fitsDays: LOWER_DAYS, wgerId: 1513,
    primary: ["Triceps"], secondary: ["Shoulders (stabilizers)"],
    cue: "Elbows pointed forward and stationary, extend fully without flaring the elbows out.",
  }),
  cable_tricep_pushdown: ex({
    name: "Cable Triceps Pushdown", region: "arms", pattern: "push", isCompound: false,
    equipment: "cable", fitsDays: LOWER_DAYS, wgerId: 1185,
    primary: ["Triceps"], secondary: ["Forearms"],
    cue: "Elbows pinned to your sides, push down to full extension without letting the elbows drift forward.",
  }),
  skull_crusher: ex({
    name: "Skull Crusher", region: "arms", pattern: "push", isCompound: false,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Triceps"], secondary: [],
    cue: "Upper arms stay vertical and still, lower the bar toward your forehead, extend without flaring elbows.",
  }),
  dip_machine: ex({
    name: "Assisted Dip Machine", region: "arms", pattern: "push", isCompound: true,
    equipment: "machine", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Triceps", "Chest"], secondary: ["Front Delts"],
    cue: "Lean slightly forward, lower until a comfortable stretch in the shoulder, press back up without locking out hard.",
  }),

  // ---- Upper pull ----
  db_row_single: ex({
    name: "Single-Arm Dumbbell Row", region: "upper", pattern: "pull", isCompound: true,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Lats", "Mid-Back"], secondary: ["Biceps", "Rear Delts"],
    cue: "Flat back, brace the free hand on a bench, pull the elbow straight back rather than up toward the ear.",
  }),
  cs_cable_row: ex({
    name: "Chest-Supported Cable Row", region: "upper", pattern: "pull", isCompound: true,
    equipment: "cable", fitsDays: UPPER_DAYS, wgerId: 1117,
    primary: ["Mid-Back", "Lats"], secondary: ["Biceps", "Rear Delts"],
    cue: "Chest against the pad, pull to your torso leading with the elbows, avoid using body momentum.",
  }),
  tbar_row: ex({
    name: "T-Bar Row", region: "upper", pattern: "pull", isCompound: true,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Mid-Back", "Lats"], secondary: ["Biceps", "Rear Delts"],
    cue: "Hinge forward with a flat back, pull the handles to your sternum, squeeze your shoulder blades together.",
  }),
  lat_pulldown_wide: ex({
    name: "Lat Pulldown (Wide Grip)", region: "upper", pattern: "pull", isCompound: true,
    equipment: "cable", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Lats"], secondary: ["Biceps", "Rear Delts", "Mid-Back"],
    cue: "Lean back slightly, pull the bar to your upper chest by driving elbows down, avoid swinging.",
  }),
  lat_pulldown_neutral: ex({
    name: "Lat Pulldown (Neutral Grip)", region: "upper", pattern: "pull", isCompound: true,
    equipment: "cable", fitsDays: UPPER_DAYS, wgerId: 1510,
    primary: ["Lats"], secondary: ["Biceps", "Mid-Back"],
    cue: "Neutral-grip handle, pull to your upper chest driving the elbows down and back.",
  }),
  assisted_pullup: ex({
    name: "Assisted Pull-Up", region: "upper", pattern: "pull", isCompound: true,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: 1929,
    primary: ["Lats"], secondary: ["Biceps", "Mid-Back"],
    cue: "Set only as much assistance as you need, pull your chest toward the bar rather than just your chin.",
  }),
  face_pull: ex({
    name: "Face Pull", region: "upper", pattern: "pull", isCompound: false,
    equipment: "cable", fitsDays: UPPER_DAYS, wgerId: 222,
    primary: ["Rear Delts"], secondary: ["Rotator Cuff", "Traps"],
    cue: "Rope to face height, pull apart and back, lead with the elbows high — great shoulder-health finisher.",
  }),
  rear_delt_fly: ex({
    name: "Rear Delt Fly", region: "upper", pattern: "pull", isCompound: false,
    equipment: "dumbbell", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Rear Delts"], secondary: ["Traps", "Rhomboids"],
    cue: "Hinge forward, soft elbow bend, raise the dumbbells out to the sides squeezing the shoulder blades together.",
  }),
  reverse_pec_deck: ex({
    name: "Reverse Pec Deck", region: "upper", pattern: "pull", isCompound: false,
    equipment: "machine", fitsDays: UPPER_DAYS, wgerId: null,
    primary: ["Rear Delts"], secondary: ["Traps", "Rhomboids"],
    cue: "Chest against the pad, sweep the handles back and out, squeeze the shoulder blades without shrugging.",
  }),
  db_curl: ex({
    name: "Dumbbell Bicep Curl", region: "arms", pattern: "pull", isCompound: false,
    equipment: "dumbbell", fitsDays: LOWER_DAYS, wgerId: 1931,
    primary: ["Biceps"], secondary: ["Forearms"],
    cue: "Elbows pinned to your sides, curl without swinging the torso, control the lowering phase.",
  }),
  cable_curl: ex({
    name: "Cable Bicep Curl", region: "arms", pattern: "pull", isCompound: false,
    equipment: "cable", fitsDays: LOWER_DAYS, wgerId: 1531,
    primary: ["Biceps"], secondary: ["Forearms"],
    cue: "Constant tension from the cable, elbows fixed at your sides, avoid leaning back to cheat the weight up.",
  }),
  ez_bar_curl: ex({
    name: "EZ-Bar Curl", region: "arms", pattern: "pull", isCompound: false,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Biceps"], secondary: ["Forearms"],
    cue: "Angled grip is easier on the wrists — elbows still, curl up without heaving the bar with your back.",
  }),
  hammer_curl: ex({
    name: "Hammer Curl", region: "arms", pattern: "pull", isCompound: false,
    equipment: "dumbbell", fitsDays: LOWER_DAYS, wgerId: 272,
    primary: ["Biceps", "Forearms"], secondary: [],
    cue: "Neutral (palms-in) grip throughout, curl straight up without letting the elbow drift forward.",
  }),

  // ---- Core ----
  pallof_press: ex({
    name: "Cable Pallof Press", region: "core", pattern: "core", isCompound: false,
    equipment: "cable", fitsDays: ANY_DAY, wgerId: 1194,
    primary: ["Obliques", "Core"], secondary: ["Shoulders (stabilizers)"],
    cue: "Stand perpendicular to the cable, press straight out and resist the pull rotating your torso.",
  }),
  cable_woodchop: ex({
    name: "Cable Woodchop", region: "core", pattern: "core", isCompound: false,
    equipment: "cable", fitsDays: ANY_DAY, wgerId: 145,
    primary: ["Obliques"], secondary: ["Core", "Shoulders"],
    cue: "Rotate from your torso and hips together, keep arms relatively fixed relative to your chest.",
  }),
  hanging_knee_raise: ex({
    name: "Hanging Knee Raise", region: "core", pattern: "core", isCompound: false,
    equipment: "bodyweight", fitsDays: ANY_DAY, wgerId: 978,
    primary: ["Lower Abs"], secondary: ["Hip Flexors"],
    cue: "Curl the pelvis up rather than just swinging the legs — controlled tempo, no momentum.",
  }),
  cable_crunch: ex({
    name: "Cable Crunch", region: "core", pattern: "core", isCompound: false,
    equipment: "cable", fitsDays: ANY_DAY, wgerId: null,
    primary: ["Abs"], secondary: [],
    cue: "Kneel below the cable, curl your ribs toward your hips — hips stay still, this isn't a hip hinge.",
  }),
  side_plank: ex({
    name: "Side Plank", region: "core", pattern: "core", isCompound: false,
    equipment: "bodyweight", fitsDays: ANY_DAY, wgerId: 580,
    primary: ["Obliques"], secondary: ["Core"],
    cue: "Stack your feet, hips lifted into a straight line, don't let your hips sag toward the floor.",
  }),

  // ---- Lower squat pattern ----
  box_squat: ex({
    name: "Box Squat (Limited Depth)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: 977,
    primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core"],
    cue: "Sit back to the box to about parallel — not deeper — pause briefly, then drive up through the heels.",
  }),
  smith_squat: ex({
    name: "Smith Machine Squat (Limited Depth)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Quads", "Glutes"], secondary: ["Hamstrings"],
    cue: "Feet slightly forward of the bar, lower to about parallel — not deeper — and press through the whole foot.",
  }),
  goblet_squat: ex({
    name: "Goblet Squat (Limited Depth)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "dumbbell", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Quads", "Glutes"], secondary: ["Core"],
    cue: "Hold the dumbbell at your chest, squat to about parallel — not deeper — elbows brushing your knees.",
  }),
  leg_press: ex({
    name: "Leg Press (Limited Depth)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "machine", fitsDays: LOWER_DAYS, wgerId: 371,
    primary: ["Quads"], secondary: ["Glutes", "Hamstrings"],
    cue: "Lower only until your thighs reach about 90°, don't let your lower back round off the pad.",
  }),
  hack_squat: ex({
    name: "Hack Squat (Limited Depth)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "machine", fitsDays: LOWER_DAYS, wgerId: 1414,
    primary: ["Quads"], secondary: ["Glutes"],
    cue: "Feet mid-platform, lower to about a 90° knee bend — not deeper — and drive through the whole foot.",
  }),
  bulgarian_split_squat: ex({
    name: "Bulgarian Split Squat (Shortened Range)", region: "lower", pattern: "squat", isCompound: true,
    equipment: "dumbbell", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core (balance)"],
    cue: "Rear foot on a low bench, lower only partway to protect the front hip — no need to go deep.",
  }),
  calf_raise: ex({
    name: "Standing Calf Raise", region: "lower", pattern: "calf", isCompound: false,
    equipment: "machine", fitsDays: LOWER_DAYS, wgerId: 622,
    primary: ["Calves"], secondary: [],
    cue: "Full stretch at the bottom, pause, then rise as high onto the toes as you can and squeeze.",
  }),
  seated_calf_raise: ex({
    name: "Seated Calf Raise", region: "lower", pattern: "calf", isCompound: false,
    equipment: "machine", fitsDays: LOWER_DAYS, wgerId: null,
    primary: ["Calves"], secondary: [],
    cue: "Knees bent under the pad, full stretch at the bottom, pause and squeeze at the top of each rep.",
  }),

  // ---- Lower hinge pattern ----
  hip_thrust: ex({
    name: "Barbell Hip Thrust", region: "lower", pattern: "hinge", isCompound: true,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: 294,
    primary: ["Glutes"], secondary: ["Hamstrings", "Core"],
    cue: "Upper back on the bench, chin tucked, drive hips up to full extension and squeeze the glutes at the top.",
  }),
  single_leg_rdl: ex({
    name: "Single-Leg Romanian Deadlift", region: "lower", pattern: "hinge", isCompound: true,
    equipment: "dumbbell", fitsDays: LOWER_DAYS, wgerId: 1388,
    primary: ["Hamstrings", "Glutes"], secondary: ["Core", "Lower Back"],
    cue: "Soft bend in the standing knee, hinge at the hip and reach the dumbbell toward the floor, back flat.",
  }),
  barbell_rdl: ex({
    name: "Barbell Romanian Deadlift", region: "lower", pattern: "hinge", isCompound: true,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: 507,
    primary: ["Hamstrings", "Glutes"], secondary: ["Lower Back"],
    cue: "Soft knees, push your hips back and lower the bar close to your legs, flat back throughout.",
  }),
  good_morning: ex({
    name: "Good Morning", region: "lower", pattern: "hinge", isCompound: true,
    equipment: "barbell", fitsDays: LOWER_DAYS, wgerId: 1392,
    primary: ["Hamstrings", "Lower Back"], secondary: ["Glutes"],
    cue: "Bar on your upper back, soft knees, hinge forward keeping a flat back until you feel a hamstring stretch.",
  }),
  cable_pull_through: ex({
    name: "Cable Pull-Through", region: "lower", pattern: "hinge", isCompound: true,
    equipment: "cable", fitsDays: LOWER_DAYS, wgerId: 1751,
    primary: ["Glutes", "Hamstrings"], secondary: ["Lower Back"],
    cue: "Cable between your legs, hinge forward reaching back, then drive your hips forward to stand tall.",
  }),
};

// slot: { exerciseId, sets, repMin, repMax, targetRIR }
function slot(exerciseId, sets, repMin, repMax, targetRIR) {
  return { exerciseId, sets, repMin, repMax, targetRIR };
}

export const DEFAULT_DAY_TEMPLATES = [
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

// Alternatives for a given slot: same day-fit, same movement pattern, not
// already used elsewhere in that day's template. Used by the exercise
// review/edit screen to offer sensible swaps that keep set/rep scheme,
// superset pairing logic, and time budget intact.
export function getAlternatives(exerciseId, dayTemplateId, excludeIds = []) {
  const original = EXERCISES[exerciseId];
  return Object.keys(EXERCISES).filter((id) => {
    if (id === exerciseId || excludeIds.includes(id)) return false;
    const candidate = EXERCISES[id];
    // Same movement pattern AND same compound/isolation role, so a heavy
    // compound lift never surfaces as a "swap" for an accessory slot (e.g.
    // calf raises and squats both used to share the "squat" pattern bucket).
    return (
      candidate.fitsDays.includes(dayTemplateId) &&
      candidate.pattern === original.pattern &&
      candidate.isCompound === original.isCompound
    );
  });
}
