import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";

function buildSparkline(history) {
  const weights = history.map((h) => h.weight).filter((w) => w != null);
  if (weights.length < 2) return "";

  const w = 300;
  const h = 80;
  const pad = 8;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = history
    .map((entry, i) => {
      if (entry.weight == null) return null;
      const x = pad + (i / (history.length - 1)) * (w - pad * 2);
      const y = h - pad - ((entry.weight - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="margin-bottom:12px;">
      <polyline points="${points}" fill="none" stroke="#4f8cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

export function render(container, { navigate }) {
  const data = State.getData();

  if (!data) {
    container.innerHTML = `<h1>History</h1><div class="empty-state">No program yet.</div>`;
    return;
  }

  const exerciseIds = Object.keys(EXERCISES);
  const optionsHTML = exerciseIds.map((id) => `<option value="${id}">${EXERCISES[id].name}</option>`).join("");

  container.innerHTML = `
    <h1>History</h1>
    <select id="historyExercisePicker">${optionsHTML}</select>
    <div id="historyBody"></div>
  `;

  const picker = container.querySelector("#historyExercisePicker");
  const body = container.querySelector("#historyBody");

  function renderExercise(exerciseId) {
    const history = State.getExerciseHistory(exerciseId);
    if (history.length === 0) {
      body.innerHTML = `<div class="empty-state">No completed sessions for this exercise yet.</div>`;
      return;
    }
    const rows = history
      .map(
        (h) => `
          <div class="history-row ${h.isDeload ? "deload" : ""}">
            <div>Week ${h.weekNumber}${h.isDeload ? " (deload)" : ""}</div>
            <div>${h.weight != null ? h.weight + " lb" : "bw"} × ${h.minReps}</div>
            <div>${h.rir != null ? "RIR " + h.rir : "—"}</div>
          </div>
        `
      )
      .join("");

    body.innerHTML = `
      <div class="card">
        ${buildSparkline(history)}
        ${rows}
      </div>
    `;
  }

  picker.addEventListener("change", () => renderExercise(picker.value));
  renderExercise(picker.value);
}
