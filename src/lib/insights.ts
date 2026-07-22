/**
 * Insights Phase 2 — PG-first query aggregates against `v_log_set_facts`.
 *
 * Query madlib: FOR (PGs) → SHOW (facets) → WHERE (nest/identity) → IN (dates).
 * Facets are atomic (reps / time / distance / load / sets). Never sum unlike
 * units. Multi-PG = stacked panels (credit-each under the hood).
 *
 * Complete logs only. Working-only default + warmups toggle.
 */

import { normalizeSetType, SET_TYPES, type SetType } from '../constants/setTypes';
import { supabase } from './supabase';
import { todayDateKey } from './localTime';

/** Atomic facet shown per Primary Group panel. */
export type InsightFacetId = 'reps' | 'time' | 'distance' | 'load' | 'sets';

/** Draft query definition (Phase 2 — not persisted). */
export type InsightQuery = {
  /** Required subject — empty = no results. */
  primaryGroupIds: string[];
  /** Inclusive YYYY-MM-DD */
  fromDate: string;
  /** Inclusive YYYY-MM-DD */
  toDate: string;
  sessionCategoryIds: string[];
  blockLabelIds: string[];
  sequenceLabelIds: string[];
  variationIds: string[];
  toolIds: string[];
  setTypes: SetType[];
  includeWarmups: boolean;
};

export type PgFacetResult = {
  id: InsightFacetId;
  label: string;
  /** Raw value: reps count, time seconds, distance meters, avg load, or set count. */
  value: number;
  /** Display unit for load (lbs/kg/BW/…); unused for other facets. */
  unit?: string;
  /** Sets that contributed to the load average. */
  loadSetCount?: number;
};

export type PgPanelResult = {
  primaryGroupId: string;
  name: string;
  facets: PgFacetResult[];
  setCount: number;
};

export type InsightQueryResult = {
  sessionCount: number;
  sessionsPerWeek: number;
  /** Ordered by InsightQuery.primaryGroupIds selection order. */
  panels: PgPanelResult[];
};

type Fact = {
  sessionLogId: string;
  sessionCategoryId: string;
  blockLabelId: string | null;
  sequenceLabelId: string | null;
  primaryGroupIds: string[];
  tagIds: string[];
  toolIds: string[];
  setType: SetType;
  effectiveReps: number;
  timeSeconds: number;
  distanceMeters: number;
  loadValue: number;
  loadUnit: string | null;
};

const METERS_PER_MILE = 1609.344;

const FACET_LABELS: Record<InsightFacetId, string> = {
  reps: 'Reps',
  time: 'Time',
  distance: 'Distance',
  load: 'Load',
  sets: 'Sets',
};

function daysAgoKey(days: number): string {
  const d = new Date(`${todayDateKey()}T12:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultInsightQuery(): InsightQuery {
  return {
    primaryGroupIds: [],
    fromDate: daysAgoKey(6), // last 7 days inclusive
    toDate: todayDateKey(),
    sessionCategoryIds: [],
    blockLabelIds: [],
    sequenceLabelIds: [],
    variationIds: [],
    toolIds: [],
    setTypes: ['Working'],
    includeWarmups: false,
  };
}

/** Effective set-type allow-list after the warmups toggle. */
export function effectiveSetTypes(query: InsightQuery): SetType[] {
  const base =
    query.setTypes.length > 0 ? [...query.setTypes] : (['Working'] as SetType[]);
  if (!query.includeWarmups) return base;
  if (base.includes('Warmup')) return base;
  return [...base, 'Warmup'];
}

export function facetLabel(id: InsightFacetId): string {
  return FACET_LABELS[id];
}

/** Format time seconds → display string (min or s). */
export function formatTimeFacet(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes >= 10) return `${Math.round(minutes)} min`;
  if (minutes >= 1) return `${minutes.toFixed(1)} min`;
  return seconds > 0 ? `${seconds.toFixed(0)}s` : '0';
}

/** Format distance meters → miles display. */
export function formatDistanceFacet(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  if (miles >= 10) return `${Math.round(miles * 10) / 10} mi`;
  if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
  return miles > 0 ? `${miles.toFixed(3)} mi` : '0 mi';
}

/** Format a facet value for display. */
export function formatFacetDisplay(facet: PgFacetResult): string {
  switch (facet.id) {
    case 'time':
      return formatTimeFacet(facet.value);
    case 'distance':
      return formatDistanceFacet(facet.value);
    case 'load': {
      const unit = facet.unit ?? '';
      const n = Number.isInteger(facet.value)
        ? String(facet.value)
        : facet.value.toFixed(1);
      const avg = unit ? `avg ${n} ${unit}` : `avg ${n}`;
      if (facet.loadSetCount != null && facet.loadSetCount > 0) {
        return `${avg} (${facet.loadSetCount} set${facet.loadSetCount === 1 ? '' : 's'})`;
      }
      return avg;
    }
    case 'reps': {
      const n = Number.isInteger(facet.value)
        ? String(facet.value)
        : facet.value.toFixed(1);
      return `${n} reps`;
    }
    case 'sets': {
      const n = Number.isInteger(facet.value)
        ? String(facet.value)
        : facet.value.toFixed(1);
      return `${n} set${facet.value === 1 ? '' : 's'}`;
    }
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && Boolean(v));
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function weeksInWindow(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 1 / 7;
  const days = Math.floor(ms / 86400000) + 1; // inclusive
  return Math.max(days / 7, 1 / 7);
}

function passesScope(
  fact: Fact,
  query: InsightQuery,
  setTypes: SetType[],
): boolean {
  if (
    query.sessionCategoryIds.length > 0 &&
    !query.sessionCategoryIds.includes(fact.sessionCategoryId)
  ) {
    return false;
  }
  if (query.blockLabelIds.length > 0) {
    if (!fact.blockLabelId || !query.blockLabelIds.includes(fact.blockLabelId)) {
      return false;
    }
  }
  if (query.sequenceLabelIds.length > 0) {
    if (
      !fact.sequenceLabelId ||
      !query.sequenceLabelIds.includes(fact.sequenceLabelId)
    ) {
      return false;
    }
  }
  if (setTypes.length > 0 && !setTypes.includes(fact.setType)) {
    return false;
  }
  if (query.variationIds.length > 0) {
    const hit = query.variationIds.some((id) => fact.tagIds.includes(id));
    if (!hit) return false;
  }
  if (query.toolIds.length > 0) {
    const hit = query.toolIds.some((id) => fact.toolIds.includes(id));
    if (!hit) return false;
  }
  return true;
}

function majorityUnit(units: string[]): string | undefined {
  if (units.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const u of units) {
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [u, n] of counts) {
    if (n > bestN || (n === bestN && best != null && u < best)) {
      best = u;
      bestN = n;
    }
  }
  return best;
}

function buildPanel(
  pgId: string,
  name: string,
  facts: Fact[],
): PgPanelResult {
  if (facts.length === 0) {
    return { primaryGroupId: pgId, name, facets: [], setCount: 0 };
  }

  let reps = 0;
  let timeSeconds = 0;
  let distanceMeters = 0;
  let hasReps = false;
  let hasTime = false;
  let hasDistance = false;
  const loadValues: number[] = [];
  const loadUnits: string[] = [];

  for (const fact of facts) {
    if (fact.effectiveReps > 0) {
      hasReps = true;
      reps += fact.effectiveReps;
    }
    if (fact.timeSeconds > 0) {
      hasTime = true;
      timeSeconds += fact.timeSeconds;
    }
    if (fact.distanceMeters > 0) {
      hasDistance = true;
      distanceMeters += fact.distanceMeters;
    }
    if (fact.loadValue > 0) {
      loadValues.push(fact.loadValue);
      if (fact.loadUnit) loadUnits.push(fact.loadUnit);
    }
  }

  const facets: PgFacetResult[] = [];
  if (hasReps) {
    facets.push({ id: 'reps', label: FACET_LABELS.reps, value: reps });
  }
  if (hasTime) {
    facets.push({
      id: 'time',
      label: FACET_LABELS.time,
      value: timeSeconds,
    });
  }
  if (hasDistance) {
    facets.push({
      id: 'distance',
      label: FACET_LABELS.distance,
      value: distanceMeters,
    });
  }
  if (loadValues.length > 0) {
    const sum = loadValues.reduce((a, b) => a + b, 0);
    const avg = sum / loadValues.length;
    facets.push({
      id: 'load',
      label: FACET_LABELS.load,
      value: Math.round(avg * 10) / 10,
      unit: majorityUnit(loadUnits),
      loadSetCount: loadValues.length,
    });
  }
  facets.push({
    id: 'sets',
    label: FACET_LABELS.sets,
    value: facts.length,
  });

  return {
    primaryGroupId: pgId,
    name,
    facets,
    setCount: facts.length,
  };
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
  load_value: number | null;
  load_unit: string | null;
  primary_group_ids: string[] | null;
  variation_ids: string[] | null;
  tool_ids: string[] | null;
};

/**
 * Run a draft Insight query. Returns null panels when no PGs selected
 * (caller should show empty state without calling, but safe if called).
 */
export async function loadInsightQuery(
  query: InsightQuery,
): Promise<{ data: InsightQueryResult | null; error: string | null }> {
  if (query.primaryGroupIds.length === 0) {
    return { data: { sessionCount: 0, sessionsPerWeek: 0, panels: [] }, error: null };
  }

  const { data: pgRows, error: pgError } = await supabase
    .from('analytics_primary_groups')
    .select('id, name')
    .in('id', query.primaryGroupIds);
  if (pgError) return { data: null, error: pgError.message };
  const nameMap = new Map<string, string>();
  for (const row of pgRows ?? []) {
    nameMap.set(row.id as string, row.name as string);
  }

  const emptyPanels = (): PgPanelResult[] =>
    query.primaryGroupIds.map((id) => ({
      primaryGroupId: id,
      name: nameMap.get(id) ?? id,
      facets: [],
      setCount: 0,
    }));

  let sessionQuery = supabase
    .from('session_logs')
    .select('id, category_id, session_date')
    .eq('status', 'complete')
    .gte('session_date', query.fromDate)
    .lte('session_date', query.toDate)
    .order('session_date', { ascending: false });

  if (query.sessionCategoryIds.length > 0) {
    sessionQuery = sessionQuery.in('category_id', query.sessionCategoryIds);
  }

  const { data: sessions, error: sessionError } = await sessionQuery;
  if (sessionError) return { data: null, error: sessionError.message };

  const sessionRows = (sessions ?? []) as {
    id: string;
    category_id: string;
    session_date: string;
  }[];

  if (sessionRows.length === 0) {
    return {
      data: {
        sessionCount: 0,
        sessionsPerWeek: 0,
        panels: emptyPanels(),
      },
      error: null,
    };
  }

  const sessionIds = sessionRows.map((s) => s.id);
  const setTypes = effectiveSetTypes(query);

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
        'load_value',
        'load_unit',
        'primary_group_ids',
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
      tagIds: asStringArray(row.variation_ids),
      toolIds: asStringArray(row.tool_ids),
      setType: normalizeSetType(row.set_type),
      effectiveReps: asNumber(row.effective_reps),
      timeSeconds: asNumber(row.time_seconds),
      distanceMeters: asNumber(row.distance_meters),
      loadValue: asNumber(row.load_value),
      loadUnit: asNullableString(row.load_unit),
    });
  }

  const scoped = facts.filter((f) => passesScope(f, query, setTypes));

  const factsByPg = new Map<string, Fact[]>();
  for (const pgId of query.primaryGroupIds) {
    factsByPg.set(pgId, []);
  }
  for (const fact of scoped) {
    for (const pgId of fact.primaryGroupIds) {
      const list = factsByPg.get(pgId);
      if (list) list.push(fact);
    }
  }

  const panels: PgPanelResult[] = query.primaryGroupIds.map((pgId) =>
    buildPanel(pgId, nameMap.get(pgId) ?? pgId, factsByPg.get(pgId) ?? []),
  );

  return {
    data: {
      sessionCount: sessionRows.length,
      sessionsPerWeek:
        Math.round(
          (sessionRows.length / weeksInWindow(query.fromDate, query.toDate)) *
            10,
        ) / 10,
      panels,
    },
    error: null,
  };
}

// Re-export for screens that build the set-type filter options.
export { SET_TYPES };
export type { SetType };
