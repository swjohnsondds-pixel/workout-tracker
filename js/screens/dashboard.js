import * as State from "../state.js";
import { EXERCISES } from "../exercises.js";
import { computeDeloadPrescription } from "../progression.js";
import { getUserName, getLastExportAt, getLastBackupNudgeAt, markBackupNudged, exportDataAsFile } from "../storage.js";
import { openModal, closeModal } from "../modal.js";

const BACKUP_REMINDER_DAYS = 14;
const BACKUP_RENUDGE_DAYS = 7;

function dayLabel(dayTemplateId) {
  const t = State.getDayTemplates().find((d) => d.id === dayTemplateId);
  return t ? t.label : dayTemplateId;
}

function dayIcon(dayTemplateId) {
  return dayTemplateId.startsWith("upper") ? "💪" : "🦵";
}

function heroNote(weekNumber, isDeload) {
  if (weekNumber === 1) return "Baseline week — log what you actually hit today. No prescribed weights yet.";
  if (isDeload) return "Deload week — lighter weight, fewer sets, easier effort. Let things recover.";
  return "Weight and reps below are prescribed from last week's performance.";
}

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Rough per-day plan stats (sets / avg target RIR / estimated duration) for
// the metadata chips — derived from the day template, not from any single
// session's actual performance.
function computeDayStats(dayTemplateId) {
  const template = State.getDayTemplates().find((t) => t.id === dayTemplateId);
  let totalSets = 0;
  let rirSum = 0;
  let rirCount = 0;
  template.supersets.forEach((ss) =>
    ss.exercises.forEach((slot) => {
      totalSets += slot.sets;
      rirSum += slot.targetRIR;
      rirCount++;
    })
  );
  const avgRIR = rirCount ? Math.round((rirSum / rirCount) * 10) / 10 : 0;
  const estMinutes = Math.max(20, Math.round((totalSets * 2.5) / 5) * 5);
  return { totalSets, avgRIR, estMinutes };
}

// Exercise-by-exercise preview of the next workout — what's coming and at
// what weight, without actually starting the day (no state mutation).
function nextWorkoutPreviewHTML(next, weekNumber, isDeload) {
  const template = State.getDayTemplates().find((t) => t.id === next.dayTemplateId);
  const cache = State.getData().progressionCache;

  const rows = [];
  template.supersets.forEach((ss) => {
    ss.exercises.forEach((slot) => {
      const def = EXERCISES[slot.exerciseId];
      const cached = cache[slot.exerciseId];
      let text;
      if (weekNumber === 1) {
        text = "Log what you hit";
      } else if (!cached) {
        text = "Not yet established";
      } else if (isDeload) {
        const d = computeDeloadPrescription(def, slot, cached);
        text = d.weight != null ? `${d.weight} lb × ${d.targetReps}` : `${d.targetReps} reps`;
      } else {
        text = cached.weight != null ? `${cached.weight} lb × ${cached.targetReps}` : `${cached.targetReps} reps`;
      }
      rows.push(`<div class="session-recap-row"><span>${def.name}</span><span class="subtle">${text}</span></div>`);
    });
  });

  return `
    <button type="button" class="muscle-toggle" id="previewToggle" style="margin-top:4px;">Preview Exercises ▾</button>
    <div class="muscle-panel" hidden id="previewPanel" style="padding:0;background:none;border:none;">
      <div class="card" style="padding-top:6px;padding-bottom:2px;">${rows.join("")}</div>
    </div>
  `;
}

// ---- quick-stat row + weekly training-load chart (presentation-only
// derivations from existing state — no new persisted fields) ----

function computeSessionStreak(data) {
  const allDays = [];
  data.weeks.forEach((w) => w.days.forEach((d) => allDays.push(d)));
  let streak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const status = allDays[i].status;
    if (status === "completed") streak++;
    else if (status === "skipped") break;
  }
  return streak;
}

function computeWeekVolumeLbs(week) {
  let total = 0;
  week.days.forEach((day) => {
    if (!day.exerciseLogs) return;
    day.exerciseLogs.forEach((log) => {
      log.workingSets.forEach((s) => {
        if (s.done && s.weight != null && s.reps != null) total += s.weight * s.reps;
      });
    });
  });
  return Math.round(total);
}

function dashStatRowHTML(data, week, completedDaysThisWeek) {
  const streak = computeSessionStreak(data);
  const volume = computeWeekVolumeLbs(week);
  return `
    <div class="dash-stat-row">
      <div class="dash-stat-card">
        <div class="dash-stat-icon">🏋️</div>
        <span class="dash-stat-num">${completedDaysThisWeek}/${week.days.length}</span>
        <span class="dash-stat-label">This Week</span>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-icon">📊</div>
        <span class="dash-stat-num">${volume.toLocaleString()}</span>
        <span class="dash-stat-label">Volume (lb)</span>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-icon">🔥</div>
        <span class="dash-stat-num">${streak}</span>
        <span class="dash-stat-label">Streak</span>
      </div>
    </div>
  `;
}

function last7DaysChartData() {
  const sessions = State.getCompletedSessions();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({ date: d, key: d.toDateString(), sets: 0 });
  }
  sessions.forEach((s) => {
    const d = new Date(s.completedAt);
    d.setHours(0, 0, 0, 0);
    const bucket = days.find((x) => x.key === d.toDateString());
    if (!bucket) return;
    bucket.sets += s.exerciseLogs.reduce((sum, l) => sum + l.workingSets.filter((x) => x.done).length, 0);
  });
  return days;
}

function weeklyLoadChartHTML() {
  const days = last7DaysChartData();
  const maxSets = Math.max(1, ...days.map((d) => d.sets));
  const avg = Math.round(days.reduce((s, d) => s + d.sets, 0) / days.length);

  let highlightKey = null;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].sets > 0) { highlightKey = days[i].key; break; }
  }

  const bars = days
    .map((d) => {
      const pct = Math.max(4, Math.round((d.sets / maxSets) * 100));
      const label = d.date.toLocaleDateString("en-US", { weekday: "narrow" });
      const active = d.key === highlightKey;
      return `
        <div class="load-bar-col ${active ? "active" : ""}" title="${d.date.toDateString()}: ${d.sets} sets">
          <div class="load-bar" style="height:${pct}%"></div>
          <span class="load-bar-day">${label}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="card load-card">
      <div class="load-card-head">
        <span class="eyebrow">Training Load</span>
        <div class="load-card-avg">
          <span class="avg-label">7-Day Avg</span>
          <span class="avg-num">${avg} sets</span>
        </div>
      </div>
      <div class="load-bars">${bars}</div>
    </div>
  `;
}

function sessionProgressPct(day) {
  if (day.status === "completed") return 100;
  if (!day.exerciseLogs) return 0;
  const totalSets = day.exerciseLogs.reduce((s, l) => s + l.workingSets.length, 0);
  const doneSets = day.exerciseLogs.reduce((s, l) => s + l.workingSets.filter((x) => x.done).length, 0);
  return totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
}

function dayPlanCardHTML(day, next) {
  const isCurrent = day.dayTemplateId === next.dayTemplateId && day.status !== "completed" && day.status !== "skipped";
  const state = day.status === "completed" ? "done" : day.status === "skipped" ? "skipped" : isCurrent ? "current" : "upcoming";
  const stats = computeDayStats(day.dayTemplateId);
  const pct = sessionProgressPct(day);

  const badgeHTML =
    state === "done"
      ? `<div class="day-plan-check">✓</div>`
      : state === "skipped"
        ? `<div class="day-plan-check skipped">–</div>`
        : "";

  const showBar = state === "done" || state === "current" || pct > 0;

  return `
    <div class="day-plan-card ${state}">
      <div class="day-plan-icon">${dayIcon(day.dayTemplateId)}</div>
      <div class="day-plan-info">
        <div class="day-plan-title">${dayLabel(day.dayTemplateId)}</div>
        <div class="chip-pill-row">
          <span class="chip-pill">⏱ ${stats.estMinutes} min</span>
          <span class="chip-pill">📊 ${stats.totalSets} sets</span>
          <span class="chip-pill">🎯 RIR ${stats.avgRIR}</span>
        </div>
        ${showBar ? `<div class="progress-bar-track small"><div class="progress-bar-fill" style="width:${pct}%"></div></div>` : ""}
      </div>
      ${badgeHTML}
    </div>
  `;
}

function maybeShowMissedSessionPrompt(container, navigate) {
  const missed = State.checkMissedSession();
  if (!missed) return;

  const body = openModal(`
    <h2>Been a bit?</h2>
    <p class="subtle" style="margin-bottom:18px;">It's been ${missed.daysSince} days since your last workout. What do you want to do with ${dayLabel(missed.next.dayTemplateId)}, which is next up?</p>
    <button class="btn secondary" id="keepQueuedBtn" style="margin-bottom:10px;">Keep it queued — I'll do it next</button>
    <button class="btn danger-outline" id="skipDayBtn">Skip that day, stay on schedule</button>
  `);
  body.querySelector("#keepQueuedBtn").addEventListener("click", () => {
    State.acknowledgeMissedSession();
    closeModal();
  });
  body.querySelector("#skipDayBtn").addEventListener("click", () => {
    State.skipNextDay();
    closeModal();
    render(container, { navigate });
  });
}

function maybeShowBackupReminder(container, navigate) {
  const lastExport = getLastExportAt();
  const lastNudge = getLastBackupNudgeAt();
  const daysSinceExport = lastExport ? (Date.now() - new Date(lastExport).getTime()) / 86400000 : Infinity;
  if (daysSinceExport < BACKUP_REMINDER_DAYS) return;
  const daysSinceNudge = lastNudge ? (Date.now() - new Date(lastNudge).getTime()) / 86400000 : Infinity;
  if (daysSinceNudge < BACKUP_RENUDGE_DAYS) return;

  const banner = document.createElement("div");
  banner.className = "card";
  banner.style.borderColor = "var(--warning)";
  banner.innerHTML = `
    <h2 style="color:var(--warning);">💾 Back up your data</h2>
    <p class="subtle">${lastExport ? "It's been a couple weeks since your last export." : "You haven't exported a backup yet."} Everything lives only on this device — a quick export protects months of progress.</p>
    <button class="btn secondary" id="exportNowBtn">Export Now</button>
    <button class="btn ghost" id="dismissBackupBtn">Remind me later</button>
  `;
  container.prepend(banner);
  banner.querySelector("#exportNowBtn").addEventListener("click", async () => {
    await exportDataAsFile();
    markBackupNudged();
    banner.remove();
  });
  banner.querySelector("#dismissBackupBtn").addEventListener("click", () => {
    markBackupNudged();
    banner.remove();
  });
}

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data.program;
  const next = State.getNextWorkout();

  if (program.status === "completed" || !next) {
    container.innerHTML = `
      <div class="greeting-eyebrow">${greetingWord()}</div>
      <h1>${getUserName() || "Friend"}</h1>
      <div class="empty-state">
        <span class="empty-icon">🏆</span>
        <h2>Program complete</h2>
        <p class="subtle">You finished all ${program.totalWeeks} weeks. Your history stays saved — start a new program whenever you're ready to keep building.</p>
      </div>
      <button class="btn" id="newProgram">Start a new program</button>
    `;
    container.querySelector("#newProgram").addEventListener("click", () => navigate("setup"));
    return;
  }

  const week = State.getWeek(next.weekNumber);
  const completedDaysThisWeek = week.days.filter((d) => d.status === "completed").length;
  const totalDaysDone = data.weeks.reduce((sum, w) => sum + w.days.filter((d) => d.status === "completed").length, 0);
  const totalDays = data.weeks.length * 4;
  const programPct = Math.round((totalDaysDone / totalDays) * 100);

  const dayCardsHTML = week.days.map((d) => dayPlanCardHTML(d, next)).join("");

  container.innerHTML = `
    <div class="greeting-eyebrow">${greetingWord()}</div>
    <h1>${getUserName() || "Friend"}</h1>

    ${dashStatRowHTML(data, week, completedDaysThisWeek)}
    ${weeklyLoadChartHTML()}

    <div class="section-header">
      <h2 style="margin-bottom:0;">Personalized Plan</h2>
      <button type="button" class="view-all" id="viewAllPlan">View All</button>
    </div>

    <div class="dashboard-hero">
      <span class="week-pill ${week.isDeload ? "deload" : ""}">Week ${week.weekNumber} of ${program.totalWeeks}${week.isDeload ? " · Deload" : ""}</span>
      <h2>${dayLabel(next.dayTemplateId)}</h2>
      <p class="hero-note">${heroNote(week.weekNumber, week.isDeload)}</p>
      <button class="btn" id="startWorkout">${next.day.status === "in_progress" ? "Resume Workout" : "Let's Workout"}</button>
      ${nextWorkoutPreviewHTML(next, week.weekNumber, week.isDeload)}
    </div>

    <div class="section-header">
      <h2 style="margin-bottom:0;">This Week's Plan</h2>
      <span class="subtle">${completedDaysThisWeek}/${week.days.length} done</span>
    </div>
    ${dayCardsHTML}

    <button type="button" class="card" id="programCard" style="width:100%;text-align:left;border:1px solid var(--border);margin-top:4px;">
      <h2>Program Progress <span class="row-chevron" style="float:right;">›</span></h2>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${programPct}%"></div></div>
      <p class="subtle" style="margin-top:10px;margin-bottom:0;">${totalDaysDone} of ${totalDays} sessions · ${programPct}% through week ${program.totalWeeks}</p>
    </button>
  `;

  container.querySelector("#startWorkout").addEventListener("click", () => {
    if (next.day.status === "in_progress") {
      navigate(`workout/${next.weekNumber}/${next.dayTemplateId}`);
    } else {
      navigate(`checkin/${next.weekNumber}/${next.dayTemplateId}`);
    }
  });
  container.querySelector("#programCard").addEventListener("click", () => navigate("program"));
  container.querySelector("#viewAllPlan").addEventListener("click", () => navigate("program"));

  const previewToggle = container.querySelector("#previewToggle");
  const previewPanel = container.querySelector("#previewPanel");
  previewToggle.addEventListener("click", () => {
    const wasHidden = previewPanel.hidden;
    previewPanel.hidden = !wasHidden;
    previewToggle.textContent = wasHidden ? "Preview Exercises ▴" : "Preview Exercises ▾";
  });

  maybeShowBackupReminder(container, navigate);
  maybeShowMissedSessionPrompt(container, navigate);
}
