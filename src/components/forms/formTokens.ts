import { colors, radii } from '../../theme/tokens';

/** Nestable node kinds — visual depth matches session-templator.html */
export type FormNodeKind = 'block' | 'cluster' | 'exercise';

export const nodeAccents: Record<
  FormNodeKind,
  { borderLeft: string; background: string }
> = {
  block: {
    borderLeft: colors.borderStrong,
    background: colors.bgPanel,
  },
  cluster: {
    borderLeft: colors.dusk,
    background: colors.bgElevated,
  },
  exercise: {
    borderLeft: colors.gold,
    background: colors.bgInset,
  },
};

/** Nested exercise inside a cluster uses sunrise accent */
export const nestedExerciseAccent = {
  borderLeft: colors.sunrise,
  background: colors.bgInset,
} as const;

export const formRadii = {
  node: radii.sm,
  panel: radii.md,
} as const;
