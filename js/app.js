import * as State from "./state.js";
import * as Dashboard from "./screens/dashboard.js";
import * as ProgramSetup from "./screens/programSetup.js";
import * as ReviewExercises from "./screens/reviewExercises.js";
import * as WorkoutSession from "./screens/workoutSession.js";
import * as SessionSummary from "./screens/sessionSummary.js";
import * as History from "./screens/history.js";
import * as Settings from "./screens/settings.js";

const app = document.getElementById("app");

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

function render() {
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
  } else if (route === "workout") {
    WorkoutSession.render(screenEl, { navigate, weekNumber: Number(params[0]), dayTemplateId: params[1] });
  } else if (route === "summary") {
    SessionSummary.render(screenEl, { navigate, weekNumber: Number(params[0]), dayTemplateId: params[1] });
  } else if (route === "history") {
    History.render(screenEl, { navigate });
  } else if (route === "settings") {
    Settings.render(screenEl, { navigate });
  } else {
    Dashboard.render(screenEl, { navigate });
  }

  if (TAB_ROUTES.includes(route) || (!hasProgram && !inSetupFlow)) {
    app.appendChild(renderTabBar(hasProgram ? route : "dashboard"));
  }
}

window.addEventListener("hashchange", render);

// Module scripts execute after the document has been parsed, so the DOM is
// already available here — no need to wait for DOMContentLoaded.
State.init();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
