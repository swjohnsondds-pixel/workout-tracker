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

  const rowsHTML = day.exerciseLogs
    .map((log) => {
      const exerciseDef = EXERCISES[log.exerciseId];
      const setsText = log.workingSets
        .filter((s) => s.reps != null)
        .map((s) => (exerciseDef.equipment === "bodyweight" ? `${s.reps}` : `${s.weight ?? "?"}×${s.reps}`))
        .join(", ") || "not logged";

      const next = data.progressionCache[log.exerciseId];
      const nextText = next
        ? next.weight != null
          ? `Next time: ${next.weight} lb × ${next.targetReps}`
          : `Next time: ${next.targetReps} reps`
        : "";

      return `
        <div class="card">
          <div class="exercise-name">${exerciseDef.name}</div>
          <div class="subtle">${setsText}${log.rir != null ? ` · RIR ${log.rir}` : ""}</div>
          ${nextText ? `<div class="progress-note">${nextText}</div>` : ""}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <h1>Workout complete 💪</h1>
    <p class="subtle">${template.label} · Week ${weekNumber}</p>
    ${rowsHTML}
    <button class="btn" id="doneBtn">Back to Dashboard</button>
  `;

  container.querySelector("#doneBtn").addEventListener("click", () => navigate("dashboard"));
}
