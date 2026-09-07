import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";

export function render(container, { navigate, weekNumber, dayTemplateId }) {
  const day = State.getDay(weekNumber, dayTemplateId);
  const template = State.getDayTemplates().find((t) => t.id === dayTemplateId);
  const week = State.getWeek(weekNumber);
  const data = State.getData();

  if (!day || day.status !== "completed") {
    navigate("dashboard");
    return;
  }

  // Only sets actually checked off count — pre-filled-but-unconfirmed sets
  // never happened as far as volume/history/progression are concerned.
  let setsCompleted = 0;
  let totalVolume = 0;
  for (const log of day.exerciseLogs) {
    for (const set of log.workingSets) {
      if (!set.done || set.reps == null) continue;
      setsCompleted++;
      if (set.weight != null) totalVolume += set.weight * set.reps;
    }
  }

  const ACTION_LABELS = {
    increase_weight: "🔺 Weight increased — reps maxed",
    increase_reps: "Reps target up",
    hold: "Holding — RIR was low",
    maxed_bodyweight: "Reps maxed — try a harder variation",
    deload: "Deload week",
  };

  const rowsHTML = day.exerciseLogs
    .map((log) => {
      const exerciseDef = EXERCISES[log.exerciseId];
      const setsText =
        log.workingSets
          .filter((s) => s.done && s.reps != null)
          .map((s) => (exerciseDef.equipment === "bodyweight" ? `${s.reps}` : `${s.weight ?? "?"}×${s.reps}`))
          .join(", ") || "not logged";

      const next = data.progressionCache[log.exerciseId];
      const nextText = next ? (next.weight != null ? `${next.weight} lb × ${next.targetReps}` : `${next.targetReps} reps`) : "";
      // The action flag describes what THIS session's performance triggered —
      // during a deload week progressionCache is deliberately left untouched
      // (see finishDay), so the cached action would stale-describe a
      // pre-deload week instead. Show the deload context there instead.
      const actionLabel = week.isDeload ? "Deload week — recovery focus" : next && ACTION_LABELS[next.action] ? ACTION_LABELS[next.action] : "";

      return `
        <div class="card recap-row">
          <div>
            <div class="exercise-name">${exerciseDef.name}</div>
            <div class="subtle">${setsText}${log.rir != null ? ` · RIR ${log.rir}` : ""}</div>
            ${actionLabel ? `<div class="subtle" style="color:var(--accent-strong);margin-top:2px;">${actionLabel}</div>` : ""}
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
