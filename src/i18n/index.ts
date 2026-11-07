import en from "../../i18n/en.json";

/**
 * Minimal translation lookup (CLAUDE.md section 4, rule 3: all
 * user-facing text lives in translation files, no hard-coded strings).
 *
 * Deliberately dependency-free for now — this is enough to enforce
 * "no hard-coded strings" during Phase 0/1. If pluralization or
 * date/number formatting needs grow, swap this for i18next without
 * changing the `t("sos.cancelButton")` call sites.
 *
 * Tagalog (`tl.json`) is added later (section 14 open items don't
 * block this — the lookup already supports more locales, there's just
 * one locale file today).
 */

type Dictionary = typeof en;
type Flatten<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? Flatten<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationKey = Flatten<Dictionary>;

const locales: Record<string, Dictionary> = { en };

let activeLocale = "en";

export function setLocale(locale: keyof typeof locales) {
  activeLocale = locale;
}

function lookup(key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = locales[activeLocale] ?? locales.en;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
    if (node === undefined) return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * t("sos.countdownAnnouncement", { circleName: "Mom's Circle" })
 * → "Alerting Mom's Circle"
 */
export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = lookup(key);
  if (template === undefined) {
    if (__DEV__) {
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}
