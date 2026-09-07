import * as State from "../state.js";

export function render(container, { navigate }) {
  const hasProgram = State.hasActiveProgram();

  container.innerHTML = `
    <h1>${hasProgram ? "Start a new program" : "Set up your program"}</h1>
    <p class="subtle">4-day split, repeating every week: Upper A, Lower A + Arms, Upper B, Lower B + Arms. Week 1 is a baseline week — no prescribed weights, just log what you hit. From week 2 on, weight/reps are prescribed automatically.</p>

    <div class="card">
      <div class="field">
        <label for="weeks">Program length (weeks)</label>
        <input type="number" id="weeks" min="2" max="52" value="8" inputmode="numeric" />
      </div>
      <p class="subtle">Deload every 4th week is built in automatically (lighter weight, fewer sets).</p>
      <button class="btn" id="createProgram">Create program</button>
      ${hasProgram ? '<p class="subtle" style="margin-top:10px;color:var(--danger)">This replaces your current program. Your logged history will no longer be reachable from the dashboard once you start a new one.</p>' : ""}
    </div>
  `;

  container.querySelector("#createProgram").addEventListener("click", () => {
    const weeksInput = container.querySelector("#weeks");
    const weeks = parseInt(weeksInput.value, 10);
    if (!Number.isFinite(weeks) || weeks < 2 || weeks > 52) {
      alert("Enter a program length between 2 and 52 weeks.");
      return;
    }
    if (hasProgram && !confirm("Start a new program? Your current program's progress display will be replaced.")) {
      return;
    }
    State.createProgram(weeks, 4, "lb");
    navigate("dashboard");
  });
}
