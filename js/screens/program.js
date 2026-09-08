import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";
import { openModal, closeModal } from "../modal.js";
import { icon } from "../icons.js";

function prescriptionText(entry) {
  const p = entry.prescription;
  if (!p) return "Not yet established (needs a completed non-deload week)";
  if (p.weight != null) return `${p.weight} lb × ${p.targetReps}`;
  return `${p.targetReps} reps (bodyweight)`;
}

function openOverrideModal(exerciseId, onSaved) {
  const def = EXERCISES[exerciseId];
  const current = State.getData().progressionCache[exerciseId];
  const isBW = def.equipment === "bodyweight";

  const body = openModal(`
    <h2>Adjust ${def.name}</h2>
    <p class="subtle" style="margin-bottom:16px;">Overrides what's prescribed next time you do this exercise. Sets/rep-range/RIR stay the same — just the target weight/reps change.</p>
    <div class="field">
      ${isBW ? "" : `<label for="ovWeight">Weight (lb)</label><input type="number" inputmode="decimal" id="ovWeight" value="${current?.weight ?? ""}" />`}
    </div>
    <div class="field">
      <label for="ovReps">Target reps</label>
      <input type="number" inputmode="numeric" id="ovReps" value="${current?.targetReps ?? ""}" />
    </div>
    <button class="btn" id="saveOverride">Save</button>
  `);

  body.querySelector("#saveOverride").addEventListener("click", () => {
    const weightInput = body.querySelector("#ovWeight");
    const repsInput = body.querySelector("#ovReps");
    const weight = weightInput ? parseFloat(weightInput.value) : null;
    const reps = parseInt(repsInput.value, 10);
    if (!Number.isFinite(reps)) {
      alert("Enter a target rep count.");
      return;
    }
    // A null weight downstream means "this is a bodyweight exercise" (see
    // prescriptionText below and workoutSession.js) — never let a weighted
    // exercise get saved with an empty weight, or it'll silently render as
    // if it were bodyweight next session.
    if (!isBW && !Number.isFinite(weight)) {
      alert("Enter a target weight.");
      return;
    }
    State.overridePrescription(exerciseId, isBW ? null : weight, reps);
    closeModal();
    onSaved();
  });
}

export function render(container, { navigate }) {
  const data = State.getData();
  if (!data) {
    navigate("dashboard");
    return;
  }
  const program = data.program;
  const next = State.getNextWorkout();
  const weeksRemaining = State.getWeeksRemaining();
  const pct = Math.round(((program.totalWeeks - weeksRemaining) / program.totalWeeks) * 100);

  let draftWeeks = program.totalWeeks;

  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>My Program</h1>

    <div class="card">
      <h2>Progress</h2>
      <p class="subtle">${next ? `Week ${next.weekNumber} of ${program.totalWeeks} · ${weeksRemaining} week${weeksRemaining === 1 ? "" : "s"} remaining` : "Program complete"}</p>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="card">
      <h2 style="text-align:center;">Program Length</h2>
      <div class="stepper">
        <button type="button" id="decBtn" aria-label="Decrease">−</button>
        <div class="stepper-value">
          <span class="stat-num" id="weeksValue">${draftWeeks}</span>
          <span class="eyebrow">weeks</span>
        </div>
        <button type="button" id="incBtn" aria-label="Increase">+</button>
      </div>
      <p class="subtle" id="lengthNote" style="text-align:center;margin-bottom:10px;">Currently ${program.totalWeeks} weeks.</p>
      <button class="btn secondary" id="saveLengthBtn" disabled>Save Length</button>
    </div>

    <div class="settings-group">
      <span class="eyebrow">Upcoming Prescriptions</span>
      <div class="settings-list" id="prescriptionList"></div>
    </div>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => navigate("dashboard"));

  const weeksValueEl = container.querySelector("#weeksValue");
  const lengthNote = container.querySelector("#lengthNote");
  const saveLengthBtn = container.querySelector("#saveLengthBtn");

  function syncLengthUI() {
    weeksValueEl.textContent = draftWeeks;
    saveLengthBtn.disabled = draftWeeks === program.totalWeeks;
    lengthNote.textContent =
      draftWeeks === program.totalWeeks
        ? `Currently ${program.totalWeeks} weeks.`
        : draftWeeks > program.totalWeeks
          ? `Adds ${draftWeeks - program.totalWeeks} more week(s) to the end.`
          : `Removes ${program.totalWeeks - draftWeeks} week(s) from the end.`;
  }

  container.querySelector("#decBtn").addEventListener("click", () => {
    draftWeeks = Math.max(2, draftWeeks - 1);
    syncLengthUI();
  });
  container.querySelector("#incBtn").addEventListener("click", () => {
    draftWeeks = Math.min(52, draftWeeks + 1);
    syncLengthUI();
  });

  saveLengthBtn.addEventListener("click", () => {
    const result = State.adjustProgramLength(draftWeeks);
    if (!result.ok) {
      alert(result.reason);
      draftWeeks = program.totalWeeks;
      syncLengthUI();
      return;
    }
    render(container, { navigate });
  });

  function paintPrescriptions() {
    const list = container.querySelector("#prescriptionList");
    const entries = State.getUpcomingPrescriptions().sort((a, b) => EXERCISES[a.exerciseId].name.localeCompare(EXERCISES[b.exerciseId].name));
    list.innerHTML = entries
      .map(
        (entry) => `
          <button type="button" class="settings-row" data-edit="${entry.exerciseId}">
            <div class="row-text">
              ${EXERCISES[entry.exerciseId].name}
              <div class="row-sub">${prescriptionText(entry)}</div>
            </div>
            <span class="row-chevron">${icon("pencil", { size: 14 })}</span>
          </button>
        `
      )
      .join("");

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openOverrideModal(btn.dataset.edit, paintPrescriptions);
      });
    });
  }

  paintPrescriptions();
}
