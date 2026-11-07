/**
 * Platform abstraction layer (CLAUDE.md section 2.3).
 *
 * Every capability that genuinely differs between Android and iPhone is
 * declared here as an interface, implemented once in `android.ts` and
 * once in `ios.ts`, and selected at import time via `index.ts`. The rest
 * of the app imports from `src/platform` and never branches on
 * `Platform.OS` directly — that keeps platform parity (section 2, rule 1)
 * enforceable by code review instead of by convention.
 *
 * Every method here must have a working implementation on BOTH
 * platforms, or a documented equivalent per the parity table in
 * section 2. There is no silent "not supported" path: if a platform
 * truly cannot do something, that has to be a product decision, flagged
 * in the PR per rule 2, not a stub that quietly no-ops.
 */

export type AlertBreakthroughResult =
  | { granted: true }
  | { granted: false; reason: string };

export interface NotificationChannelSetup {
  /** Creates/updates the SOS high-priority channel or Critical Alerts
   * entitlement request, per the parity table row "Alert that breaks
   * through silent / Do Not Disturb". */
  ensureSosChannel(): Promise<AlertBreakthroughResult>;
}

export interface BackgroundReliabilitySetup {
  /** Requests whatever this platform calls "please don't kill this app
   * in the background" — Unrestricted battery on Android, Background
   * App Refresh + Always location on iPhone. Returns whether the user
   * still needs to flip something in system settings (the Setup
   * Checklist, section 11, walks them through it either way). */
  requestBackgroundReliability(): Promise<{ needsManualStep: boolean }>;
}

export interface SosWidgetSetup {
  /** True once the OS reports the widget/Lock Screen item/Control
   * Center control has actually been added by the user. There is no
   * way to add it programmatically on either platform — this only
   * reports status so the Setup Checklist can show a green check. */
  isSosWidgetInstalled(): Promise<boolean>;
}

export interface PlatformAdapter
  extends NotificationChannelSetup,
    BackgroundReliabilitySetup,
    SosWidgetSetup {
  readonly os: "android" | "ios";
}
