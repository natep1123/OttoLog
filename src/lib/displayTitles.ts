/**
 * Resolved display titles for template layers.
 *
 * Custom Name/Brief wins, exactly as typed. Empty name → the bare kind word
 * (Session / Block / Sequence / Exercise). Labels are taxonomy only and do not
 * compose into titles — no "Warmup Block" / "Circuit Sequence" generation.
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

/** Future logs — not used by templates. */
export function sessionLogTitle(
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
  localDateLabel: string,
  sameDayOrdinal = 1,
): string {
  const owned = normalizeBrief(brief);
  const base = owned
    ? `${owned} - ${localDateLabel}`
    : `Session - ${localDateLabel}`;
  return sameDayOrdinal >= 2 ? `${base} (session ${sameDayOrdinal})` : base;
}

export function blockTitle(
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
  _orderInParent1?: number,
): string {
  return normalizeBrief(brief) ?? 'Block';
}

export function clusterTitle(
  _labelId: string | null | undefined,
  _labelWord: string | null | undefined,
  brief: string | null | undefined,
  _letterIndex0?: number,
): string {
  return normalizeBrief(brief) ?? 'Sequence';
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
