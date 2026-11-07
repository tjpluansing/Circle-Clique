import type { PlatformAdapter } from "./types";

/**
 * Android implementation (CLAUDE.md section 2, parity table).
 *
 * TODO (Phase 0/1, needs a dev build — Expo Go is not enough):
 * - ensureSosChannel: create a high-importance notification channel
 *   with a full-screen intent, and ask the user to disable battery
 *   optimization / DND override for it.
 * - requestBackgroundReliability: guide the user to "Unrestricted"
 *   battery and off any "sleeping apps" list (section 11 has the
 *   Samsung-specific wording: "Never auto sleeping apps").
 * - isSosWidgetInstalled: there's no public API to detect this
 *   reliably pre-Android 14; until then this always resolves false and
 *   the Setup Checklist stays un-checked until the user confirms by
 *   hand.
 */
export const androidAdapter: PlatformAdapter = {
  os: "android",

  async ensureSosChannel() {
    // Implemented once expo-notifications + a config plugin are wired
    // up (Phase 0 checklist item: "Decide the Android widget approach").
    throw new Error("androidAdapter.ensureSosChannel: not implemented yet");
  },

  async requestBackgroundReliability() {
    throw new Error(
      "androidAdapter.requestBackgroundReliability: not implemented yet",
    );
  },

  async isSosWidgetInstalled() {
    return false;
  },
};
