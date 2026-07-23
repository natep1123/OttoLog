import { colors, layer, override } from '../../theme/tokens';
import type { FormNodeKind } from '../forms/formTokens';

/**
 * Query builder layer kinds. Structural color resolves from the **workout**
 * `layer` ramp by depth (Decision 12, overturned the provisional cool
 * `queryLayer`): Query→session, Section→block, Breakdown→cluster,
 * Subject→exercise. Keep the `Qb*` product nouns; reuse the workout accents so
 * the nest reads as the same family. See `docs/Insights_Query_Builder.md` §5/§12.
 */
export type QbLayerKind = 'query' | 'section' | 'breakdown' | 'subject';

/** Depth map: each QB layer borrows a workout layer's structural treatment. */
export const QB_TO_FORM: Record<QbLayerKind, FormNodeKind> = {
  query: 'session',
  section: 'block',
  breakdown: 'cluster',
  subject: 'exercise',
};

/** Workout `layer` token for a QB layer (rail / bg / border / chip). */
export function qbLayerToken(kind: QbLayerKind) {
  return layer[QB_TO_FORM[kind]];
}

/** The workout `FormNodeKind` — for shared chrome (`IconButton`, `MorePanel`). */
export function qbFormKind(kind: QbLayerKind): FormNodeKind {
  return QB_TO_FORM[kind];
}

/**
 * Measure leaf chip — the amber **set chip** (same recipe as `CoordRow`'s
 * `kind: 'set'`), because a Measure is the analytics analog of a Set.
 */
export const qbMeasureChip = {
  color: colors.sunrise,
  border: 'rgba(255, 154, 90, 0.28)',
  background: colors.amberGlow,
} as const;

/** Dusk override accent for sparse leaf extras (Subject `For each …` / totals). */
export const qbLeafOverride = override;

/** Add controls use the exact chip token of the layer they create. */
export function qbAddButtonColors(creates: QbLayerKind) {
  const token = qbLayerToken(creates);
  return {
    border: token.chip.color,
    wash: token.chip.background,
    label: token.chip.color,
  };
}

/** Measure add/leaf uses the amber Set-analog chip token. */
export function qbMeasureColors() {
  return {
    border: qbMeasureChip.color,
    wash: qbMeasureChip.background,
    label: qbMeasureChip.color,
  };
}
