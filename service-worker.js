const CACHE_NAME = "lift-tracker-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/state.js",
  "./js/storage.js",
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
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
