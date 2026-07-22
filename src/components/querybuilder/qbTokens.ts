import { measureChip, queryLayer } from '../../theme/tokens';

/**
 * Query builder layer kinds resolve structural color from `theme.queryLayer`
 * (the cool analytics ramp) — never the warm workout `layer` ramp.
 */
export type QbLayerKind = keyof typeof queryLayer;

/** Add controls use the exact chip token of the layer they create. */
export function qbAddButtonColors(creates: QbLayerKind) {
  const token = queryLayer[creates];
  return {
    border: token.chip.color,
    wash: token.chip.background,
    label: token.chip.color,
  };
}

/** Measure add/leaf uses the cool Set-analog chip token. */
export function qbMeasureColors() {
  return {
    border: measureChip.color,
    wash: measureChip.background,
    label: measureChip.color,
  };
}
