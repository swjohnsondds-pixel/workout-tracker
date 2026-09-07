import * as State from "../state.js";
import { DAY_TEMPLATES } from "../exercises.js";

function dayLabel(dayTemplateId) {
  const t = DAY_TEMPLATES.find((d) => d.id === dayTemplateId);
  return t ? t.label : dayTemplateId;
}

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data.program;
  const next = State.getNextWorkout();

  if (program.status === "completed" || !next) {
    container.innerHTML = `
      <h1>Program complete 🎉</h1>
      <p class="subtle">You finished all ${program.totalWeeks} weeks. Start a new program to keep going — your history stays saved until you start a fresh one.</p>
      <button class="btn" id="newProgram">Start a new program</button>
    `;
    container.querySelector("#newProgram").addEventListener("click", () => navigate("setup"));
    return;
  }

  const week = State.getWeek(next.weekNumber);
  const completedDaysThisWeek = week.days.filter((d) => d.status === "completed").length;

  container.innerHTML = `
    <h1>Lift Tracker</h1>
    <div class="dashboard-hero">
      <span class="week-pill">Week ${week.weekNumber} of ${program.totalWeeks}${week.isDeload ? " · Deload" : ""}</span>
      <h2>${dayLabel(next.dayTemplateId)}</h2>
      <p class="subtle">
        ${week.weekNumber === 1 ? "Baseline week — log what you actually hit, no prescribed weights yet." : ""}
        ${week.isDeload ? "Deload week — lighter weight, fewer sets, easier RIR target." : ""}
      </p>
      <button class="btn" id="startWorkout">${next.day.status === "in_progress" ? "Resume workout" : "Start workout"}</button>
    </div>
    <div class="card">
      <h2>This week</h2>
      <p class="subtle">${completedDaysThisWeek} of ${week.days.length} sessions completed</p>
    </div>
  `;

  container.querySelector("#startWorkout").addEventListener("click", () => {
    navigate(`workout/${next.weekNumber}/${next.dayTemplateId}`);
  });
}
