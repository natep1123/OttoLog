/**
 * Insights aggregates against greenfield log tables.
 *
 * Grain model (chat 5.5): every fact (a log set) carries its own dimension
 * keys — session label, block label, sequence label, plus the exercise
 * identity (PG / category / muscle / variation / tool). A single "lens"
 * chooses which dimension the headline volume chart groups by; stacked
 * filters narrow the fact set regardless of lens.
 *
 * Credit rule (decision: credit-each, documented):
 *  - Per-PG, per-category, and per-muscle rollups deliberately double-count.
 *    A multi-PG complex credits each PG's chart; a multi-muscle exercise
 *    credits each muscle. NEVER sum those rows into one grand total.
 *  - Session / block / sequence label lenses count each set ONCE (a set lives
 *    in exactly one session/block/sequence), so those are honest partitions.
 *  - Honest totals (sessionCount, workingSetsTotal, tonnageTotal) are computed
 *    once at the set grain, never by summing a credited dimension.
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

export type InsightsFilters = {
  /** Inclusive YYYY-MM-DD */
  fromDate: string;
  /** Inclusive YYYY-MM-DD */
  toDate: string;
  /** Which dimension the headline volume chart groups by */
  lens: InsightsLens;
  /** Empty = all session labels */
  sessionCategoryIds: string[];
  /** Empty = all block labels */
  blockLabelIds: string[];
  /** Empty = all variations; match if exercise has any of these tags */
  variationIds: string[];
  /** Empty = all tools; match if exercise has any of these tools */
  toolIds: string[];
  /** Empty = all set types */
  setTypes: SetType[];
};

export type NamedTotal = {
  id: string;
  name: string;
  value: number;
};

export type InsightsSnapshot = {
  lens: InsightsLens;
  sessionCount: number;
  /** Sessions per week across the selected window (honest, header grain). */
  sessionsPerWeek: number;
  /** Working sets counted once each (honest total, not per-muscle). */
  workingSetsTotal: number;
  /** Volume (effective reps) grouped by the active lens. */
  volumeByLens: NamedTotal[];
  /** Balance rolled up by PG category (credit-each; do not sum). */
  balanceByCategory: NamedTotal[];
  /** Working-set counts credited per muscle (do not sum across muscles). */
  workingSetsByMuscle: NamedTotal[];
  /** Tonnage credited per PG (do not sum across PGs). */
  tonnageByPrimaryGroup: NamedTotal[];
  /** Total set tonnage counted once — the honest session tonnage. */
  tonnageTotal: number;
};

type Fact = {
  sessionCategoryId: string;
  blockLabelId: string | null;
  sequenceLabelId: string | null;
  primaryGroupIds: string[];
  muscleGroupIds: string[];
  tagIds: string[];
  toolIds: string[];
  setType: SetType;
  reps: number | null;
  isPerSide: boolean;
  loadValue: number | null;
  loadUnit: string | null;
};

const SEQUENCE_NONE_ID = '__no_sequence__';

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
    fromDate: daysAgoKey(27),
    toDate: todayDateKey(),
    lens: 'primaryGroup',
    sessionCategoryIds: [],
    blockLabelIds: [],
    variationIds: [],
    toolIds: [],
    setTypes: [],
  };
}

function effectiveReps(reps: number | null, isPerSide: boolean): number {
  if (reps == null || reps <= 0) return 0;
  return reps * (isPerSide ? 2 : 1);
}

function setTonnage(
  reps: number | null,
  loadValue: number | null,
  loadUnit: string | null,
  isPerSide: boolean,
): number {
  if (reps == null || reps <= 0) return 0;
  if (loadValue == null || loadValue <= 0) return 0;
  if (loadUnit !== 'lbs' && loadUnit !== 'kg') return 0;
  return loadValue * effectiveReps(reps, isPerSide);
}

function passesFilters(fact: Fact, filters: InsightsFilters): boolean {
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
  if (filters.setTypes.length > 0 && !filters.setTypes.includes(fact.setType)) {
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

/**
 * Load complete session facts in the date window and aggregate.
 * Requires greenfield schema (tag links, set_type, PG category, log labels).
 */
export async function loadInsightsSnapshot(
  filters: InsightsFilters,
): Promise<{ data: InsightsSnapshot | null; error: string | null }> {
  const empty = (sessionCount: number): InsightsSnapshot => ({
    lens: filters.lens,
    sessionCount,
    sessionsPerWeek: 0,
    workingSetsTotal: 0,
    volumeByLens: [],
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
  const categoryBySession = new Map(
    sessionRows.map((s) => [s.id, s.category_id]),
  );

  const { data: blocks, error: blocksError } = await supabase
    .from('log_blocks')
    .select('id, session_log_id, label_id')
    .in('session_log_id', sessionIds);
  if (blocksError) return { data: null, error: blocksError.message };

  const blockRows = (blocks ?? []) as {
    id: string;
    session_log_id: string;
    label_id: string | null;
  }[];
  if (blockRows.length === 0) {
    return { data: empty(sessionRows.length), error: null };
  }

  const blockIds = blockRows.map((b) => b.id);
  // O(1) lookups: block → { sessionId, labelId }
  const blockMeta = new Map(
    blockRows.map((b) => [
      b.id,
      { sessionId: b.session_log_id, labelId: b.label_id },
    ]),
  );

  const { data: items, error: itemsError } = await supabase
    .from('log_items')
    .select('id, log_block_id, kind, track_analytics, tool_id, label_id')
    .in('log_block_id', blockIds);
  if (itemsError) return { data: null, error: itemsError.message };

  const itemRows = (items ?? []) as {
    id: string;
    log_block_id: string;
    kind: string;
    track_analytics: boolean | null;
    tool_id: string | null;
    label_id: string | null;
  }[];

  // O(1) lookups: item → its block + (for clusters) sequence label
  const itemMeta = new Map(
    itemRows.map((i) => [
      i.id,
      { blockId: i.log_block_id, kind: i.kind, labelId: i.label_id },
    ]),
  );

  const exerciseItems = itemRows.filter(
    (i) => i.kind === 'exercise' && i.track_analytics === true,
  );
  const clusterItems = itemRows.filter((i) => i.kind === 'cluster');
  const clusterIds = clusterItems.map((i) => i.id);

  let subRows: {
    id: string;
    log_item_id: string;
    track_analytics: boolean;
    tool_id: string;
  }[] = [];
  if (clusterIds.length) {
    const { data: subs, error: subsError } = await supabase
      .from('log_sub_items')
      .select('id, log_item_id, track_analytics, tool_id')
      .in('log_item_id', clusterIds)
      .eq('track_analytics', true);
    if (subsError) return { data: null, error: subsError.message };
    subRows = (subs ?? []) as typeof subRows;
  }

  const exerciseItemIds = exerciseItems.map((i) => i.id);
  const subIds = subRows.map((s) => s.id);
  // O(1) lookups: sub-item → its owning cluster item
  const subMeta = new Map(subRows.map((s) => [s.id, { itemId: s.log_item_id }]));

  /** Resolve a fact's location keys from its parent item / sub-item. */
  const locationFor = (
    parentId: string,
    isSub: boolean,
  ): {
    sessionId: string;
    blockLabelId: string | null;
    sequenceLabelId: string | null;
  } | null => {
    if (isSub) {
      const sub = subMeta.get(parentId);
      if (!sub) return null;
      const cluster = itemMeta.get(sub.itemId);
      if (!cluster) return null;
      const block = blockMeta.get(cluster.blockId);
      if (!block) return null;
      return {
        sessionId: block.sessionId,
        blockLabelId: block.labelId,
        sequenceLabelId: cluster.labelId,
      };
    }
    const item = itemMeta.get(parentId);
    if (!item) return null;
    const block = blockMeta.get(item.blockId);
    if (!block) return null;
    return {
      sessionId: block.sessionId,
      blockLabelId: block.labelId,
      sequenceLabelId: null,
    };
  };

  async function linkMap(
    table: string,
    parentCol: string,
    parentIds: string[],
    valueCol: string,
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (parentIds.length === 0) return map;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in(parentCol, parentIds)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const rec = row as Record<string, unknown>;
      const id = rec[parentCol] as string;
      const value = rec[valueCol] as string;
      const list = map.get(id) ?? [];
      list.push(value);
      map.set(id, list);
    }
    return map;
  }

  let pgByItem: Map<string, string[]>;
  let pgBySub: Map<string, string[]>;
  let mgByItem: Map<string, string[]>;
  let mgBySub: Map<string, string[]>;
  let tagByItem: Map<string, string[]>;
  let tagBySub: Map<string, string[]>;
  let toolByItem: Map<string, string[]>;
  let toolBySub: Map<string, string[]>;

  try {
    [pgByItem, pgBySub, mgByItem, mgBySub, tagByItem, tagBySub, toolByItem, toolBySub] =
      await Promise.all([
        linkMap(
          'log_item_primary_group_links',
          'log_item_id',
          exerciseItemIds,
          'primary_group_id',
        ),
        linkMap(
          'log_sub_item_primary_group_links',
          'log_sub_item_id',
          subIds,
          'primary_group_id',
        ),
        linkMap(
          'log_item_muscle_group_links',
          'log_item_id',
          exerciseItemIds,
          'muscle_group_id',
        ),
        linkMap(
          'log_sub_item_muscle_group_links',
          'log_sub_item_id',
          subIds,
          'muscle_group_id',
        ),
        linkMap('log_item_tag_links', 'log_item_id', exerciseItemIds, 'tag_id'),
        linkMap('log_sub_item_tag_links', 'log_sub_item_id', subIds, 'tag_id'),
        linkMap('log_item_tools', 'log_item_id', exerciseItemIds, 'tool_id'),
        linkMap('log_sub_item_tools', 'log_sub_item_id', subIds, 'tool_id'),
      ]);
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Could not load analytics links.',
    };
  }

  // Fallback primary tool column when link rows missing
  for (const item of exerciseItems) {
    if (!toolByItem.has(item.id) && item.tool_id) {
      toolByItem.set(item.id, [item.tool_id]);
    }
  }
  for (const sub of subRows) {
    if (!toolBySub.has(sub.id) && sub.tool_id) {
      toolBySub.set(sub.id, [sub.tool_id]);
    }
  }

  type SetRow = {
    log_item_id: string | null;
    log_sub_item_id: string | null;
    reps: number | null;
    is_per_side: boolean;
    load_value: number | null;
    load_unit: string | null;
    track_analytics: boolean | null;
    set_type: string | null;
  };

  const setRows: SetRow[] = [];
  if (exerciseItemIds.length) {
    const { data, error } = await supabase
      .from('log_sets')
      .select(
        'log_item_id, log_sub_item_id, reps, is_per_side, load_value, load_unit, track_analytics, set_type',
      )
      .in('log_item_id', exerciseItemIds);
    if (error) return { data: null, error: error.message };
    setRows.push(...((data ?? []) as SetRow[]));
  }
  if (subIds.length) {
    const { data, error } = await supabase
      .from('log_sets')
      .select(
        'log_item_id, log_sub_item_id, reps, is_per_side, load_value, load_unit, track_analytics, set_type',
      )
      .in('log_sub_item_id', subIds);
    if (error) return { data: null, error: error.message };
    setRows.push(...((data ?? []) as SetRow[]));
  }

  const facts: Fact[] = [];
  for (const set of setRows) {
    if (set.track_analytics === false) continue;
    const isSub = Boolean(set.log_sub_item_id);
    const parentId = (isSub ? set.log_sub_item_id : set.log_item_id) as string;
    const loc = locationFor(parentId, isSub);
    if (!loc) continue;
    const sessionCategoryId = categoryBySession.get(loc.sessionId);
    if (!sessionCategoryId) continue;

    facts.push({
      sessionCategoryId,
      blockLabelId: loc.blockLabelId,
      sequenceLabelId: loc.sequenceLabelId,
      primaryGroupIds: isSub
        ? (pgBySub.get(parentId) ?? [])
        : (pgByItem.get(parentId) ?? []),
      muscleGroupIds: isSub
        ? (mgBySub.get(parentId) ?? [])
        : (mgByItem.get(parentId) ?? []),
      tagIds: isSub
        ? (tagBySub.get(parentId) ?? [])
        : (tagByItem.get(parentId) ?? []),
      toolIds: isSub
        ? (toolBySub.get(parentId) ?? [])
        : (toolByItem.get(parentId) ?? []),
      setType: normalizeSetType(set.set_type),
      reps: typeof set.reps === 'number' ? set.reps : null,
      isPerSide: Boolean(set.is_per_side),
      loadValue: typeof set.load_value === 'number' ? set.load_value : null,
      loadUnit: typeof set.load_unit === 'string' ? set.load_unit : null,
    });
  }

  const filtered = facts.filter((f) => passesFilters(f, filters));

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
  const balanceByCat = new Map<string, number>();
  const workingByMuscle = new Map<string, number>();
  let tonnageTotal = 0;
  let workingSetsTotal = 0;

  // ── Headline volume grouped by the active lens ────────────────────────────
  const volumeByLens = new Map<string, number>();

  for (const fact of filtered) {
    const vol = effectiveReps(fact.reps, fact.isPerSide);
    const ton = setTonnage(fact.reps, fact.loadValue, fact.loadUnit, fact.isPerSide);
    if (ton > 0) tonnageTotal += ton;

    const isWorking = normalizeSetType(fact.setType) === 'Working';
    if (isWorking) workingSetsTotal += 1;

    // Secondary: tonnage + balance credited per PG (credit-each).
    for (const pgId of fact.primaryGroupIds) {
      if (vol > 0) {
        const cat = pgMeta.get(pgId)?.category ?? 'Skill';
        balanceByCat.set(cat, (balanceByCat.get(cat) ?? 0) + vol);
      }
      if (ton > 0) tonnageByPg.set(pgId, (tonnageByPg.get(pgId) ?? 0) + ton);
    }

    // Secondary: working sets credited per muscle.
    if (isWorking) {
      for (const mgId of fact.muscleGroupIds) {
        workingByMuscle.set(mgId, (workingByMuscle.get(mgId) ?? 0) + 1);
      }
    }

    // Headline volume by lens.
    if (vol > 0) {
      switch (filters.lens) {
        case 'primaryGroup':
          for (const pgId of fact.primaryGroupIds) {
            volumeByLens.set(pgId, (volumeByLens.get(pgId) ?? 0) + vol);
          }
          break;
        case 'category': {
          // credit-each: same reps credit every credited PG's category
          for (const pgId of fact.primaryGroupIds) {
            const cat = pgMeta.get(pgId)?.category ?? 'Skill';
            volumeByLens.set(cat, (volumeByLens.get(cat) ?? 0) + vol);
          }
          break;
        }
        case 'muscle':
          for (const mgId of fact.muscleGroupIds) {
            volumeByLens.set(mgId, (volumeByLens.get(mgId) ?? 0) + vol);
          }
          break;
        case 'sessionLabel':
          volumeByLens.set(
            fact.sessionCategoryId,
            (volumeByLens.get(fact.sessionCategoryId) ?? 0) + vol,
          );
          break;
        case 'blockLabel': {
          const key = fact.blockLabelId ?? SEQUENCE_NONE_ID;
          volumeByLens.set(key, (volumeByLens.get(key) ?? 0) + vol);
          break;
        }
        case 'sequenceLabel': {
          const key = fact.sequenceLabelId ?? SEQUENCE_NONE_ID;
          volumeByLens.set(key, (volumeByLens.get(key) ?? 0) + vol);
          break;
        }
      }
    }
  }

  // Resolve names for the active lens dimension.
  let lensNames = new Map<string, string>();
  const lensKeys = [...volumeByLens.keys()];
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
  // 'category' keys are already display names.

  const lensRow = (id: string): NamedTotal => {
    if (filters.lens === 'category') return { id, name: id, value: 0 };
    if (id === SEQUENCE_NONE_ID) {
      return {
        id,
        name: filters.lens === 'sequenceLabel' ? 'No sequence' : 'Unlabeled',
        value: 0,
      };
    }
    return { id, name: lensNames.get(id) ?? id, value: 0 };
  };

  const volumeByLensRows = sortNamed(
    [...volumeByLens.entries()].map(([id, value]) => ({
      ...lensRow(id),
      value,
    })),
  );

  return {
    data: {
      lens: filters.lens,
      sessionCount: sessionRows.length,
      sessionsPerWeek:
        Math.round(
          (sessionRows.length / weeksInWindow(filters.fromDate, filters.toDate)) *
            10,
        ) / 10,
      workingSetsTotal,
      volumeByLens: volumeByLensRows,
      balanceByCategory: PRIMARY_GROUP_CATEGORIES.map((cat) => ({
        id: cat,
        name: cat,
        value: balanceByCat.get(cat) ?? 0,
      })).filter((r) => r.value > 0),
      workingSetsByMuscle: sortNamed(
        [...workingByMuscle.entries()].map(([id, value]) => ({
          id,
          name: mgNames.get(id) ?? id,
          value,
        })),
      ),
      tonnageByPrimaryGroup: sortNamed(
        [...tonnageByPg.entries()].map(([id, value]) => ({
          id,
          name: pgMeta.get(id)?.name ?? id,
          value,
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
