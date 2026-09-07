import * as State from "../state.js";
import { DAY_TEMPLATES, EXERCISES } from "../exercises.js";

export function render(container, { navigate, weekNumber, dayTemplateId }) {
  const day = State.getDay(weekNumber, dayTemplateId);
  const template = DAY_TEMPLATES.find((t) => t.id === dayTemplateId);
  const data = State.getData();

  if (!day || day.status !== "completed") {
    navigate("dashboard");
    return;
  }

  let setsCompleted = 0;
  let totalVolume = 0;
  for (const log of day.exerciseLogs) {
    for (const set of log.workingSets) {
      if (set.reps == null) continue;
      setsCompleted++;
      if (set.weight != null) totalVolume += set.weight * set.reps;
    }
  }

  const rowsHTML = day.exerciseLogs
    .map((log) => {
      const exerciseDef = EXERCISES[log.exerciseId];
      const setsText =
        log.workingSets
          .filter((s) => s.reps != null)
          .map((s) => (exerciseDef.equipment === "bodyweight" ? `${s.reps}` : `${s.weight ?? "?"}×${s.reps}`))
          .join(", ") || "not logged";

      const next = data.progressionCache[log.exerciseId];
      const nextText = next ? (next.weight != null ? `${next.weight} lb × ${next.targetReps}` : `${next.targetReps} reps`) : "";

      return `
        <div class="card recap-row">
          <div>
            <div class="exercise-name">${exerciseDef.name}</div>
            <div class="subtle">${setsText}${log.rir != null ? ` · RIR ${log.rir}` : ""}</div>
          </div>
          ${nextText ? `<div class="recap-next">Next: ${nextText}</div>` : ""}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="summary-hero">
      <div class="summary-icon">💪</div>
      <h1>Workout Complete</h1>
      <p class="subtle">${template.label} · Week ${weekNumber}</p>
    </div>

    <div class="stat-grid">
      <div class="stat-tile"><span class="stat-num">${setsCompleted}</span><span class="stat-label">Sets</span></div>
      <div class="stat-tile"><span class="stat-num">${totalVolume.toLocaleString()}</span><span class="stat-label">Volume (lb)</span></div>
      <div class="stat-tile"><span class="stat-num">${day.exerciseLogs.length}</span><span class="stat-label">Exercises</span></div>
    </div>

    ${rowsHTML}
    <button class="btn" id="doneBtn">Back to Dashboard</button>
  `;

  container.querySelector("#doneBtn").addEventListener("click", () => navigate("dashboard"));
}
