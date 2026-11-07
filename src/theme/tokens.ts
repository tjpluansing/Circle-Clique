/**
 * Circle Clique design system: "Teal and Peach" (CLAUDE.md section 10).
 *
 * Rules baked into these tokens:
 * - `emergency` is reserved for SOS and urgent alerts only — never used
 *   decoratively elsewhere in the app.
 * - `secondary` never carries white text on top of it (contrast rule).
 * - Status is never color alone: pair every status color with an icon
 *   and a word (see `StatusTone` below for the matching icon/word pairs
 *   screens should use).
 */

export const colors = {
  primary: "#0F6B6D",
  secondary: "#5FA8A0",
  background: "#FFF4E8",
  highlight: "#F7B08A",
  emergency: "#C94F33",
  text: "#12302F",
  textOnPrimary: "#FFFFFF",

  // Supporting neutrals used across the mockups, not in the core 7
  // tokens above but kept here so every screen draws from one place
  // instead of re-inventing hex values.
  card: "#FFFFFF",
  cardBorder: "#EBDCCB",
  mutedText: "#3F5857",
  successTint: "#DDEFEA",
  successText: "#0B4A4C",
} as const;

export type ColorToken = keyof typeof colors;

/** Print-safe palette (section 9.2): teal headings, black text, white background. */
export const printColors = {
  heading: "#0F6B6D",
  text: "#000000",
  background: "#FFFFFF",
} as const;

export const typography = {
  fontFamily: {
    body: "AtkinsonHyperlegible_400Regular",
    bodyBold: "AtkinsonHyperlegible_700Bold",
    display: "Fraunces_700Bold",
  },
  // Accessibility (section 10): body text at least 18sp, respect system
  // font scaling. These are starting points, not hard caps — every
  // screen must still allow the OS font-scale setting to grow them.
  size: {
    body: 18,
    bodyLarge: 20,
    label: 14,
    h1: 26,
    h1Large: 32, // Primary Mode headings run larger
    countdownDigit: 72,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
  card: 20,
} as const;

export const sizes = {
  /** Minimum tap target per section 10 accessibility rule. */
  minButtonHeight: 56,
  minTouchTarget: 44,
  /** SOS button minimum per the widget rules in section 6.7. */
  minSosTargetDp: 64,
} as const;

/**
 * Status tone helper (section 4, rule 5 and section 10): never color
 * alone. Every status in the app should resolve to one of these so the
 * icon + word + color stay paired by construction, not by convention.
 */
export type StatusTone = "ok" | "due" | "missed" | "urgent" | "info";

export const statusTones: Record<
  StatusTone,
  { color: string; word: string }
> = {
  ok: { color: colors.primary, word: "On track" },
  due: { color: colors.highlight, word: "Due" },
  missed: { color: colors.emergency, word: "Missed" },
  urgent: { color: colors.emergency, word: "Urgent" },
  info: { color: colors.secondary, word: "Info" },
};

export const theme = {
  colors,
  printColors,
  typography,
  spacing,
  radii,
  sizes,
  statusTones,
} as const;

export type Theme = typeof theme;
