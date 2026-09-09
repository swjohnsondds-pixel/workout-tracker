import * as State from "./state.js";
import { getUserName, getTheme, wipeEverything } from "./storage.js";
import { maybeShowTrainingReminder } from "./notifications.js";
import { icon } from "./icons.js";
import * as Dashboard from "./screens/dashboard.js";
import * as ProgramSetup from "./screens/programSetup.js";
import * as ReviewExercises from "./screens/reviewExercises.js";
import * as WorkoutSession from "./screens/workoutSession.js";
import * as SessionSummary from "./screens/sessionSummary.js";
import * as History from "./screens/history.js";
import * as Settings from "./screens/settings.js";
import * as Program from "./screens/program.js";
import * as Body from "./screens/body.js";
import * as CheckIn from "./screens/checkin.js";

const app = document.getElementById("app");
const EXIT_MS = 160;

export function navigate(path) {
  window.location.hash = path;
}

const TAB_ROUTES = ["dashboard", "history", "settings"];

function renderTabBar(activeRoute) {
  const bar = document.createElement("div");
  bar.className = "tab-bar";
  bar.innerHTML = `
    <button data-route="dashboard" class="${activeRoute === "dashboard" ? "active" : ""}">
      <span class="icon">${icon("dumbbell")}</span>Home
    </button>
    <button data-route="history" class="${activeRoute === "history" ? "active" : ""}">
      <span class="icon">${icon("trending-up")}</span>History
    </button>
    <button data-route="settings" class="${activeRoute === "settings" ? "active" : ""}">
      <span class="icon">${icon("settings")}</span>Settings
    </button>
  `;
  bar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
  return bar;
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [route, ...params] = raw.split("/").filter(Boolean);
  return { route: route || "dashboard", params };
}

let previousRoute = null;

// A render crash used to leave #app exactly as innerHTML="" left it — a
// silent blank screen with no signal anywhere about what broke. This
// renders an actual recovery screen instead: the real error (so it's
// diagnosable, not guessed at) plus a way forward that doesn't require
// dev tools — reload, or reset app data if the underlying cause is
// corrupted state that no navigation can fix on its own.
function renderCrashScreen(error) {
  console.error("Render failed:", error);
  app.innerHTML = "";
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <h1>Something Went Wrong</h1>
    <p class="subtle" style="margin-bottom:16px;">The screen you were on hit an error and couldn't render. Nothing has been lost — your data is still saved.</p>
    <div class="card" style="margin-bottom:16px;">
      <p class="subtle" style="font-family:monospace;font-size:0.78rem;white-space:pre-wrap;word-break:break-word;margin:0;">${(error && (error.stack || error.message)) || String(error)}</p>
    </div>
    <button type="button" class="btn" id="crashReloadBtn">Reload App</button>
    <button type="button" class="btn danger-outline" id="crashResetBtn" style="margin-top:10px;">Reset App Data</button>
  `;
  app.appendChild(el);
  el.querySelector("#crashReloadBtn").addEventListener("click", () => window.location.reload());
  el.querySelector("#crashResetBtn").addEventListener("click", async () => {
    if (!confirm("This permanently erases all workout data, body log entries, and photos on this device. Continue?")) return;
    await wipeEverything();
    window.location.hash = "";
    window.location.reload();
  });
}

// Builds the DOM for the current hash into a fresh #app — the actual
// per-screen rendering logic, unconcerned with transitions.
function renderRoute() {
  try {
    renderRouteUnsafe();
  } catch (error) {
    renderCrashScreen(error);
  }
}

function renderRouteUnsafe() {
  const { route, params } = parseHash();

  if (previousRoute === "workout" && route !== "workout") {
    WorkoutSession.cleanup();
  }
  previousRoute = route;

  app.innerHTML = "";

  const screenEl = document.createElement("div");
  screenEl.className = "screen";
  app.appendChild(screenEl);

  const hasProgram = State.hasActiveProgram();
  const inSetupFlow = route === "setup" || route === "review";

  if (!hasProgram && !inSetupFlow) {
    ProgramSetup.render(screenEl, { navigate });
  } else if (route === "setup") {
    ProgramSetup.render(screenEl, { navigate });
  } else if (route === "review") {
    ReviewExercises.render(screenEl, { navigate, weeks: Number(params[0]) });
  } else if (route === "checkin") {
    CheckIn.render(screenEl, { navigate, weekNumber: Number(params[0]), dayTemplateId: params[1] });
  } else if (route === "workout") {
    WorkoutSession.render(screenEl, { navigate, weekNumber: Number(params[0]), dayTemplateId: params[1] });
  } else if (route === "summary") {
    SessionSummary.render(screenEl, { navigate, weekNumber: Number(params[0]), dayTemplateId: params[1] });
  } else if (route === "history") {
    History.render(screenEl, { navigate });
  } else if (route === "settings") {
    Settings.render(screenEl, { navigate });
  } else if (route === "program") {
    Program.render(screenEl, { navigate });
  } else if (route === "body") {
    Body.render(screenEl, { navigate });
  } else {
    Dashboard.render(screenEl, { navigate });
  }

  if (TAB_ROUTES.includes(route) || (!hasProgram && !inSetupFlow)) {
    app.appendChild(renderTabBar(hasProgram ? route : "dashboard"));
  }
}

// Screen-to-screen transition: fade the outgoing .screen out, swap the DOM,
// then let the incoming .screen's own CSS enter-animation (screenIn) play.
// Sequential rather than a true overlapping crossfade — simpler and more
// robust than absolutely-positioning two differently-sized screens against
// each other, while still reading as a smooth transition instead of a cut.
// Only the .screen fades (not the fixed tab bar, which is persistent chrome).
let transitioning = false;
function render() {
  if (transitioning) return; // a transition is already in flight; let it finish
  const oldScreen = app.querySelector(".screen");
  if (!oldScreen) {
    renderRoute();
    return;
  }
  transitioning = true;
  oldScreen.classList.add("screen-exit");
  setTimeout(() => {
    renderRoute();
    transitioning = false;
  }, EXIT_MS);
}

// Runs once per app open, before anything else is on screen: a blank dark
// screen, a typewriter greeting, then a moody gym photo + Start button that
// fade in together — Start is the ONLY way forward, no timeout, no
// tap-anywhere fallback. onDone (building the real Dashboard underneath)
// only fires once Start is actually pressed.
function showOpeningSequence(onDone) {
  const el = document.createElement("div");
  el.className = "opening-sequence";
  el.innerHTML = `
    <div class="opening-photo-bg" style="background-image:url('images/workout-moody.jpg')"></div>
    <div class="opening-text-wrap">
      <span class="opening-text"></span><span class="opening-cursor"></span>
    </div>
    <button type="button" class="btn opening-start-btn">START</button>
  `;
  document.body.appendChild(el);

  const textEl = el.querySelector(".opening-text");
  const cursorEl = el.querySelector(".opening-cursor");
  const photoEl = el.querySelector(".opening-photo-bg");
  const startBtn = el.querySelector(".opening-start-btn");

  const name = getUserName();
  const fullText = name ? `Welcome ${name}` : "Welcome Friend";
  let i = 0;
  function typeNext() {
    i++;
    textEl.textContent = fullText.slice(0, i);
    if (i < fullText.length) {
      setTimeout(typeNext, 65);
    } else {
      setTimeout(() => {
        cursorEl.classList.add("fade-out");
        photoEl.classList.add("in");
        startBtn.classList.add("in");
      }, 500);
    }
  }
  setTimeout(typeNext, 400); // a beat of true blankness before typing starts

  startBtn.addEventListener("click", () => {
    if (startBtn.classList.contains("pressed")) return; // ignore a double-tap mid-transition
    startBtn.classList.add("pressed");
    setTimeout(() => {
      el.classList.add("fade-out");
      onDone();
      setTimeout(() => el.remove(), 320);
    }, 220);
  });
}

window.addEventListener("hashchange", render);

// Applied first, before any rendering, so the correct theme is already in
// place for the very first paint (no flash of the wrong theme).
document.documentElement.dataset.theme = getTheme();

// Module scripts execute after the document has been parsed, so the DOM is
// already available here — no need to wait for DOMContentLoaded. #app stays
// empty (truly blank, per the opening sequence's own dark background) until
// Start is pressed — the real screen isn't built until then.
State.init();
showOpeningSequence(() => {
  renderRoute();
  if (State.hasActiveProgram()) maybeShowTrainingReminder();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
