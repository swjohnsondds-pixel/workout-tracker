import * as State from "../state.js";
import { exportDataAsFile, importDataFromFile, wipeEverything, getUserName, setUserName } from "../storage.js";
import { EXERCISES } from "../exercises.js";

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data && data.program;
  const activeFlags = State.getAllPainFlags().filter((f) => !f.resolved);

  container.innerHTML = `
    <h1>Settings</h1>

    <div class="settings-group">
      <span class="eyebrow">Profile</span>
      <div class="card">
        <div class="field" style="margin-bottom:0;">
          <label for="nameInput">Your name</label>
          <input type="text" id="nameInput" value="${getUserName()}" placeholder="Steven" />
        </div>
      </div>
    </div>

    <div class="settings-group">
      <span class="eyebrow">Program</span>
      <div class="settings-list">
        <div class="settings-row" style="cursor:default;">
          <div class="row-icon">🏋️</div>
          <div class="row-text">
            ${program ? `${program.totalWeeks}-week program` : "No active program"}
            ${program ? `<div class="row-sub">Deload every ${program.deloadEveryNWeeks} weeks · units: ${program.units}</div>` : ""}
          </div>
        </div>
        <button type="button" class="settings-row" id="viewProgramBtn">
          <div class="row-icon">📋</div>
          <div class="row-text">View &amp; adjust program<div class="row-sub">Weeks remaining, upcoming prescriptions</div></div>
          <span class="row-chevron">›</span>
        </button>
        <button type="button" class="settings-row" id="newProgramBtn">
          <div class="row-icon">✨</div>
          <div class="row-text">Start a new program</div>
          <span class="row-chevron">›</span>
        </button>
      </div>
    </div>

    <div class="settings-group">
      <span class="eyebrow">Tracking</span>
      <div class="settings-list">
        <button type="button" class="settings-row" id="bodyCompBtn">
          <div class="row-icon">📉</div>
          <div class="row-text">Body composition<div class="row-sub">Weight, measurements, progress photos</div></div>
          <span class="row-chevron">›</span>
        </button>
      </div>
    </div>

    ${activeFlags.length ? `
      <div class="settings-group">
        <span class="eyebrow">Active Pain Flags</span>
        <div class="settings-list" id="painFlagList">
          ${activeFlags
            .map(
              (f) => `
                <div class="settings-row" style="cursor:default;">
                  <div class="row-icon">⚠️</div>
                  <div class="row-text">${EXERCISES[f.exerciseId]?.name || f.exerciseId} — ${f.joint}
                    <div class="row-sub">${f.note || "No note"} · ${new Date(f.loggedAt).toLocaleDateString()}</div>
                  </div>
                  <button type="button" class="btn small secondary" data-resolve="${f.id}">Resolved</button>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    ` : ""}

    <div class="settings-group">
      <span class="eyebrow">Backup</span>
      <div class="settings-list">
        <button type="button" class="settings-row" id="exportBtn">
          <div class="row-icon">⬇️</div>
          <div class="row-text">Export backup<div class="row-sub">Program data, body log, and photos as one JSON file</div></div>
          <span class="row-chevron">›</span>
        </button>
        <label class="settings-row" for="importFile" style="cursor:pointer;">
          <div class="row-icon">⬆️</div>
          <div class="row-text">Import backup<div class="row-sub">Replaces all current data</div></div>
          <span class="row-chevron">›</span>
        </label>
        <input type="file" id="importFile" accept="application/json" style="display:none" />
      </div>
      <p class="subtle" style="margin-top:10px;padding:0 4px;">Your data lives only on this device's browser storage. Export a backup periodically, especially before clearing Safari data.</p>
    </div>

    <div class="settings-group">
      <span class="eyebrow">Danger Zone</span>
      <div class="settings-list">
        <button type="button" class="settings-row danger" id="clearBtn">
          <div class="row-icon">🗑️</div>
          <div class="row-text">Erase all data<div class="row-sub">Program, body log, photos — everything</div></div>
        </button>
      </div>
    </div>
  `;

  container.querySelector("#nameInput").addEventListener("change", (e) => {
    setUserName(e.target.value.trim());
  });

  container.querySelector("#newProgramBtn").addEventListener("click", () => navigate("setup"));
  container.querySelector("#bodyCompBtn").addEventListener("click", () => navigate("body"));
  if (program) {
    container.querySelector("#viewProgramBtn").addEventListener("click", () => navigate("program"));
  }

  container.querySelectorAll("[data-resolve]").forEach((btn) => {
    btn.addEventListener("click", () => {
      State.resolvePainFlag(btn.dataset.resolve);
      render(container, { navigate });
    });
  });

  container.querySelector("#exportBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const original = btn.querySelector(".row-text").innerHTML;
    btn.querySelector(".row-text").innerHTML = "Preparing backup…";
    btn.disabled = true;
    try {
      await exportDataAsFile();
    } finally {
      btn.querySelector(".row-text").innerHTML = original;
      btn.disabled = false;
    }
  });

  container.querySelector("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Importing will replace all current data. Continue?")) return;
    try {
      await importDataFromFile(file);
      State.init();
      navigate("dashboard");
    } catch (err) {
      alert("That file could not be read as a valid backup.");
    }
  });

  container.querySelector("#clearBtn").addEventListener("click", async () => {
    if (!confirm("This permanently erases all workout data, body log entries, and photos on this device. Continue?")) return;
    await wipeEverything();
    State.init();
    navigate("setup");
  });
}
