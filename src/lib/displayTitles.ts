/**
 * Resolved display titles for template layers.
 *
 * **Library / search / owned identity:** Custom Name/Brief wins, exactly as
 * typed. Empty name → the bare kind word (Session / Block / Sequence / Exercise).
 *
 * **Compact builder chrome (pills, locked outline):** Session / Block / Sequence
 * use the taxonomy Label word so a long Name/Brief stays out of tight UI.
 * Exercise still uses its name. Labels never compose with briefs
 * ("Warmup - …" is not generated).
 */

export function isBriefOwned(brief: string | null | undefined): boolean {
  return Boolean(brief?.trim());
}

export function normalizeBrief(brief: string | null | undefined): string | null {
  const trimmed = brief?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** 0-based index → A, B, … Z, AA, … (kept for any lettered UI). */
export function clusterLetter(index0: number): string {
  let n = Math.max(0, Math.floor(index0));
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function sessionTemplateTitle(
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
): string {
  return normalizeBrief(brief) ?? 'Session';
}

/** Compact UI (pills / locked outline): Label word, not Name/Brief. */
export function sessionUiTitle(labelWord: string | null | undefined): string {
  return labelWord?.trim() || 'Session';
}

/**
 * Session log card title: taxonomy Label + local date.
 * Optional Name/Brief belongs in meta, not here.
 */
export function sessionLogTitle(
  labelWord: string | null | undefined,
  _brief: string | null | undefined,
  localDateLabel: string,
  sameDayOrdinal = 1,
): string {
  const label = labelWord?.trim() || 'Session';
  const base = `${label} - ${localDateLabel}`;
  return sameDayOrdinal >= 2 ? `${base} (session ${sameDayOrdinal})` : base;
}

export function blockTitle(
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
  _orderInParent1?: number,
): string {
  return normalizeBrief(brief) ?? 'Block';
}

/** Compact UI (pills / locked outline): Label word, not Name/Brief. */
export function blockUiTitle(labelWord: string | null | undefined): string {
  return labelWord?.trim() || 'Block';
}

export function clusterTitle(
  _labelId: string | null | undefined,
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
  _letterIndex0?: number,
): string {
  return normalizeBrief(brief) ?? 'Sequence';
}

/** Compact UI (pills / locked outline): Label word, not Name/Brief. */
export function clusterUiTitle(labelWord: string | null | undefined): string {
  return labelWord?.trim() || 'Sequence';
}

export function exerciseTitle(
  _toolId: string | null | undefined,
  _toolWord: string | null | undefined,
  name: string | null | undefined,
  _orderInParent1?: number,
): string {
  return normalizeBrief(name) ?? 'Exercise';
}

/** Fallback label word for system-null ids (matches sql/013 seeds). */
export function defaultLabelWord(
  kind: 'session' | 'block' | 'cluster',
  _labelId?: string | null,
): string {
  if (kind === 'session') return 'Session';
  if (kind === 'block') return 'Block';
  return 'Sequence';
}

/** Infer legacy cluster_type from a label name for dual-write compatibility. */
export function legacyClusterTypeFromLabel(
  labelWord: string | null | undefined,
): 'superset' | 'circuit' {
  return labelWord?.trim().toLowerCase() === 'circuit' ? 'circuit' : 'superset';
}
