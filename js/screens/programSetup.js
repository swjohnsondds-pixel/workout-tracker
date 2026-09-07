import * as State from "../state.js";

const PRESETS = [6, 8, 10, 12];

export function render(container, { navigate }) {
  const hasProgram = State.hasActiveProgram();
  let weeks = 8;

  container.innerHTML = `
    <h1>${hasProgram ? "New Program" : "Set Up Your Program"}</h1>
    <div class="info-card">
      A 4-day split, every week: <strong>Upper A → Lower A + Arms → Upper B → Lower B + Arms</strong>.
      Week 1 is a baseline week — no prescribed weights, just log what you hit. From week 2 on, weight
      and reps are prescribed automatically, with a deload built in every 4th week.
    </div>

    <div class="card">
      <h2 style="text-align:center;">Program Length</h2>
      <div class="stepper">
        <button type="button" id="decBtn" aria-label="Decrease">−</button>
        <div class="stepper-value">
          <span class="stat-num" id="weeksValue">8</span>
          <span class="eyebrow">weeks</span>
        </div>
        <button type="button" id="incBtn" aria-label="Increase">+</button>
      </div>
      <div class="chip-row" id="chipRow">
        ${PRESETS.map((p) => `<button type="button" class="week-chip ${p === weeks ? "selected" : ""}" data-weeks="${p}">${p} wk</button>`).join("")}
      </div>
      <button class="btn" id="createProgram">Create Program</button>
      ${hasProgram ? '<p class="subtle" style="margin-top:12px;text-align:center;">Starting a new program replaces what\'s on your dashboard. Past history stays saved.</p>' : ""}
    </div>
  `;

  const weeksValueEl = container.querySelector("#weeksValue");
  const chipRow = container.querySelector("#chipRow");

  function syncChips() {
    chipRow.querySelectorAll(".week-chip").forEach((chip) => {
      chip.classList.toggle("selected", Number(chip.dataset.weeks) === weeks);
    });
  }

  function setWeeks(n) {
    weeks = Math.min(52, Math.max(2, n));
    weeksValueEl.textContent = weeks;
    syncChips();
  }

  container.querySelector("#decBtn").addEventListener("click", () => setWeeks(weeks - 1));
  container.querySelector("#incBtn").addEventListener("click", () => setWeeks(weeks + 1));
  chipRow.querySelectorAll(".week-chip").forEach((chip) => {
    chip.addEventListener("click", () => setWeeks(Number(chip.dataset.weeks)));
  });

  container.querySelector("#createProgram").addEventListener("click", () => {
    if (hasProgram && !confirm("Start a new program? Your current program's progress display will be replaced.")) {
      return;
    }
    State.createProgram(weeks, 4, "lb");
    navigate("dashboard");
  });
}
