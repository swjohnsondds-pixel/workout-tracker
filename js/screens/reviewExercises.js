import * as State from "../state.js";
import { EXERCISES, DEFAULT_DAY_TEMPLATES, getAlternatives } from "../exercises.js";
import { openModal, closeModal } from "../modal.js";

// Working copy the user edits before the program is created. Re-created
// fresh each time this screen is entered from Program Setup.
let workingTemplates = null;
let workingWeeks = 8;

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_DAY_TEMPLATES));
}

function slotMeta(slot) {
  return `${slot.sets} × ${slot.repMin}-${slot.repMax} reps · RIR ${slot.targetRIR}`;
}

function exercisesUsedOnDay(dayTemplate) {
  const ids = [];
  dayTemplate.supersets.forEach((ss) => ss.exercises.forEach((s) => ids.push(s.exerciseId)));
  return ids;
}

function openSwapModal(dayTemplate, slot, onSwapped) {
  const usedIds = exercisesUsedOnDay(dayTemplate);
  const alternatives = getAlternatives(slot.exerciseId, dayTemplate.id, usedIds);

  const listHTML = alternatives.length
    ? alternatives
        .map((id) => {
          const alt = EXERCISES[id];
          return `
            <button type="button" class="alt-option" data-alt-id="${id}">
              <div class="alt-name">${alt.name}</div>
              <div class="alt-meta">${alt.primary.join(", ")} · ${alt.equipment}</div>
            </button>
          `;
        })
        .join("")
    : `<p class="subtle">No alternatives with the same movement pattern and equipment fit this slot yet — this exercise stays as-is.</p>`;

  const body = openModal(`
    <h2>Swap Exercise</h2>
    <p class="subtle" style="margin-bottom:14px;">Replacing <strong style="color:var(--text)">${EXERCISES[slot.exerciseId].name}</strong> — same sets/reps/RIR, just a different movement.</p>
    ${listHTML}
  `);

  body.querySelectorAll("[data-alt-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      slot.exerciseId = btn.dataset.altId;
      closeModal();
      onSwapped();
    });
  });
}

function dayCardHTML(dayTemplate) {
  const supersetsHTML = dayTemplate.supersets
    .map((ss) => {
      const rowsHTML = ss.exercises
        .map((slot) => {
          const ex = EXERCISES[slot.exerciseId];
          return `
            <div class="review-exercise-row">
              <div>
                <div class="rex-name">${ex.name}</div>
                <div class="rex-meta">${slotMeta(slot)}</div>
              </div>
              <button type="button" class="swap-btn" data-superset="${ss.id}" data-exercise="${slot.exerciseId}">Swap</button>
            </div>
          `;
        })
        .join("");
      return `<div class="review-superset-group">${rowsHTML}</div>`;
    })
    .join("");

  return `
    <div class="card review-day-card" data-day="${dayTemplate.id}">
      <h2>${dayTemplate.label}</h2>
      ${supersetsHTML}
    </div>
  `;
}

function attachSwapHandlers(container, rerender) {
  container.querySelectorAll(".review-day-card").forEach((dayCard) => {
    const dayId = dayCard.dataset.day;
    const dayTemplate = workingTemplates.find((t) => t.id === dayId);

    dayCard.querySelectorAll(".swap-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ss = dayTemplate.supersets.find((s) => s.id === btn.dataset.superset);
        const slot = ss.exercises.find((e) => e.exerciseId === btn.dataset.exercise);
        openSwapModal(dayTemplate, slot, rerender);
      });
    });
  });
}

export function render(container, { navigate, weeks }) {
  if (weeks) workingWeeks = weeks;
  if (!workingTemplates) workingTemplates = cloneDefaults();

  function rerender() {
    render(container, { navigate });
  }

  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>Review Your Exercises</h1>
    <p class="subtle" style="margin-bottom:18px;">
      Here's the default ${workingWeeks}-week program. Tap "Swap" on anything you'd rather do differently —
      swaps keep the same sets/reps/RIR so supersets and session length stay intact.
    </p>
    ${workingTemplates.map(dayCardHTML).join("")}
    <button class="btn" id="confirmBtn">Confirm &amp; Create Program</button>
    <button class="btn ghost" id="resetBtn">Reset to Defaults</button>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => {
    workingTemplates = null;
    navigate("setup");
  });

  container.querySelector("#resetBtn").addEventListener("click", () => {
    workingTemplates = cloneDefaults();
    rerender();
  });

  container.querySelector("#confirmBtn").addEventListener("click", () => {
    State.createProgram(workingWeeks, 4, "lb", workingTemplates);
    workingTemplates = null;
    navigate("dashboard");
  });

  attachSwapHandlers(container, rerender);
}
