import * as State from "../state.js";
import { exportDataAsFile, importDataFromFile, clearData } from "../storage.js";

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data && data.program;

  container.innerHTML = `
    <h1>Settings</h1>

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
      <span class="eyebrow">Backup</span>
      <div class="settings-list">
        <button type="button" class="settings-row" id="exportBtn">
          <div class="row-icon">⬇️</div>
          <div class="row-text">Export backup<div class="row-sub">Saves a JSON file of all your data</div></div>
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
          <div class="row-text">Erase all data</div>
        </button>
      </div>
    </div>
  `;

  container.querySelector("#newProgramBtn").addEventListener("click", () => navigate("setup"));
  if (program) {
    container.querySelector("#viewProgramBtn").addEventListener("click", () => navigate("program"));
  }

  container.querySelector("#exportBtn").addEventListener("click", () => {
    exportDataAsFile();
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

  container.querySelector("#clearBtn").addEventListener("click", () => {
    if (!confirm("This permanently erases all workout data on this device. Continue?")) return;
    clearData();
    State.init();
    navigate("setup");
  });
}
