import type { TranslationKey } from "../../i18n";

/**
 * Device Setup Checklist content (CLAUDE.md section 11). One shared
 * shape for both platforms — the checklist UI itself doesn't need a
 * src/platform/ adapter (section 2 rule 3 applies to *behavior* that
 * differs by OS; the text here just differs, which the usual i18n
 * mechanism already handles).
 *
 * Note (flagged, not silently built around): section 11 says "shown
 * in-app, with green checks the Admin can see remotely," but section
 * 7's data model has no table for that yet. Completion state here is
 * local-only (useState in the screen) until a
 * setup_checklist_progress table (or similar) is added in a reviewed
 * migration.
 */
export interface ChecklistItem {
  id: string;
  labelKey: TranslationKey;
  /** Items marked optional in the spec text itself (watch pairing, voice/hearing-aid). */
  optional?: boolean;
}

export const androidChecklistItems: ChecklistItem[] = [
  { id: "notifications", labelKey: "setupChecklist.android.item0" },
  { id: "location", labelKey: "setupChecklist.android.item1" },
  { id: "battery", labelKey: "setupChecklist.android.item2" },
  { id: "brandSpecific", labelKey: "setupChecklist.android.item3" },
  { id: "sosWidget", labelKey: "setupChecklist.android.item4" },
  { id: "builtInEmergencySos", labelKey: "setupChecklist.android.item5" },
  { id: "autoUpdates", labelKey: "setupChecklist.android.item6" },
  {
    id: "wearOsWatch",
    labelKey: "setupChecklist.android.item7",
    optional: true,
  },
  {
    id: "voiceAndHearingAid",
    labelKey: "setupChecklist.android.item8",
    optional: true,
  },
];

export const iphoneChecklistItems: ChecklistItem[] = [
  { id: "notifications", labelKey: "setupChecklist.iphone.item0" },
  { id: "location", labelKey: "setupChecklist.iphone.item1" },
  { id: "backgroundAppRefresh", labelKey: "setupChecklist.iphone.item2" },
  { id: "focusAndEmergencyBypass", labelKey: "setupChecklist.iphone.item3" },
  { id: "sosWidgetAndControl", labelKey: "setupChecklist.iphone.item4" },
  { id: "autoUpdates", labelKey: "setupChecklist.iphone.item5" },
  {
    id: "appleWatch",
    labelKey: "setupChecklist.iphone.item6",
    optional: true,
  },
  {
    id: "voiceAndHearingAid",
    labelKey: "setupChecklist.iphone.item7",
    optional: true,
  },
];
