/**
 * Session logs — denest nested editor drafts into sql/greenfield/007 relational
 * tables, and renest rows back into the same SessionTemplateInput-shaped tree
 * the session template builder uses.
 */

import {
  CLUSTER_LABEL_NULL_ID,
  GENERAL_BLOCK_LABEL_ID,
  NO_TOOL_ID,
  UNCATEGORIZED_ID,
} from '../constants/sentinelIds';
import { TARGET_SHAPE_IDS } from '../constants/lockedAtoms';
import {
  normalizeIntensityForStorage,
  normalizeSetType,
} from '../constants/setTypes';
import {
  legacyClusterTypeFromLabel,
  normalizeBrief,
  sessionLogTitle,
} from './displayTitles';
import {
  formatSessionDateLabel,
  todayDateKey,
} from './localTime';
import { supabase } from './supabase';
import {
  defaultBlockExerciseItem,
  prepareBlockItemForSave,
} from './blockTemplates';
import {
  defaultClusterExerciseItem,
  expandClusterPerformedSets,
} from './clusterTemplates';
import {
  buildTargets,
  coercePrimaryGroupIds,
  coerceToolIds,
  normalizeMuscleGroupIds,
  primaryPrimaryGroupId,
  primaryToolId,
  sanitizeTargetsForShape,
} from './exerciseTemplates';
import { defaultSessionBlockItem, defaultSessionDraft } from './sessionTemplates';
import { isEmptySessionLabel } from './taxonomy';
import type {
  BlockClusterItem,
  BlockExerciseItem,
  BlockItem,
} from '../types/blockTemplate';
import type {
  ClusterExerciseItem,
  ClusterType,
} from '../types/clusterTemplate';
import type { ExerciseTarget } from '../types/exerciseTemplate';
import type { SessionBlockItem } from '../types/sessionTemplate';
import type {
  SessionLogDetail,
  SessionLogInput,
  SessionLogListRow,
  SessionLogStatus,
} from '../types/sessionLog';

function newClientId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSessionLogDraft(): SessionLogInput {
  return {
    ...defaultSessionDraft(),
    session_date: todayDateKey(),
    status: 'complete',
    template_id: null,
  };
}

export function sessionLogToDraft(row: SessionLogDetail): SessionLogInput {
  return {
    name: row.name ?? '',
    category_id: row.category_id || UNCATEGORIZED_ID,
    label_name: row.label_name ?? null,
    notes: row.notes,
    track_duration: row.track_duration,
    duration: row.duration,
    blocks: row.blocks,
    session_date: row.session_date,
    status: row.status,
    template_id: row.template_id,
  };
}

function durationPair(
  track: boolean,
  duration: string | null | undefined,
): { track_duration: boolean; duration: string | null } {
  if (track) {
    return { track_duration: true, duration: duration ?? '00:00:00' };
  }
  return { track_duration: false, duration: null };
}

function targetToSetRow(
  target: ExerciseTarget,
  setNumber: number,
  parent: { log_item_id?: string; log_sub_item_id?: string },
  trackIntensity: boolean,
) {
  return {
    ...parent,
    set_number: setNumber,
    reps: target.reps,
    is_per_side: Boolean(target.is_per_side),
    time_duration: target.time_duration,
    distance_value: target.distance_value,
    distance_unit: target.distance_unit,
    load_value: target.load_value,
    load_unit: target.load_unit,
    track_analytics: target.track_analytics,
    set_type: normalizeSetType(target.set_type),
    intensity: trackIntensity
      ? normalizeIntensityForStorage(target.intensity)
      : null,
  };
}

function setRowToTarget(row: Record<string, unknown>, index: number): ExerciseTarget {
  return {
    set: index + 1,
    reps: typeof row.reps === 'number' ? row.reps : null,
    is_per_side: Boolean(row.is_per_side),
    time_duration:
      typeof row.time_duration === 'string' ? row.time_duration : null,
    distance_value:
      typeof row.distance_value === 'number' ? row.distance_value : null,
    distance_unit:
      row.distance_unit === 'km' || row.distance_unit === 'm'
        ? row.distance_unit
        : 'mi',
    load_value: typeof row.load_value === 'number' ? row.load_value : null,
    load_unit:
      row.load_unit === 'lbs' || row.load_unit === 'kg' ? row.load_unit : 'BW',
    track_analytics:
      typeof row.track_analytics === 'boolean' ? row.track_analytics : null,
    set_type: normalizeSetType(row.set_type),
    intensity: normalizeIntensityForStorage(
      typeof row.intensity === 'number' ? row.intensity : null,
    ),
  };
}

function resolveClusterType(item: BlockClusterItem): ClusterType {
  if (item.cluster_type === 'circuit' || item.cluster_type === 'superset') {
    return item.cluster_type;
  }
  return legacyClusterTypeFromLabel(item.label_name);
}

async function validateLogDraft(
  draft: SessionLogInput,
): Promise<string | null> {
  if (!draft.session_date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.session_date)) {
    return 'Session date is required.';
  }
  if (draft.session_date > todayDateKey()) {
    return 'Session date cannot be in the future.';
  }
  if (!draft.category_id) return 'Session label is required.';
  const emptyLabel = await isEmptySessionLabel(draft.category_id);
  if (emptyLabel) {
    if (draft.blocks.length > 0) {
      return 'Empty session labels cannot have blocks. Notes only.';
    }
    return null;
  }
  if (draft.blocks.length === 0) return 'Add at least one block.';
  for (let i = 0; i < draft.blocks.length; i += 1) {
    const block = draft.blocks[i];
    if (!block.label_id) return `Block ${i + 1} needs a label.`;
    if (block.items.length === 0) {
      return `Block ${i + 1} needs at least one sequence or exercise.`;
    }
    for (let j = 0; j < block.items.length; j += 1) {
      const item = block.items[j];
      if (item.kind === 'cluster' && !item.label_id) {
        return `Sequence ${j + 1} in Block ${i + 1} needs a label.`;
      }
      if (
        item.kind === 'exercise' &&
        item.track_analytics &&
        coercePrimaryGroupIds(item).length === 0
      ) {
        return `Exercise ${j + 1} in Block ${i + 1} needs a primary analytics group.`;
      }
      if (item.kind === 'cluster') {
        for (let k = 0; k < item.items.length; k += 1) {
          const ex = item.items[k];
          if (ex.track_analytics && coercePrimaryGroupIds(ex).length === 0) {
            return `Exercise ${k + 1} in Sequence ${j + 1} (Block ${i + 1}) needs a primary analytics group.`;
          }
        }
      }
    }
  }
  return null;
}

async function insertSets(
  rows: ReturnType<typeof targetToSetRow>[],
): Promise<string | null> {
  if (rows.length === 0) return null;
  const { error } = await supabase.from('log_sets').insert(rows);
  return error ? error.message : null;
}

async function denestBlock(
  sessionLogId: string,
  block: SessionBlockItem,
  blockOrder: number,
): Promise<string | null> {
  const blockDur = durationPair(block.track_duration, block.duration);
  const { data: blockRow, error: blockError } = await supabase
    .from('log_blocks')
    .insert({
      session_log_id: sessionLogId,
      block_order: blockOrder,
      name: normalizeBrief(block.name),
      label_id: block.label_id || GENERAL_BLOCK_LABEL_ID,
      notes: block.notes?.trim() || null,
      ...blockDur,
    })
    .select('id')
    .single();

  if (blockError || !blockRow) {
    return blockError?.message ?? 'Could not save block.';
  }

  const preparedItems = block.items.map(prepareBlockItemForSave);

  for (let itemOrder = 0; itemOrder < preparedItems.length; itemOrder += 1) {
    const item = preparedItems[itemOrder];
    if (item.kind === 'exercise') {
      const err = await denestExerciseItem(blockRow.id, item, itemOrder + 1);
      if (err) return err;
    } else {
      const err = await denestClusterItem(blockRow.id, item, itemOrder + 1);
      if (err) return err;
    }
  }
  return null;
}

async function replaceLogItemTools(
  logItemId: string,
  toolIds: string[],
): Promise<string | null> {
  const ids = coerceToolIds({ tool_ids: toolIds });
  const { error: delError } = await supabase
    .from('log_item_tools')
    .delete()
    .eq('log_item_id', logItemId);
  if (delError) return delError.message;

  const { error } = await supabase.from('log_item_tools').insert(
    ids.map((tool_id, sort_order) => ({
      log_item_id: logItemId,
      tool_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function replaceLogSubItemTools(
  logSubItemId: string,
  toolIds: string[],
): Promise<string | null> {
  const ids = coerceToolIds({ tool_ids: toolIds });
  const { error: delError } = await supabase
    .from('log_sub_item_tools')
    .delete()
    .eq('log_sub_item_id', logSubItemId);
  if (delError) return delError.message;

  const { error } = await supabase.from('log_sub_item_tools').insert(
    ids.map((tool_id, sort_order) => ({
      log_sub_item_id: logSubItemId,
      tool_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function replaceLogItemPrimaryGroups(
  logItemId: string,
  groupIds: string[],
): Promise<string | null> {
  const ids = coercePrimaryGroupIds({ primary_group_ids: groupIds });
  const { error: delError } = await supabase
    .from('log_item_primary_group_links')
    .delete()
    .eq('log_item_id', logItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase.from('log_item_primary_group_links').insert(
    ids.map((primary_group_id, sort_order) => ({
      log_item_id: logItemId,
      primary_group_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function replaceLogSubItemPrimaryGroups(
  logSubItemId: string,
  groupIds: string[],
): Promise<string | null> {
  const ids = coercePrimaryGroupIds({ primary_group_ids: groupIds });
  const { error: delError } = await supabase
    .from('log_sub_item_primary_group_links')
    .delete()
    .eq('log_sub_item_id', logSubItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase
    .from('log_sub_item_primary_group_links')
    .insert(
      ids.map((primary_group_id, sort_order) => ({
        log_sub_item_id: logSubItemId,
        primary_group_id,
        sort_order,
      })),
    );
  return error?.message ?? null;
}

async function replaceLogItemMuscleGroups(
  logItemId: string,
  muscleGroupIds: string[],
): Promise<string | null> {
  const ids = normalizeMuscleGroupIds(muscleGroupIds);
  const { error: delError } = await supabase
    .from('log_item_muscle_group_links')
    .delete()
    .eq('log_item_id', logItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase.from('log_item_muscle_group_links').insert(
    ids.map((muscle_group_id, sort_order) => ({
      log_item_id: logItemId,
      muscle_group_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function replaceLogSubItemMuscleGroups(
  logSubItemId: string,
  muscleGroupIds: string[],
): Promise<string | null> {
  const ids = normalizeMuscleGroupIds(muscleGroupIds);
  const { error: delError } = await supabase
    .from('log_sub_item_muscle_group_links')
    .delete()
    .eq('log_sub_item_id', logSubItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase
    .from('log_sub_item_muscle_group_links')
    .insert(
      ids.map((muscle_group_id, sort_order) => ({
        log_sub_item_id: logSubItemId,
        muscle_group_id,
        sort_order,
      })),
    );
  return error?.message ?? null;
}

async function replaceLogItemTags(
  logItemId: string,
  tagIds: string[],
): Promise<string | null> {
  const ids = [...new Set(tagIds.filter(Boolean))];
  const { error: delError } = await supabase
    .from('log_item_tag_links')
    .delete()
    .eq('log_item_id', logItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase.from('log_item_tag_links').insert(
    ids.map((tag_id, sort_order) => ({
      log_item_id: logItemId,
      tag_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function replaceLogSubItemTags(
  logSubItemId: string,
  tagIds: string[],
): Promise<string | null> {
  const ids = [...new Set(tagIds.filter(Boolean))];
  const { error: delError } = await supabase
    .from('log_sub_item_tag_links')
    .delete()
    .eq('log_sub_item_id', logSubItemId);
  if (delError) return delError.message;
  if (ids.length === 0) return null;

  const { error } = await supabase.from('log_sub_item_tag_links').insert(
    ids.map((tag_id, sort_order) => ({
      log_sub_item_id: logSubItemId,
      tag_id,
      sort_order,
    })),
  );
  return error?.message ?? null;
}

async function denestExerciseItem(
  logBlockId: string,
  item: BlockExerciseItem,
  itemOrder: number,
): Promise<string | null> {
  const itemDur = durationPair(item.track_duration, item.duration);
  const trackAnalytics = Boolean(item.track_analytics);
  const trackIntensity = Boolean(item.track_intensity);
  const tool_ids = coerceToolIds(item);
  const primary_group_ids = trackAnalytics ? coercePrimaryGroupIds(item) : [];
  const muscle_group_ids = trackAnalytics
    ? normalizeMuscleGroupIds(item.muscle_group_ids)
    : [];
  const tag_ids = trackAnalytics ? (item.analytics_tag_ids ?? []) : [];
  const { data: itemRow, error: itemError } = await supabase
    .from('log_items')
    .insert({
      log_block_id: logBlockId,
      item_order: itemOrder,
      kind: 'exercise',
      name: normalizeBrief(item.name),
      notes: item.notes?.trim() || null,
      ...itemDur,
      cluster_type: null,
      label_id: null,
      rounds: null,
      tool_id: primaryToolId(tool_ids),
      target_shape_id: item.target_shape_id || TARGET_SHAPE_IDS.reps,
      track_analytics: trackAnalytics,
      track_intensity: trackIntensity,
      primary_group_id: primaryPrimaryGroupId(primary_group_ids),
    })
    .select('id')
    .single();

  if (itemError || !itemRow) {
    return itemError?.message ?? 'Could not save exercise.';
  }

  const toolErr = await replaceLogItemTools(itemRow.id, tool_ids);
  if (toolErr) return toolErr;

  const pgErr = await replaceLogItemPrimaryGroups(itemRow.id, primary_group_ids);
  if (pgErr) return pgErr;

  const mgErr = await replaceLogItemMuscleGroups(itemRow.id, muscle_group_ids);
  if (mgErr) return mgErr;

  const tagErr = await replaceLogItemTags(itemRow.id, tag_ids);
  if (tagErr) return tagErr;

  const targets = item.targets.length
    ? sanitizeTargetsForShape(item.target_shape_id, item.targets)
    : buildTargets(1);
  const setRows = targets.map((t, i) =>
    targetToSetRow(t, i + 1, { log_item_id: itemRow.id }, trackIntensity),
  );
  return insertSets(setRows);
}

async function denestClusterItem(
  logBlockId: string,
  item: BlockClusterItem,
  itemOrder: number,
): Promise<string | null> {
  const itemDur = durationPair(item.track_duration, item.duration);
  const rounds = Math.max(1, item.rounds || 1);
  const clusterType = resolveClusterType(item);

  const { data: itemRow, error: itemError } = await supabase
    .from('log_items')
    .insert({
      log_block_id: logBlockId,
      item_order: itemOrder,
      kind: 'cluster',
      name: normalizeBrief(item.name),
      notes: item.notes?.trim() || null,
      ...itemDur,
      cluster_type: clusterType,
      label_id: item.label_id || CLUSTER_LABEL_NULL_ID,
      rounds,
      tool_id: null,
      target_shape_id: null,
      track_analytics: null,
      track_intensity: null,
      primary_group_id: null,
    })
    .select('id')
    .single();

  if (itemError || !itemRow) {
    return itemError?.message ?? 'Could not save sequence.';
  }

  const subIdByExerciseId = new Map<string, string>();
  const trackIntensityBySub = new Map<string, boolean>();

  for (let subOrder = 0; subOrder < item.items.length; subOrder += 1) {
    const ex = item.items[subOrder];
    const exDur = durationPair(ex.track_duration, ex.duration);
    const trackAnalytics = Boolean(ex.track_analytics);
    const trackIntensity = Boolean(ex.track_intensity);
    const tool_ids = coerceToolIds(ex);
    const primary_group_ids = trackAnalytics ? coercePrimaryGroupIds(ex) : [];
    const muscle_group_ids = trackAnalytics
      ? normalizeMuscleGroupIds(ex.muscle_group_ids)
      : [];
    const tag_ids = trackAnalytics ? (ex.analytics_tag_ids ?? []) : [];
    const { data: subRow, error: subError } = await supabase
      .from('log_sub_items')
      .insert({
        log_item_id: itemRow.id,
        sub_item_order: subOrder + 1,
        name: normalizeBrief(ex.name),
        notes: ex.notes?.trim() || null,
        tool_id: primaryToolId(tool_ids),
        target_shape_id: ex.target_shape_id || TARGET_SHAPE_IDS.reps,
        track_analytics: trackAnalytics,
        track_intensity: trackIntensity,
        primary_group_id: primaryPrimaryGroupId(primary_group_ids),
        ...exDur,
      })
      .select('id')
      .single();

    if (subError || !subRow) {
      return subError?.message ?? 'Could not save sequence exercise.';
    }
    const toolErr = await replaceLogSubItemTools(subRow.id, tool_ids);
    if (toolErr) return toolErr;
    const pgErr = await replaceLogSubItemPrimaryGroups(
      subRow.id,
      primary_group_ids,
    );
    if (pgErr) return pgErr;
    const mgErr = await replaceLogSubItemMuscleGroups(
      subRow.id,
      muscle_group_ids,
    );
    if (mgErr) return mgErr;
    const tagErr = await replaceLogSubItemTags(subRow.id, tag_ids);
    if (tagErr) return tagErr;
    subIdByExerciseId.set(ex.id, subRow.id);
    trackIntensityBySub.set(subRow.id, trackIntensity);
  }

  const performed = expandClusterPerformedSets({
    rounds,
    items: item.items.map((ex) => ({
      ...ex,
      targets: sanitizeTargetsForShape(
        ex.target_shape_id,
        ex.targets.length ? ex.targets : buildTargets(1),
      ),
    })),
    overrides: item.overrides ?? [],
  });

  const setCounters = new Map<string, number>();
  const setRows: ReturnType<typeof targetToSetRow>[] = [];

  for (const slot of performed) {
    const subId = subIdByExerciseId.get(slot.exercise_id);
    if (!subId) continue;
    const next = (setCounters.get(subId) ?? 0) + 1;
    setCounters.set(subId, next);
    setRows.push(
      targetToSetRow(
        slot.target,
        next,
        { log_sub_item_id: subId },
        trackIntensityBySub.get(subId) ?? false,
      ),
    );
  }

  return insertSets(setRows);
}

async function replaceLogChildren(
  sessionLogId: string,
  draft: SessionLogInput,
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from('log_blocks')
    .delete()
    .eq('session_log_id', sessionLogId);
  if (deleteError) return deleteError.message;

  for (let i = 0; i < draft.blocks.length; i += 1) {
    const err = await denestBlock(sessionLogId, draft.blocks[i], i + 1);
    if (err) return err;
  }
  return null;
}

export type SaveSessionLogArgs = {
  userId: string;
  logId?: string | null;
  draft: SessionLogInput;
};

export async function saveSessionLog(
  args: SaveSessionLogArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, logId, draft } = args;
  const validationError = await validateLogDraft(draft);
  if (validationError) return { id: null, error: validationError };

  const sessionDur = durationPair(draft.track_duration, draft.duration);
  const header = {
    user_id: userId,
    template_id: draft.template_id ?? null,
    name: normalizeBrief(draft.name),
    category_id: draft.category_id || UNCATEGORIZED_ID,
    session_date: draft.session_date,
    notes: draft.notes?.trim() || null,
    ...sessionDur,
    status: draft.status === 'draft' ? 'draft' : 'complete',
    updated_at: new Date().toISOString(),
  };

  let id = logId ?? null;

  if (id) {
    const { error } = await supabase
      .from('session_logs')
      .update(header)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { id: null, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('session_logs')
      .insert(header)
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    id = data.id;
  }

  if (!id) return { id: null, error: 'Could not save session log.' };

  const childError = await replaceLogChildren(id, {
    ...draft,
    blocks: draft.blocks.map((block) => ({
      ...block,
      kind: 'block' as const,
      name: block.name.trim(),
      label_id: block.label_id || GENERAL_BLOCK_LABEL_ID,
      label_name: block.label_name?.trim() || null,
      notes: block.notes?.trim() || null,
      items: block.items.map(prepareBlockItemForSave),
    })),
  });

  if (childError) {
    if (!logId) {
      await supabase.from('session_logs').delete().eq('id', id).eq('user_id', userId);
    }
    return { id: null, error: childError };
  }

  return { id, error: null };
}

function labelFromJoin(
  join: { name?: string } | { name?: string }[] | null | undefined,
): string | null {
  if (!join) return null;
  if (Array.isArray(join)) return typeof join[0]?.name === 'string' ? join[0].name : null;
  return typeof join.name === 'string' ? join.name : null;
}

function normalizeStatus(raw: unknown): SessionLogStatus {
  return raw === 'draft' ? 'draft' : 'complete';
}

function computeSameDayOrdinals(
  rows: { id: string; session_date: string; created_at: string }[],
): Map<string, number> {
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byDate.get(row.session_date) ?? [];
    list.push(row);
    byDate.set(row.session_date, list);
  }
  const ordinals = new Map<string, number>();
  for (const list of byDate.values()) {
    list
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((row, index) => {
        ordinals.set(row.id, index + 1);
      });
  }
  return ordinals;
}

export async function listSessionLogs(): Promise<{
  data: SessionLogListRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*, session_categories(name), log_blocks(id)')
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const raw = (data ?? []) as Record<string, unknown>[];
  const ordinals = computeSameDayOrdinals(
    raw.map((r) => ({
      id: r.id as string,
      session_date: r.session_date as string,
      created_at: r.created_at as string,
    })),
  );

  return {
    data: raw.map((r) => {
      const blocks = r.log_blocks as { id: string }[] | null;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        name: typeof r.name === 'string' ? r.name : null,
        category_id: (r.category_id as string) || UNCATEGORIZED_ID,
        label_name: labelFromJoin(
          r.session_categories as
            | { name?: string }
            | { name?: string }[]
            | null,
        ),
        session_date: r.session_date as string,
        status: normalizeStatus(r.status),
        template_id: (r.template_id as string | null) ?? null,
        notes: typeof r.notes === 'string' ? r.notes : null,
        track_duration: Boolean(r.track_duration),
        duration: typeof r.duration === 'string' ? r.duration : null,
        block_count: Array.isArray(blocks) ? blocks.length : 0,
        same_day_ordinal: ordinals.get(r.id as string) ?? 1,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      };
    }),
    error: null,
  };
}

export function formatLogListTitle(row: SessionLogListRow): string {
  return sessionLogTitle(
    row.label_name,
    row.name,
    formatSessionDateLabel(row.session_date),
    row.same_day_ordinal,
  );
}

async function fetchSetsForParents(args: {
  itemIds: string[];
  subItemIds: string[];
}): Promise<{
  byItem: Map<string, Record<string, unknown>[]>;
  bySub: Map<string, Record<string, unknown>[]>;
  error: string | null;
}> {
  const byItem = new Map<string, Record<string, unknown>[]>();
  const bySub = new Map<string, Record<string, unknown>[]>();

  if (args.itemIds.length) {
    const { data, error } = await supabase
      .from('log_sets')
      .select('*')
      .in('log_item_id', args.itemIds)
      .order('set_number', { ascending: true });
    if (error) return { byItem, bySub, error: error.message };
    for (const row of data ?? []) {
      const id = row.log_item_id as string;
      const list = byItem.get(id) ?? [];
      list.push(row as Record<string, unknown>);
      byItem.set(id, list);
    }
  }

  if (args.subItemIds.length) {
    const { data, error } = await supabase
      .from('log_sets')
      .select('*')
      .in('log_sub_item_id', args.subItemIds)
      .order('set_number', { ascending: true });
    if (error) return { byItem, bySub, error: error.message };
    for (const row of data ?? []) {
      const id = row.log_sub_item_id as string;
      const list = bySub.get(id) ?? [];
      list.push(row as Record<string, unknown>);
      bySub.set(id, list);
    }
  }

  return { byItem, bySub, error: null };
}

function renestExerciseFromRows(
  item: Record<string, unknown>,
  setRows: Record<string, unknown>[],
  toolIdsByItem: Map<string, string[]>,
  primaryGroupIdsByItem: Map<string, string[]>,
  muscleGroupIdsByItem: Map<string, string[]>,
  tagIdsByItem: Map<string, string[]>,
): BlockExerciseItem {
  const targets = setRows.length
    ? setRows.map((r, i) => setRowToTarget(r, i))
    : buildTargets(1);
  const base = defaultClusterExerciseItem();
  const tool_ids = coerceToolIds({
    tool_ids: toolIdsByItem.get(item.id as string),
    tool_id: (item.tool_id as string) || NO_TOOL_ID,
  });
  const primary_group_ids = coercePrimaryGroupIds({
    primary_group_ids: primaryGroupIdsByItem.get(item.id as string),
    primary_group_id:
      typeof item.primary_group_id === 'string' ? item.primary_group_id : null,
  });
  const muscle_group_ids = normalizeMuscleGroupIds(
    muscleGroupIdsByItem.get(item.id as string),
  );
  return {
    ...base,
    id: newClientId('ex'),
    name: typeof item.name === 'string' ? item.name : '',
    tool_ids,
    tool_id: primaryToolId(tool_ids),
    target_shape_id: (item.target_shape_id as string) || TARGET_SHAPE_IDS.reps,
    track_analytics: Boolean(item.track_analytics),
    track_intensity: Boolean(item.track_intensity),
    primary_group_ids,
    primary_group_id: primaryPrimaryGroupId(primary_group_ids),
    analytics_tag_ids: tagIdsByItem.get(item.id as string) ?? [],
    muscle_group_ids,
    targets,
    track_duration: Boolean(item.track_duration),
    duration: typeof item.duration === 'string' ? item.duration : null,
    notes: typeof item.notes === 'string' ? item.notes : null,
  };
}

function renestClusterFromRows(
  item: Record<string, unknown>,
  subItems: Record<string, unknown>[],
  setsBySub: Map<string, Record<string, unknown>[]>,
  toolIdsBySub: Map<string, string[]>,
  primaryGroupIdsBySub: Map<string, string[]>,
  muscleGroupIdsBySub: Map<string, string[]>,
  tagIdsBySub: Map<string, string[]>,
): BlockClusterItem {
  const storedRounds = Math.max(
    1,
    typeof item.rounds === 'number' ? item.rounds : 1,
  );

  // If any sub-item's sets don't divide evenly by rounds (skips), flatten
  // to a single-round card so re-save doesn't re-multiply performed work.
  const canCompact = subItems.every((sub) => {
    const setRows = setsBySub.get(sub.id as string) ?? [];
    return (
      storedRounds === 1 ||
      setRows.length === 0 ||
      setRows.length % storedRounds === 0
    );
  });
  const rounds = canCompact ? storedRounds : 1;

  const exercises: ClusterExerciseItem[] = subItems.map((sub) => {
    const setRows = setsBySub.get(sub.id as string) ?? [];
    let targets: ExerciseTarget[];

    if (rounds > 1 && setRows.length > 0 && setRows.length % rounds === 0) {
      const perRound = setRows.length / rounds;
      targets = setRows.slice(0, perRound).map((r, i) => setRowToTarget(r, i));
    } else {
      targets = setRows.length
        ? setRows.map((r, i) => setRowToTarget(r, i))
        : buildTargets(1);
    }

    const base = defaultClusterExerciseItem();
    const tool_ids = coerceToolIds({
      tool_ids: toolIdsBySub.get(sub.id as string),
      tool_id: (sub.tool_id as string) || NO_TOOL_ID,
    });
    const primary_group_ids = coercePrimaryGroupIds({
      primary_group_ids: primaryGroupIdsBySub.get(sub.id as string),
      primary_group_id:
        typeof sub.primary_group_id === 'string' ? sub.primary_group_id : null,
    });
    const muscle_group_ids = normalizeMuscleGroupIds(
      muscleGroupIdsBySub.get(sub.id as string),
    );
    return {
      ...base,
      id: newClientId('ex'),
      name: typeof sub.name === 'string' ? sub.name : '',
      tool_ids,
      tool_id: primaryToolId(tool_ids),
      target_shape_id:
        (sub.target_shape_id as string) || TARGET_SHAPE_IDS.reps,
      track_analytics: Boolean(sub.track_analytics),
      track_intensity: Boolean(sub.track_intensity),
      primary_group_ids,
      primary_group_id: primaryPrimaryGroupId(primary_group_ids),
      analytics_tag_ids: tagIdsBySub.get(sub.id as string) ?? [],
      muscle_group_ids,
      targets,
      track_duration: Boolean(sub.track_duration),
      duration: typeof sub.duration === 'string' ? sub.duration : null,
      notes: typeof sub.notes === 'string' ? sub.notes : null,
    };
  });

  const clusterType: ClusterType =
    item.cluster_type === 'circuit' ? 'circuit' : 'superset';
  const joinedLabel = labelFromJoin(
    item.cluster_labels as { name?: string } | { name?: string }[] | null,
  );

  return {
    kind: 'cluster',
    id: newClientId('cl'),
    name: typeof item.name === 'string' ? item.name : '',
    label_id: (item.label_id as string) || CLUSTER_LABEL_NULL_ID,
    label_name:
      joinedLabel ??
      (clusterType === 'circuit' ? 'Circuit' : 'Sequence'),
    cluster_type: clusterType,
    notes: typeof item.notes === 'string' ? item.notes : null,
    track_duration: Boolean(item.track_duration),
    duration: typeof item.duration === 'string' ? item.duration : null,
    rounds,
    items: exercises.length ? exercises : [defaultClusterExerciseItem()],
    overrides: [],
  };
}

export async function getSessionLog(
  id: string,
): Promise<{ data: SessionLogDetail | null; error: string | null }> {
  const { data: header, error: headerError } = await supabase
    .from('session_logs')
    .select('*, session_categories(name)')
    .eq('id', id)
    .maybeSingle();

  if (headerError) return { data: null, error: headerError.message };
  if (!header) return { data: null, error: 'Session log not found.' };

  const { data: blocks, error: blocksError } = await supabase
    .from('log_blocks')
    .select('*, block_labels(name)')
    .eq('session_log_id', id)
    .order('block_order', { ascending: true });

  if (blocksError) return { data: null, error: blocksError.message };

  const blockRows = (blocks ?? []) as Record<string, unknown>[];
  const blockIds = blockRows.map((b) => b.id as string);

  let itemRows: Record<string, unknown>[] = [];
  if (blockIds.length) {
    const { data: items, error: itemsError } = await supabase
      .from('log_items')
      .select('*, cluster_labels(name)')
      .in('log_block_id', blockIds)
      .order('item_order', { ascending: true });
    if (itemsError) return { data: null, error: itemsError.message };
    itemRows = (items ?? []) as Record<string, unknown>[];
  }

  const clusterItemIds = itemRows
    .filter((i) => i.kind === 'cluster')
    .map((i) => i.id as string);

  let subRows: Record<string, unknown>[] = [];
  if (clusterItemIds.length) {
    const { data: subs, error: subsError } = await supabase
      .from('log_sub_items')
      .select('*')
      .in('log_item_id', clusterItemIds)
      .order('sub_item_order', { ascending: true });
    if (subsError) return { data: null, error: subsError.message };
    subRows = (subs ?? []) as Record<string, unknown>[];
  }

  const exerciseItemIds = itemRows
    .filter((i) => i.kind === 'exercise')
    .map((i) => i.id as string);
  const subIds = subRows.map((s) => s.id as string);

  const { byItem, bySub, error: setsError } = await fetchSetsForParents({
    itemIds: exerciseItemIds,
    subItemIds: subIds,
  });
  if (setsError) return { data: null, error: setsError };

  const toolIdsByItem = new Map<string, string[]>();
  if (exerciseItemIds.length) {
    const { data: itemTools, error: itemToolsError } = await supabase
      .from('log_item_tools')
      .select('log_item_id, tool_id, sort_order')
      .in('log_item_id', exerciseItemIds)
      .order('sort_order', { ascending: true });
    if (itemToolsError) return { data: null, error: itemToolsError.message };
    for (const row of itemTools ?? []) {
      const id = row.log_item_id as string;
      const list = toolIdsByItem.get(id) ?? [];
      list.push(row.tool_id as string);
      toolIdsByItem.set(id, list);
    }
  }

  const toolIdsBySub = new Map<string, string[]>();
  if (subIds.length) {
    const { data: subTools, error: subToolsError } = await supabase
      .from('log_sub_item_tools')
      .select('log_sub_item_id, tool_id, sort_order')
      .in('log_sub_item_id', subIds)
      .order('sort_order', { ascending: true });
    if (subToolsError) return { data: null, error: subToolsError.message };
    for (const row of subTools ?? []) {
      const id = row.log_sub_item_id as string;
      const list = toolIdsBySub.get(id) ?? [];
      list.push(row.tool_id as string);
      toolIdsBySub.set(id, list);
    }
  }

  const primaryGroupIdsByItem = new Map<string, string[]>();
  if (exerciseItemIds.length) {
    const { data: itemGroups, error: itemGroupsError } = await supabase
      .from('log_item_primary_group_links')
      .select('log_item_id, primary_group_id, sort_order')
      .in('log_item_id', exerciseItemIds)
      .order('sort_order', { ascending: true });
    if (itemGroupsError) return { data: null, error: itemGroupsError.message };
    for (const row of itemGroups ?? []) {
      const id = row.log_item_id as string;
      const list = primaryGroupIdsByItem.get(id) ?? [];
      list.push(row.primary_group_id as string);
      primaryGroupIdsByItem.set(id, list);
    }
  }

  const primaryGroupIdsBySub = new Map<string, string[]>();
  if (subIds.length) {
    const { data: subGroups, error: subGroupsError } = await supabase
      .from('log_sub_item_primary_group_links')
      .select('log_sub_item_id, primary_group_id, sort_order')
      .in('log_sub_item_id', subIds)
      .order('sort_order', { ascending: true });
    if (subGroupsError) return { data: null, error: subGroupsError.message };
    for (const row of subGroups ?? []) {
      const id = row.log_sub_item_id as string;
      const list = primaryGroupIdsBySub.get(id) ?? [];
      list.push(row.primary_group_id as string);
      primaryGroupIdsBySub.set(id, list);
    }
  }

  const muscleGroupIdsByItem = new Map<string, string[]>();
  if (exerciseItemIds.length) {
    const { data: itemMuscleGroups, error: itemMuscleGroupsError } =
      await supabase
        .from('log_item_muscle_group_links')
        .select('log_item_id, muscle_group_id, sort_order')
        .in('log_item_id', exerciseItemIds)
        .order('sort_order', { ascending: true });
    if (itemMuscleGroupsError) {
      return { data: null, error: itemMuscleGroupsError.message };
    }
    for (const row of itemMuscleGroups ?? []) {
      const id = row.log_item_id as string;
      const list = muscleGroupIdsByItem.get(id) ?? [];
      list.push(row.muscle_group_id as string);
      muscleGroupIdsByItem.set(id, list);
    }
  }

  const muscleGroupIdsBySub = new Map<string, string[]>();
  if (subIds.length) {
    const { data: subMuscleGroups, error: subMuscleGroupsError } =
      await supabase
        .from('log_sub_item_muscle_group_links')
        .select('log_sub_item_id, muscle_group_id, sort_order')
        .in('log_sub_item_id', subIds)
        .order('sort_order', { ascending: true });
    if (subMuscleGroupsError) {
      return { data: null, error: subMuscleGroupsError.message };
    }
    for (const row of subMuscleGroups ?? []) {
      const id = row.log_sub_item_id as string;
      const list = muscleGroupIdsBySub.get(id) ?? [];
      list.push(row.muscle_group_id as string);
      muscleGroupIdsBySub.set(id, list);
    }
  }

  const tagIdsByItem = new Map<string, string[]>();
  if (exerciseItemIds.length) {
    const { data: itemTags, error: itemTagsError } = await supabase
      .from('log_item_tag_links')
      .select('log_item_id, tag_id, sort_order')
      .in('log_item_id', exerciseItemIds)
      .order('sort_order', { ascending: true });
    if (itemTagsError) return { data: null, error: itemTagsError.message };
    for (const row of itemTags ?? []) {
      const id = row.log_item_id as string;
      const list = tagIdsByItem.get(id) ?? [];
      list.push(row.tag_id as string);
      tagIdsByItem.set(id, list);
    }
  }

  const tagIdsBySub = new Map<string, string[]>();
  if (subIds.length) {
    const { data: subTags, error: subTagsError } = await supabase
      .from('log_sub_item_tag_links')
      .select('log_sub_item_id, tag_id, sort_order')
      .in('log_sub_item_id', subIds)
      .order('sort_order', { ascending: true });
    if (subTagsError) return { data: null, error: subTagsError.message };
    for (const row of subTags ?? []) {
      const id = row.log_sub_item_id as string;
      const list = tagIdsBySub.get(id) ?? [];
      list.push(row.tag_id as string);
      tagIdsBySub.set(id, list);
    }
  }

  const itemsByBlock = new Map<string, Record<string, unknown>[]>();
  for (const item of itemRows) {
    const bid = item.log_block_id as string;
    const list = itemsByBlock.get(bid) ?? [];
    list.push(item);
    itemsByBlock.set(bid, list);
  }

  const subsByItem = new Map<string, Record<string, unknown>[]>();
  for (const sub of subRows) {
    const iid = sub.log_item_id as string;
    const list = subsByItem.get(iid) ?? [];
    list.push(sub);
    subsByItem.set(iid, list);
  }

  const renestedBlocks: SessionBlockItem[] = blockRows.map((block) => {
    const nested = (itemsByBlock.get(block.id as string) ?? []).map(
      (item): BlockItem => {
        if (item.kind === 'cluster') {
          return renestClusterFromRows(
            item,
            subsByItem.get(item.id as string) ?? [],
            bySub,
            toolIdsBySub,
            primaryGroupIdsBySub,
            muscleGroupIdsBySub,
            tagIdsBySub,
          );
        }
        return renestExerciseFromRows(
          item,
          byItem.get(item.id as string) ?? [],
          toolIdsByItem,
          primaryGroupIdsByItem,
          muscleGroupIdsByItem,
          tagIdsByItem,
        );
      },
    );

    return {
      kind: 'block',
      id: newClientId('bl'),
      name: typeof block.name === 'string' ? block.name : '',
      label_id: (block.label_id as string) || GENERAL_BLOCK_LABEL_ID,
      label_name:
        labelFromJoin(
          block.block_labels as
            | { name?: string }
            | { name?: string }[]
            | null,
        ) ?? 'Block',
      notes: typeof block.notes === 'string' ? block.notes : null,
      track_duration: Boolean(block.track_duration),
      duration: typeof block.duration === 'string' ? block.duration : null,
      items: nested.length ? nested : [defaultBlockExerciseItem()],
    };
  });

  const { data: sameDay } = await supabase
    .from('session_logs')
    .select('id, created_at')
    .eq('session_date', header.session_date as string)
    .eq('user_id', header.user_id as string)
    .order('created_at', { ascending: true });

  const sameDayList = (sameDay ?? []) as { id: string; created_at: string }[];
  const ordinalIndex = sameDayList.findIndex((r) => r.id === id);
  const ordinal = ordinalIndex >= 0 ? ordinalIndex + 1 : 1;

  const categoryId = (header.category_id as string) || UNCATEGORIZED_ID;
  const emptyLabel = await isEmptySessionLabel(categoryId);

  const detail: SessionLogDetail = {
    id: header.id as string,
    user_id: header.user_id as string,
    name: typeof header.name === 'string' ? header.name : null,
    category_id: categoryId,
    label_name: labelFromJoin(
      header.session_categories as
        | { name?: string }
        | { name?: string }[]
        | null,
    ),
    session_date: header.session_date as string,
    status: normalizeStatus(header.status),
    template_id: (header.template_id as string | null) ?? null,
    notes: typeof header.notes === 'string' ? header.notes : null,
    track_duration: Boolean(header.track_duration),
    duration: typeof header.duration === 'string' ? header.duration : null,
    block_count: renestedBlocks.length,
    same_day_ordinal: ordinal,
    created_at: header.created_at as string,
    updated_at: header.updated_at as string,
    blocks:
      renestedBlocks.length > 0
        ? renestedBlocks
        : emptyLabel
          ? []
          : [defaultSessionBlockItem()],
  };

  return { data: detail, error: null };
}

export async function deleteSessionLog(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('session_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
