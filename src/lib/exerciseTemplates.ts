import { supabase } from './supabase';
import type {
  ExerciseTarget,
  ExerciseTemplateInput,
  ExerciseTemplateRow,
  ExerciseTemplateWithTags,
} from '../types/exerciseTemplate';
import { TARGET_SHAPE_IDS } from '../constants/lockedAtoms';
import { DEFAULT_SET_TYPE } from '../constants/setTypes';
import { fieldsForTargetShape } from '../constants/targetShapeFields';
import { NO_TOOL_ID } from '../constants/sentinelIds';

export function emptyTarget(set: number): ExerciseTarget {
  return {
    set,
    reps: null,
    is_per_side: false,
    time_duration: null,
    distance_value: null,
    distance_unit: 'mi',
    load_value: null,
    load_unit: 'BW',
    track_analytics: null,
    set_type: DEFAULT_SET_TYPE,
    intensity: null,
  };
}

export function buildTargets(count: number, existing: ExerciseTarget[] = []): ExerciseTarget[] {
  const next: ExerciseTarget[] = [];
  for (let i = 0; i < count; i += 1) {
    const prev = existing[i];
    next.push(prev ? { ...prev, set: i + 1 } : emptyTarget(i + 1));
  }
  return next;
}

/**
 * Keep metrics that the new shape still uses; clear the rest.
 * e.g. Time → Time & Distance keeps time; Reps → Time clears reps.
 * Zero duration / distance are normalized to null (unset).
 */
export function migrateTargetsForShapeChange(
  newShapeId: string,
  targets: ExerciseTarget[],
): ExerciseTarget[] {
  return sanitizeTargetsForShape(newShapeId, targets);
}

function normalizeTimeDuration(value: string | null): string | null {
  if (!value || value === '00:00:00') return null;
  return value;
}

function normalizeDistanceValue(value: number | null): number | null {
  if (value == null || value === 0) return null;
  return value;
}

/**
 * Zero out metric fields that the current shape does not use.
 * Used on save and when migrating after a shape change.
 */
export function sanitizeTargetsForShape(
  targetShapeId: string,
  targets: ExerciseTarget[],
): ExerciseTarget[] {
  const fields = new Set(fieldsForTargetShape(targetShapeId));
  return targets.map((t) => {
    const next = emptyTarget(t.set);
    next.track_analytics = t.track_analytics;
    next.set_type = t.set_type ?? DEFAULT_SET_TYPE;
    next.intensity = t.intensity ?? null;
    if (fields.has('reps')) next.reps = t.reps;
    if (fields.has('is_per_side')) next.is_per_side = t.is_per_side;
    if (fields.has('time_duration')) {
      next.time_duration = normalizeTimeDuration(t.time_duration);
    }
    if (fields.has('distance_value')) {
      next.distance_value = normalizeDistanceValue(t.distance_value);
    }
    if (fields.has('distance_unit')) next.distance_unit = t.distance_unit;
    if (fields.has('load_unit')) next.load_unit = t.load_unit;
    if (fields.has('load_value')) {
      next.load_value =
        next.load_unit === 'BW' ? null : t.load_value;
    }
    return next;
  });
}

/**
 * Exclusive No Tool: any real tool clears it; empty / only No Tool → `[NO_TOOL_ID]`.
 * Dedupes while preserving order. Always returns ≥1 id.
 */
export function normalizeToolIds(ids: string[] | null | undefined): string[] {
  const raw = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  const withoutNoTool = deduped.filter((id) => id !== NO_TOOL_ID);
  if (withoutNoTool.length === 0) return [NO_TOOL_ID];
  return withoutNoTool;
}

export function primaryToolId(ids: string[] | null | undefined): string {
  return normalizeToolIds(ids)[0];
}

/** Prefer tool_ids[]; else wrap singular tool_id; else No Tool. */
export function coerceToolIds(args: {
  tool_ids?: string[] | null;
  tool_id?: string | null;
}): string[] {
  if (Array.isArray(args.tool_ids) && args.tool_ids.length > 0) {
    return normalizeToolIds(args.tool_ids);
  }
  if (args.tool_id) return normalizeToolIds([args.tool_id]);
  return [NO_TOOL_ID];
}

/** Dedupe primary group ids while preserving order. */
export function normalizePrimaryGroupIds(
  ids: string[] | null | undefined,
): string[] {
  const raw = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

/** Dedupe muscle group ids while preserving order. */
export function normalizeMuscleGroupIds(
  ids: string[] | null | undefined,
): string[] {
  const raw = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

/** First primary group, or null when empty. */
export function primaryPrimaryGroupId(
  ids: string[] | null | undefined,
): string | null {
  return normalizePrimaryGroupIds(ids)[0] ?? null;
}

/** Prefer primary_group_ids[]; else wrap singular primary_group_id. */
export function coercePrimaryGroupIds(args: {
  primary_group_ids?: string[] | null;
  primary_group_id?: string | null;
}): string[] {
  if (
    Array.isArray(args.primary_group_ids) &&
    args.primary_group_ids.length > 0
  ) {
    return normalizePrimaryGroupIds(args.primary_group_ids);
  }
  if (args.primary_group_id) {
    return normalizePrimaryGroupIds([args.primary_group_id]);
  }
  return [];
}

export function defaultExerciseDraft(): ExerciseTemplateInput {
  return {
    name: '',
    tool_ids: [NO_TOOL_ID],
    target_shape_id: TARGET_SHAPE_IDS.reps,
    track_analytics: false,
    track_intensity: false,
    primary_group_ids: [],
    primary_group_id: null,
    analytics_tag_ids: [],
    muscle_group_ids: [],
    default_target_shape: buildTargets(1),
    track_duration: false,
    duration: null,
    notes: null,
  };
}

async function replaceTagLinks(
  templateId: string,
  tagIds: string[],
): Promise<{ error: string | null }> {
  const { error: delError } = await supabase
    .from('analytics_tag_links')
    .delete()
    .eq('exercise_template_id', templateId);

  if (delError) return { error: delError.message };
  if (tagIds.length === 0) return { error: null };

  const { error } = await supabase.from('analytics_tag_links').insert(
    tagIds.map((tag_id) => ({
      exercise_template_id: templateId,
      tag_id,
    })),
  );

  return { error: error?.message ?? null };
}

async function replaceToolLinks(
  templateId: string,
  toolIds: string[],
): Promise<{ error: string | null }> {
  const ids = normalizeToolIds(toolIds);
  const { error: delError } = await supabase
    .from('exercise_template_tool_links')
    .delete()
    .eq('exercise_template_id', templateId);

  if (delError) return { error: delError.message };

  const { error } = await supabase.from('exercise_template_tool_links').insert(
    ids.map((tool_id, sort_order) => ({
      exercise_template_id: templateId,
      tool_id,
      sort_order,
    })),
  );

  return { error: error?.message ?? null };
}

async function replacePrimaryGroupLinks(
  templateId: string,
  groupIds: string[],
): Promise<{ error: string | null }> {
  const ids = normalizePrimaryGroupIds(groupIds);
  const { error: delError } = await supabase
    .from('exercise_template_primary_group_links')
    .delete()
    .eq('exercise_template_id', templateId);

  if (delError) return { error: delError.message };
  if (ids.length === 0) return { error: null };

  const { error } = await supabase
    .from('exercise_template_primary_group_links')
    .insert(
      ids.map((primary_group_id, sort_order) => ({
        exercise_template_id: templateId,
        primary_group_id,
        sort_order,
      })),
    );

  return { error: error?.message ?? null };
}

async function replaceMuscleGroupLinks(
  templateId: string,
  muscleGroupIds: string[],
): Promise<{ error: string | null }> {
  const ids = normalizeMuscleGroupIds(muscleGroupIds);
  const { error: delError } = await supabase
    .from('exercise_template_muscle_group_links')
    .delete()
    .eq('exercise_template_id', templateId);

  if (delError) return { error: delError.message };
  if (ids.length === 0) return { error: null };

  const { error } = await supabase
    .from('exercise_template_muscle_group_links')
    .insert(
      ids.map((muscle_group_id, sort_order) => ({
        exercise_template_id: templateId,
        muscle_group_id,
        sort_order,
      })),
    );

  return { error: error?.message ?? null };
}

export async function listExerciseTemplates(): Promise<{
  data: ExerciseTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('exercise_templates')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ExerciseTemplateRow[], error: null };
}

export async function getExerciseTemplate(
  id: string,
): Promise<{ data: ExerciseTemplateWithTags | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('exercise_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: 'Template not found.' };

  const template = row as ExerciseTemplateRow;

  const { data: links, error: linkError } = await supabase
    .from('analytics_tag_links')
    .select('tag_id, analytics_tags ( name )')
    .eq('exercise_template_id', id);

  if (linkError) return { data: null, error: linkError.message };

  const { data: toolLinks, error: toolLinkError } = await supabase
    .from('exercise_template_tool_links')
    .select('tool_id, sort_order, tools ( name, is_system_default )')
    .eq('exercise_template_id', id)
    .order('sort_order', { ascending: true });

  if (toolLinkError) return { data: null, error: toolLinkError.message };

  const { data: pgLinks, error: pgLinkError } = await supabase
    .from('exercise_template_primary_group_links')
    .select('primary_group_id, sort_order')
    .eq('exercise_template_id', id)
    .order('sort_order', { ascending: true });

  if (pgLinkError) return { data: null, error: pgLinkError.message };

  const { data: mgLinks, error: mgLinkError } = await supabase
    .from('exercise_template_muscle_group_links')
    .select('muscle_group_id, sort_order')
    .eq('exercise_template_id', id)
    .order('sort_order', { ascending: true });

  if (mgLinkError) return { data: null, error: mgLinkError.message };

  const muscle_group_ids = normalizeMuscleGroupIds(
    (mgLinks ?? []).map((l) => l.muscle_group_id as string),
  );

  const primary_group_ids = coercePrimaryGroupIds({
    primary_group_ids: (pgLinks ?? []).map((l) => l.primary_group_id as string),
    primary_group_id: template.primary_group_id,
  });

  let primary_group_name: string | null = null;
  const primaryId = primaryPrimaryGroupId(primary_group_ids);
  if (primaryId) {
    const { data: group, error: groupError } = await supabase
      .from('analytics_primary_groups')
      .select('name')
      .eq('id', primaryId)
      .maybeSingle();
    if (groupError) return { data: null, error: groupError.message };
    primary_group_name = group?.name ?? null;
  }

  const analytics_tag_ids = (links ?? []).map((l) => l.tag_id as string);
  const tag_names = (links ?? [])
    .map((l) => {
      const tag = l.analytics_tags as { name: string } | { name: string }[] | null;
      if (!tag) return null;
      if (Array.isArray(tag)) return tag[0]?.name ?? null;
      return tag.name;
    })
    .filter((n): n is string => Boolean(n));

  const linkedToolIds = (toolLinks ?? []).map((l) => l.tool_id as string);
  const tool_ids = coerceToolIds({
    tool_ids: linkedToolIds,
    tool_id: template.tool_id,
  });
  const tool_names = (toolLinks ?? [])
    .map((l) => {
      const tool = l.tools as
        | { name: string; is_system_default?: boolean }
        | { name: string; is_system_default?: boolean }[]
        | null;
      if (!tool) return null;
      const row = Array.isArray(tool) ? tool[0] : tool;
      if (!row?.name) return null;
      if (l.tool_id === NO_TOOL_ID || row.is_system_default) return 'None';
      return row.name;
    })
    .filter((n): n is string => Boolean(n));

  return {
    data: {
      ...template,
      tool_id: primaryToolId(tool_ids),
      track_intensity: Boolean(template.track_intensity),
      default_target_shape: Array.isArray(template.default_target_shape)
        ? template.default_target_shape
        : [],
      tool_ids,
      tool_names:
        tool_names.length > 0
          ? tool_names
          : tool_ids.map((tid) => (tid === NO_TOOL_ID ? 'None' : tid)),
      primary_group_ids,
      primary_group_id: primaryId,
      analytics_tag_ids,
      muscle_group_ids,
      primary_group_name,
      tag_names,
    },
    error: null,
  };
}

export type SaveExerciseArgs = {
  userId: string;
  templateId?: string | null;
  draft: ExerciseTemplateInput;
};

export async function saveExerciseTemplate(
  args: SaveExerciseArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, templateId, draft } = args;
  const trimmed = draft.name.trim();
  const name = trimmed.length > 0 ? trimmed : null;

  // Unique only among custom nonblank names.
  if (name) {
    let dupeQuery = supabase
      .from('exercise_templates')
      .select('id')
      .eq('user_id', userId)
      .is('archived_at', null)
      .ilike('name', name);
    if (templateId) dupeQuery = dupeQuery.neq('id', templateId);

    const { data: dupes, error: dupeError } = await dupeQuery.limit(1);
    if (dupeError) return { id: null, error: dupeError.message };
    if (dupes && dupes.length > 0) {
      return {
        id: null,
        error: `An exercise template named “${name}” already exists.`,
      };
    }
  }

  let primary_group_ids: string[] = [];
  let primary_group_id: string | null = null;
  let tagIds: string[] = [];
  let muscleGroupIds: string[] = [];

  if (draft.track_analytics) {
    primary_group_ids = coercePrimaryGroupIds({
      primary_group_ids: draft.primary_group_ids,
      primary_group_id: draft.primary_group_id,
    });
    if (primary_group_ids.length === 0) {
      return { id: null, error: 'Primary analytics group is required.' };
    }
    primary_group_id = primaryPrimaryGroupId(primary_group_ids);
    tagIds = draft.analytics_tag_ids ?? [];
    muscleGroupIds = normalizeMuscleGroupIds(draft.muscle_group_ids);
  }

  const tool_ids = normalizeToolIds(draft.tool_ids);
  const payload = {
    user_id: userId,
    name,
    tool_id: primaryToolId(tool_ids),
    target_shape_id: draft.target_shape_id,
    track_analytics: draft.track_analytics,
    track_intensity: Boolean(draft.track_intensity),
    primary_group_id,
    default_target_shape: sanitizeTargetsForShape(
      draft.target_shape_id,
      draft.default_target_shape,
    ).map((t) => ({
      ...t,
      intensity: draft.track_intensity ? t.intensity ?? null : null,
    })),
    track_duration: draft.track_duration,
    duration: draft.track_duration ? draft.duration : null,
    notes: draft.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let id = templateId ?? null;

  if (id) {
    const { error } = await supabase
      .from('exercise_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { id: null, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('exercise_templates')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    id = data.id;
  }

  if (!id) return { id: null, error: 'Save failed.' };

  const toolLinks = await replaceToolLinks(id, tool_ids);
  if (toolLinks.error) return { id: null, error: toolLinks.error };

  const pgLinks = await replacePrimaryGroupLinks(id, primary_group_ids);
  if (pgLinks.error) return { id: null, error: pgLinks.error };

  const links = await replaceTagLinks(id, tagIds);
  if (links.error) return { id: null, error: links.error };

  const mgLinks = await replaceMuscleGroupLinks(id, muscleGroupIds);
  if (mgLinks.error) return { id: null, error: mgLinks.error };

  return { id, error: null };
}

/** Permanently remove an exercise template (tag links cascade). */
export async function deleteExerciseTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('exercise_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
