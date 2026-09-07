import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";
import { calculateWarmups } from "../warmups.js";
import { fetchHowTo } from "../howto.js";
import { openModal } from "../modal.js";

// ---- rest timer (module-level, independent of screen re-render) ----
const REST_RING_R = 22;
const REST_CIRCUMFERENCE = 2 * Math.PI * REST_RING_R;
let restTimer = { intervalId: null, el: null };

// Called by the router when navigating away from this screen by any means
// other than its own Back/Finish buttons (which already clean up inline) —
// e.g. tapping a tab-bar item mid-rest — so the timer never gets orphaned
// floating over a different screen.
export function cleanup() {
  clearRestTimer();
}

function clearRestTimer() {
  if (restTimer.intervalId) clearInterval(restTimer.intervalId);
  if (restTimer.el) restTimer.el.remove();
  restTimer = { intervalId: null, el: null };
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

// ---- helpers ----
function referenceWeight(log) {
  if (log.prescribedWeight != null) return log.prescribedWeight;
  const first = log.workingSets[0];
  return first && first.weight != null ? first.weight : null;
}

function warmupText(exerciseDef, log) {
  const ref = referenceWeight(log);
  const warmups = calculateWarmups(exerciseDef, ref);
  if (warmups.length === 0) return "";
  return warmups.map((w) => `<span>${w.weight} lb × ${w.reps}</span>`).join("");
}

function prescriptionText(log, weekNumber) {
  if (weekNumber === 1) return "Baseline week — log whatever weight/reps you hit.";
  if (log.prescribedWeight != null) return `Prescribed: ${log.prescribedWeight} lb × ${log.targetReps} reps`;
  if (log.targetReps != null) return `Prescribed: ${log.targetReps} reps (bodyweight)`;
  return "Log what you hit.";
}

// Only flag the cases worth a decision point — plain "add a rep this week"
// is the expected default and doesn't need its own badge every session.
const ACTION_FLAGS = {
  increase_weight: { label: "🔺 Weight up — reps maxed last week", cls: "flag-up" },
  hold: { label: "⏸ Holding — RIR was low last week", cls: "flag-hold" },
  maxed_bodyweight: { label: "⚠️ Reps maxed — consider a harder variation", cls: "flag-hold" },
};

function actionFlagHTML(log) {
  const flag = ACTION_FLAGS[log.prescriptionAction];
  return flag ? `<div class="action-flag ${flag.cls}">${flag.label}</div>` : "";
}

function chipsHTML(list) {
  return list.map((m) => `<span class="chip">${m}</span>`).join("");
}

function muscleSectionHTML(exerciseDef) {
  return `
    <button type="button" class="muscle-toggle" data-muscle-toggle>Muscles worked ▾</button>
    <div class="muscle-panel" hidden data-muscle-panel>
      <div class="muscle-group"><span class="muscle-label">Primary</span>${chipsHTML(exerciseDef.primary)}</div>
      ${exerciseDef.secondary.length ? `<div class="muscle-group"><span class="muscle-label">Secondary</span>${chipsHTML(exerciseDef.secondary)}</div>` : ""}
    </div>
  `;
}

function isSetDone(set) {
  return !!set.done;
}
function isExerciseComplete(log) {
  return log.workingSets.length > 0 && log.workingSets.every(isSetDone);
}

function doneLineHTML(exerciseDef, set) {
  const values = exerciseDef.equipment === "bodyweight" ? `${set.reps ?? "?"} reps` : `${set.weight ?? "?"} lb × ${set.reps ?? "?"}`;
  return `<span class="check-icon">✓</span> Set ${set.setNumber} <span class="set-values">${values}</span>`;
}

function setRowHTML(log, exerciseDef, i) {
  const set = log.workingSets[i];
  const isBodyweight = exerciseDef.equipment === "bodyweight";
  const cols = isBodyweight ? "26px 1fr 44px" : "26px 1fr 1fr 44px";

  const weightField = isBodyweight
    ? ""
    : `<input type="number" inputmode="decimal" class="set-weight" data-set="${i}" placeholder="${log.prescribedWeight ?? "lb"}" value="${set.weight ?? ""}" />`;

  return `
    <div class="set-row-wrapper" data-set-wrapper="${i}">
      <div class="set-row" data-set-row style="grid-template-columns:${cols}" ${set.done ? "hidden" : ""}>
        <div class="set-label">${i + 1}</div>
        ${weightField}
        <input type="number" inputmode="numeric" class="set-reps" data-set="${i}" placeholder="${log.targetReps ?? log.repMax}" value="${set.reps ?? ""}" />
        <button type="button" class="set-check" data-set="${i}" aria-label="Mark set done">✓</button>
      </div>
      <button type="button" class="set-done-line" data-set-reopen="${i}" ${set.done ? "" : "hidden"}>
        ${doneLineHTML(exerciseDef, set)}
      </button>
    </div>
  `;
}

function exerciseCardHTML(log, weekNumber) {
  const exerciseDef = EXERCISES[log.exerciseId];
  const setsHTML = log.workingSets.map((_, i) => setRowHTML(log, exerciseDef, i)).join("");

  const rirOptions = [0, 1, 2, 3, "4+"];
  const rirPillsHTML = rirOptions
    .map((r) => {
      const val = r === "4+" ? 4 : r;
      const selected = log.rir === val ? "selected" : "";
      return `<button type="button" class="rir-pill ${selected}" data-rir="${val}">${r}</button>`;
    })
    .join("");

  return `
    <div class="exercise-card" data-exercise-id="${log.exerciseId}">
      <span class="card-status-badge" data-status-badge></span>
      <button type="button" class="exercise-name-btn" data-howto>${exerciseDef.name} <span class="info-icon">ⓘ How-to</span></button>
      <div class="exercise-meta">${log.sets} sets · ${log.repMin}-${log.repMax} reps · target RIR ${log.targetRIR}</div>
      <div class="progress-note">${prescriptionText(log, weekNumber)}</div>
      ${actionFlagHTML(log)}
      <div class="warmup-row" data-warmup-row>${warmupText(exerciseDef, log)}</div>
      ${muscleSectionHTML(exerciseDef)}
      ${setsHTML}
      <div class="rir-row">
        <label>RIR (last set)</label>
        <div class="rir-pills">${rirPillsHTML}</div>
      </div>
    </div>
  `;
}

async function openHowTo(exerciseDef) {
  const body = openModal(`
    <h2>${exerciseDef.name}</h2>
    <div class="modal-cue">${exerciseDef.cue}</div>
    <div class="modal-media-slot"><div class="modal-loading"><span class="spinner"></span>Loading demonstration…</div></div>
  `);

  const howto = await fetchHowTo(exerciseDef.wgerId);
  const slot = body.isConnected ? body.querySelector(".modal-media-slot") : null;
  if (!slot) return;

  if (!howto || (!howto.video && !howto.image && !howto.description)) {
    slot.remove();
    return;
  }

  let mediaHTML = "";
  if (howto.video) {
    mediaHTML = `<video src="${howto.video}" controls playsinline muted></video>`;
  } else if (howto.image) {
    mediaHTML = `<img src="${howto.image}" alt="${exerciseDef.name} demonstration" />`;
  }
  const descHTML = howto.description ? `<div class="modal-description">${howto.description}</div>` : "";
  slot.innerHTML = mediaHTML + descHTML;
}

export function render(container, { navigate, weekNumber, dayTemplateId }) {
  clearRestTimer();

  const day = State.startDay(weekNumber, dayTemplateId);
  const template = State.getDayTemplates().find((t) => t.id === dayTemplateId);
  const week = State.getWeek(weekNumber);

  const supersetsHTML = template.supersets
    .map((ss) => {
      const cards = ss.exercises
        .map((slot) => {
          const log = day.exerciseLogs.find((l) => l.exerciseId === slot.exerciseId);
          return exerciseCardHTML(log, weekNumber);
        })
        .join("");
      return `<div class="superset-block" data-superset="${ss.id}">${cards}</div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="session-header">
      <div class="top-bar">
        <button class="back" id="backBtn">‹ Back</button>
      </div>
      <h1>${template.label}</h1>
      <p class="subtle">Week ${weekNumber} of ${State.getData().program.totalWeeks}${week.isDeload ? " · Deload week" : ""}</p>
      <div class="session-progress-row">
        <div class="progress-bar-track"><div class="progress-bar-fill" id="sessionProgressFill" style="width:0%"></div></div>
        <span class="progress-count" id="sessionProgressCount"></span>
      </div>
    </div>
    ${supersetsHTML}
    <button class="btn" id="finishBtn">Finish Workout</button>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => {
    clearRestTimer();
    navigate("dashboard");
  });

  // ---- flat exercise order, used to compute current/upcoming/complete ----
  const orderedIds = [];
  template.supersets.forEach((ss) => ss.exercises.forEach((slot) => orderedIds.push(slot.exerciseId)));

  function refreshCardStates() {
    let currentIndex = orderedIds.findIndex((id) => {
      const log = day.exerciseLogs.find((l) => l.exerciseId === id);
      return !isExerciseComplete(log);
    });
    if (currentIndex === -1) currentIndex = orderedIds.length; // everything complete

    orderedIds.forEach((id, i) => {
      const card = container.querySelector(`.exercise-card[data-exercise-id="${id}"]`);
      if (!card) return;
      const badge = card.querySelector("[data-status-badge]");
      card.classList.remove("state-current", "state-upcoming", "state-complete");
      if (i < currentIndex) {
        card.classList.add("state-complete");
        badge.textContent = "Done";
        badge.className = "card-status-badge complete";
      } else if (i === currentIndex) {
        card.classList.add("state-current");
        badge.textContent = "In Progress";
        badge.className = "card-status-badge current";
      } else {
        card.classList.add("state-upcoming");
        badge.textContent = "";
        badge.className = "card-status-badge";
      }
    });

    template.supersets.forEach((ss) => {
      const block = container.querySelector(`[data-superset="${ss.id}"]`);
      const ids = ss.exercises.map((s) => s.exerciseId);
      const logs = ids.map((id) => day.exerciseLogs.find((l) => l.exerciseId === id));
      const allDone = logs.every(isExerciseComplete);
      const anyCurrent = ids.some((id) => orderedIds.indexOf(id) === currentIndex);
      block.classList.toggle("complete", allDone);
      block.classList.toggle("active", !allDone && anyCurrent);
    });

    const totalSets = day.exerciseLogs.reduce((sum, l) => sum + l.workingSets.length, 0);
    const doneSets = day.exerciseLogs.reduce((sum, l) => sum + l.workingSets.filter(isSetDone).length, 0);
    container.querySelector("#sessionProgressFill").style.width = `${totalSets ? (doneSets / totalSets) * 100 : 0}%`;
    container.querySelector("#sessionProgressCount").textContent = `${doneSets}/${totalSets} sets`;
  }

  container.querySelectorAll(".exercise-card").forEach((card) => {
    const exerciseId = card.dataset.exerciseId;
    const log = day.exerciseLogs.find((l) => l.exerciseId === exerciseId);
    const exerciseDef = EXERCISES[exerciseId];

    card.querySelector("[data-howto]").addEventListener("click", () => openHowTo(exerciseDef));

    const muscleToggle = card.querySelector("[data-muscle-toggle]");
    const musclePanel = card.querySelector("[data-muscle-panel]");
    muscleToggle.addEventListener("click", () => {
      const hidden = musclePanel.hidden;
      musclePanel.hidden = !hidden;
      muscleToggle.textContent = hidden ? "Muscles worked ▴" : "Muscles worked ▾";
    });

    function persistAndMaybeRewarm(setIndex) {
      const weightInput = card.querySelector(`.set-weight[data-set="${setIndex}"]`);
      const repsInput = card.querySelector(`.set-reps[data-set="${setIndex}"]`);
      const weight = weightInput ? parseFloat(weightInput.value) : null;
      const reps = repsInput ? parseInt(repsInput.value, 10) : null;
      State.logWorkingSet(
        weekNumber,
        dayTemplateId,
        exerciseId,
        setIndex,
        Number.isFinite(weight) ? weight : null,
        Number.isFinite(reps) ? reps : null
      );
      log.workingSets[setIndex].weight = Number.isFinite(weight) ? weight : null;
      log.workingSets[setIndex].reps = Number.isFinite(reps) ? reps : null;
      if (setIndex === 0) {
        const warmupRow = card.querySelector("[data-warmup-row]");
        const warmups = calculateWarmups(exerciseDef, referenceWeight(log));
        warmupRow.innerHTML = warmups.map((w) => `<span>${w.weight} lb × ${w.reps}</span>`).join("");
        State.setWarmups(weekNumber, dayTemplateId, exerciseId, warmups);
      }
    }

    card.querySelectorAll(".set-weight").forEach((input) => {
      input.addEventListener("input", () => persistAndMaybeRewarm(Number(input.dataset.set)));
    });
    card.querySelectorAll(".set-reps").forEach((input) => {
      input.addEventListener("input", () => persistAndMaybeRewarm(Number(input.dataset.set)));
    });
    card.querySelectorAll(".rir-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        card.querySelectorAll(".rir-pill").forEach((p) => p.classList.remove("selected"));
        pill.classList.add("selected");
        State.logRIR(weekNumber, dayTemplateId, exerciseId, Number(pill.dataset.rir));
      });
    });

    card.querySelectorAll("[data-set-wrapper]").forEach((wrapper) => {
      const i = Number(wrapper.dataset.setWrapper);
      const setRow = wrapper.querySelector(".set-row");
      const doneLine = wrapper.querySelector(".set-done-line");
      const checkBtn = wrapper.querySelector(".set-check");

      checkBtn.addEventListener("click", () => {
        State.markSetDone(weekNumber, dayTemplateId, exerciseId, i, true);
        log.workingSets[i].done = true;

        checkBtn.classList.add("firing");

        const ring = document.createElement("span");
        ring.className = "burst-ring";
        wrapper.appendChild(ring);
        setTimeout(() => ring.remove(), 550);

        const burst = document.createElement("span");
        burst.className = "checkmark-burst";
        burst.textContent = "✓";
        wrapper.appendChild(burst);
        setTimeout(() => burst.remove(), 650);

        refreshCardStates();
        startRestTimer(exerciseDef.isCompound ? 90 : 60, exerciseDef.name);

        setTimeout(() => {
          setRow.classList.add("collapsing");
          setTimeout(() => {
            setRow.hidden = true;
            doneLine.innerHTML = doneLineHTML(exerciseDef, log.workingSets[i]);
            doneLine.hidden = false;
          }, 340);
        }, 150);
      });

      doneLine.addEventListener("click", () => {
        State.markSetDone(weekNumber, dayTemplateId, exerciseId, i, false);
        log.workingSets[i].done = false;
        doneLine.hidden = true;
        setRow.hidden = false;
        setRow.classList.remove("collapsing");
        checkBtn.classList.remove("firing");
        refreshCardStates();
      });
    });
  });

  refreshCardStates();

  container.querySelector("#finishBtn").addEventListener("click", () => {
    clearRestTimer();
    const anyEmpty = day.exerciseLogs.some((l) => l.workingSets.every((s) => !s.done));
    if (anyEmpty && !confirm("Some exercises have no confirmed sets. Finish workout anyway?")) {
      return;
    }
    State.finishDay(weekNumber, dayTemplateId);
    navigate(`summary/${weekNumber}/${dayTemplateId}`);
  });
}
