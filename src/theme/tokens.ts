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
  /** Soft pressed wash for tappable panels and rows */
  pressedWash: 'rgba(255, 154, 90, 0.06)',

  /** Primary button label — matches `.btn-primary` color */
  onPrimary: '#1a0e0a',
} as const;

/**
 * Nested template chrome. Cool colors are intentionally scoped to the
 * organizational Block/Cluster rails, borders, chips, and overflow icons.
 */
export const layer = {
  session: {
    bg: '#0c0a0e',
    border: 'rgba(214, 91, 75, 0.12)',
    rail: { color: '#d65b4b', width: 4, glow: null },
    chip: {
      color: '#d65b4b',
      background: 'rgba(214, 91, 75, 0.21)',
    },
  },
  block: {
    bg: '#0d0b0f',
    border: 'rgba(74, 127, 181, 0.12)',
    rail: { color: '#4a7fb5', width: 4, glow: null },
    chip: {
      color: '#4a7fb5',
      background: 'rgba(74, 127, 181, 0.21)',
    },
  },
  cluster: {
    bg: '#0f0d11',
    border: 'rgba(122, 107, 201, 0.12)',
    rail: { color: '#7a6bc9', width: 4, glow: null },
    chip: {
      color: '#7a6bc9',
      background: 'rgba(122, 107, 201, 0.21)',
    },
  },
  exercise: {
    bg: '#100e12',
    border: 'rgba(214, 170, 102, 0.12)',
    rail: {
      color: '#d6aa66',
      width: 4,
      glow: '0 0 8px rgba(214, 170, 102, 0.32)',
    },
    chip: {
      color: '#d6aa66',
      background: 'rgba(214, 170, 102, 0.3)',
    },
  },
} as const;

/**
 * Insights Query builder chrome — a distinct **cool analytics** ramp so a query
 * nest (Query → Section → Breakdown → Subject) never reads as a workout nest
 * (Session/Block/Sequence/Exercise). Same geometry as `layer`; teal → aqua hues.
 * The Measure leaf is a chip token (like Set), not a rail. See
 * `docs/Insights_Query_Builder.md` §5/§12.
 */
export const queryLayer = {
  query: {
    bg: '#0a0c0e',
    border: 'rgba(63, 174, 159, 0.12)',
    rail: { color: '#3fae9f', width: 4, glow: null },
    chip: {
      color: '#3fae9f',
      background: 'rgba(63, 174, 159, 0.21)',
    },
  },
  section: {
    bg: '#0b0d0f',
    border: 'rgba(63, 159, 196, 0.12)',
    rail: { color: '#3f9fc4', width: 4, glow: null },
    chip: {
      color: '#3f9fc4',
      background: 'rgba(63, 159, 196, 0.21)',
    },
  },
  breakdown: {
    bg: '#0c0e11',
    border: 'rgba(91, 143, 214, 0.12)',
    rail: { color: '#5b8fd6', width: 4, glow: null },
    chip: {
      color: '#5b8fd6',
      background: 'rgba(91, 143, 214, 0.21)',
    },
  },
  subject: {
    bg: '#0e1012',
    border: 'rgba(72, 196, 201, 0.12)',
    rail: {
      color: '#48c4c9',
      width: 4,
      glow: '0 0 8px rgba(72, 196, 201, 0.32)',
    },
    chip: {
      color: '#48c4c9',
      background: 'rgba(72, 196, 201, 0.3)',
    },
  },
} as const;

/** Measure leaf chip (cool analog of the amber Set chip in `CoordRow`). */
export const measureChip = {
  color: '#48c4c9',
  border: 'rgba(72, 196, 201, 0.28)',
  background: 'rgba(72, 196, 201, 0.15)',
} as const;

/** Sparse round-override UI inside Cluster editors — intentionally dusk pink. */
export const override = {
  color: colors.dusk,
  border: 'rgba(201, 107, 138, 0.28)',
  borderSoft: 'rgba(201, 107, 138, 0.16)',
  wash: 'rgba(201, 107, 138, 0.08)',
  washStrong: 'rgba(201, 107, 138, 0.16)',
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
  layer: typeof layer;
  override: typeof override;
  radii: typeof radii;
  typography: typeof typography;
  spacing: typeof spacing;
};

export const theme: Theme = {
  colors,
  layer,
  override,
  radii,
  typography,
  spacing,
};
