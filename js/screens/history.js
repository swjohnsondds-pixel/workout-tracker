import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";

const CHART_W = 300;
const CHART_H = 140;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

function buildChart(history, pr) {
  const points = history.map((h, i) => ({ i, weight: h.weight, isPR: pr && h.weekNumber === pr.weekNumber })).filter((p) => p.weight != null);
  if (points.length < 2) return "";

  const min = Math.min(...points.map((p) => p.weight));
  const max = Math.max(...points.map((p) => p.weight));
  const range = max - min || 1;
  const plotW = CHART_W - PAD_X * 2;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const xy = (p) => {
    const x = PAD_X + (history.length === 1 ? 0 : (p.i / (history.length - 1)) * plotW);
    const y = PAD_TOP + plotH - ((p.weight - min) / range) * plotH;
    return [x, y];
  };

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

  const dots = coords
    .map((p) => {
      const [x, y] = p.xy;
      const isLast = p === last;
      const cls = p.isPR ? "chart-dot-pr" : isLast ? "chart-dot-last" : "chart-dot";
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.isPR || isLast ? 5 : 3}" class="${cls}" />`;
    })
    .join("");

  const firstWeek = history[0].weekNumber;
  const lastWeek = history[history.length - 1].weekNumber;

  return `
    <svg viewBox="0 0 ${CHART_W} ${CHART_H}" width="100%" height="${CHART_H}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3d7bff" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#3d7bff" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#areaFill)" stroke="none" />
      <path d="${linePath}" fill="none" stroke="#3d7bff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
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

function prBadgeHTML(pr, exerciseDef) {
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

    body.innerHTML = `
      ${prBadgeHTML(pr, EXERCISES[exerciseId])}
      <div class="chart-card">
        ${headlineHTML(history)}
        ${buildChart(history, pr) || '<p class="subtle" style="padding:20px 0;text-align:center;">Log two or more sessions to see a trend.</p>'}
      </div>
      <div class="card" style="padding-top:4px;padding-bottom:4px;">${rows}</div>
    `;
  }

  picker.addEventListener("change", () => renderExercise(picker.value));
  renderExercise(picker.value);
}

function sessionRecapHTML(session) {
  return session.exerciseLogs
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
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

export function render(container, { navigate }) {
  const data = State.getData();

  if (!data) {
    container.innerHTML = `<h1>History</h1><div class="empty-state"><span class="empty-icon">📊</span><h2>No program yet</h2><p class="subtle">Start a program to begin tracking progress.</p></div>`;
    return;
  }

  let view = "exercise";

  container.innerHTML = `
    <h1>History</h1>
    <div class="view-toggle">
      <button type="button" data-view="exercise" class="active">By Exercise</button>
      <button type="button" data-view="sessions">Sessions</button>
    </div>
    <div id="historyView"></div>
  `;

  const viewSlot = container.querySelector("#historyView");
  const toggleBtns = container.querySelectorAll(".view-toggle button");

  function paint() {
    toggleBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "exercise") renderExerciseView(viewSlot, Object.keys(EXERCISES)[0]);
    else renderSessionsView(viewSlot);
  }

  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      view = btn.dataset.view;
      paint();
    });
  });

  paint();
}
