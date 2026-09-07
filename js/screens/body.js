import * as State from "../state.js";
import { savePhoto, getPhotoURL, deletePhoto } from "../photoStore.js";
import { uid, todayISO } from "../utils.js";

function buildWeightChart(entries) {
  const points = entries.filter((e) => e.weight != null);
  if (points.length < 2) return "";

  const W = 300, H = 120, PAD_X = 10, PAD_TOP = 12, PAD_BOTTOM = 10;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => [
    PAD_X + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW),
    PAD_TOP + plotH - ((p.weight - min) / range) * plotH,
  ]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} L${coords[0][0].toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;
  const dots = coords.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === coords.length - 1 ? 5 : 3}" class="${i === coords.length - 1 ? "chart-dot-last" : "chart-dot"}" />`).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="bodyAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c6ff4a" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#c6ff4a" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#bodyAreaFill)" stroke="none" />
      <path d="${linePath}" fill="none" stroke="#c6ff4a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
    </svg>
  `;
}

export function render(container, { navigate }) {
  const entries = State.getBodyEntries();

  container.innerHTML = `
    <div class="top-bar">
      <button class="back" id="backBtn">‹ Back</button>
    </div>
    <h1>Body Composition</h1>

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
        <label for="entryNotes">Notes (optional)</label>
        <input type="text" id="entryNotes" placeholder="How you're feeling, anything notable" />
      </div>
      <div class="field">
        <label for="entryPhoto">Progress photo (optional)</label>
        <input type="file" id="entryPhoto" accept="image/*" capture="environment" />
      </div>
      <button class="btn" id="saveEntryBtn">Save Entry</button>
    </div>

    ${entries.length >= 2 ? `<div class="chart-card"><h2>Weight Trend</h2>${buildWeightChart(entries)}</div>` : ""}

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

  container.querySelector("#saveEntryBtn").addEventListener("click", async () => {
    const dateISO = container.querySelector("#entryDate").value || todayISO();
    const weight = parseFloat(container.querySelector("#entryWeight").value);
    const bodyFatPct = parseFloat(container.querySelector("#entryBF").value);
    const notes = container.querySelector("#entryNotes").value;
    const photoFile = container.querySelector("#entryPhoto").files[0];

    if (!Number.isFinite(weight) && !Number.isFinite(bodyFatPct) && !photoFile) {
      alert("Enter at least a weight, body fat %, or photo.");
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
      notes,
      photoId,
    });
    render(container, { navigate });
  });

  // ---- entry list, with async photo thumbnails ----
  const listEl = container.querySelector("#entryList");
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">📉</span><h2>No entries yet</h2><p class="subtle">Log your first weigh-in above to start tracking.</p></div>`;
  } else {
    listEl.innerHTML = `<div class="settings-list">${[...entries].reverse().map((e) => `
      <div class="settings-row" style="cursor:default;">
        <div class="body-thumb" data-photo-slot="${e.photoId || ""}">${e.photoId ? "" : "—"}</div>
        <div class="row-text">
          ${new Date(e.dateISO).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          <div class="row-sub">${e.weight != null ? `${e.weight} lb` : ""}${e.bodyFatPct != null ? ` · ${e.bodyFatPct}% BF` : ""}${e.notes ? ` · ${e.notes}` : ""}</div>
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
