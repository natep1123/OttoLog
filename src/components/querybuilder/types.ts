/**
 * Insights Query builder — ephemeral draft model (slice 1, no persistence).
 *
 * Mirrors the workout nest: Query → Section → (optional) Breakdown → Subject →
 * Measure (= Session → Block → Sequence → Exercise → Set). One auto Section in
 * v1; Breakdown wraps Subjects with no nesting. See
 * `docs/Insights_Query_Builder.md` §3/§5. When the save slice lands this JSON
 * becomes the `saved_queries` definition — no table yet.
 */

import type { IdentityMatch, InsightFacetId, QueryWindow, SetType } from '../../lib/insights';
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

/**
 * One ask-slice under a FOR — product noun **Insight** (doc §11.4, locked
 * AST lean `Subject.asks[]`). A soft identity combo (`WITH` variations/tools,
 * any/all) + its `SHOW` measures. Many Insights can stack under one Subject
 * the way many Sets stack under one Exercise/round — structural parallel
 * only: dusk chrome (the workout-override family), never the word
 * "override" on this surface.
 */
export type InsightNode = {
  id: string;
  variationIds: string[];
  toolIds: string[];
  /**
   * WITH match mode for the variation facet (doc §12 decision 1 — splits the
   * old shared `identityMatch`): `'any'` (default) = has at least one
   * selected variation; `'all'` = must have every one selected
   * (intersection). Independent of `toolMatch`.
   */
  variationMatch: IdentityMatch;
  /** WITH match mode for the tool facet — independent of `variationMatch`. */
  toolMatch: IdentityMatch;
  measures: MeasureNode[];
};

/**
 * One Primary Group (`FOR`) + its Insights. §11.4 AST lean: identity
 * (variations/tools/match) and Measures moved **off** the Subject onto each
 * `InsightNode` — the Subject itself only carries the PG and the ordered ask
 * list. This is **not** N Subjects sharing a `pgId`; the PG lives once here.
 */
export type SubjectNode = {
  id: string;
  /** Null until the user picks a Primary Group. */
  pgId: string | null;
  asks: InsightNode[];
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

/**
 * WHERE's own date sub-window (doc §12 decision 2) — same shape as the
 * Query's window. Must clamp inside the Query's outer window; see
 * `clampSectionWindow` / `effectiveSectionWindow`.
 */
export type SectionDateWindow = QueryWindow;

export type SectionNode = {
  /**
   * Stable lock-tree id (doc §12 decision 4) — minted, not a static constant,
   * so multi-WHERE (Slice 5) drops in without a lock-id rework. v1 AST still
   * holds exactly one Section.
   */
  id: string;
  scope: SectionScope;
  setPolicy: SectionSetPolicy;
  /** Null = inherit the Query's window unchanged (today's behavior, no regression). */
  dateWindow: SectionDateWindow | null;
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

/** An empty Insight (no WITH picks yet; one empty Measure). */
export function emptyInsight(): InsightNode {
  return {
    id: qbId('insight'),
    variationIds: [],
    toolIds: [],
    variationMatch: 'any',
    toolMatch: 'any',
    measures: [emptyMeasure()],
  };
}

/** An empty Subject (no PG yet) with one empty Insight. */
export function emptySubject(): SectionChildSubject {
  return {
    id: qbId('subject'),
    kind: 'subject',
    pgId: null,
    asks: [emptyInsight()],
  };
}

/**
 * The Insight a SPLIT (Breakdown) uses as its partition template — its WITH
 * filter narrows which facts are grouped, its SHOW measures apply to each
 * resulting group. Mode C (doc §11.5): hand Insights and auto-partition are
 * never both live, so a SPLIT-wrapped Subject reads its single template
 * ask here rather than a full `asks[]` list.
 */
export function templateAsk(subject: SubjectNode): InsightNode {
  return subject.asks[0] ?? emptyInsight();
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
      id: qbId('section'),
      scope: { sessionCategoryIds: [], blockLabelIds: [], sequenceLabelIds: [] },
      setPolicy: { setTypes: ['Working'], includeWarmups: false },
      dateWindow: null,
      children: [emptySubject()],
    },
  };
}

/**
 * Clamp a candidate WHERE date sub-window inside the Query's outer window
 * (doc §12 decision 2) — never wider than the Query. If the candidate
 * doesn't overlap the Query's window at all, collapses to a single day at
 * the nearer edge rather than producing an inverted range.
 */
export function clampSectionWindow(
  candidate: SectionDateWindow,
  queryWindow: QueryWindow,
): SectionDateWindow {
  const fromDate =
    candidate.fromDate < queryWindow.fromDate ? queryWindow.fromDate : candidate.fromDate;
  const toDate = candidate.toDate > queryWindow.toDate ? queryWindow.toDate : candidate.toDate;
  if (fromDate > toDate) return { fromDate: toDate, toDate };
  return { fromDate, toDate };
}

/**
 * The Section's effective date window for fact filtering: its own clamped
 * sub-window when set, else the Query's window unchanged (no-regression
 * default — doc §12 decision 2).
 */
export function effectiveSectionWindow(
  section: SectionNode,
  queryWindow: QueryWindow,
): QueryWindow {
  return section.dateWindow ? clampSectionWindow(section.dateWindow, queryWindow) : queryWindow;
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
  // Mode C (doc §11.5): hand Insights and auto-partition are never both
  // live on the same FOR — collapse to a single template ask when SPLIT
  // turns on (the first existing Insight, or a fresh empty one).
  const template = rest.asks[0] ?? emptyInsight();
  return {
    id: qbId('breakdown'),
    kind: 'breakdown',
    dimension,
    subjects: [{ ...rest, asks: [template] }],
  };
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
