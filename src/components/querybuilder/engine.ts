/**
 * Query builder client-side aggregation (slice 1).
 *
 * Given the scoped facts from `loadQueryFacts`, compute each Subject's Measures
 * (op × field) and, when a Subject sits inside a Breakdown, its per-group rows +
 * a totals row (credit-each: a fact with two variations counts in both groups;
 * totals recompute over the Subject's full set, never sum across groups).
 *
 * WITH / SPLIT (doc §10, Option B + C): a Subject's WITH filter (`identityMatch`
 * any/all) narrows which facts count at all; when that Subject is also
 * SPLIT, the per-group partition excludes the WITH ids so groups read as
 * sibling co-tags on the filtered set (e.g. `WITH Running · SPLIT variation`
 * → `Weighted`), not a peer list of every tag on the whole Primary Group.
 * Empty WITH keeps today's full peer partition.
 *
 * NULL discipline: sum/avg/max/min consider only sets that logged the field
 * (value > 0); an all-empty measure returns `value: null` (empty state, never a
 * fake zero). `count` / `field:'sets'` = COUNT(*) of matching sets.
 */

import {
  formatDistanceFacet,
  formatTimeFacet,
  majorityUnit,
  passesPgIdentity,
  type Fact,
} from '../../lib/insights';
import {
  isBreakdown,
  type MeasureField,
  type MeasureNode,
  type MeasureOp,
  type SectionNode,
  type SubjectNode,
} from './types';

export type MeasureResult = {
  measureId: string;
  op: MeasureOp;
  field: MeasureField | null;
  /** Null = no sets logged this field in-window (empty state). */
  value: number | null;
  /** Load unit (majority) when field is load. */
  unit?: string;
  /** Sets that contributed to the value. */
  matchingSetCount: number;
};

export type BreakdownGroupResult = {
  /** Variation or tool id for this group. */
  groupId: string;
  setCount: number;
  measures: MeasureResult[];
};

export type SubjectResult = {
  subjectId: string;
  pgId: string | null;
  /** Total matching sets for the Subject (its full, ungrouped set). */
  setCount: number;
  /** Measures over the Subject's full set. Also the Breakdown totals row. */
  measures: MeasureResult[];
  /** Present only when the Subject sits inside a Breakdown. */
  groups?: BreakdownGroupResult[];
  breakdownDimension?: 'variation' | 'tool';
};

/** Results keyed by Subject id for direct card lookup. */
export type SectionResult = Record<string, SubjectResult>;

/** Extract one set's value for a field, or null if not logged (value <= 0). */
function fieldValue(fact: Fact, field: MeasureField): number | null {
  switch (field) {
    case 'reps':
      return fact.effectiveReps > 0 ? fact.effectiveReps : null;
    case 'time':
      return fact.timeSeconds > 0 ? fact.timeSeconds : null;
    case 'distance':
      return fact.distanceMeters > 0 ? fact.distanceMeters : null;
    case 'load':
      return fact.loadValue > 0 ? fact.loadValue : null;
    case 'sets':
      return null; // sets is a count-only field
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Apply one Measure (op × field) to a set of facts. */
export function applyMeasure(facts: Fact[], measure: MeasureNode): MeasureResult {
  const base: MeasureResult = {
    measureId: measure.id,
    op: measure.op,
    field: measure.field,
    value: null,
    matchingSetCount: 0,
  };

  if (measure.field == null) return base;

  // COUNT(*) — field moot; renders as `N sets`.
  if (measure.op === 'count' || measure.field === 'sets') {
    return { ...base, value: facts.length, matchingSetCount: facts.length };
  }

  const values: number[] = [];
  const units: string[] = [];
  for (const fact of facts) {
    const v = fieldValue(fact, measure.field);
    if (v == null) continue;
    values.push(v);
    if (measure.field === 'load' && fact.loadUnit) units.push(fact.loadUnit);
  }

  if (values.length === 0) return base;

  let value: number;
  switch (measure.op) {
    case 'sum':
      value = values.reduce((a, b) => a + b, 0);
      break;
    case 'avg':
      value = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case 'max':
      value = Math.max(...values);
      break;
    case 'min':
      value = Math.min(...values);
      break;
    default:
      value = values.reduce((a, b) => a + b, 0);
  }

  return {
    ...base,
    value: round1(value),
    unit: measure.field === 'load' ? majorityUnit(units) : undefined,
    matchingSetCount: values.length,
  };
}

/** Facts credited to a Subject (its PG + soft identity filters, any/all). */
function subjectFacts(facts: Fact[], subject: SubjectNode): Fact[] {
  if (!subject.pgId) return [];
  const pgId = subject.pgId;
  return facts.filter(
    (f) =>
      f.primaryGroupIds.includes(pgId) &&
      passesPgIdentity(
        f,
        subject.variationIds,
        subject.toolIds,
        subject.identityMatch,
      ),
  );
}

/**
 * Group a Subject's (already WITH-filtered) facts by a Breakdown dimension
 * (credit-each), excluding `excludeIds` from the group keys.
 *
 * Option C (doc §10): when the Subject's WITH filter narrowed this dimension
 * (e.g. `WITH Running`, `SPLIT variation`), callers pass those WITH ids as
 * `excludeIds` so the groups read as **siblings** co-tagged on the filtered
 * set (e.g. `Weighted`) instead of the WITH id echoing itself back as its own
 * group. Empty `excludeIds` (WITH empty, or WITH on the other dimension) =
 * today's full peer partition — unchanged.
 */
function groupByDimension(
  facts: Fact[],
  dimension: 'variation' | 'tool',
  excludeIds: string[] = [],
): Map<string, Fact[]> {
  const exclude = new Set(excludeIds);
  const groups = new Map<string, Fact[]>();
  for (const fact of facts) {
    const ids = dimension === 'variation' ? fact.tagIds : fact.toolIds;
    for (const id of ids) {
      if (exclude.has(id)) continue;
      const list = groups.get(id);
      if (list) list.push(fact);
      else groups.set(id, [fact]);
    }
  }
  return groups;
}

function evalSubject(
  facts: Fact[],
  subject: SubjectNode,
  breakdownDimension?: 'variation' | 'tool',
): SubjectResult {
  const own = subjectFacts(facts, subject);
  const measures = subject.measures.map((m) => applyMeasure(own, m));

  const result: SubjectResult = {
    subjectId: subject.id,
    pgId: subject.pgId,
    setCount: own.length,
    measures,
  };

  if (breakdownDimension) {
    const excludeIds =
      breakdownDimension === 'variation' ? subject.variationIds : subject.toolIds;
    const grouped = groupByDimension(own, breakdownDimension, excludeIds);
    const groups: BreakdownGroupResult[] = [...grouped.entries()]
      .map(([groupId, groupFacts]) => ({
        groupId,
        setCount: groupFacts.length,
        measures: subject.measures.map((m) => applyMeasure(groupFacts, m)),
      }))
      .sort((a, b) => b.setCount - a.setCount);
    result.groups = groups;
    result.breakdownDimension = breakdownDimension;
    // `measures` above already = the totals row (over the Subject's full set).
  }

  return result;
}

/** Evaluate a whole Section into per-Subject results keyed by Subject id. */
export function evaluateSection(
  facts: Fact[],
  section: SectionNode,
): SectionResult {
  const out: SectionResult = {};
  for (const child of section.children) {
    if (isBreakdown(child)) {
      for (const subject of child.subjects) {
        out[subject.id] = evalSubject(facts, subject, child.dimension);
      }
    } else {
      out[child.id] = evalSubject(facts, child);
    }
  }
  return out;
}

const OP_LABEL: Record<MeasureOp, string> = {
  sum: 'sum',
  avg: 'avg',
  max: 'max',
  min: 'min',
  count: 'count',
};

/** Op label for pickers/tokens. */
export function opLabel(op: MeasureOp): string {
  return OP_LABEL[op];
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Grammar token for a computed Measure, e.g. `max 24 reps`, `avg 20 lb`,
 * `12 sets`. Null when the Measure has no field or no logged data.
 */
export function measureToken(r: MeasureResult): string | null {
  if (r.field == null || r.value == null) return null;
  if (r.op === 'count' || r.field === 'sets') {
    return `${fmtNum(r.value)} set${r.value === 1 ? '' : 's'}`;
  }
  const op = OP_LABEL[r.op];
  switch (r.field) {
    case 'reps':
      return `${op} ${fmtNum(r.value)} reps`;
    case 'load':
      return r.unit
        ? `${op} ${fmtNum(r.value)} ${r.unit}`
        : `${op} ${fmtNum(r.value)}`;
    case 'time':
      return `${op} ${formatTimeFacet(r.value)}`;
    case 'distance':
      return `${op} ${formatDistanceFacet(r.value)}`;
  }
}
