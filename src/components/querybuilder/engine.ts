/**
 * Query builder client-side aggregation (slice 1; Insight AST in §11).
 *
 * Given the scoped facts from `loadQueryFacts`, compute each Subject's (FOR's)
 * Insights (`asks[]` — WITH identity + SHOW measures, doc §11.4) and, when the
 * Subject sits inside a SPLIT (Breakdown), its per-group rows + a totals row
 * (credit-each: a fact with two variations counts in both groups; totals
 * recompute over the template Insight's own filtered set, never sum across
 * groups).
 *
 * Insights credit-each (doc §11.4, locked): each Insight computes its own
 * aggregate over whatever facts match its own WITH filter, independent of its
 * siblings — a set that qualifies for two Insights counts in both. "Asks can
 * overlap" is the coach-plain copy; don't expect an Insight's siblings to sum
 * to the FOR's total.
 *
 * WITH / SPLIT (doc §10, Option B + C; unaffected by the Insight AST move): a
 * SPLIT-wrapped Subject reads its single template Insight (`templateAsk`,
 * §11.5 Mode C) as the partition's WITH filter + SHOW measures; when that
 * template has a WITH filter, the per-group partition excludes those ids so
 * groups read as sibling co-tags on the filtered set (e.g.
 * `WITH Running · SPLIT variation` → `Weighted`), not a peer list of every tag
 * on the whole Primary Group. Empty WITH keeps today's full peer partition.
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
  type QueryWindow,
} from '../../lib/insights';
import {
  effectiveSectionWindow,
  emptyInsight,
  isBreakdown,
  qbId,
  templateAsk,
  type InsightNode,
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

/** One Insight's computed ask-slice — its own WITH-filtered set + SHOW values. */
export type InsightResult = {
  insightId: string;
  setCount: number;
  measures: MeasureResult[];
  /**
   * Fields this Insight's (already WITH-filtered) facts actually logged
   * in-window (`sets` always included). Falls back to the full field set
   * when nothing has matched yet, so a fresh Insight isn't blocked from
   * picking a Measure before any data exists.
   */
  availableFields: MeasureField[];
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
  /** Total matching sets under this FOR (PG-only; union across all Insights). */
  setCount: number;
  /**
   * One result per `Subject.asks` Insight, same order (credit-each — see
   * module doc). Length 1 when the Subject sits inside a SPLIT (the template
   * Insight's own result; also the Breakdown totals row).
   */
  asks: InsightResult[];
  /** Present only when the Subject sits inside a Breakdown (SPLIT). */
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

const ALL_MEASURE_FIELDS: MeasureField[] = ['reps', 'time', 'distance', 'load', 'sets'];

/**
 * Fields a Subject's (already scoped) facts actually logged in-window —
 * shape-driven, `sets` always present. Empty facts → full field set (don't
 * block Measure setup before any data lands). Cheap: reuses the facts
 * already loaded for the Subject, no extra read.
 */
function subjectAvailableFields(facts: Fact[]): MeasureField[] {
  if (facts.length === 0) return ALL_MEASURE_FIELDS;
  const fields: MeasureField[] = [];
  if (facts.some((f) => f.effectiveReps > 0)) fields.push('reps');
  if (facts.some((f) => f.timeSeconds > 0)) fields.push('time');
  if (facts.some((f) => f.distanceMeters > 0)) fields.push('distance');
  if (facts.some((f) => f.loadValue > 0)) fields.push('load');
  fields.push('sets');
  return fields;
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

/** Facts credited to a Subject's Primary Group only — no identity filter at
 * this level; identity now lives per-Insight (`asks[]`, doc §11.4). */
function subjectPgFacts(facts: Fact[], subject: SubjectNode): Fact[] {
  if (!subject.pgId) return [];
  const pgId = subject.pgId;
  return facts.filter((f) => f.primaryGroupIds.includes(pgId));
}

/** Facts credited to one Insight's soft WITH identity (independent any/all
 * per facet, doc §12 decision 1), over its FOR's PG facts. */
function insightFacts(pgFacts: Fact[], ask: InsightNode): Fact[] {
  return pgFacts.filter((f) =>
    passesPgIdentity(f, ask.variationIds, ask.toolIds, ask.variationMatch, ask.toolMatch),
  );
}

/** Evaluate one Insight (WITH filter + SHOW measures) over its FOR's PG facts. */
function evalInsight(pgFacts: Fact[], ask: InsightNode): InsightResult {
  const facts = insightFacts(pgFacts, ask);
  return {
    insightId: ask.id,
    setCount: facts.length,
    measures: ask.measures.map((m) => applyMeasure(facts, m)),
    availableFields: subjectAvailableFields(facts),
  };
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
  const pgFacts = subjectPgFacts(facts, subject);

  const result: SubjectResult = {
    subjectId: subject.id,
    pgId: subject.pgId,
    setCount: pgFacts.length,
    asks: subject.asks.map((ask) => evalInsight(pgFacts, ask)),
  };

  if (breakdownDimension) {
    // Mode C (doc §11.5): the SPLIT template Insight supplies the WITH
    // filter (narrows + excludes from group keys, Option C) and the SHOW
    // measures applied to each resulting group.
    const template = templateAsk(subject);
    const templateFacts = insightFacts(pgFacts, template);
    const excludeIds =
      breakdownDimension === 'variation' ? template.variationIds : template.toolIds;
    const grouped = groupByDimension(templateFacts, breakdownDimension, excludeIds);
    const groups: BreakdownGroupResult[] = [...grouped.entries()]
      .map(([groupId, groupFacts]) => ({
        groupId,
        setCount: groupFacts.length,
        measures: template.measures.map((m) => applyMeasure(groupFacts, m)),
      }))
      .sort((a, b) => b.setCount - a.setCount);
    result.groups = groups;
    result.breakdownDimension = breakdownDimension;
    // `result.asks[0]` above already = the totals row (template's full set).
  }

  return result;
}

/**
 * One-shot `+ Split into Insights` seed (doc §11.5, Mode C). Builds one
 * hand-authored Insight per already-computed partition group (the FOR's live
 * `SubjectResult.groups` — a pure function over that, not a recompute, so the
 * seed matches exactly what the live preview showed): WITH prefilled from the
 * template's own filter plus that group's tag id (sibling co-tags, Option C),
 * SHOW copied from the template's measures. Falls back to one empty Insight
 * when the partition found no groups, so the FOR never seeds into a dead
 * card. After this fires, SPLIT is off (caller unwraps the Breakdown) and the
 * seeded cards are ordinary Insights the user can edit, delete, or add to
 * freely — not a live binding back to the partition.
 */
export function seedInsightsFromGroups(
  template: InsightNode,
  dimension: 'variation' | 'tool',
  groups: BreakdownGroupResult[],
): InsightNode[] {
  if (groups.length === 0) return [emptyInsight()];
  return groups.map((group) => ({
    id: qbId('insight'),
    variationMatch: template.variationMatch,
    toolMatch: template.toolMatch,
    variationIds:
      dimension === 'variation'
        ? [...template.variationIds, group.groupId]
        : [...template.variationIds],
    toolIds:
      dimension === 'tool' ? [...template.toolIds, group.groupId] : [...template.toolIds],
    measures: template.measures.map((m) => ({ ...m, id: qbId('measure') })),
  }));
}

/**
 * Facts within an effective window's inclusive date range. Facts are already
 * scoped to the Query's own window by `loadQueryFacts`; this narrows further
 * when WHERE has its own clamped date sub-window (doc §12 decision 2). A
 * no-op (returns every fact) when the effective window equals the Query's
 * window, so unset WHERE date windows regress to nothing — today's behavior.
 */
function filterFactsByWindow(facts: Fact[], window: QueryWindow): Fact[] {
  return facts.filter(
    (f) => f.sessionDate >= window.fromDate && f.sessionDate <= window.toDate,
  );
}

/**
 * Evaluate a whole Section into per-Subject results keyed by Subject id.
 * `queryWindow` is the Query's own date window — WHERE's optional date
 * sub-window (doc §12 decision 2) clamps inside it and narrows which facts
 * feed the aggregate; unset (default) inherits the Query's window exactly.
 */
export function evaluateSection(
  facts: Fact[],
  section: SectionNode,
  queryWindow: QueryWindow,
): SectionResult {
  const scopedFacts = filterFactsByWindow(facts, effectiveSectionWindow(section, queryWindow));
  const out: SectionResult = {};
  for (const child of section.children) {
    if (isBreakdown(child)) {
      for (const subject of child.subjects) {
        out[subject.id] = evalSubject(scopedFacts, subject, child.dimension);
      }
    } else {
      out[child.id] = evalSubject(scopedFacts, child);
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
