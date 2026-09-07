import * as State from "../state.js";
import { DAY_TEMPLATES, EXERCISES } from "../exercises.js";
import { calculateWarmups } from "../warmups.js";

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

function exerciseCardHTML(log, weekNumber) {
  const exerciseDef = EXERCISES[log.exerciseId];
  const isBodyweight = exerciseDef.equipment === "bodyweight";

  const setsHTML = log.workingSets
    .map((set, i) => {
      const weightField = isBodyweight
        ? ""
        : `<input type="number" inputmode="decimal" class="set-weight" data-set="${i}" placeholder="${log.prescribedWeight ?? "lb"}" value="${set.weight ?? ""}" />`;
      return `
        <div class="set-row" style="grid-template-columns:${isBodyweight ? "28px 1fr" : "28px 1fr 1fr"}">
          <div class="set-label">${i + 1}</div>
          ${weightField}
          <input type="number" inputmode="numeric" class="set-reps" data-set="${i}" placeholder="${log.targetReps ?? log.repMax}" value="${set.reps ?? ""}" />
        </div>
      `;
    })
    .join("");

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
      <div class="exercise-name">${exerciseDef.name}</div>
      <div class="exercise-meta">${log.sets} sets · ${log.repMin}-${log.repMax} reps · target RIR ${log.targetRIR}</div>
      <div class="progress-note">${prescriptionText(log, weekNumber)}</div>
      <div class="warmup-row" data-warmup-row>${warmupText(exerciseDef, log)}</div>
      ${setsHTML}
      <div class="rir-row">
        <label>RIR (last set)</label>
        <div class="rir-pills">${rirPillsHTML}</div>
      </div>
    </div>
  `;
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
