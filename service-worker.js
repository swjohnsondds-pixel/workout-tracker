const CACHE_NAME = "lift-tracker-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/photoStore.js",
  "./js/utils.js",
  "./js/warmups.js",
  "./js/progression.js",
  "./js/exercises.js",
  "./js/howto.js",
  "./js/modal.js",
  "./js/screens/dashboard.js",
  "./js/screens/programSetup.js",
  "./js/screens/reviewExercises.js",
  "./js/screens/workoutSession.js",
  "./js/screens/sessionSummary.js",
  "./js/screens/history.js",
  "./js/screens/settings.js",
  "./js/screens/program.js",
  "./js/screens/body.js",
  "./js/screens/checkin.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Cache what we can rather than all-or-nothing: cache.addAll() fails
        // the *entire* install if even one URL 404s, silently leaving the app
        // with zero offline support. A single bad path here should never be
        // able to take down offline access to everything else.
        Promise.allSettled(
          ASSETS.map((url) =>
            cache.add(url).catch((err) => console.warn("[sw] failed to cache", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Only handle same-origin app-shell requests with the cache-first
  // strategy. Cross-origin calls (the wger.de how-to API) are left to the
  // network as normal — howto.js already catches failures there and falls
  // back to the local cue, and caching third-party API responses here would
  // just be unreliable dead weight.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
