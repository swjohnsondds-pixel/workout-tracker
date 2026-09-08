import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";
import { createWheelPicker, range } from "../wheelPicker.js";
import { icon } from "../icons.js";

const HR_VALUES = range(60, 200, 5);
const CAL_VALUES = range(50, 800, 10);
const DURATION_VALUES = range(5, 180, 1);

function appTrackedDurationMinutes(day) {
  if (!day.startedAt || !day.completedAt) return null;
  const mins = Math.round((new Date(day.completedAt) - new Date(day.startedAt)) / 60000);
  return Math.max(DURATION_VALUES[0], Math.min(DURATION_VALUES[DURATION_VALUES.length - 1], mins));
}

function closestValue(values, target) {
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), values[0]);
}

function watchStatsSummaryHTML(stats) {
  const parts = [];
  if (stats.avgHR != null) parts.push(`${icon("heart-pulse", { size: 14 })} ${stats.avgHR} bpm avg`);
  if (stats.activeCalories != null) parts.push(`${icon("flame", { size: 14 })} ${stats.activeCalories} cal`);
  if (stats.durationMinutes != null) parts.push(`${icon("clock", { size: 14 })} ${stats.durationMinutes} min`);
  return parts.length ? `<div class="watch-stats-row">${parts.map((p) => `<span>${p}</span>`).join("")}</div>` : "";
}

function renderWatchStatsCard(container, { weekNumber, dayTemplateId, day, onSaved }) {
  const slot = container.querySelector("#watchStatsSlot");
  const existing = day.watchStats;

  if (existing) {
    slot.innerHTML = `
      <div class="card">
        <h2 style="display:flex;align-items:center;gap:8px;">${icon("watch", { size: 18 })} Watch Stats</h2>
        ${watchStatsSummaryHTML(existing)}
        <button class="btn ghost" id="editWatchStatsBtn" style="margin-top:8px;">Edit</button>
      </div>
    `;
    slot.querySelector("#editWatchStatsBtn").addEventListener("click", () => {
      day.watchStats = null; // reopen the picker; not saved until they hit Save again
      renderWatchStatsCard(container, { weekNumber, dayTemplateId, day, onSaved });
    });
    return;
  }

  const defaultDuration = appTrackedDurationMinutes(day);

  slot.innerHTML = `
    <div class="card">
      <h2 style="display:flex;align-items:center;gap:8px;">${icon("watch", { size: 18 })} Add Watch Stats</h2>
      <p class="subtle" style="margin-bottom:14px;">Optional — quickly log what your Apple Watch showed for this session. Skip if you don't have it handy.</p>
      <div class="wheel-row">
        <div class="wheel-col">
          <div class="wheel-col-label">Heart Rate</div>
          <div id="hrWheel"></div>
          <div class="wheel-unit">bpm avg</div>
        </div>
        <div class="wheel-col">
          <div class="wheel-col-label">Calories</div>
          <div id="calWheel"></div>
          <div class="wheel-unit">kcal</div>
        </div>
        <div class="wheel-col">
          <div class="wheel-col-label">Duration</div>
          <div id="durWheel"></div>
          <div class="wheel-unit">minutes</div>
        </div>
      </div>
      <button class="btn" id="saveWatchBtn" style="margin-top:16px;">Save Watch Stats</button>
      <button class="btn ghost" id="skipWatchBtn">Skip</button>
    </div>
  `;

  const hrPicker = createWheelPicker(slot.querySelector("#hrWheel"), {
    values: HR_VALUES,
    initialValue: closestValue(HR_VALUES, 120),
    formatLabel: (v) => v,
  });
  const calPicker = createWheelPicker(slot.querySelector("#calWheel"), {
    values: CAL_VALUES,
    initialValue: closestValue(CAL_VALUES, 300),
    formatLabel: (v) => v,
  });
  const durPicker = createWheelPicker(slot.querySelector("#durWheel"), {
    values: DURATION_VALUES,
    initialValue: defaultDuration != null ? closestValue(DURATION_VALUES, defaultDuration) : 50,
    formatLabel: (v) => v,
  });

  slot.querySelector("#saveWatchBtn").addEventListener("click", () => {
    State.saveWatchStats(weekNumber, dayTemplateId, {
      avgHR: hrPicker.getValue(),
      activeCalories: calPicker.getValue(),
      durationMinutes: durPicker.getValue(),
    });
    day.watchStats = State.getDay(weekNumber, dayTemplateId).watchStats;
    renderWatchStatsCard(container, { weekNumber, dayTemplateId, day, onSaved });
    if (onSaved) onSaved();
  });
  slot.querySelector("#skipWatchBtn").addEventListener("click", () => {
    slot.innerHTML = "";
  });
}

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
    increase_weight: `${icon("trending-up", { size: 13 })} Weight increased — reps maxed`,
    increase_reps: "Reps target up",
    hold: "Holding — RIR was low",
    maxed_bodyweight: "Reps maxed — try a harder variation",
    deload: "Deload week",
    manual_override: `${icon("pencil", { size: 13 })} Manually adjusted`,
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
            ${actionLabel ? `<div class="subtle" style="color:var(--accent-strong);margin-top:2px;display:inline-flex;align-items:center;gap:6px;">${actionLabel}</div>` : ""}
          </div>
          ${nextText ? `<div class="recap-next">Next: ${nextText}</div>` : ""}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="photo-banner tall" style="background-image:url('images/workout-moody.jpg');">
      <div class="photo-banner-text">
        <span class="eyebrow">Session Complete</span>
        <strong>Well Done</strong>
      </div>
    </div>

    <div class="summary-hero">
      <div class="summary-icon">${icon("check-circle-2", { size: 34 })}</div>
      <h1>Workout Complete</h1>
      <p class="subtle">${template.label} · Week ${weekNumber}</p>
    </div>

    ${day.notes ? `<div class="card"><h2>Your Notes</h2><p class="subtle" style="white-space:pre-line;">${day.notes}</p></div>` : ""}

    <div class="stat-grid">
      <div class="stat-tile"><span class="stat-num">${setsCompleted}</span><span class="stat-label">Sets</span></div>
      <div class="stat-tile"><span class="stat-num">${totalVolume.toLocaleString()}</span><span class="stat-label">Volume (lb)</span></div>
      <div class="stat-tile"><span class="stat-num">${day.exerciseLogs.length}</span><span class="stat-label">Exercises</span></div>
    </div>

    <div id="watchStatsSlot"></div>

    ${rowsHTML}
    <button class="btn" id="doneBtn">Back to Dashboard</button>
  `;

  renderWatchStatsCard(container, { weekNumber, dayTemplateId, day, onSaved: null });

  container.querySelector("#doneBtn").addEventListener("click", () => navigate("dashboard"));
}
