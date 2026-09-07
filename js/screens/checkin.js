import * as State from "../state.js";

const OPTIONS = [
  { level: "sore", emoji: "😩", label: "Sore / Tired", sub: "Trims a set off today's exercises" },
  { level: "okay", emoji: "🙂", label: "Okay", sub: "Full prescribed volume" },
  { level: "great", emoji: "💪", label: "Great", sub: "Full prescribed volume" },
];

export function render(container, { navigate, weekNumber, dayTemplateId }) {
  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>How are you feeling?</h1>
    <p class="subtle">A quick check-in before you start. If you're sore or tired, we'll trim the volume slightly rather than push full sets.</p>

    <div class="checkin-options">
      ${OPTIONS.map(
        (o) => `
          <button type="button" class="checkin-option" data-level="${o.level}">
            <span class="checkin-emoji">${o.emoji}</span>
            <span>
              <span class="checkin-label" style="display:block;">${o.label}</span>
              <span class="checkin-sub">${o.sub}</span>
            </span>
          </button>
        `
      ).join("")}
    </div>

    <button class="btn ghost" id="skipBtn">Skip check-in</button>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => navigate("dashboard"));

  function proceed(level) {
    if (level) State.setCheckIn(weekNumber, dayTemplateId, level);
    navigate(`workout/${weekNumber}/${dayTemplateId}`);
  }

  container.querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => proceed(btn.dataset.level));
  });
  container.querySelector("#skipBtn").addEventListener("click", () => proceed(null));
}
