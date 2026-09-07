import * as State from "../state.js";
import { exportDataAsFile, importDataFromFile, clearData } from "../storage.js";

export function render(container, { navigate }) {
  const data = State.getData();
  const program = data && data.program;

  container.innerHTML = `
    <h1>Settings</h1>

    <div class="card">
      <h2>Program</h2>
      <p class="subtle">${program ? `${program.totalWeeks}-week program · deload every ${program.deloadEveryNWeeks} weeks · units: ${program.units}` : "No active program"}</p>
      <button class="btn secondary" id="newProgramBtn">Start a new program</button>
    </div>

    <div class="card">
      <h2>Backup</h2>
      <p class="subtle">Your data lives only on this device's browser storage. Export a backup periodically, especially before clearing Safari data.</p>
      <button class="btn secondary" id="exportBtn">Export backup (JSON)</button>
      <label class="btn secondary" for="importFile" style="text-align:center;display:block;margin-top:8px;cursor:pointer;">Import backup</label>
      <input type="file" id="importFile" accept="application/json" style="display:none" />
    </div>

    <div class="card">
      <h2>Danger zone</h2>
      <button class="btn secondary" id="clearBtn" style="color:var(--danger);border-color:var(--danger);">Erase all data</button>
    </div>
  `;

  container.querySelector("#newProgramBtn").addEventListener("click", () => navigate("setup"));

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
