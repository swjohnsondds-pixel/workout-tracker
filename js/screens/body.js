import * as State from "../state.js";
import { savePhoto, getPhotoURL, deletePhoto } from "../photoStore.js";
import { uid, todayISO } from "../utils.js";
import { getHeightInches, setHeightInches } from "../storage.js";

const METRICS = [
  { key: "weight", label: "Weight", unit: "lb" },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "bodyFatPct", label: "Body Fat", unit: "%" },
  { key: "muscleMassLb", label: "Muscle Mass", unit: "lb" },
  { key: "waterPct", label: "Water", unit: "%" },
  { key: "boneMassLb", label: "Bone Mass", unit: "lb" },
  { key: "visceralFat", label: "Visceral Fat", unit: "" },
  { key: "metabolicAge", label: "Metabolic Age", unit: "yrs" },
];

function computeBMI(weightLb, heightIn) {
  if (!weightLb || !heightIn) return null;
  return Math.round(((weightLb / (heightIn * heightIn)) * 703) * 10) / 10;
}

function entriesWithBMI(entries, heightIn) {
  return entries.map((e) => ({ ...e, bmi: computeBMI(e.weight, heightIn) }));
}

function buildMetricChart(entries, key) {
  const W = 300, H = 130, PAD_X = 10, PAD_TOP = 12, PAD_BOTTOM = 20;
  const points = entries.map((e, i) => ({ i, value: e[key] })).filter((p) => p.value != null);
  if (points.length < 2) return "";

  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = max - min || 1;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p) => [
    PAD_X + (points.length === 1 ? 0 : (p.i / (entries.length - 1)) * plotW),
    PAD_TOP + plotH - ((p.value - min) / range) * plotH,
  ]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} L${coords[0][0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;
  const dots = coords
    .map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === coords.length - 1 ? 5 : 3}" fill="${i === coords.length - 1 ? "#d7ff3d" : "#1c1c1e"}" stroke="#d7ff3d" stroke-width="2" />`)
    .join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="bodyMetricFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d7ff3d" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#d7ff3d" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#bodyMetricFill)" stroke="none" />
      <path d="${linePath}" fill="none" stroke="#d7ff3d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
    </svg>
  `;
}

function rowSummary(e) {
  const parts = [];
  if (e.weight != null) parts.push(`${e.weight} lb`);
  if (e.bmi != null) parts.push(`BMI ${e.bmi}`);
  if (e.bodyFatPct != null) parts.push(`${e.bodyFatPct}% BF`);
  if (e.muscleMassLb != null) parts.push(`${e.muscleMassLb} lb muscle`);
  if (e.waterPct != null) parts.push(`${e.waterPct}% water`);
  if (e.boneMassLb != null) parts.push(`${e.boneMassLb} lb bone`);
  if (e.visceralFat != null) parts.push(`VF ${e.visceralFat}`);
  if (e.metabolicAge != null) parts.push(`meta age ${e.metabolicAge}`);
  if (e.notes) parts.push(e.notes);
  return parts.join(" · ") || "No metrics logged";
}

export function render(container, { navigate }) {
  const heightIn = getHeightInches();
  const rawEntries = State.getBodyEntries();
  const entries = entriesWithBMI(rawEntries, heightIn);

  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>Body Composition</h1>
    <p class="subtle" style="margin-bottom:16px;">Its own space, separate from workout logging — log a reading whenever you weigh in, not every session.</p>

    <div class="card">
      <h2>Height</h2>
      <p class="subtle" style="margin-bottom:10px;">Needed to compute BMI. Set once, edit anytime.</p>
      <div class="field" style="margin-bottom:0;display:flex;gap:10px;align-items:flex-end;">
        <div style="flex:1;">
          <label for="heightInput">Height (inches)</label>
          <input type="number" inputmode="decimal" id="heightInput" value="${heightIn ?? ""}" placeholder="e.g. 70" />
        </div>
        <button class="btn secondary small" id="saveHeightBtn">Save</button>
      </div>
    </div>

    <div class="card">
      <h2>Log an Entry</h2>
      <div class="field">
        <label for="entryDate">Date</label>
        <input type="date" id="entryDate" value="${todayISO()}" />
      </div>
      <div class="field">
        <label for="entryWeight">Weight (lb)</label>
        <input type="number" inputmode="decimal" id="entryWeight" placeholder="e.g. 182.5" />
      </div>
      <div class="field">
        <label for="entryBF">Body fat % (optional)</label>
        <input type="number" inputmode="decimal" id="entryBF" placeholder="e.g. 18" />
      </div>
      <div class="field">
        <label for="entryMuscle">Muscle mass, lb (optional)</label>
        <input type="number" inputmode="decimal" id="entryMuscle" placeholder="e.g. 145" />
      </div>
      <div class="field">
        <label for="entryWater">Water % (optional)</label>
        <input type="number" inputmode="decimal" id="entryWater" placeholder="e.g. 55" />
      </div>
      <div class="field">
        <label for="entryBone">Bone mass, lb (optional)</label>
        <input type="number" inputmode="decimal" id="entryBone" placeholder="e.g. 7.2" />
      </div>
      <div class="field">
        <label for="entryVisceral">Visceral fat rating (optional)</label>
        <input type="number" inputmode="decimal" id="entryVisceral" placeholder="e.g. 8" />
      </div>
      <div class="field">
        <label for="entryMetaAge">Metabolic age (optional)</label>
        <input type="number" inputmode="numeric" id="entryMetaAge" placeholder="e.g. 42" />
      </div>
      <div class="field">
        <label for="entryNotes">Notes (optional)</label>
        <input type="text" id="entryNotes" placeholder="How you're feeling, anything notable" />
      </div>
      <div class="field">
        <label for="entryPhoto">Progress photo (optional)</label>
        <input type="file" id="entryPhoto" accept="image/*" capture="environment" />
      </div>
      <button class="btn" id="saveEntryBtn">Save Entry</button>
    </div>

    ${entries.length >= 2 ? `
      <div class="chart-card">
        <div class="exercise-picker-wrap">
          <select id="metricPicker">
            ${METRICS.map((m) => `<option value="${m.key}">${m.label}</option>`).join("")}
          </select>
        </div>
        <div id="metricChartBody"></div>
      </div>
    ` : ""}

    ${entries.filter((e) => e.photoId).length >= 2 ? `
      <div class="card">
        <h2>Compare Photos</h2>
        <div class="field">
          <label for="compareA">From</label>
          <select id="compareA"></select>
        </div>
        <div class="field">
          <label for="compareB">To</label>
          <select id="compareB"></select>
        </div>
        <div id="compareView" class="compare-view"></div>
      </div>
    ` : ""}

    <div class="settings-group">
      <span class="eyebrow">History</span>
      <div id="entryList"></div>
    </div>
  `;

  container.querySelector("#backBtn").addEventListener("click", () => navigate("settings"));

  container.querySelector("#saveHeightBtn").addEventListener("click", () => {
    const v = parseFloat(container.querySelector("#heightInput").value);
    setHeightInches(Number.isFinite(v) && v > 0 ? v : null);
    render(container, { navigate });
  });

  container.querySelector("#saveEntryBtn").addEventListener("click", async () => {
    const dateISO = container.querySelector("#entryDate").value || todayISO();
    const weight = parseFloat(container.querySelector("#entryWeight").value);
    const bodyFatPct = parseFloat(container.querySelector("#entryBF").value);
    const muscleMassLb = parseFloat(container.querySelector("#entryMuscle").value);
    const waterPct = parseFloat(container.querySelector("#entryWater").value);
    const boneMassLb = parseFloat(container.querySelector("#entryBone").value);
    const visceralFat = parseFloat(container.querySelector("#entryVisceral").value);
    const metabolicAge = parseFloat(container.querySelector("#entryMetaAge").value);
    const notes = container.querySelector("#entryNotes").value;
    const photoFile = container.querySelector("#entryPhoto").files[0];

    const anyMetric = [weight, bodyFatPct, muscleMassLb, waterPct, boneMassLb, visceralFat, metabolicAge].some(Number.isFinite);
    if (!anyMetric && !photoFile) {
      alert("Enter at least one metric or a photo.");
      return;
    }

    let photoId = null;
    if (photoFile) {
      photoId = uid();
      try {
        await savePhoto(photoId, photoFile);
      } catch (err) {
        alert("Could not save the photo (your device may be low on storage). Saving the rest of the entry anyway.");
        photoId = null;
      }
    }

    State.addBodyEntry({
      dateISO,
      weight: Number.isFinite(weight) ? weight : null,
      bodyFatPct: Number.isFinite(bodyFatPct) ? bodyFatPct : null,
      muscleMassLb: Number.isFinite(muscleMassLb) ? muscleMassLb : null,
      waterPct: Number.isFinite(waterPct) ? waterPct : null,
      boneMassLb: Number.isFinite(boneMassLb) ? boneMassLb : null,
      visceralFat: Number.isFinite(visceralFat) ? visceralFat : null,
      metabolicAge: Number.isFinite(metabolicAge) ? metabolicAge : null,
      notes,
      photoId,
    });
    render(container, { navigate });
  });

  // ---- metric chart picker ----
  const metricPicker = container.querySelector("#metricPicker");
  if (metricPicker) {
    function paintMetric() {
      const metric = METRICS.find((m) => m.key === metricPicker.value);
      const body = container.querySelector("#metricChartBody");
      if (metric.key === "bmi" && !heightIn) {
        body.innerHTML = `<p class="subtle" style="padding:20px 0;text-align:center;">Set your height above to see BMI.</p>`;
        return;
      }
      const withValue = entries.filter((e) => e[metric.key] != null);
      if (withValue.length === 0) {
        body.innerHTML = `<p class="subtle" style="padding:20px 0;text-align:center;">No ${metric.label.toLowerCase()} entries logged yet.</p>`;
        return;
      }
      const latest = withValue[withValue.length - 1];
      const chart = buildMetricChart(entries, metric.key);
      body.innerHTML = `
        <div class="chart-headline"><span class="stat-num">${latest[metric.key]}${metric.unit ? " " + metric.unit : ""}</span></div>
        ${chart || '<p class="subtle" style="padding:20px 0;text-align:center;">Log this metric twice to see a trend.</p>'}
      `;
    }
    metricPicker.addEventListener("change", paintMetric);
    paintMetric();
  }

  // ---- entry list, with async photo thumbnails ----
  const listEl = container.querySelector("#entryList");
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">📉</span><h2>No entries yet</h2><p class="subtle">Log your first reading above to start tracking.</p></div>`;
  } else {
    listEl.innerHTML = `<div class="settings-list">${[...entries].reverse().map((e) => `
      <div class="settings-row" style="cursor:default;">
        <div class="body-thumb" data-photo-slot="${e.photoId || ""}">${e.photoId ? "" : "—"}</div>
        <div class="row-text">
          ${new Date(e.dateISO).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          <div class="row-sub">${rowSummary(e)}</div>
        </div>
        <button type="button" class="btn small danger-outline" data-delete-entry="${e.id}" data-photo-id="${e.photoId || ""}">Delete</button>
      </div>
    `).join("")}</div>`;

    listEl.querySelectorAll("[data-photo-slot]").forEach(async (el) => {
      const photoId = el.dataset.photoSlot;
      if (!photoId) return;
      const url = await getPhotoURL(photoId);
      if (url && el.isConnected) el.innerHTML = `<img src="${url}" alt="progress photo" />`;
    });

    listEl.querySelectorAll("[data-delete-entry]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this entry?")) return;
        if (btn.dataset.photoId) await deletePhoto(btn.dataset.photoId);
        State.deleteBodyEntry(btn.dataset.deleteEntry);
        render(container, { navigate });
      });
    });
  }

  // ---- photo comparison ----
  const compareA = container.querySelector("#compareA");
  const compareB = container.querySelector("#compareB");
  if (compareA && compareB) {
    const withPhotos = entries.filter((e) => e.photoId);
    const optionsHTML = withPhotos
      .map((e) => `<option value="${e.id}">${new Date(e.dateISO).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</option>`)
      .join("");
    compareA.innerHTML = optionsHTML;
    compareB.innerHTML = optionsHTML;
    compareA.value = withPhotos[0].id;
    compareB.value = withPhotos[withPhotos.length - 1].id;

    async function paintCompare() {
      const a = withPhotos.find((e) => e.id === compareA.value);
      const b = withPhotos.find((e) => e.id === compareB.value);
      const view = container.querySelector("#compareView");
      const [urlA, urlB] = await Promise.all([getPhotoURL(a.photoId), getPhotoURL(b.photoId)]);
      const delta = a.weight != null && b.weight != null ? (b.weight - a.weight).toFixed(1) : null;
      view.innerHTML = `
        <div class="compare-pair">
          <div class="compare-side"><img src="${urlA}" alt="before" />${a.weight != null ? `<div class="subtle">${a.weight} lb</div>` : ""}</div>
          <div class="compare-side"><img src="${urlB}" alt="after" />${b.weight != null ? `<div class="subtle">${b.weight} lb</div>` : ""}</div>
        </div>
        ${delta != null ? `<p class="subtle" style="text-align:center;margin-top:10px;">${delta > 0 ? "+" : ""}${delta} lb over this span</p>` : ""}
      `;
    }
    compareA.addEventListener("change", paintCompare);
    compareB.addEventListener("change", paintCompare);
    paintCompare();
  }
}
