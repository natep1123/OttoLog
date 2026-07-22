/**
 * Insights day-one aggregates against greenfield log tables.
 * Multi-PG volume deliberately double-counts — never sum PG rows into a
 * grand total. Working-set muscle counts filter set_type = Working.
 */

import { PRIMARY_GROUP_CATEGORIES } from '../constants/primaryGroupCategories';
import { normalizeSetType } from '../constants/setTypes';
import { supabase } from './supabase';
import { todayDateKey } from './localTime';

export type InsightsFilters = {
  /** Inclusive YYYY-MM-DD */
  fromDate: string;
  /** Inclusive YYYY-MM-DD */
  toDate: string;
  /** Empty = all session labels */
  sessionCategoryIds: string[];
  /** Empty = all variations; match if exercise has any of these tags */
  variationIds: string[];
  /** Empty = all tools; match if exercise has any of these tools */
  toolIds: string[];
};

export type NamedTotal = {
  id: string;
  name: string;
  value: number;
};

export type InsightsSnapshot = {
  sessionCount: number;
  volumeByPrimaryGroup: NamedTotal[];
  balanceByCategory: NamedTotal[];
  workingSetsByMuscle: NamedTotal[];
  tonnageByPrimaryGroup: NamedTotal[];
  /** Sum of tonnage rows — only meaningful when not multi-counting PGs;
   *  use per-PG tonnage for charting; this is total set tonnage once. */
  tonnageTotal: number;
};

type Fact = {
  sessionCategoryId: string;
  primaryGroupIds: string[];
  muscleGroupIds: string[];
  tagIds: string[];
  toolIds: string[];
  setType: string;
  reps: number | null;
  isPerSide: boolean;
  loadValue: number | null;
  loadUnit: string | null;
  trackAnalytics: boolean;
};

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
    sessionCategoryIds: [],
    variationIds: [],
    toolIds: [],
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

/**
 * Load complete session facts in the date window and aggregate.
 * Requires greenfield schema (tag links, set_type, PG category).
 */
export async function loadInsightsSnapshot(
  filters: InsightsFilters,
): Promise<{ data: InsightsSnapshot | null; error: string | null }> {
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

  if (sessionRows.length === 0) {
    return {
      data: {
        sessionCount: 0,
        volumeByPrimaryGroup: [],
        balanceByCategory: [],
        workingSetsByMuscle: [],
        tonnageByPrimaryGroup: [],
        tonnageTotal: 0,
      },
      error: null,
    };
  }

  const sessionIds = sessionRows.map((s) => s.id);
  const categoryBySession = new Map(
    sessionRows.map((s) => [s.id, s.category_id]),
  );

  const { data: blocks, error: blocksError } = await supabase
    .from('log_blocks')
    .select('id, session_log_id')
    .in('session_log_id', sessionIds);
  if (blocksError) return { data: null, error: blocksError.message };

  const blockRows = (blocks ?? []) as {
    id: string;
    session_log_id: string;
  }[];
  if (blockRows.length === 0) {
    return {
      data: {
        sessionCount: sessionRows.length,
        volumeByPrimaryGroup: [],
        balanceByCategory: [],
        workingSetsByMuscle: [],
        tonnageByPrimaryGroup: [],
        tonnageTotal: 0,
      },
      error: null,
    };
  }

  const blockIds = blockRows.map((b) => b.id);
  const sessionByBlock = new Map(
    blockRows.map((b) => [b.id, b.session_log_id]),
  );

  const { data: items, error: itemsError } = await supabase
    .from('log_items')
    .select('id, log_block_id, kind, track_analytics, tool_id')
    .in('log_block_id', blockIds);
  if (itemsError) return { data: null, error: itemsError.message };

  const itemRows = (items ?? []) as {
    id: string;
    log_block_id: string;
    kind: string;
    track_analytics: boolean | null;
    tool_id: string | null;
  }[];

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

  const sessionForItem = (itemId: string, isSub: boolean): string | null => {
    if (isSub) {
      const sub = subRows.find((s) => s.id === itemId);
      if (!sub) return null;
      const cluster = clusterItems.find((c) => c.id === sub.log_item_id);
      if (!cluster) return null;
      return sessionByBlock.get(cluster.log_block_id) ?? null;
    }
    const item = exerciseItems.find((i) => i.id === itemId);
    if (!item) return null;
    return sessionByBlock.get(item.log_block_id) ?? null;
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
        linkMap(
          'log_item_tag_links',
          'log_item_id',
          exerciseItemIds,
          'tag_id',
        ),
        linkMap(
          'log_sub_item_tag_links',
          'log_sub_item_id',
          subIds,
          'tag_id',
        ),
        linkMap('log_item_tools', 'log_item_id', exerciseItemIds, 'tool_id'),
        linkMap(
          'log_sub_item_tools',
          'log_sub_item_id',
          subIds,
          'tool_id',
        ),
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
    const sessionId = sessionForItem(parentId, isSub);
    if (!sessionId) continue;
    const sessionCategoryId = categoryBySession.get(sessionId);
    if (!sessionCategoryId) continue;

    facts.push({
      sessionCategoryId,
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
      trackAnalytics: true,
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

  const volumeByPg = new Map<string, number>();
  const tonnageByPg = new Map<string, number>();
  const balanceByCat = new Map<string, number>();
  const workingByMuscle = new Map<string, number>();
  let tonnageTotal = 0;

  for (const fact of filtered) {
    const vol = effectiveReps(fact.reps, fact.isPerSide);
    const ton = setTonnage(
      fact.reps,
      fact.loadValue,
      fact.loadUnit,
      fact.isPerSide,
    );
    if (ton > 0) tonnageTotal += ton;

    for (const pgId of fact.primaryGroupIds) {
      if (vol > 0) {
        volumeByPg.set(pgId, (volumeByPg.get(pgId) ?? 0) + vol);
        const meta = pgMeta.get(pgId);
        const cat = meta?.category ?? 'Skill';
        balanceByCat.set(cat, (balanceByCat.get(cat) ?? 0) + vol);
      }
      if (ton > 0) {
        tonnageByPg.set(pgId, (tonnageByPg.get(pgId) ?? 0) + ton);
      }
    }

    if (normalizeSetType(fact.setType) === 'Working') {
      for (const mgId of fact.muscleGroupIds) {
        workingByMuscle.set(mgId, (workingByMuscle.get(mgId) ?? 0) + 1);
      }
    }
  }

  // Seed zero categories so empty balance still shows the axis vocabulary
  for (const cat of PRIMARY_GROUP_CATEGORIES) {
    if (!balanceByCat.has(cat)) balanceByCat.set(cat, 0);
  }

  return {
    data: {
      sessionCount: sessionRows.length,
      volumeByPrimaryGroup: sortNamed(
        [...volumeByPg.entries()].map(([id, value]) => ({
          id,
          name: pgMeta.get(id)?.name ?? id,
          value,
        })),
      ),
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
