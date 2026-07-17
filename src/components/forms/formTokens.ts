import { colors, radii } from '../../theme/tokens';

/**
 * Nestable form layers — backgrounds step lighter outward; each layer owns
 * one accent for rail / more-menu / hairline border.
 */
export type FormNodeKind = 'session' | 'block' | 'cluster' | 'exercise';

export const nodeAccents: Record<
  FormNodeKind,
  { borderLeft: string; background: string; border: string }
> = {
  session: {
    borderLeft: colors.sunset,
    background: colors.bg,
    border: 'rgba(232, 93, 76, 0.12)',
  },
  block: {
    borderLeft: colors.sunrise,
    background: colors.bgPanel,
    border: 'rgba(255, 154, 90, 0.12)',
  },
  cluster: {
    borderLeft: colors.dusk,
    background: colors.bgElevated,
    border: 'rgba(201, 107, 138, 0.12)',
  },
  exercise: {
    borderLeft: colors.gold,
    background: colors.bgInset,
    border: 'rgba(232, 184, 109, 0.12)',
  },
};

/** ⋯ more-menu + IconButton accents — match each level’s primary. */
export const moreAccents: Record<
  FormNodeKind,
  {
    rail: string;
    eyebrow: string;
    wash: string;
    border: string;
    iconActive: string;
    iconActiveBg: string;
  }
> = {
  session: {
    rail: colors.sunset,
    eyebrow: colors.sunset,
    wash: 'rgba(232, 93, 76, 0.06)',
    border: 'rgba(232, 93, 76, 0.28)',
    iconActive: colors.sunset,
    iconActiveBg: 'rgba(232, 93, 76, 0.1)',
  },
  block: {
    rail: colors.sunrise,
    eyebrow: colors.sunrise,
    wash: 'rgba(255, 154, 90, 0.06)',
    border: 'rgba(255, 154, 90, 0.28)',
    iconActive: colors.sunrise,
    iconActiveBg: 'rgba(255, 154, 90, 0.08)',
  },
  cluster: {
    rail: colors.dusk,
    eyebrow: colors.dusk,
    wash: 'rgba(201, 107, 138, 0.08)',
    border: 'rgba(201, 107, 138, 0.28)',
    iconActive: colors.dusk,
    iconActiveBg: 'rgba(201, 107, 138, 0.1)',
  },
  exercise: {
    rail: colors.gold,
    eyebrow: colors.gold,
    wash: 'rgba(232, 184, 109, 0.06)',
    border: 'rgba(232, 184, 109, 0.28)',
    iconActive: colors.gold,
    iconActiveBg: 'rgba(232, 184, 109, 0.1)',
  },
};

export const formRadii = {
  node: radii.sm,
  panel: radii.md,
} as const;

/** Horizontal inset inside NodeShell — CoordRow toggle pulls left by this amount. */
export const nodePaddingX = 12;

/** Shared disclosure / coord chevron — keep CoordRow and Disclosure in sync. */
export const formChevron = {
  fontSize: 22,
  lineHeight: 24,
} as const;
