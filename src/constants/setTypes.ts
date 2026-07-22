/**
 * log_sets.set_type — greenfield CHECK + default Working.
 * Matches sql/greenfield/007_session_logs.sql.
 */

export const SET_TYPES = [
  'Warmup',
  'Working',
  'Drop',
  'Failure',
  'AMRAP',
  'Backoff',
] as const;

export type SetType = (typeof SET_TYPES)[number];

export const DEFAULT_SET_TYPE: SetType = 'Working';

export const SET_TYPE_OPTIONS: { id: SetType; label: string }[] =
  SET_TYPES.map((id) => ({ id, label: id }));

export function normalizeSetType(value: unknown): SetType {
  if (
    typeof value === 'string' &&
    (SET_TYPES as readonly string[]).includes(value)
  ) {
    return value as SetType;
  }
  return DEFAULT_SET_TYPE;
}

/**
 * Intensity UI scale: 0 = clear (persist NULL), then 0.5–10.0 half-steps.
 * Never store literal 0.
 */
export const INTENSITY_UI_OPTIONS: { id: string; label: string; value: number | null }[] =
  [
    { id: '0', label: '—', value: null },
    ...Array.from({ length: 20 }, (_, i) => {
      const v = (i + 1) * 0.5;
      return {
        id: String(v),
        label: Number.isInteger(v) ? String(v) : v.toFixed(1),
        value: v,
      };
    }),
  ];

/** UI 0 / unset → NULL; clamp to 0.5–10 half-steps. */
export function normalizeIntensityForStorage(
  value: number | null | undefined,
): number | null {
  if (value == null || value === 0) return null;
  if (value < 0.5 || value > 10) return null;
  const half = Math.round(value * 2) / 2;
  if (half < 0.5 || half > 10) return null;
  return half;
}

export function intensityToUiValue(
  value: number | null | undefined,
): number {
  if (value == null) return 0;
  return value;
}
