// Workout reminder notifications.
//
// HONEST SCOPE NOTE: iOS 16.4+ Safari does support Web Push for installed
// PWAs, but only when a server holds VAPID keys and actively sends the
// push message — that's how the Push API works everywhere, iOS included.
// This is a static site with no backend, so there is nothing that can wake
// your phone with an alert while the app is closed; standing that up would
// mean deploying and maintaining a small server, which is a real
// infrastructure decision, not something this file can fake its way around.
//
// What IS genuinely implemented here: a real system notification (not a
// fake in-app banner) shown via the Notification permission you grant,
// triggered when you actually open the app on a day you're due to train.
// It's a foreground trigger, not a background wake-up.

import { getNotificationsEnabled, setNotificationsEnabled, getLastNotifiedAt, markNotified } from "./storage.js";
import { getDaysSinceLastActivity, getNextWorkout } from "./state.js";

const REMINDER_AFTER_DAYS = 1; // "due" once a full day has passed with no session
const RENOTIFY_HOURS = 20;

export function notificationsSupported() {
  return typeof Notification !== "undefined";
}

export function getPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export function isEnabled() {
  return getNotificationsEnabled() && getPermission() === "granted";
}

export async function enableReminders() {
  if (!notificationsSupported()) return { ok: false, reason: "Notifications aren't supported in this browser." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setNotificationsEnabled(false);
    return { ok: false, reason: "Permission wasn't granted. You can allow it later from iOS Settings → Notifications → Lift Tracker." };
  }
  setNotificationsEnabled(true);
  return { ok: true };
}

export function disableReminders() {
  setNotificationsEnabled(false);
}

// Call this once when the app opens (foreground only — see the scope note
// above). Shows a real system notification if you're enabled, permitted,
// overdue for a session, and haven't already been notified recently.
export async function maybeShowTrainingReminder() {
  if (!isEnabled()) return;

  const next = getNextWorkout();
  if (!next) return; // program complete, nothing to remind about

  const daysSince = getDaysSinceLastActivity();
  if (daysSince < REMINDER_AFTER_DAYS) return;

  const last = getLastNotifiedAt();
  if (last && (Date.now() - new Date(last).getTime()) / 3600000 < RENOTIFY_HOURS) return;

  const title = "Time to train 💪";
  const body = "Your next session is queued up and ready whenever you are.";

  try {
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, icon: "icons/icon-192.png", tag: "lift-tracker-reminder" });
        markNotified();
        return;
      }
    }
    new Notification(title, { body, icon: "icons/icon-192.png" });
    markNotified();
  } catch (e) {
    // Never let a notification failure disrupt the app.
  }
}
