import * as State from "../state.js";

function dayLabel(dayTemplateId) {
  const t = State.getDayTemplates().find((d) => d.id === dayTemplateId);
  return t ? t.label : dayTemplateId;
}

function shortLabel(dayTemplateId) {
  return { upperA: "Upper A", lowerA: "Lower A", upperB: "Upper B", lowerB: "Lower B" }[dayTemplateId] || dayTemplateId;
}

function heroNote(weekNumber, isDeload) {
  if (weekNumber === 1) return "Baseline week — log what you actually hit today. No prescribed weights yet.";
  if (isDeload) return "Deload week — lighter weight, fewer sets, easier effort. Let things recover.";
  return "Weight and reps below are prescribed from last week's performance.";
}

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data.program;
  const next = State.getNextWorkout();

  if (program.status === "completed" || !next) {
    container.innerHTML = `
      <h1>Lift Tracker</h1>
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

  const pipsHTML = week.days
    .map((d) => {
      const isToday = d.dayTemplateId === next.dayTemplateId && d.status !== "completed";
      const state = d.status === "completed" ? "done" : isToday ? "today" : "";
      const mark = d.status === "completed" ? "✓" : "";
      return `
        <div class="day-pip ${state}">
          <div class="pip-dot">${mark ? `<span style="font-size:7px;line-height:10px;color:#06231a;display:block;text-align:center;">${mark}</span>` : ""}</div>
          <div class="pip-label">${shortLabel(d.dayTemplateId)}</div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="eyebrow" style="margin-bottom:6px;">Lift Tracker</div>
    <h1>Home</h1>

    <div class="dashboard-hero">
      <span class="week-pill ${week.isDeload ? "deload" : ""}">Week ${week.weekNumber} of ${program.totalWeeks}${week.isDeload ? " · Deload" : ""}</span>
      <h2>${dayLabel(next.dayTemplateId)}</h2>
      <p class="hero-note">${heroNote(week.weekNumber, week.isDeload)}</p>
      <button class="btn" id="startWorkout">${next.day.status === "in_progress" ? "Resume Workout" : "Start Workout"}</button>
    </div>

    <div class="card">
      <h2>This Week</h2>
      <div class="week-track">${pipsHTML}</div>
      <p class="subtle" style="margin-top:14px;margin-bottom:0;">${completedDaysThisWeek} of ${week.days.length} sessions completed</p>
    </div>

    <div class="card">
      <h2>Program Progress</h2>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${programPct}%"></div></div>
      <p class="subtle" style="margin-top:10px;margin-bottom:0;">${totalDaysDone} of ${totalDays} sessions · ${programPct}% through week ${program.totalWeeks}</p>
    </div>
  `;

  container.querySelector("#startWorkout").addEventListener("click", () => {
    navigate(`workout/${next.weekNumber}/${next.dayTemplateId}`);
  });
}
