/**
 * Resolved display titles for template layers.
 * Custom Name/Brief wins; empty brief → generated from label + layer kind.
 * Generated strings are never persisted.
 *
 * Session / Block / Sequence signatures are always `Label Kind`
 * (e.g. Warmup Block, Circuit Sequence). Exercise keeps parent-local
 * numbering (`Exercise 1`) and is exempt from the Label+Kind pattern.
 */

import {
  CLUSTER_LABEL_NULL_ID,
  GENERAL_BLOCK_LABEL_ID,
  NO_TOOL_ID,
  UNCATEGORIZED_ID,
} from '../constants/sentinelIds';

export function isBriefOwned(brief: string | null | undefined): boolean {
  return Boolean(brief?.trim());
}

export function normalizeBrief(brief: string | null | undefined): string | null {
  const trimmed = brief?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** 0-based index → A, B, … Z, AA, … */
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
  labelWord: string | null | undefined,
  brief: string | null | undefined,
): string {
  const owned = normalizeBrief(brief);
  if (owned) return owned;
  const label = labelWord?.trim() || 'Uncategorized';
  return `${label} Session`;
}

/** Future logs — not used by templates. */
export function sessionLogTitle(
  labelWord: string | null | undefined,
  brief: string | null | undefined,
  localDateLabel: string,
  sameDayOrdinal = 1,
): string {
  const owned = normalizeBrief(brief);
  if (owned) return owned;
  const label = labelWord?.trim() || 'Uncategorized';
  const base = `${label} Session - ${localDateLabel}`;
  return sameDayOrdinal >= 2 ? `${base} (session ${sameDayOrdinal})` : base;
}

export function blockTitle(
  labelWord: string | null | undefined,
  brief: string | null | undefined,
  _orderInParent1?: number,
): string {
  const owned = normalizeBrief(brief);
  if (owned) return owned;
  const label = labelWord?.trim() || 'General';
  return `${label} Block`;
}

export function clusterTitle(
  labelId: string | null | undefined,
  labelWord: string | null | undefined,
  brief: string | null | undefined,
  _letterIndex0?: number,
): string {
  const owned = normalizeBrief(brief);
  if (owned) return owned;
  const isNull =
    !labelId ||
    labelId === CLUSTER_LABEL_NULL_ID ||
    !labelWord?.trim() ||
    labelWord.trim().toLowerCase() === 'cluster' ||
    labelWord.trim().toLowerCase() === 'untyped cluster' ||
    labelWord.trim().toLowerCase() === 'standard';
  if (isNull) return 'Standard Sequence';
  return `${labelWord!.trim()} Sequence`;
}

export function exerciseTitle(
  toolId: string | null | undefined,
  toolWord: string | null | undefined,
  name: string | null | undefined,
  orderInParent1: number,
): string {
  const owned = normalizeBrief(name);
  if (owned) return owned;
  const n = Math.max(1, Math.floor(orderInParent1) || 1);
  const noTool =
    !toolId ||
    toolId === NO_TOOL_ID ||
    !toolWord?.trim() ||
    toolWord.trim().toLowerCase() === 'none' ||
    toolWord.trim().toLowerCase() === 'no tool';
  if (noTool) return `Exercise ${n}`;
  return `${toolWord!.trim()} Exercise ${n}`;
}

export function defaultLabelWord(
  kind: 'session' | 'block' | 'cluster',
  labelId: string | null | undefined,
): string {
  if (kind === 'session') {
    return labelId === UNCATEGORIZED_ID || !labelId ? 'Uncategorized' : 'Session';
  }
  if (kind === 'block') {
    return labelId === GENERAL_BLOCK_LABEL_ID || !labelId ? 'General' : 'Block';
  }
  return 'Standard';
}

/** Infer legacy cluster_type from a label name for dual-write compatibility. */
export function legacyClusterTypeFromLabel(
  labelWord: string | null | undefined,
): 'superset' | 'circuit' {
  return labelWord?.trim().toLowerCase() === 'circuit' ? 'circuit' : 'superset';
}
