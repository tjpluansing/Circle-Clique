import type { PlatformAdapter } from "./types";

/**
 * iPhone implementation (CLAUDE.md section 2, parity table).
 *
 * TODO (Phase 0/1, needs a dev build and the Critical Alerts
 * entitlement applied for in Phase 0):
 * - ensureSosChannel: request Critical Alerts; fall back to Time
 *   Sensitive + SMS/voice escalation if the entitlement isn't granted
 *   yet (the fallback path must work even if Apple never approves it).
 * - requestBackgroundReliability: Background App Refresh on, location
 *   "Always", and guide the user to add the app to Focus-mode
 *   allow-lists (section 11).
 * - isSosWidgetInstalled: WidgetKit has no reliable "is this widget on
 *   a Home Screen/Lock Screen right now" API either; this always
 *   resolves false and the Setup Checklist stays un-checked until the
 *   user confirms by hand, same as Android.
 */
export const iosAdapter: PlatformAdapter = {
  os: "ios",

  async ensureSosChannel() {
    throw new Error("iosAdapter.ensureSosChannel: not implemented yet");
  },

  async requestBackgroundReliability() {
    throw new Error(
      "iosAdapter.requestBackgroundReliability: not implemented yet",
    );
  },

  async isSosWidgetInstalled() {
    return false;
  },
};
