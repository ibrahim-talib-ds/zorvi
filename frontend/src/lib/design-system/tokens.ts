/**
 * ZORVI — Design tokens
 * Author: Ibrahim Talib
 *
 * Single source of truth for colors, spacing, typography, radius.
 * Every color used in ZORVI must come from `colors`.
 * Every spacing value must come from `space`.
 * Every font size must come from `text`.
 *
 * Never hardcode a hex value in a screen component.
 */

export const colors = {
  // ---- Dark theme (default / primary) ----
  bgBase:       "#0D1122",
  bgSurface:    "#11152A",
  bgElevated:   "#171B35",
  bgBorder:     "#1F2442",

  textPrimary:   "#F2F4FA",
  textSecondary: "#A0A6BF",
  textMuted:     "#6B7194",

  brandPrimary:  "#7559E8",
  brandHover:    "#8568EE",
  brandSubtle:   "#A78BFA",

  accentTeal:    "#22C58B",
  accentAmber:   "#F5A623",
  accentRose:    "#F05D70",
  accentBlue:    "#5B9EFF",
} as const;

export const space = {
  xs:  "4px",
  sm:  "8px",
  md:  "12px",
  lg:  "16px",
  xl:  "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
  "5xl": "48px",
  "6xl": "64px",
  "7xl": "80px",
} as const;

export const text = {
  displayXL: { size: "56px", weight: 800, family: "var(--font-jakarta)", lineHeight: 1.05 },
  displayLG: { size: "44px", weight: 800, family: "var(--font-jakarta)", lineHeight: 1.1 },
  h1:        { size: "32px", weight: 700, family: "var(--font-jakarta)", lineHeight: 1.15 },
  h2:        { size: "24px", weight: 700, family: "var(--font-jakarta)", lineHeight: 1.2 },
  h3:        { size: "20px", weight: 700, family: "var(--font-jakarta)", lineHeight: 1.25 },
  bodyLG:    { size: "16px", weight: 400, family: "var(--font-inter)",   lineHeight: 1.55 },
  bodyMD:    { size: "14px", weight: 400, family: "var(--font-inter)",   lineHeight: 1.5  },
  bodySM:    { size: "13px", weight: 500, family: "var(--font-inter)",   lineHeight: 1.4  },
  caption:   { size: "12px", weight: 500, family: "var(--font-inter)",   lineHeight: 1.3  },
  code:      { size: "13px", weight: 400, family: "var(--font-mono)",    lineHeight: 1.5  },
} as const;

export const radius = {
  sm:   "6px",
  md:   "10px",
  lg:   "14px",
  xl:   "20px",
  full: "999px",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.4)",
  md: "0 4px 12px rgba(0,0,0,0.35)",
  lg: "0 12px 32px rgba(0,0,0,0.45)",
  glowBrand: "0 0 24px rgba(117,89,232,0.35)",
} as const;

export const T = { colors, space, text, radius, shadow } as const;
