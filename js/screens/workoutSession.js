import * as State from "../state.js";
import { DAY_TEMPLATES, EXERCISES } from "../exercises.js";
import { calculateWarmups } from "../warmups.js";
import { fetchHowTo } from "../howto.js";
import { openModal } from "../modal.js";

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

function doneLineText(exerciseDef, set) {
  if (exerciseDef.equipment === "bodyweight") {
    return `Set ${set.setNumber} — ${set.reps ?? "?"} reps`;
  }
  return `Set ${set.setNumber} — ${set.weight ?? "?"} lb × ${set.reps ?? "?"}`;
}

function setRowHTML(log, exerciseDef, i) {
  const set = log.workingSets[i];
  const isBodyweight = exerciseDef.equipment === "bodyweight";
  const cols = isBodyweight ? "28px 1fr 40px" : "28px 1fr 1fr 40px";

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
        <span class="check-icon">✓</span> ${doneLineText(exerciseDef, set)}
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
      <button type="button" class="exercise-name-btn" data-howto>${exerciseDef.name} <span class="info-icon">ⓘ how-to</span></button>
      <div class="exercise-meta">${log.sets} sets · ${log.repMin}-${log.repMax} reps · target RIR ${log.targetRIR}</div>
      <div class="progress-note">${prescriptionText(log, weekNumber)}</div>
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
    <div class="modal-media-slot"><div class="modal-loading">Loading demonstration…</div></div>
  `);

  const howto = await fetchHowTo(exerciseDef.wgerId);

  // The modal may have been closed (or replaced by a different exercise's
  // modal) while the fetch was in flight — bail out rather than touching a
  // detached node.
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
  const day = State.startDay(weekNumber, dayTemplateId);
  const template = DAY_TEMPLATES.find((t) => t.id === dayTemplateId);
  const week = State.getWeek(weekNumber);

  const supersetsHTML = template.supersets
    .map((ss) => {
      const cards = ss.exercises
        .map((slot) => {
          const log = day.exerciseLogs.find((l) => l.exerciseId === slot.exerciseId);
          return exerciseCardHTML(log, weekNumber);
        })
        .join("");
      return `<div class="superset-block">${cards}</div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>${template.label}</h1>
    <p class="subtle">Week ${weekNumber} of ${State.getData().program.totalWeeks}${week.isDeload ? " · Deload week" : ""}</p>
    ${supersetsHTML}
    <button class="btn" id="finishBtn">Finish Workout</button>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => navigate("dashboard"));

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

        const burst = document.createElement("span");
        burst.className = "checkmark-burst";
        burst.textContent = "✓";
        wrapper.appendChild(burst);
        setTimeout(() => burst.remove(), 600);

        setRow.classList.add("collapsing");
        setTimeout(() => {
          setRow.hidden = true;
          doneLine.textContent = "";
          doneLine.innerHTML = `<span class="check-icon">✓</span> ${doneLineText(exerciseDef, log.workingSets[i])}`;
          doneLine.hidden = false;
        }, 360);
      });

      doneLine.addEventListener("click", () => {
        State.markSetDone(weekNumber, dayTemplateId, exerciseId, i, false);
        log.workingSets[i].done = false;
        doneLine.hidden = true;
        setRow.hidden = false;
        setRow.classList.remove("collapsing");
      });
    });
  });

  container.querySelector("#finishBtn").addEventListener("click", () => {
    const anyEmpty = day.exerciseLogs.some((l) => l.workingSets.every((s) => s.reps == null));
    if (anyEmpty && !confirm("Some exercises have no logged sets. Finish workout anyway?")) {
      return;
    }
    State.finishDay(weekNumber, dayTemplateId);
    navigate(`summary/${weekNumber}/${dayTemplateId}`);
  });
}
