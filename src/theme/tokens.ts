/**
 * Design tokens extracted from session-templator.html `:root` / ambient / brand / buttons.
 * Do not invent hexes — keep this file in sync with the form prototype CSS.
 */

export const colors = {
  bg: '#0c0a0e',
  bgElevated: '#161218',
  bgPanel: '#1a151c',
  bgInset: '#100e12',

  border: 'rgba(255, 180, 120, 0.12)',
  borderStrong: 'rgba(255, 160, 100, 0.22)',

  text: '#f3ebe3',
  textMuted: '#9a8b80',
  textDim: '#6b5f57',

  sunrise: '#ff9a5a',
  sunset: '#e85d4c',
  dusk: '#c96b8a',
  gold: '#e8b86d',
  amberGlow: 'rgba(255, 154, 90, 0.15)',

  /** Primary button label — matches `.btn-primary` color */
  onPrimary: '#1a0e0a',
} as const;

export const radii = {
  sm: 6,
  md: 10,
} as const;

export const typography = {
  /** DM Sans — UI body (CSS `--font`) */
  font: 'DMSans_400Regular',
  fontMedium: 'DMSans_500Medium',
  fontSemiBold: 'DMSans_600SemiBold',
  /** Fraunces — brand display (CSS `--display`) */
  display: 'Fraunces_600SemiBold',
} as const;

/** Ambient radial washes from `.ambient` — SVG equivalents of CSS radial-gradients.
 * Bottom gold wash omitted for now (felt like a big yellow ball on phone); keep in CSS prototype for later. */
export const ambient = {
  washes: [
    {
      // ellipse 80% 50% at 15% -10%, rgba(255, 120, 70, 0.18)
      cxRatio: 0.15,
      cyRatio: -0.1,
      rxRatio: 0.4,
      ryRatio: 0.25,
      color: 'rgba(255, 120, 70, 0.18)',
    },
    {
      // ellipse 60% 40% at 90% 5%, rgba(200, 80, 100, 0.12)
      cxRatio: 0.9,
      cyRatio: 0.05,
      rxRatio: 0.3,
      ryRatio: 0.2,
      color: 'rgba(200, 80, 100, 0.12)',
    },
  ],
} as const;

/** Brand wordmark gradient — `.brand` linear-gradient(120deg, sunrise → sunset 55% → dusk) */
export const brandGradient = {
  colors: [colors.sunrise, colors.sunset, colors.dusk] as const,
  locations: [0, 0.55, 1] as const,
  // 120deg in CSS ≈ start top-left-ish → end bottom-right
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0.75 },
} as const;

/** Primary CTA — `.btn-primary` linear-gradient(135deg, sunrise, sunset) */
export const primaryGradient = {
  colors: [colors.sunrise, colors.sunset] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Colors = typeof colors;
export type Theme = {
  colors: typeof colors;
  radii: typeof radii;
  typography: typeof typography;
  spacing: typeof spacing;
};

export const theme: Theme = {
  colors,
  radii,
  typography,
  spacing,
};
