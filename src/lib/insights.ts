/**
 * Insights aggregates against greenfield `v_log_set_facts`.
 *
 * Grain model: every fact (a log set) carries its own dimension keys —
 * session label, block label, sequence label, plus exercise identity
 * (PG / category / muscle / variation / tool). A single "lens" chooses
 * which dimension the headline chart groups by; stacked filters narrow
 * the fact set regardless of lens.
 *
 * Metric model (Phase 1a):
 *  - User picks Reps | Time | Distance | Tonnage | Sets, or Auto.
 *  - Auto per bucket: distance if any, else time if any, else reps.
 *    (Phase 1b: PG `natural_metric` / "Counts as" replaces the heuristic.)
 *  - Never sum across different metrics into one total.
 *
 * Credit rule (decision: credit-each, documented):
 *  - Per-PG, per-category, and per-muscle rollups deliberately double-count.
 *    NEVER sum those rows into one grand total.
 *  - Session / block / sequence label lenses count each set ONCE.
 *  - Honest totals (sessionCount, workingSetsTotal, tonnageTotal) are
 *    computed once at the set grain, never by summing a credited dimension.
 */

import { PRIMARY_GROUP_CATEGORIES } from '../constants/primaryGroupCategories';
import { normalizeSetType, SET_TYPES, type SetType } from '../constants/setTypes';
import { supabase } from './supabase';
import { todayDateKey } from './localTime';

/** Dimension the headline volume chart groups by. */
export type InsightsLens =
  | 'primaryGroup'
  | 'category'
  | 'muscle'
  | 'sessionLabel'
  | 'blockLabel'
  | 'sequenceLabel';

export const INSIGHTS_LENS_OPTIONS: { id: InsightsLens; label: string }[] = [
  { id: 'primaryGroup', label: 'Primary Group' },
  { id: 'category', label: 'Category' },
  { id: 'muscle', label: 'Muscle' },
  { id: 'sessionLabel', label: 'Session label' },
  { id: 'blockLabel', label: 'Block label' },
  { id: 'sequenceLabel', label: 'Sequence label' },
];

/** User-facing measure for the headline chart. */
export type InsightsMetric = 'reps' | 'time' | 'distance' | 'tonnage' | 'sets';

/** Metric selector including Auto (per-bucket heuristic until PG Counts as). */
export type InsightsMetricMode = InsightsMetric | 'auto';

export const INSIGHTS_METRIC_OPTIONS: {
  id: InsightsMetricMode;
  label: string;
}[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'reps', label: 'Reps' },
  { id: 'time', label: 'Time' },
  { id: 'distance', label: 'Distance' },
  { id: 'tonnage', label: 'Tonnage' },
  { id: 'sets', label: 'Sets' },
];

/** Lenses that credit multiple dimensions per set (never sum their rows). */
const CREDIT_EACH_LENSES: ReadonlySet<InsightsLens> = new Set<InsightsLens>([
  'primaryGroup',
  'category',
  'muscle',
]);

export function lensDoubleCounts(lens: InsightsLens): boolean {
  return CREDIT_EACH_LENSES.has(lens);
}

export function lensLabel(lens: InsightsLens): string {
  return (
    INSIGHTS_LENS_OPTIONS.find((o) => o.id === lens)?.label ?? 'Primary Group'
  );
}

export function metricLabel(metric: InsightsMetricMode): string {
  return (
    INSIGHTS_METRIC_OPTIONS.find((o) => o.id === metric)?.label ?? 'Auto'
  );
}

/** Short unit for a resolved metric (Auto rows carry their own). */
export function metricUnit(metric: InsightsMetric): string {
  switch (metric) {
    case 'reps':
      return 'reps';
    case 'time':
      return 'min';
    case 'distance':
      return 'mi';
    case 'tonnage':
      return '';
    case 'sets':
      return 'sets';
  }
}

export type InsightsFilters = {
  /** Inclusive YYYY-MM-DD */
  fromDate: string;
  /** Inclusive YYYY-MM-DD */
  toDate: string;
  /** Which dimension the headline chart groups by */
  lens: InsightsLens;
  /** Headline measure; Auto = per-bucket heuristic */
  metric: InsightsMetricMode;
  /** Empty = all session labels */
  sessionCategoryIds: string[];
  /** Empty = all block labels */
  blockLabelIds: string[];
  /** Empty = all variations; match if exercise has any of these tags */
  variationIds: string[];
  /** Empty = all tools; match if exercise has any of these tools */
  toolIds: string[];
  /**
   * Set-type allow-list. Default Working-only.
   * `includeWarmups` adds Warmup when the list is the Working-only default.
   */
  setTypes: SetType[];
  /** When true and setTypes is Working-only default, also include Warmup. */
  includeWarmups: boolean;
};

export type NamedTotal = {
  id: string;
  name: string;
  value: number;
  /** Resolved metric for this row (always set; differs across rows when Auto). */
  metric: InsightsMetric;
};

export type InsightsSnapshot = {
  lens: InsightsLens;
  metricMode: InsightsMetricMode;
  sessionCount: number;
  /** Sessions per week across the selected window (honest, header grain). */
  sessionsPerWeek: number;
  /** Working sets counted once each (honest total, not per-muscle). */
  workingSetsTotal: number;
  /** Volume grouped by the active lens + metric. Never sum Auto rows. */
  volumeByLens: NamedTotal[];
  /**
   * Names that had tracked sets in-window but zero contribution for the
   * selected fixed metric (omitted from the chart). Empty when Auto.
   */
  omittedForMetric: string[];
  /** Balance rolled up by PG category (credit-each; data-only; do not sum). */
  balanceByCategory: NamedTotal[];
  /** Working-set counts credited per muscle (do not sum across muscles). */
  workingSetsByMuscle: NamedTotal[];
  /** Tonnage credited per PG (do not sum across PGs). */
  tonnageByPrimaryGroup: NamedTotal[];
  /** Total set tonnage counted once — the honest session tonnage. */
  tonnageTotal: number;
};

type Fact = {
  sessionLogId: string;
  sessionCategoryId: string;
  blockLabelId: string | null;
  sequenceLabelId: string | null;
  primaryGroupIds: string[];
  muscleGroupIds: string[];
  tagIds: string[];
  toolIds: string[];
  setType: SetType;
  effectiveReps: number;
  timeSeconds: number;
  distanceMeters: number;
  tonnage: number;
};

const SEQUENCE_NONE_ID = '__no_sequence__';
const METERS_PER_MILE = 1609.344;

function daysAgoKey(days: number): string {
  const d = new Date(`${todayDateKey()}T12:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultInsightsFilters(): InsightsFilters {
  return {
    fromDate: daysAgoKey(6), // last 7 days inclusive
    toDate: todayDateKey(),
    lens: 'primaryGroup',
    metric: 'auto',
    sessionCategoryIds: [],
    blockLabelIds: [],
    variationIds: [],
    toolIds: [],
    setTypes: ['Working'],
    includeWarmups: false,
  };
}

/** Effective set-type allow-list after the warmups toggle. */
export function effectiveSetTypes(filters: InsightsFilters): SetType[] {
  const base =
    filters.setTypes.length > 0 ? [...filters.setTypes] : (['Working'] as SetType[]);
  if (!filters.includeWarmups) return base;
  if (base.includes('Warmup')) return base;
  return [...base, 'Warmup'];
}

/** Format a stored metric value for display (time→min, distance→mi). */
export function formatMetricValue(
  value: number,
  metric: InsightsMetric,
): string {
  if (metric === 'time') {
    const minutes = value / 60;
    if (minutes >= 10) return String(Math.round(minutes));
    if (minutes >= 1) return minutes.toFixed(1);
    return value > 0 ? value.toFixed(0) + 's' : '0';
  }
  if (metric === 'distance') {
    const miles = value / METERS_PER_MILE;
    if (miles >= 10) return String(Math.round(miles * 10) / 10);
    if (miles >= 0.1) return miles.toFixed(2);
    return miles > 0 ? miles.toFixed(3) : '0';
  }
  if (metric === 'tonnage') {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function formatMetricDisplay(
  value: number,
  metric: InsightsMetric,
): string {
  const n = formatMetricValue(value, metric);
  if (metric === 'time' && n.endsWith('s')) return n;
  const unit = metricUnit(metric);
  return unit ? `${n} ${unit}` : n;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && Boolean(v));
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function metricContribution(fact: Fact, metric: InsightsMetric): number {
  switch (metric) {
    case 'reps':
      return fact.effectiveReps > 0 ? fact.effectiveReps : 0;
    case 'time':
      return fact.timeSeconds > 0 ? fact.timeSeconds : 0;
    case 'distance':
      return fact.distanceMeters > 0 ? fact.distanceMeters : 0;
    case 'tonnage':
      return fact.tonnage > 0 ? fact.tonnage : 0;
    case 'sets':
      return 1;
  }
}

/** Phase 1a Auto heuristic — Phase 1b reads PG Counts as instead. */
export function autoMetricForFacts(facts: readonly FactLike[]): InsightsMetric {
  if (facts.some((f) => f.distanceMeters > 0)) return 'distance';
  if (facts.some((f) => f.timeSeconds > 0)) return 'time';
  if (facts.some((f) => f.effectiveReps > 0)) return 'reps';
  return 'reps';
}

type FactLike = {
  distanceMeters: number;
  timeSeconds: number;
  effectiveReps: number;
};

function passesFilters(
  fact: Fact,
  filters: InsightsFilters,
  setTypes: SetType[],
): boolean {
  if (
    filters.sessionCategoryIds.length > 0 &&
    !filters.sessionCategoryIds.includes(fact.sessionCategoryId)
  ) {
    return false;
  }
  if (filters.blockLabelIds.length > 0) {
    if (!fact.blockLabelId || !filters.blockLabelIds.includes(fact.blockLabelId)) {
      return false;
    }
  }
  if (setTypes.length > 0 && !setTypes.includes(fact.setType)) {
    return false;
  }
  if (filters.variationIds.length > 0) {
    const hit = filters.variationIds.some((id) => fact.tagIds.includes(id));
    if (!hit) return false;
  }
  if (filters.toolIds.length > 0) {
    const hit = filters.toolIds.some((id) => fact.toolIds.includes(id));
    if (!hit) return false;
  }
  return true;
}

function sortNamed(rows: NamedTotal[]): NamedTotal[] {
  return rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function weeksInWindow(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 1 / 7;
  const days = Math.floor(ms / 86400000) + 1; // inclusive
  return Math.max(days / 7, 1 / 7);
}

/** Resolve id → name for a taxonomy/label table (best-effort). */
async function resolveNames(
  table: string,
  ids: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return names;
  const { data, error } = await supabase
    .from(table)
    .select('id, name')
    .in('id', unique);
  if (error) return names;
  for (const row of data ?? []) {
    names.set(row.id as string, row.name as string);
  }
  return names;
}

type FactRow = {
  set_id: string;
  session_log_id: string;
  session_date: string;
  session_status: string;
  session_category_id: string;
  block_label_id: string | null;
  sequence_label_id: string | null;
  track_analytics: boolean | null;
  set_type: string | null;
  effective_reps: number | null;
  time_seconds: number | null;
  distance_meters: number | null;
  tonnage: number | null;
  primary_group_ids: string[] | null;
  muscle_group_ids: string[] | null;
  variation_ids: string[] | null;
  tool_ids: string[] | null;
};

/**
 * Load complete session facts in the date window and aggregate.
 * Reads `v_log_set_facts` (greenfield 007).
 */
export async function loadInsightsSnapshot(
  filters: InsightsFilters,
): Promise<{ data: InsightsSnapshot | null; error: string | null }> {
  const empty = (sessionCount: number): InsightsSnapshot => ({
    lens: filters.lens,
    metricMode: filters.metric,
    sessionCount,
    sessionsPerWeek: 0,
    workingSetsTotal: 0,
    volumeByLens: [],
    omittedForMetric: [],
    balanceByCategory: [],
    workingSetsByMuscle: [],
    tonnageByPrimaryGroup: [],
    tonnageTotal: 0,
  });

  let sessionQuery = supabase
    .from('session_logs')
    .select('id, category_id, session_date')
    .eq('status', 'complete')
    .gte('session_date', filters.fromDate)
    .lte('session_date', filters.toDate)
    .order('session_date', { ascending: false });

  if (filters.sessionCategoryIds.length > 0) {
    sessionQuery = sessionQuery.in('category_id', filters.sessionCategoryIds);
  }

  const { data: sessions, error: sessionError } = await sessionQuery;
  if (sessionError) return { data: null, error: sessionError.message };

  const sessionRows = (sessions ?? []) as {
    id: string;
    category_id: string;
    session_date: string;
  }[];

  if (sessionRows.length === 0) return { data: empty(0), error: null };

  const sessionIds = sessionRows.map((s) => s.id);
  const setTypes = effectiveSetTypes(filters);

  const { data: factData, error: factError } = await supabase
    .from('v_log_set_facts')
    .select(
      [
        'set_id',
        'session_log_id',
        'session_date',
        'session_status',
        'session_category_id',
        'block_label_id',
        'sequence_label_id',
        'track_analytics',
        'set_type',
        'effective_reps',
        'time_seconds',
        'distance_meters',
        'tonnage',
        'primary_group_ids',
        'muscle_group_ids',
        'variation_ids',
        'tool_ids',
      ].join(', '),
    )
    .in('session_log_id', sessionIds)
    .eq('session_status', 'complete');

  if (factError) return { data: null, error: factError.message };

  const facts: Fact[] = [];
  for (const row of (factData ?? []) as unknown as FactRow[]) {
    if (row.track_analytics === false) continue;
    facts.push({
      sessionLogId: row.session_log_id,
      sessionCategoryId: row.session_category_id,
      blockLabelId: row.block_label_id,
      sequenceLabelId: row.sequence_label_id,
      primaryGroupIds: asStringArray(row.primary_group_ids),
      muscleGroupIds: asStringArray(row.muscle_group_ids),
      tagIds: asStringArray(row.variation_ids),
      toolIds: asStringArray(row.tool_ids),
      setType: normalizeSetType(row.set_type),
      effectiveReps: asNumber(row.effective_reps),
      timeSeconds: asNumber(row.time_seconds),
      distanceMeters: asNumber(row.distance_meters),
      tonnage: asNumber(row.tonnage),
    });
  }

  const filtered = facts.filter((f) => passesFilters(f, filters, setTypes));

  const allPgIds = [...new Set(filtered.flatMap((f) => f.primaryGroupIds))];
  const allMgIds = [...new Set(filtered.flatMap((f) => f.muscleGroupIds))];

  const pgMeta = new Map<string, { name: string; category: string }>();
  if (allPgIds.length) {
    const { data, error } = await supabase
      .from('analytics_primary_groups')
      .select('id, name, category')
      .in('id', allPgIds);
    if (error) return { data: null, error: error.message };
    for (const row of data ?? []) {
      pgMeta.set(row.id as string, {
        name: row.name as string,
        category: (row.category as string) ?? 'Skill',
      });
    }
  }

  const mgNames = new Map<string, string>();
  if (allMgIds.length) {
    const { data, error } = await supabase
      .from('analytics_muscle_groups')
      .select('id, name')
      .in('id', allMgIds);
    if (error) return { data: null, error: error.message };
    for (const row of data ?? []) {
      mgNames.set(row.id as string, row.name as string);
    }
  }

  // ── Fixed secondary rollups ───────────────────────────────────────────────
  const tonnageByPg = new Map<string, number>();
  const workingByMuscle = new Map<string, number>();
  let tonnageTotal = 0;
  let workingSetsTotal = 0;

  // Facts per lens key (for Auto + omission captions)
  const factsByLensKey = new Map<string, Fact[]>();

  const pushLensFact = (key: string, fact: Fact) => {
    const list = factsByLensKey.get(key);
    if (list) list.push(fact);
    else factsByLensKey.set(key, [fact]);
  };

  for (const fact of filtered) {
    if (fact.tonnage > 0) tonnageTotal += fact.tonnage;

    const isWorking = fact.setType === 'Working';
    if (isWorking) workingSetsTotal += 1;

    for (const pgId of fact.primaryGroupIds) {
      if (fact.tonnage > 0) {
        tonnageByPg.set(pgId, (tonnageByPg.get(pgId) ?? 0) + fact.tonnage);
      }
    }

    if (isWorking) {
      for (const mgId of fact.muscleGroupIds) {
        workingByMuscle.set(mgId, (workingByMuscle.get(mgId) ?? 0) + 1);
      }
    }

    switch (filters.lens) {
      case 'primaryGroup':
        for (const pgId of fact.primaryGroupIds) pushLensFact(pgId, fact);
        break;
      case 'category':
        for (const pgId of fact.primaryGroupIds) {
          const cat = pgMeta.get(pgId)?.category ?? 'Skill';
          pushLensFact(cat, fact);
        }
        break;
      case 'muscle':
        for (const mgId of fact.muscleGroupIds) pushLensFact(mgId, fact);
        break;
      case 'sessionLabel':
        pushLensFact(fact.sessionCategoryId, fact);
        break;
      case 'blockLabel':
        pushLensFact(fact.blockLabelId ?? SEQUENCE_NONE_ID, fact);
        break;
      case 'sequenceLabel':
        pushLensFact(fact.sequenceLabelId ?? SEQUENCE_NONE_ID, fact);
        break;
    }
  }

  // Resolve names for the active lens dimension.
  let lensNames = new Map<string, string>();
  const lensKeys = [...factsByLensKey.keys()];
  if (filters.lens === 'primaryGroup') {
    lensNames = new Map([...pgMeta].map(([id, m]) => [id, m.name]));
  } else if (filters.lens === 'muscle') {
    lensNames = mgNames;
  } else if (filters.lens === 'sessionLabel') {
    lensNames = await resolveNames('session_categories', lensKeys);
  } else if (filters.lens === 'blockLabel') {
    lensNames = await resolveNames('block_labels', lensKeys);
  } else if (filters.lens === 'sequenceLabel') {
    lensNames = await resolveNames('cluster_labels', lensKeys);
  }

  const lensName = (id: string): string => {
    if (filters.lens === 'category') return id;
    if (id === SEQUENCE_NONE_ID) {
      return filters.lens === 'sequenceLabel' ? 'No sequence' : 'Unlabeled';
    }
    return lensNames.get(id) ?? id;
  };

  const volumeByLens: NamedTotal[] = [];
  const omittedForMetric: string[] = [];
  const isAuto = filters.metric === 'auto';

  for (const [id, bucketFacts] of factsByLensKey) {
    const resolved: InsightsMetric = isAuto
      ? autoMetricForFacts(bucketFacts)
      : (filters.metric as InsightsMetric);
    let value = 0;
    for (const fact of bucketFacts) {
      value += metricContribution(fact, resolved);
    }
    if (value > 0) {
      volumeByLens.push({
        id,
        name: lensName(id),
        value,
        metric: resolved,
      });
    } else if (!isAuto) {
      // Had facts in-window but nothing for the selected metric.
      omittedForMetric.push(lensName(id));
    }
  }

  // Balance by category — same metric mode, credit-each, data-only.
  const factsByCategory = new Map<string, Fact[]>();
  for (const fact of filtered) {
    for (const pgId of fact.primaryGroupIds) {
      const cat = pgMeta.get(pgId)?.category ?? 'Skill';
      const list = factsByCategory.get(cat);
      if (list) list.push(fact);
      else factsByCategory.set(cat, [fact]);
    }
  }

  const balanceByCategory: NamedTotal[] = [];
  for (const cat of PRIMARY_GROUP_CATEGORIES) {
    const bucketFacts = factsByCategory.get(cat) ?? [];
    if (bucketFacts.length === 0) continue;
    const resolved: InsightsMetric = isAuto
      ? autoMetricForFacts(bucketFacts)
      : (filters.metric as InsightsMetric);
    let value = 0;
    for (const fact of bucketFacts) {
      value += metricContribution(fact, resolved);
    }
    if (value > 0) {
      balanceByCategory.push({
        id: cat,
        name: cat,
        value,
        metric: resolved,
      });
    }
  }

  return {
    data: {
      lens: filters.lens,
      metricMode: filters.metric,
      sessionCount: sessionRows.length,
      sessionsPerWeek:
        Math.round(
          (sessionRows.length / weeksInWindow(filters.fromDate, filters.toDate)) *
            10,
        ) / 10,
      workingSetsTotal,
      volumeByLens: sortNamed(volumeByLens),
      omittedForMetric: omittedForMetric.sort((a, b) => a.localeCompare(b)),
      balanceByCategory: sortNamed(balanceByCategory),
      workingSetsByMuscle: sortNamed(
        [...workingByMuscle.entries()].map(([id, value]) => ({
          id,
          name: mgNames.get(id) ?? id,
          value,
          metric: 'sets' as const,
        })),
      ),
      tonnageByPrimaryGroup: sortNamed(
        [...tonnageByPg.entries()].map(([id, value]) => ({
          id,
          name: pgMeta.get(id)?.name ?? id,
          value,
          metric: 'tonnage' as const,
        })),
      ),
      tonnageTotal,
    },
    error: null,
  };
}

// Re-export for screens that build the set-type filter options.
export { SET_TYPES };
export type { SetType };
