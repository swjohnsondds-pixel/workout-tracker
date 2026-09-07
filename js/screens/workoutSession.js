import * as State from "../state.js";
import { EXERCISES, getAlternatives } from "../exercises.js";
import { calculateWarmups } from "../warmups.js";
import { fetchHowTo } from "../howto.js";
import { openModal, closeModal } from "../modal.js";

const PAIN_JOINTS = ["Shoulder", "Elbow", "Wrist", "Lower Back", "Hip", "Knee", "Ankle", "Other"];

const TARGET_MINUTES_MAX = 60;

// ---- rest timer + elapsed-time clock: module-level so the router's
// cleanup() hook can always reach them, regardless of which render() closure
// started them. ----
const REST_RING_R = 22;
const REST_CIRCUMFERENCE = 2 * Math.PI * REST_RING_R;
let restTimer = { intervalId: null, el: null };
let elapsedIntervalId = null;

// ---- rest timer audio alert ----
// iOS requires an AudioContext to be resumed from within a real user
// gesture before it'll play anything. We lazily create/resume it the
// moment the user taps "Mark Complete" (a real gesture) — the context
// then stays unlocked, so the LATER beep (fired from a setInterval
// callback when the timer hits zero, not a gesture) still plays fine.
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {
    audioCtx = null;
  }
}
function playRestDoneBeep() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // ignore — sound is a nice-to-have, never worth breaking the timer over
  }
}
// Note: iOS Safari has never implemented the Vibration API (on any
// version) — this is a real WebKit limitation, not a bug here. It's
// still worth calling defensively since it's free and would work on
// browsers that do support it.
function tryVibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {}
}

function clearRestTimer() {
  if (restTimer.intervalId) clearInterval(restTimer.intervalId);
  if (restTimer.el) restTimer.el.remove();
  restTimer = { intervalId: null, el: null };
}

function clearElapsedTimer() {
  if (elapsedIntervalId) clearInterval(elapsedIntervalId);
  elapsedIntervalId = null;
}

export function cleanup() {
  clearRestTimer();
  clearElapsedTimer();
}

function startRestTimer(seconds, label) {
  clearRestTimer();
  let remaining = seconds;

  const el = document.createElement("div");
  el.className = "rest-timer";
  el.innerHTML = `
    <div class="ring-wrap">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle class="ring-bg" cx="26" cy="26" r="${REST_RING_R}"></circle>
        <circle class="ring-progress" cx="26" cy="26" r="${REST_RING_R}" stroke-dasharray="${REST_CIRCUMFERENCE}" stroke-dashoffset="0"></circle>
      </svg>
      <div class="ring-time"></div>
    </div>
    <div class="rest-label">Rest<strong>${label}</strong></div>
    <button type="button" class="skip-btn">Skip</button>
  `;
  document.body.appendChild(el);
  restTimer.el = el;

  const ringProgress = el.querySelector(".ring-progress");
  const ringTime = el.querySelector(".ring-time");

  function tick() {
    const pct = Math.max(0, remaining / seconds);
    ringProgress.style.strokeDashoffset = String(REST_CIRCUMFERENCE * (1 - pct));
    if (remaining <= 0) {
      ringTime.textContent = "✓";
      el.classList.add("done");
      clearInterval(restTimer.intervalId);
      restTimer.intervalId = null;
      playRestDoneBeep();
      tryVibrate([200, 80, 200]);
      setTimeout(clearRestTimer, 1800);
    } else {
      ringTime.textContent = String(remaining);
    }
  }

  tick();
  restTimer.intervalId = setInterval(() => {
    remaining -= 1;
    tick();
  }, 1000);

  el.querySelector(".skip-btn").addEventListener("click", clearRestTimer);
}

// ---- pure markup helpers (no closure over session state) ----

const EQUIPMENT_PHOTOS = {
  barbell: "images/hero-barbell.jpg",
  dumbbell: "images/dumbbell-rack.jpg",
  cable: "images/dumbbells-row.jpg",
  machine: "images/dumbbells-row.jpg",
  bodyweight: "images/workout-moody.jpg",
};
function equipmentPhoto(equipment) {
  return EQUIPMENT_PHOTOS[equipment] || "images/dumbbells-row.jpg";
}

function warmupText(exerciseDef, referenceWeight) {
  const warmups = calculateWarmups(exerciseDef, referenceWeight);
  if (warmups.length === 0) return "";
  return warmups.map((w) => `<span>${w.weight} lb × ${w.reps}</span>`).join("");
}

function prescriptionText(log, weekNumber) {
  if (weekNumber === 1) return "Baseline — log whatever you hit.";
  if (log.prescribedWeight != null) return `Prescribed: ${log.prescribedWeight} lb × ${log.targetReps}`;
  if (log.targetReps != null) return `Prescribed: ${log.targetReps} reps (bodyweight)`;
  return "Log what you hit.";
}

const ACTION_FLAGS = {
  increase_weight: { label: "🔺 Weight up — reps maxed last week", cls: "flag-up" },
  hold: { label: "⏸ Holding — RIR was low last week", cls: "flag-hold" },
  maxed_bodyweight: { label: "⚠️ Reps maxed — consider a harder variation", cls: "flag-hold" },
  manual_override: { label: "✏️ Manually adjusted in My Program", cls: "flag-up" },
};

function actionFlagHTML(log) {
  const flag = ACTION_FLAGS[log.prescriptionAction];
  return flag ? `<div class="action-flag ${flag.cls}">${flag.label}</div>` : "";
}

function chipsHTML(list) {
  return list.map((m) => `<span class="chip">${m}</span>`).join("");
}

function muscleSectionHTML(def, id, isPair) {
  const label = isPair ? `${def.name} muscles` : "Muscles worked";
  return `
    <button type="button" class="muscle-toggle" data-muscle-toggle="${id}">${label} ▾</button>
    <div class="muscle-panel" hidden data-muscle-panel="${id}">
      <div class="muscle-group"><span class="muscle-label">Primary</span>${chipsHTML(def.primary)}</div>
      ${def.secondary.length ? `<div class="muscle-group"><span class="muscle-label">Secondary</span>${chipsHTML(def.secondary)}</div>` : ""}
    </div>
  `;
}

function doneLineInner(exerciseDef, set) {
  const values =
    exerciseDef.equipment === "bodyweight" ? `${set.reps ?? "?"} reps` : `${set.weight ?? "?"} lb × ${set.reps ?? "?"}`;
  return `<span class="check-icon">✓</span><span class="set-values">${values}</span>`;
}

function stepperFieldHTML(label, kind, exId, r, value, placeholder, showPlateCalc) {
  return `
    <div class="stepper-field">
      <span class="stepper-label">${label}</span>
      <div class="stepper-row">
        <button type="button" class="step-btn" data-step="-1" data-kind="${kind}" data-ex="${exId}" data-round="${r}">−</button>
        <input type="number" inputmode="${kind === "weight" ? "decimal" : "numeric"}" class="field-input" data-kind="${kind}" data-ex="${exId}" data-round="${r}" value="${value ?? ""}" placeholder="${placeholder ?? ""}" />
        <button type="button" class="step-btn" data-step="1" data-kind="${kind}" data-ex="${exId}" data-round="${r}">+</button>
      </div>
      ${showPlateCalc ? `<button type="button" class="plate-calc-link" data-plate-calc data-ex="${exId}" data-round="${r}">🏋️ Plate calculator</button>` : ""}
    </div>
  `;
}

// Standard 45lb bar + a typical commercial-gym plate set.
const BAR_WEIGHT = 45;
const AVAILABLE_PLATES = [45, 35, 25, 10, 5, 2.5];

function calculatePlates(targetWeight) {
  let perSide = (targetWeight - BAR_WEIGHT) / 2;
  if (perSide < 0) return { breakdown: [], leftover: perSide, tooLight: true };
  const breakdown = [];
  for (const plate of AVAILABLE_PLATES) {
    const count = Math.floor(perSide / plate + 1e-6);
    if (count > 0) {
      breakdown.push({ plate, count });
      perSide -= count * plate;
    }
  }
  return { breakdown, leftover: Math.round(perSide * 100) / 100, tooLight: false };
}

function openPlateCalcModal(exerciseName, weight) {
  if (!Number.isFinite(weight) || weight <= 0) {
    openModal(`<h2>Plate Calculator</h2><p class="subtle">Enter a weight for ${exerciseName} first.</p>`);
    return;
  }
  const result = calculatePlates(weight);
  const bodyHTML = result.tooLight
    ? `<p class="subtle">${weight} lb is below an empty ${BAR_WEIGHT} lb bar — no plates needed.</p>`
    : `
      <div class="plate-breakdown">
        ${
          result.breakdown.length
            ? result.breakdown.map((p) => `<div class="plate-row"><span class="plate-chip">${p.plate} lb</span><span>× ${p.count} per side</span></div>`).join("")
            : `<p class="subtle">Empty ${BAR_WEIGHT} lb bar gets you there.</p>`
        }
        ${result.leftover > 0.01 ? `<p class="subtle" style="margin-top:8px;">Closest exact match is ${(weight - result.leftover * 2).toFixed(1)} lb — off by ${(result.leftover * 2).toFixed(1)} lb given standard plates.</p>` : ""}
      </div>
    `;
  openModal(`
    <h2>Plate Calculator</h2>
    <p class="subtle" style="margin-bottom:14px;">${exerciseName} — ${weight} lb on a ${BAR_WEIGHT} lb bar</p>
    ${bodyHTML}
  `);
}

function rirRowHTML(log, exId, exName) {
  const options = [0, 1, 2, 3, "4+"];
  const pills = options
    .map((r) => {
      const val = r === "4+" ? 4 : r;
      return `<button type="button" class="rir-pill ${log.rir === val ? "selected" : ""}" data-rir-ex="${exId}" data-rir="${val}">${r}</button>`;
    })
    .join("");
  return `<div class="rir-row"><label>${exName} — RIR</label><div class="rir-pills">${pills}</div></div>`;
}

function painSectionHTML(exerciseId) {
  const def = EXERCISES[exerciseId];
  const flag = State.getActivePainFlag(exerciseId);
  if (!flag) {
    // General mid-workout swap is always available, independent of a pain
    // flag — flagging pain is a reason to swap, not the only way to.
    return `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
        <button type="button" class="btn small secondary" data-swap-ex="${exerciseId}" style="width:auto;">🔄 Swap Exercise</button>
        <button type="button" class="btn small secondary" data-flag-pain="${exerciseId}" style="width:auto;">🚩 Flag Pain</button>
      </div>
    `;
  }
  return `
    <div class="pain-banner">
      <strong>⚠️ ${def.name} — ${flag.joint} pain flagged</strong>
      ${flag.note ? `<span class="subtle">${flag.note}</span>` : ""}
      <div class="pain-banner-actions">
        <button type="button" class="btn small secondary" data-resolve-pain="${flag.id}">Feeling better</button>
        <button type="button" class="btn small" data-swap-ex="${exerciseId}">Swap exercise</button>
      </div>
    </div>
  `;
}

function openFlagPainModal(exerciseId, onSaved) {
  const def = EXERCISES[exerciseId];
  let selectedJoint = null;

  const body = openModal(`
    <h2>Flag Pain — ${def.name}</h2>
    <p class="subtle" style="margin-bottom:12px;">This logs the flag and nudges you toward a regression or alternative next time this exercise comes up.</p>
    <div class="joint-chip-row" id="jointChips">
      ${PAIN_JOINTS.map((j) => `<button type="button" class="joint-chip" data-joint="${j}">${j}</button>`).join("")}
    </div>
    <div class="field">
      <label for="painNote">Note (optional)</label>
      <input type="text" id="painNote" placeholder="What did it feel like?" />
    </div>
    <button class="btn" id="savePainBtn" disabled>Save Flag</button>
  `);

  const saveBtn = body.querySelector("#savePainBtn");
  body.querySelectorAll("[data-joint]").forEach((chip) => {
    chip.addEventListener("click", () => {
      body.querySelectorAll("[data-joint]").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedJoint = chip.dataset.joint;
      saveBtn.disabled = false;
    });
  });

  saveBtn.addEventListener("click", () => {
    if (!selectedJoint) return;
    State.flagPain(exerciseId, selectedJoint, body.querySelector("#painNote").value.trim());
    closeModal();
    onSaved();
  });
}

function openSwapModal(exerciseId, dayTemplateId, onSwapped) {
  const template = State.getDayTemplates().find((t) => t.id === dayTemplateId);
  const usedIds = template.supersets.flatMap((ss) => ss.exercises.map((e) => e.exerciseId));
  const alternatives = getAlternatives(exerciseId, dayTemplateId, usedIds);

  const body = openModal(`
    <h2>Swap Exercise</h2>
    <p class="subtle" style="margin-bottom:14px;">Replacing <strong style="color:var(--text)">${EXERCISES[exerciseId].name}</strong> going forward — same sets/reps/RIR, just a different equivalent movement.</p>
    ${
      alternatives.length
        ? alternatives
            .map(
              (id) => `
                <button type="button" class="alt-option" data-alt-id="${id}">
                  <div class="alt-name">${EXERCISES[id].name}</div>
                  <div class="alt-meta">${EXERCISES[id].primary.join(", ")} · ${EXERCISES[id].equipment}</div>
                </button>
              `
            )
            .join("")
        : `<p class="subtle">No alternatives with the same movement pattern fit this slot — talk to a coach or physio about a regression instead.</p>`
    }
  `);

  body.querySelectorAll("[data-alt-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      State.swapExerciseInProgram(dayTemplateId, exerciseId, btn.dataset.altId);
      closeModal();
      onSwapped();
    });
  });
}

function youtubeSearchURL(name) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form tutorial")}`;
}

// priorPR is captured BEFORE this set was marked done (from history only —
// this session hasn't been saved to history yet), so it genuinely reflects
// "the best you'd done before right now."
function checkForPR(exerciseId, set, priorPR) {
  if (set.reps == null || !priorPR) return; // no baseline yet (e.g. week 1) — nothing to beat
  const def = EXERCISES[exerciseId];
  let isNewPR = false;
  if (def.equipment === "bodyweight") {
    isNewPR = set.reps > priorPR.minReps;
  } else if (set.weight != null && priorPR.weight != null) {
    isNewPR = set.weight > priorPR.weight || (set.weight === priorPR.weight && set.reps > priorPR.minReps);
  }
  if (isNewPR) celebratePR(def, set.weight, set.reps);
}

function celebratePR(def, weight, reps) {
  const el = document.createElement("div");
  el.className = "pr-celebration";
  const detail = weight != null ? `${def.name} — ${weight} lb × ${reps}` : `${def.name} — ${reps} reps`;
  el.innerHTML = `
    <div class="pr-celebration-emoji">🎉</div>
    <div class="pr-celebration-title">New PR!</div>
    <div class="pr-celebration-detail">${detail}</div>
  `;
  document.body.appendChild(el);
  tryVibrate([120, 60, 120, 60, 200]);
  setTimeout(() => el.classList.add("fade-out"), 1700);
  setTimeout(() => el.remove(), 2100);
}

function youtubeLinkHTML(exerciseDef) {
  return `
    <a class="youtube-link" href="${youtubeSearchURL(exerciseDef.name)}" target="_blank" rel="noopener">
      ▶ Search YouTube for "${exerciseDef.name}"
    </a>
  `;
}

async function openHowTo(exerciseDef) {
  const body = openModal(`
    <h2>${exerciseDef.name}</h2>
    <div class="view-toggle">
      <button type="button" data-howto-tab="video" class="active">Watch Video</button>
      <button type="button" data-howto-tab="diagram">See Diagram</button>
    </div>
    <div class="howto-tab" data-tab-panel="video">
      <div class="modal-loading"><span class="spinner"></span>Looking for a demonstration…</div>
    </div>
    <div class="howto-tab" data-tab-panel="diagram" hidden>
      <div class="modal-loading"><span class="spinner"></span>Looking for a diagram…</div>
    </div>
  `);

  body.querySelectorAll("[data-howto-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      body.querySelectorAll("[data-howto-tab]").forEach((b) => b.classList.toggle("active", b === btn));
      body.querySelectorAll("[data-tab-panel]").forEach((p) => {
        p.hidden = p.dataset.tabPanel !== btn.dataset.howtoTab;
      });
    });
  });

  const howto = await fetchHowTo(exerciseDef.wgerId);
  if (!body.isConnected) return; // modal closed (or replaced) while fetching

  const videoPanel = body.querySelector('[data-tab-panel="video"]');
  const diagramPanel = body.querySelector('[data-tab-panel="diagram"]');

  const videoHTML = howto && howto.video
    ? `<video src="${howto.video}" controls playsinline muted></video><p class="subtle">Demonstration from our exercise database.</p>${youtubeLinkHTML(exerciseDef)}`
    : `<p class="subtle" style="margin-bottom:12px;">No demonstration video in our database for this exercise yet.</p>${youtubeLinkHTML(exerciseDef)}`;
  videoPanel.innerHTML = videoHTML;

  const chips = (list) => list.map((m) => `<span class="chip">${m}</span>`).join("");
  const imageHTML = howto && howto.image
    ? `<img src="${howto.image}" alt="${exerciseDef.name} diagram" />`
    : `<p class="subtle" style="margin-bottom:12px;">No diagram available from our database for this exercise.</p>`;
  const muscleHTML = `
    <div class="muscle-group"><span class="muscle-label">Primary</span>${chips(exerciseDef.primary)}</div>
    ${exerciseDef.secondary.length ? `<div class="muscle-group"><span class="muscle-label">Secondary</span>${chips(exerciseDef.secondary)}</div>` : ""}
  `;
  const descHTML = howto && howto.description ? `<div class="modal-description">${howto.description}</div>` : "";
  diagramPanel.innerHTML = `
    ${imageHTML}
    <div class="muscle-panel" style="margin-bottom:14px;">${muscleHTML}</div>
    <div class="modal-cue">${exerciseDef.cue}</div>
    ${descHTML}
  `;
}

// ================= main screen =================

export function render(container, { navigate, weekNumber, dayTemplateId }) {
  cleanup();

  const day = State.startDay(weekNumber, dayTemplateId);
  const template = State.getDayTemplates().find((t) => t.id === dayTemplateId);
  const week = State.getWeek(weekNumber);
  const program = State.getData().program;

  // One "unit" = one superset (1 or 2 exercises). This is the thing the user
  // focuses on at a time.
  const units = template.supersets.map((ss) => ({
    id: ss.id,
    exerciseIds: ss.exercises.map((s) => s.exerciseId),
  }));

  const findLog = (exId) => day.exerciseLogs.find((l) => l.exerciseId === exId);
  const isUnitComplete = (unit) => unit.exerciseIds.every((id) => findLog(id).workingSets.every((s) => s.done));

  let currentIndex = units.findIndex((u) => !isUnitComplete(u));
  if (currentIndex === -1) currentIndex = units.length - 1;

  container.innerHTML = `
    <div class="session-header">
      <div class="top-bar">
        <button class="back" id="backBtn">‹ Back</button>
        <button class="btn ghost" id="finishLink" style="width:auto;">Finish Early</button>
      </div>
      <h1>${template.label}</h1>
      <p class="subtle">Week ${weekNumber} of ${program.totalWeeks}${week.isDeload ? " · Deload week" : ""}</p>
      <div class="session-progress-row">
        <span class="unit-counter" id="unitCounter"></span>
        <span class="elapsed-time" id="elapsedTime"></span>
      </div>
      <div class="progress-bar-track"><div class="progress-bar-fill" id="sessionProgressFill" style="width:0%"></div></div>
      <p class="progress-count" id="sessionProgressCount"></p>
    </div>
    <div id="unitCardSlot"></div>
    <div class="unit-nav">
      <button type="button" id="prevBtn">‹ Prev</button>
      <button type="button" id="nextBtn">Next ›</button>
    </div>

    <div class="card" style="margin-top:18px;">
      <h2>Session Notes</h2>
      <textarea id="sessionNotes" class="notes-textarea" placeholder="How did this session feel? Anything worth remembering for next time?">${day.notes || ""}</textarea>
    </div>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => {
    cleanup();
    navigate("dashboard");
  });
  container.querySelector("#finishLink").addEventListener("click", () => attemptFinish());
  container.querySelector("#prevBtn").addEventListener("click", () => goToUnit(currentIndex - 1));
  container.querySelector("#nextBtn").addEventListener("click", () => {
    if (currentIndex === units.length - 1) attemptFinish();
    else goToUnit(currentIndex + 1);
  });
  container.querySelector("#sessionNotes").addEventListener("input", (e) => {
    State.setSessionNotes(weekNumber, dayTemplateId, e.target.value);
  });

  function attemptFinish() {
    const anyEmpty = day.exerciseLogs.some((l) => l.workingSets.every((s) => !s.done));
    if (anyEmpty && !confirm("Some exercises have no confirmed sets. Finish workout anyway?")) return;
    cleanup();
    State.finishDay(weekNumber, dayTemplateId);
    navigate(`summary/${weekNumber}/${dayTemplateId}`);
  }

  function updateHeaderProgress() {
    container.querySelector("#unitCounter").textContent = `Exercise ${currentIndex + 1} of ${units.length}`;
    const totalSets = day.exerciseLogs.reduce((sum, l) => sum + l.workingSets.length, 0);
    const doneSets = day.exerciseLogs.reduce((sum, l) => sum + l.workingSets.filter((s) => s.done).length, 0);
    container.querySelector("#sessionProgressFill").style.width = `${totalSets ? (doneSets / totalSets) * 100 : 0}%`;
    container.querySelector("#sessionProgressCount").textContent = `${doneSets} of ${totalSets} sets total`;
  }

  function updateNavButtons() {
    const prevBtn = container.querySelector("#prevBtn");
    const nextBtn = container.querySelector("#nextBtn");
    prevBtn.disabled = currentIndex === 0;
    const isLast = currentIndex === units.length - 1;
    nextBtn.className = "";
    if (isLast) {
      nextBtn.textContent = "Finish Workout ✓";
      nextBtn.classList.add("finish-primary");
    } else {
      nextBtn.textContent = "Next ›";
      if (isUnitComplete(units[currentIndex])) nextBtn.classList.add("next-primary");
    }
  }

  function goToUnit(index) {
    currentIndex = Math.max(0, Math.min(units.length - 1, index));
    paintUnit();
  }

  function unitCardHTML(unit) {
    const ids = unit.exerciseIds;
    const logs = ids.map(findLog);
    const defs = ids.map((id) => EXERCISES[id]);
    const isPair = ids.length === 2;

    const headerHTML = isPair
      ? `<div class="pair-header">
           <button type="button" class="exercise-name-btn" data-howto="${ids[0]}">${defs[0].name}</button>
           <span class="pair-plus">+</span>
           <button type="button" class="exercise-name-btn" data-howto="${ids[1]}">${defs[1].name}</button>
         </div>`
      : `<button type="button" class="exercise-name-btn" data-howto="${ids[0]}">${defs[0].name} <span class="info-icon">ⓘ How-to</span></button>`;

    const metaLine = `
      <div class="chip-pill-row">
        <span class="chip-pill">📊 ${logs[0].sets} ${isPair ? "rounds" : "sets"}</span>
        <span class="chip-pill">🔁 ${logs[0].repMin}-${logs[0].repMax} reps</span>
        <span class="chip-pill">🎯 RIR ${logs[0].targetRIR}</span>
      </div>
    `;
    const flagsHTML = logs.map(actionFlagHTML).join("");
    const painHTML = ids.map(painSectionHTML).join("");
    const muscleHTML = ids.map((id, i) => muscleSectionHTML(defs[i], id, isPair)).join("");

    const roundsCount = logs[0].sets;
    const roundsHTML = Array.from({ length: roundsCount }, (_, r) => roundBlockHTML(unit, r, isPair)).join("");
    const rirHTML = ids.map((id, i) => rirRowHTML(logs[i], id, defs[i].name)).join("");

    return `${headerHTML}${metaLine}${flagsHTML}${painHTML}${muscleHTML}${roundsHTML}${rirHTML}`;
  }

  function roundBlockHTML(unit, r, isPair) {
    const isFirstRound = r === 0;
    const exercisesHTML = unit.exerciseIds
      .map((id) => {
        const def = EXERCISES[id];
        const log = findLog(id);
        const set = log.workingSets[r];
        const isBW = def.equipment === "bodyweight";
        const refWeight = log.prescribedWeight != null ? log.prescribedWeight : set.weight;
        const warmup = isFirstRound && def.isCompound ? warmupText(def, refWeight) : "";

        return `
          <div class="round-exercise" data-ex="${id}" data-round="${r}">
            ${isPair ? `<div class="round-exercise-name">${def.name}</div>` : ""}
            ${isFirstRound ? `<div class="progress-note">${prescriptionText(log, weekNumber)}</div>` : ""}
            ${isFirstRound ? `<div class="warmup-row" data-warmup-for="${id}">${warmup}</div>` : ""}
            <div class="set-controls" ${set.done ? "hidden" : ""}>
              ${isBW ? "" : stepperFieldHTML("Weight (lb)", "weight", id, r, set.weight, log.prescribedWeight, def.equipment === "barbell")}
              ${stepperFieldHTML("Reps", "reps", id, r, set.reps, log.targetReps ?? log.repMax)}
              <button type="button" class="mark-complete-btn" data-complete data-ex="${id}" data-round="${r}">Mark Complete</button>
            </div>
            <button type="button" class="done-line" data-reopen data-ex="${id}" data-round="${r}" ${set.done ? "" : "hidden"}>
              ${doneLineInner(def, set)}
            </button>
          </div>
        `;
      })
      .join("");

    return `
      <div class="round-block" data-round-block="${r}">
        <div class="round-label">${isPair ? "Round" : "Set"} ${r + 1} of ${findLog(unit.exerciseIds[0]).sets}</div>
        ${exercisesHTML}
      </div>
    `;
  }

  function wireUnitCard(slot, unit) {
    const isPair = unit.exerciseIds.length === 2;

    slot.querySelectorAll("[data-howto]").forEach((btn) => {
      btn.addEventListener("click", () => openHowTo(EXERCISES[btn.dataset.howto]));
    });

    slot.querySelectorAll("[data-muscle-toggle]").forEach((btn) => {
      const id = btn.dataset.muscleToggle;
      const panel = slot.querySelector(`[data-muscle-panel="${id}"]`);
      btn.addEventListener("click", () => {
        const wasHidden = panel.hidden;
        panel.hidden = !wasHidden;
        btn.textContent = btn.textContent.replace(wasHidden ? "▾" : "▴", wasHidden ? "▴" : "▾");
      });
    });

    slot.querySelectorAll("[data-rir-ex]").forEach((pill) => {
      pill.addEventListener("click", () => {
        const exId = pill.dataset.rirEx;
        slot.querySelectorAll(`[data-rir-ex="${exId}"]`).forEach((p) => p.classList.remove("selected"));
        pill.classList.add("selected");
        State.logRIR(weekNumber, dayTemplateId, exId, Number(pill.dataset.rir));
      });
    });

    slot.querySelectorAll("[data-flag-pain]").forEach((btn) => {
      btn.addEventListener("click", () => openFlagPainModal(btn.dataset.flagPain, paintUnit));
    });
    slot.querySelectorAll("[data-resolve-pain]").forEach((btn) => {
      btn.addEventListener("click", () => {
        State.resolvePainFlag(btn.dataset.resolvePain);
        paintUnit();
      });
    });
    slot.querySelectorAll("[data-swap-ex]").forEach((btn) => {
      // Swapping changes the day template itself, not just this exercise's
      // log — re-run the whole screen render so `units` picks up the new
      // exerciseIds rather than trying to patch the current closure's copy.
      btn.addEventListener("click", () =>
        openSwapModal(btn.dataset.swapEx, dayTemplateId, () => render(container, { navigate, weekNumber, dayTemplateId }))
      );
    });

    slot.querySelectorAll("[data-plate-calc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const exId = btn.dataset.ex;
        const r = Number(btn.dataset.round);
        const input = slot.querySelector(`.field-input[data-ex="${exId}"][data-round="${r}"][data-kind="weight"]`);
        openPlateCalcModal(EXERCISES[exId].name, parseFloat(input.value));
      });
    });

    function persist(exId, r, kind, rawValue) {
      const log = findLog(exId);
      const set = log.workingSets[r];
      if (kind === "weight") {
        const w = parseFloat(rawValue);
        set.weight = Number.isFinite(w) ? w : null;
      } else {
        const rp = parseInt(rawValue, 10);
        set.reps = Number.isFinite(rp) ? rp : null;
      }
      State.logWorkingSet(weekNumber, dayTemplateId, exId, r, set.weight, set.reps);

      if (r === 0 && kind === "weight" && log.prescribedWeight == null) {
        const def = EXERCISES[exId];
        const warmupEl = slot.querySelector(`[data-warmup-for="${exId}"]`);
        if (warmupEl && def.isCompound) {
          warmupEl.innerHTML = warmupText(def, set.weight);
        }
      }
    }

    slot.querySelectorAll(".field-input").forEach((input) => {
      input.addEventListener("input", () =>
        persist(input.dataset.ex, Number(input.dataset.round), input.dataset.kind, input.value)
      );
    });

    slot.querySelectorAll(".step-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const exId = btn.dataset.ex;
        const r = Number(btn.dataset.round);
        const kind = btn.dataset.kind;
        const input = slot.querySelector(`.field-input[data-ex="${exId}"][data-round="${r}"][data-kind="${kind}"]`);
        const step = Number(btn.dataset.step);
        const current = parseFloat(input.value) || 0;
        const increment = kind === "weight" ? 5 : 1;
        const next = Math.max(0, current + step * increment);
        input.value = kind === "weight" ? next : Math.round(next);
        persist(exId, r, kind, input.value);
      });
    });

    slot.querySelectorAll("[data-complete]").forEach((btn) => {
      btn.addEventListener("click", () => handleComplete(btn.dataset.ex, Number(btn.dataset.round)));
    });
    slot.querySelectorAll("[data-reopen]").forEach((btn) => {
      btn.addEventListener("click", () => handleReopen(btn.dataset.ex, Number(btn.dataset.round)));
    });

    function handleComplete(exId, r) {
      unlockAudio(); // this tap is a real user gesture — unlock now so the rest timer's later beep can play

      const priorPR = State.getPR(exId);
      State.markSetDone(weekNumber, dayTemplateId, exId, r, true);
      const log = findLog(exId);
      log.workingSets[r].done = true;
      checkForPR(exId, log.workingSets[r], priorPR);

      const roundExerciseEl = slot.querySelector(`.round-exercise[data-ex="${exId}"][data-round="${r}"]`);
      const controls = roundExerciseEl.querySelector(".set-controls");
      const doneLine = roundExerciseEl.querySelector(".done-line");
      const completeBtn = roundExerciseEl.querySelector("[data-complete]");
      const def = EXERCISES[exId];

      completeBtn.classList.add("firing");
      const ring = document.createElement("span");
      ring.className = "burst-ring";
      roundExerciseEl.appendChild(ring);
      setTimeout(() => ring.remove(), 550);

      const burst = document.createElement("span");
      burst.className = "checkmark-burst";
      burst.textContent = "✓";
      roundExerciseEl.appendChild(burst);
      setTimeout(() => burst.remove(), 650);

      setTimeout(() => {
        controls.hidden = true;
        doneLine.innerHTML = doneLineInner(def, log.workingSets[r]);
        doneLine.hidden = false;
      }, 260);

      const roundComplete = unit.exerciseIds.every((id) => findLog(id).workingSets[r].done);
      if (roundComplete) {
        const roundBlock = slot.querySelector(`.round-block[data-round-block="${r}"]`);
        setTimeout(() => roundBlock.classList.add("collapsing"), 300);

        const wholeDayComplete = units.every(isUnitComplete);
        if (wholeDayComplete) {
          // The very last set of the whole session — nothing left to rest
          // for, so skip the rest timer and finish automatically. This is
          // the "no manual save step" path: checking off the last set is
          // enough, no separate Finish tap required.
          setTimeout(() => attemptFinish(), 700);
        } else {
          const anyCompound = unit.exerciseIds.some((id) => EXERCISES[id].isCompound);
          const label = unit.exerciseIds.map((id) => EXERCISES[id].name).join(" + ");
          startRestTimer(anyCompound ? 90 : 60, label);

          if (isUnitComplete(unit) && currentIndex < units.length - 1) {
            setTimeout(() => goToUnit(currentIndex + 1), 550);
          }
        }
      }
      updateHeaderProgress();
      updateNavButtons();
    }

    function handleReopen(exId, r) {
      State.markSetDone(weekNumber, dayTemplateId, exId, r, false);
      findLog(exId).workingSets[r].done = false;

      const roundExerciseEl = slot.querySelector(`.round-exercise[data-ex="${exId}"][data-round="${r}"]`);
      roundExerciseEl.querySelector(".set-controls").hidden = false;
      roundExerciseEl.querySelector(".done-line").hidden = true;
      roundExerciseEl.querySelector("[data-complete]").classList.remove("firing");

      const roundBlock = slot.querySelector(`.round-block[data-round-block="${r}"]`);
      roundBlock.classList.remove("collapsing");

      updateHeaderProgress();
      updateNavButtons();
    }
  }

  function paintUnit() {
    const slot = container.querySelector("#unitCardSlot");
    const unit = units[currentIndex];
    const photoURL = equipmentPhoto(EXERCISES[unit.exerciseIds[0]].equipment);
    slot.innerHTML = `<div class="unit-card"><div class="unit-card-photo" style="background-image:url('${photoURL}');"></div>${unitCardHTML(unit)}</div>`;
    wireUnitCard(slot.querySelector(".unit-card"), unit);
    updateHeaderProgress();
    updateNavButtons();
  }

  function startElapsedTimer() {
    function tick() {
      const el = container.querySelector("#elapsedTime");
      if (!el || !el.isConnected) {
        clearElapsedTimer();
        return;
      }
      const startedAt = day.startedAt ? new Date(day.startedAt).getTime() : Date.now();
      const mins = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
      el.textContent = `${mins} min elapsed`;
      el.classList.toggle("over-target", mins > TARGET_MINUTES_MAX);
    }
    tick();
    elapsedIntervalId = setInterval(tick, 15000);
  }

  paintUnit();
  startElapsedTimer();
}
