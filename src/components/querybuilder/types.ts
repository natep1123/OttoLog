/**
 * Insights Query builder — ephemeral draft model (slice 1, no persistence).
 *
 * Mirrors the workout nest: Query → Section → (optional) Breakdown → Subject →
 * Measure (= Session → Block → Sequence → Exercise → Set). One auto Section in
 * v1; Breakdown wraps Subjects with no nesting. See
 * `docs/Insights_Query_Builder.md` §3/§5. When the save slice lands this JSON
 * becomes the `saved_queries` definition — no table yet.
 */

import type { IdentityMatch, InsightFacetId, SetType } from '../../lib/insights';
import { daysAgoKey } from '../../lib/insights';
import { todayDateKey } from '../../lib/localTime';

/** Aggregate operation applied to a field (Measure leaf). v1 op set. */
export type MeasureOp = 'sum' | 'avg' | 'max' | 'min' | 'count';

/** Field a Measure aggregates. Shape-driven atomic fields (existing facets). */
export type MeasureField = InsightFacetId;

/** The Breakdown dimension (`GROUP BY`). v1 dims only. */
export type BreakdownDimension = 'variation' | 'tool';

/** Query builder node kinds (for chrome palette + add controls). */
export type QbNodeKind = 'query' | 'section' | 'breakdown' | 'subject';

/** One aggregate column: op × field. `field:'sets'` is COUNT(*) of matching sets. */
export type MeasureNode = {
  id: string;
  op: MeasureOp;
  /** Null until the user picks a field (smart-default op applied then). */
  field: MeasureField | null;
};

/** One Primary Group + soft identity filters + its Measures. */
export type SubjectNode = {
  id: string;
  /** Null until the user picks a Primary Group. */
  pgId: string | null;
  variationIds: string[];
  toolIds: string[];
  /**
   * WITH match mode (Option B, doc §10): `'any'` (default) = has at least
   * one selected variation/tool; `'all'` = must have every one selected
   * (intersection). Applies uniformly to the variation set and the tool set.
   */
  identityMatch: IdentityMatch;
  measures: MeasureNode[];
};

/** `For each <dimension>` — wraps Subjects, no nested Breakdowns in v1. */
export type BreakdownNode = {
  id: string;
  kind: 'breakdown';
  dimension: BreakdownDimension;
  subjects: SubjectNode[];
};

/** A Subject sitting directly under the Section (ungrouped). */
export type SectionChildSubject = SubjectNode & { kind: 'subject' };

/** Ordered Section children: ungrouped Subjects and/or Breakdowns. */
export type SectionChild = SectionChildSubject | BreakdownNode;

/** Section-level scope (`WHERE`) — reads query-global with one Section. */
export type SectionScope = {
  sessionCategoryIds: string[];
  blockLabelIds: string[];
  sequenceLabelIds: string[];
};

/** Which sets count (`WHERE set_type …`). */
export type SectionSetPolicy = {
  setTypes: SetType[];
  includeWarmups: boolean;
};

export type SectionNode = {
  scope: SectionScope;
  setPolicy: SectionSetPolicy;
  children: SectionChild[];
};

/** The whole report: date window + name/notes + one Section. */
export type QueryDraft = {
  name: string;
  /** Free-text notes (behind the More panel). Null when unset. */
  notes: string | null;
  window: { fromDate: string; toDate: string };
  section: SectionNode;
};

let seq = 0;
/** Ephemeral node id (draft-only; not a DB id). */
export function qbId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** Smart-default op for a freshly chosen field (matches Dashboard `buildPanel`). */
export function defaultOpForField(field: MeasureField): MeasureOp {
  switch (field) {
    case 'load':
      return 'avg';
    case 'sets':
      return 'count';
    case 'reps':
    case 'time':
    case 'distance':
      return 'sum';
  }
}

/** An empty Measure (no field yet — renders as a placeholder token). */
export function emptyMeasure(): MeasureNode {
  return { id: qbId('measure'), op: 'sum', field: null };
}

/** An empty Subject (no PG yet) with one empty Measure. */
export function emptySubject(): SectionChildSubject {
  return {
    id: qbId('subject'),
    kind: 'subject',
    pgId: null,
    variationIds: [],
    toolIds: [],
    identityMatch: 'any',
    measures: [emptyMeasure()],
  };
}

/** A fresh Breakdown wrapping one empty Subject. */
export function emptyBreakdown(): BreakdownNode {
  return {
    id: qbId('breakdown'),
    kind: 'breakdown',
    dimension: 'variation',
    subjects: [{ ...emptySubject() }],
  };
}

/**
 * New Query pre-seed (§6): Query → Section (no scope) → empty Subject → empty
 * Measure. No Breakdown by default. Rolling last 7 days.
 */
export function defaultQueryDraft(): QueryDraft {
  return {
    name: '',
    notes: null,
    window: { fromDate: daysAgoKey(6), toDate: todayDateKey() },
    section: {
      scope: { sessionCategoryIds: [], blockLabelIds: [], sequenceLabelIds: [] },
      setPolicy: { setTypes: ['Working'], includeWarmups: false },
      children: [emptySubject()],
    },
  };
}

/** Type guard: Section child is a Breakdown. */
export function isBreakdown(child: SectionChild): child is BreakdownNode {
  return (child as BreakdownNode).kind === 'breakdown';
}

/**
 * Madlib author: **SPLIT** on a Subject clause wraps that one Subject in a
 * Breakdown (doc §2/§3 — "SPLIT chip on Subject clause", no nested
 * Breakdowns). Wrap/unwrap keep the Subject's own `id` so engine results
 * (`SectionResult` keyed by Subject id) and React keys stay stable across the
 * toggle — only the wrapper changes.
 */
export function wrapInBreakdown(
  subject: SectionChildSubject,
  dimension: BreakdownDimension = 'variation',
): BreakdownNode {
  const { kind: _kind, ...rest } = subject;
  return { id: qbId('breakdown'), kind: 'breakdown', dimension, subjects: [rest] };
}

/** SPLIT off: unwrap a Breakdown back to its (single, madlib-authored) Subject. */
export function unwrapBreakdown(breakdown: BreakdownNode): SectionChildSubject {
  const subject = breakdown.subjects[0] ?? emptySubject();
  return { ...subject, kind: 'subject' };
}

/** Stable list-key for a Section child across SPLIT toggles (keys off the Subject). */
export function sectionChildKey(child: SectionChild): string {
  return isBreakdown(child) ? (child.subjects[0]?.id ?? child.id) : child.id;
}

/** The one Subject a Section child carries, whether SPLIT-wrapped or plain. */
export function sectionChildSubject(child: SectionChild): SubjectNode {
  return isBreakdown(child) ? child.subjects[0] : child;
}
