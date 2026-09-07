import { getAllPhotos, restorePhotos, blobToBase64, base64ToBlob, clearAllPhotos } from "./photoStore.js";

const STORAGE_KEY = "workoutTrackerData.v1";
const PERSISTENT_KEY = "workoutTrackerPersistent.v1";

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load data", e);
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
    alert("Could not save — your device may be out of storage space.");
  }
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}

// Body-composition entries and pain flags live separately from the program
// blob above, on purpose: starting a new program (createProgram overwrites
// `data` entirely) or erasing program data should never wipe out months of
// body-weight history or your pain-flag log.
export function loadPersistent() {
  try {
    const raw = localStorage.getItem(PERSISTENT_KEY);
    return raw ? JSON.parse(raw) : { bodyEntries: [], painFlags: [] };
  } catch (e) {
    console.error("Failed to load persistent data", e);
    return { bodyEntries: [], painFlags: [] };
  }
}

export function savePersistent(persistent) {
  try {
    localStorage.setItem(PERSISTENT_KEY, JSON.stringify(persistent));
  } catch (e) {
    console.error("Failed to save persistent data", e);
  }
}

export function clearPersistentData() {
  localStorage.removeItem(PERSISTENT_KEY);
}

// The Settings "erase all data" nuclear option — everything, not just the
// active program.
export async function wipeEverything() {
  clearData();
  clearPersistentData();
  await clearAllPhotos();
}

// Full backup: program data + persistent data (body entries/pain flags) +
// every progress photo, base64-encoded so it travels in one plain JSON file.
export async function exportDataAsFile() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const persistentRaw = localStorage.getItem(PERSISTENT_KEY);
  const photos = await getAllPhotos();
  const photoEntries = await Promise.all(
    photos.map(async (p) => ({ id: p.id, dataURL: await blobToBase64(p.blob) }))
  );

  const bundle = {
    format: "lift-tracker-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: raw ? JSON.parse(raw) : null,
    persistent: persistentRaw ? JSON.parse(persistentRaw) : { bodyEntries: [], painFlags: [] },
    photos: photoEntries,
  };

  const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `workout-tracker-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  markExported();
}

export function importDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (parsed.format === "lift-tracker-backup") {
          if (parsed.data) saveData(parsed.data);
          if (parsed.persistent) savePersistent(parsed.persistent);
          if (Array.isArray(parsed.photos) && parsed.photos.length) {
            const entries = await Promise.all(
              parsed.photos.map(async (p) => ({ id: p.id, blob: await base64ToBlob(p.dataURL) }))
            );
            await restorePhotos(entries);
          }
          resolve(parsed.data);
        } else {
          // Older exports were just the raw program data blob.
          saveData(parsed);
          resolve(parsed);
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ---- lightweight settings that live outside both blobs above ----

const NAME_KEY = "workoutTrackerUserName";
const LAST_EXPORT_KEY = "workoutTrackerLastExportAt";
const LAST_BACKUP_NUDGE_KEY = "workoutTrackerLastBackupNudgeAt";

export function getUserName() {
  return localStorage.getItem(NAME_KEY) || "Steven";
}

export function setUserName(name) {
  localStorage.setItem(NAME_KEY, name || "Steven");
}

export function getLastExportAt() {
  return localStorage.getItem(LAST_EXPORT_KEY);
}

export function markExported() {
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

export function getLastBackupNudgeAt() {
  return localStorage.getItem(LAST_BACKUP_NUDGE_KEY);
}

export function markBackupNudged() {
  localStorage.setItem(LAST_BACKUP_NUDGE_KEY, new Date().toISOString());
}
