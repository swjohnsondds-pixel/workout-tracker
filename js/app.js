import * as State from "./state.js";
import { getUserName, getTheme } from "./storage.js";
import { maybeShowTrainingReminder } from "./notifications.js";
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
      <span class="icon">🏋️</span>Home
    </button>
    <button data-route="history" class="${activeRoute === "history" ? "active" : ""}">
      <span class="icon">📈</span>History
    </button>
    <button data-route="settings" class="${activeRoute === "settings" ? "active" : ""}">
      <span class="icon">⚙️</span>Settings
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

// Builds the DOM for the current hash into a fresh #app — the actual
// per-screen rendering logic, unconcerned with transitions.
function renderRoute() {
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

// Auto-dismisses after ~1.3s either way — the pill button just lets an
// impatient tap skip straight to the Dashboard instead of waiting it out.
function showWelcomeSplash() {
  const el = document.createElement("div");
  el.className = "welcome-splash";
  el.innerHTML = `
    <div class="welcome-photos">
      <div class="welcome-photo" style="background-image:url('images/dumbbell-rack.jpg')"></div>
      <div class="welcome-photo main" style="background-image:url('images/workout-moody.jpg')"></div>
      <div class="welcome-photo" style="background-image:url('images/dumbbells-row.jpg')"></div>
    </div>
    <div class="welcome-content">
      <div class="welcome-label">Iron &amp; Steven</div>
      <div class="welcome-text">Build Your<br />Best Body</div>
      <button type="button" class="welcome-cta">Hello, ${getUserName()}</button>
      <div class="welcome-home-indicator"></div>
    </div>
  `;
  document.body.appendChild(el);
  const dismiss = () => {
    if (el.classList.contains("fade-out")) return;
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 350);
  };
  el.querySelector(".welcome-cta").addEventListener("click", dismiss);
  setTimeout(dismiss, 900);
}

window.addEventListener("hashchange", render);

// Applied first, before any rendering, so the correct theme is already in
// place for the very first paint (no flash of the wrong theme).
document.documentElement.dataset.theme = getTheme();

// Module scripts execute after the document has been parsed, so the DOM is
// already available here — no need to wait for DOMContentLoaded.
State.init();
renderRoute();
showWelcomeSplash();
if (State.hasActiveProgram()) maybeShowTrainingReminder();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
