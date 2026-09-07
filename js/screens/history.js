import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";

const CHART_W = 300;
const CHART_H = 140;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

// Generic small line/area chart, reused for both the weight trend and the
// RIR trend — parameterized by which field to plot and what color to use,
// rather than duplicating near-identical SVG-building logic per chart.
function svgLineChart(history, valueKey, { color, highlightWeek } = {}) {
  const points = history
    .map((h, i) => ({ i, value: h[valueKey], weekNumber: h.weekNumber }))
    .filter((p) => p.value != null);
  if (points.length < 2) return "";

  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = max - min || 1;
  const plotW = CHART_W - PAD_X * 2;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const xy = (p) => [
    PAD_X + (history.length === 1 ? 0 : (p.i / (history.length - 1)) * plotW),
    PAD_TOP + plotH - ((p.value - min) / range) * plotH,
  ];

  const coords = points.map((p) => ({ ...p, xy: xy(p) }));
  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.xy[0].toFixed(1)},${p.xy[1].toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPath = `${linePath} L${last.xy[0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} L${first.xy[0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;

  const gridLines = [0, 0.5, 1]
    .map((t) => {
      const y = PAD_TOP + plotH * t;
      return `<line x1="${PAD_X}" y1="${y}" x2="${CHART_W - PAD_X}" y2="${y}" class="chart-grid" />`;
    })
    .join("");

  const gradientId = `grad-${valueKey}-${color.replace("#", "")}`;
  const dots = coords
    .map((p) => {
      const [x, y] = p.xy;
      const isLast = p === last;
      const isHighlight = highlightWeek != null && p.weekNumber === highlightWeek;
      const fill = isHighlight ? "#ffc23c" : isLast ? color : "#0a0a08";
      const stroke = isHighlight ? "#0a0a08" : color;
      const r = isHighlight || isLast ? 5 : 3;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
    })
    .join("");

  const firstWeek = history[0].weekNumber;
  const lastWeek = history[history.length - 1].weekNumber;

  return `
    <svg viewBox="0 0 ${CHART_W} ${CHART_H}" width="100%" height="${CHART_H}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#${gradientId})" stroke="none" />
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      <text x="${PAD_X}" y="${CHART_H - 4}" class="chart-axis-label">Wk ${firstWeek}</text>
      <text x="${CHART_W - PAD_X}" y="${CHART_H - 4}" text-anchor="end" class="chart-axis-label">Wk ${lastWeek}</text>
    </svg>
  `;
}

function headlineHTML(history) {
  const withWeight = history.filter((h) => h.weight != null);
  if (withWeight.length === 0) return "";
  const latest = withWeight[withWeight.length - 1];
  const prev = withWeight.length > 1 ? withWeight[withWeight.length - 2] : null;
  let deltaHTML = "";
  if (prev) {
    const diff = latest.weight - prev.weight;
    if (diff > 0) deltaHTML = `<span class="chart-delta up">▲ +${diff} lb</span>`;
    else if (diff < 0) deltaHTML = `<span class="chart-delta up" style="color:var(--danger)">▼ ${diff} lb</span>`;
    else deltaHTML = `<span class="chart-delta flat">— steady</span>`;
  }
  return `
    <div class="chart-headline">
      <div><span class="stat-num">${latest.weight} lb</span> <span class="subtle">× ${latest.minReps}</span></div>
      ${deltaHTML}
    </div>
  `;
}

function prBadgeHTML(pr) {
  if (!pr) return "";
  const value = pr.weight != null ? `${pr.weight} lb × ${pr.minReps}` : `${pr.minReps} reps`;
  return `
    <div class="pr-badge">
      <span class="pr-trophy">🏆</span>
      <div>
        <div class="pr-label">Personal Record</div>
        <div class="pr-value">${value} <span class="subtle">· Week ${pr.weekNumber}</span></div>
      </div>
    </div>
  `;
}

function findTargetRIR(exerciseId) {
  for (const t of State.getDayTemplates()) {
    for (const ss of t.supersets) {
      const slot = ss.exercises.find((e) => e.exerciseId === exerciseId);
      if (slot) return slot.targetRIR;
    }
  }
  return null;
}

// Early fatigue signal: if RIR has been running consistently under target
// across the last 3 confirmed sessions, that's worth surfacing before a
// deload is officially due.
function fatigueNoteHTML(history, targetRIR) {
  const withRIR = history.filter((h) => h.rir != null);
  if (withRIR.length < 3) return "";
  const recent = withRIR.slice(-3);
  const avgRecent = recent.reduce((s, h) => s + h.rir, 0) / recent.length;
  if (targetRIR != null && avgRecent < targetRIR - 0.5) {
    return `<div class="action-flag flag-hold">⚠️ RIR has averaged ${avgRecent.toFixed(1)} the last 3 sessions vs a target of ${targetRIR} — fatigue may be creeping in before your next deload.</div>`;
  }
  return "";
}

function renderExerciseView(container, initialId) {
  const exerciseIds = Object.keys(EXERCISES);
  const optionsHTML = exerciseIds.map((id) => `<option value="${id}" ${id === initialId ? "selected" : ""}>${EXERCISES[id].name}</option>`).join("");

  container.innerHTML = `
    <div class="exercise-picker-wrap">
      <select id="historyExercisePicker">${optionsHTML}</select>
    </div>
    <div id="historyBody"></div>
  `;

  const picker = container.querySelector("#historyExercisePicker");
  const body = container.querySelector("#historyBody");

  function renderExercise(exerciseId) {
    const history = State.getExerciseHistory(exerciseId);
    if (history.length === 0) {
      body.innerHTML = `<div class="empty-state"><span class="empty-icon">📈</span><h2>No sessions yet</h2><p class="subtle">Complete this exercise in a workout to see progress here.</p></div>`;
      return;
    }
    const pr = State.getPR(exerciseId);
    const targetRIR = findTargetRIR(exerciseId);

    const rows = history
      .map(
        (h) => `
          <div class="history-row ${h.isDeload ? "deload" : ""}">
            <div class="h-week">${pr && h.weekNumber === pr.weekNumber ? "🏆 " : ""}Week ${h.weekNumber}</div>
            <div class="h-metric">${h.weight != null ? h.weight + " lb" : "BW"} × ${h.minReps}</div>
            <div class="h-rir">${h.rir != null ? "RIR " + h.rir : "—"}</div>
          </div>
        `
      )
      .join("");

    const weightChart = svgLineChart(history, "weight", { color: "#c6ff4a", highlightWeek: pr?.weekNumber });
    const rirChart = svgLineChart(history, "rir", { color: "#ffc23c" });

    body.innerHTML = `
      ${prBadgeHTML(pr)}
      <div class="chart-card">
        ${headlineHTML(history)}
        ${weightChart || '<p class="subtle" style="padding:20px 0;text-align:center;">Log two or more sessions to see a trend.</p>'}
      </div>
      <div class="chart-card">
        <h2 style="margin-bottom:2px;">RIR Trend</h2>
        <p class="subtle" style="margin-bottom:10px;">Lower RIR over time (at the same prescribed effort) is an early fatigue signal.</p>
        ${rirChart || '<p class="subtle" style="padding:10px 0;text-align:center;">Log RIR on two or more sessions to see a trend.</p>'}
        ${fatigueNoteHTML(history, targetRIR)}
      </div>
      <div class="card" style="padding-top:4px;padding-bottom:4px;">${rows}</div>
    `;
  }

  picker.addEventListener("change", () => renderExercise(picker.value));
  renderExercise(picker.value);
}

function sessionRecapHTML(session) {
  const exerciseRows = session.exerciseLogs
    .map((log) => {
      const def = EXERCISES[log.exerciseId];
      const setsText =
        log.workingSets
          .filter((s) => s.done && s.reps != null)
          .map((s) => (def.equipment === "bodyweight" ? `${s.reps}` : `${s.weight ?? "?"}×${s.reps}`))
          .join(", ") || "not logged";
      return `<div class="session-recap-row"><span>${def.name}</span><span class="subtle">${setsText}${log.rir != null ? ` · RIR ${log.rir}` : ""}</span></div>`;
    })
    .join("");
  const notesHTML = session.notes
    ? `<div class="session-recap-row" style="flex-direction:column;align-items:flex-start;gap:4px;"><strong>Notes</strong><span class="subtle" style="white-space:pre-line;">${session.notes}</span></div>`
    : "";
  return exerciseRows + notesHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function watchStatsRowHTML(stats) {
  if (!stats) return "";
  const parts = [];
  if (stats.avgHR != null) parts.push(`❤️ ${stats.avgHR} bpm`);
  if (stats.activeCalories != null) parts.push(`🔥 ${stats.activeCalories} cal`);
  if (stats.durationMinutes != null) parts.push(`⏱ ${stats.durationMinutes} min`);
  return parts.length ? `<div class="watch-stats-row">${parts.map((p) => `<span>${p}</span>`).join("")}</div>` : "";
}

function renderSessionsView(container) {
  const sessions = State.getCompletedSessions();
  if (sessions.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🗓️</span><h2>No sessions yet</h2><p class="subtle">Finish a workout to see it show up here.</p></div>`;
    return;
  }

  container.innerHTML = sessions
    .map(
      (s, i) => `
        <div class="card session-card" data-session="${i}">
          <button type="button" class="session-toggle">
            <div>
              <div class="session-title">${s.dayLabel} ${s.isDeload ? '<span class="chip" style="color:var(--warning);border-color:var(--warning);">Deload</span>' : ""}</div>
              <div class="subtle">Week ${s.weekNumber} · ${formatDate(s.completedAt)}</div>
              ${watchStatsRowHTML(s.watchStats)}
            </div>
            <span class="session-chevron">▾</span>
          </button>
          <div class="session-recap" hidden>${sessionRecapHTML(s)}</div>
        </div>
      `
    )
    .join("");

  container.querySelectorAll(".session-card").forEach((card) => {
    const toggle = card.querySelector(".session-toggle");
    const recap = card.querySelector(".session-recap");
    const chevron = card.querySelector(".session-chevron");
    toggle.addEventListener("click", () => {
      recap.hidden = !recap.hidden;
      chevron.textContent = recap.hidden ? "▾" : "▴";
    });
  });
}

// ---- consistency calendar (GitHub-style heatmap: weeks as rows of 7 days) ----
function renderCalendarView(container) {
  const data = State.getData();
  const sessions = State.getCompletedSessions();
  const trainedDates = new Set(sessions.map((s) => new Date(s.completedAt).toDateString()));
  const skippedDates = new Set();
  data.weeks.forEach((w) => w.days.forEach((d) => {
    if (d.status === "skipped" && d.skippedAt) skippedDates.add(new Date(d.skippedAt).toDateString());
  }));

  const start = new Date(data.program.startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pad to start on a Sunday so the grid lines up into clean weeks.
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const totalDays = Math.round((today - gridStart) / 86400000) + 1;
  const cells = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    let cls = "future";
    if (d < start) cls = "";
    else if (trainedDates.has(d.toDateString())) cls = "trained";
    else if (skippedDates.has(d.toDateString())) cls = "skipped";
    else if (d <= today) cls = "";
    cells.push(`<div class="streak-cell ${cls}" title="${d.toDateString()}"></div>`);
  }

  const totalTrained = trainedDates.size;
  const totalSkipped = skippedDates.size;
  const spanDays = Math.round((today - start) / 86400000) + 1;
  const consistencyPct = spanDays > 0 ? Math.round((totalTrained / spanDays) * 100) : 0;

  container.innerHTML = `
    <div class="streak-stats">
      <div class="stat-tile"><span class="stat-num">${totalTrained}</span><span class="stat-label">Days Trained</span></div>
      <div class="stat-tile"><span class="stat-num">${totalSkipped}</span><span class="stat-label">Days Skipped</span></div>
      <div class="stat-tile"><span class="stat-num">${consistencyPct}%</span><span class="stat-label">Of Span Trained</span></div>
    </div>
    <div class="card">
      <h2>Consistency</h2>
      <div class="streak-grid">${cells.join("")}</div>
      <div class="streak-legend">
        <span><span class="dot" style="background:var(--success);"></span> Trained</span>
        <span><span class="dot" style="background:var(--danger);opacity:0.55;"></span> Skipped</span>
        <span><span class="dot" style="background:var(--surface-2);"></span> Rest / not yet</span>
      </div>
    </div>
  `;
}

function renderVolumeView(container) {
  const data = State.getData();
  const next = State.getNextWorkout();
  const defaultWeek = next ? next.weekNumber : data.weeks[data.weeks.length - 1].weekNumber;

  container.innerHTML = `
    <div class="exercise-picker-wrap">
      <select id="volumeWeekPicker">
        ${data.weeks
          .map(
            (w) =>
              `<option value="${w.weekNumber}" ${w.weekNumber === defaultWeek ? "selected" : ""}>Week ${w.weekNumber}${w.isDeload ? " (Deload)" : ""}</option>`
          )
          .join("")}
      </select>
    </div>
    <div id="volumeBody"></div>
  `;

  const picker = container.querySelector("#volumeWeekPicker");
  const body = container.querySelector("#volumeBody");

  function paint(weekNumber) {
    const totals = State.getWeeklyVolumeByMuscleGroup(Number(weekNumber));
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      body.innerHTML = `<div class="empty-state"><span class="empty-icon">🏋️</span><h2>No sets yet</h2><p class="subtle">Complete a session this week to see volume by muscle group.</p></div>`;
      return;
    }
    const max = entries[0][1];
    body.innerHTML = `<div class="card">${entries
      .map(
        ([muscle, sets]) => `
          <div class="volume-row">
            <div class="volume-row-label"><span>${muscle}</span><span class="subtle">${sets} set${sets === 1 ? "" : "s"}</span></div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${Math.round((sets / max) * 100)}%"></div></div>
          </div>
        `
      )
      .join("")}</div>`;
  }

  picker.addEventListener("change", () => paint(picker.value));
  paint(defaultWeek);
}

export function render(container, { navigate }) {
  const data = State.getData();

  if (!data) {
    container.innerHTML = `<h1>History</h1><div class="empty-state"><span class="empty-icon">📊</span><h2>No program yet</h2><p class="subtle">Start a program to begin tracking progress.</p></div>`;
    return;
  }

  let view = "exercise";

  container.innerHTML = `
    <div class="photo-banner" style="background-image:url('images/dumbbells-row.jpg');">
      <div class="photo-banner-text">
        <span class="eyebrow">Track The Climb</span>
        <strong>Your Progress</strong>
      </div>
    </div>
    <h1>History</h1>
    <div class="view-toggle">
      <button type="button" data-view="exercise" class="active">Exercise</button>
      <button type="button" data-view="sessions">Sessions</button>
      <button type="button" data-view="calendar">Calendar</button>
      <button type="button" data-view="volume">Volume</button>
    </div>
    <div id="historyView"></div>
  `;

  const viewSlot = container.querySelector("#historyView");
  const toggleBtns = container.querySelectorAll(".view-toggle button");

  function paint() {
    toggleBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "exercise") renderExerciseView(viewSlot, Object.keys(EXERCISES)[0]);
    else if (view === "sessions") renderSessionsView(viewSlot);
    else if (view === "calendar") renderCalendarView(viewSlot);
    else renderVolumeView(viewSlot);
  }

  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      view = btn.dataset.view;
      paint();
    });
  });

  paint();
}
