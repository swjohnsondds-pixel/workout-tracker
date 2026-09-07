// Fetches a short how-to video/image + description from wger.de's open,
// keyless exercise database (CORS-enabled, no API key required). Results are
// cached in localStorage so repeat views and offline use don't need network,
// and any failure (offline, no match, API hiccup) resolves to null so the
// caller can fall back to the local `cue` text instead of blocking the UI.

const CACHE_PREFIX = "wgerHowTo:";

function stripHtml(html) {
  return (html || "")
    .replace(/<\/(p|li|ul|ol|div|br|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

export async function fetchHowTo(wgerId) {
  if (wgerId == null) return null;

  const cacheKey = CACHE_PREFIX + wgerId;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through and re-fetch
    }
  }

  try {
    const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/?format=json`);
    if (!res.ok) return null;
    const data = await res.json();

    const video = data.videos && data.videos[0] ? data.videos[0].video : null;
    const mainImage = (data.images || []).find((i) => i.is_main) || (data.images || [])[0];
    const image = mainImage ? mainImage.image : null;
    const translation =
      (data.translations || []).find((t) => t.language === 2) || (data.translations || [])[0];
    const description = translation ? stripHtml(translation.description) : "";

    const result = { video, image, description };
    localStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch (e) {
    return null;
  }
}
