import { supabase } from './supabase';
import type {
  ExerciseTarget,
  ExerciseTemplateInput,
  ExerciseTemplateRow,
  ExerciseTemplateWithTags,
} from '../types/exerciseTemplate';
import { TARGET_SHAPE_IDS } from '../constants/lockedAtoms';
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

export function defaultExerciseDraft(): ExerciseTemplateInput {
  return {
    name: '',
    tool_id: NO_TOOL_ID,
    target_shape_id: TARGET_SHAPE_IDS.reps,
    track_analytics: false,
    primary_group_id: null,
    analytics_tag_ids: [],
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

  let primary_group_name: string | null = null;
  if (template.primary_group_id) {
    const { data: group, error: groupError } = await supabase
      .from('analytics_primary_groups')
      .select('name')
      .eq('id', template.primary_group_id)
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

  return {
    data: {
      ...template,
      default_target_shape: Array.isArray(template.default_target_shape)
        ? template.default_target_shape
        : [],
      analytics_tag_ids,
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
  const name = draft.name.trim();
  if (!name) return { id: null, error: 'Name is required.' };

  // Enforce unique active template names per user (case-insensitive).
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

  let primary_group_id: string | null = null;
  let tagIds: string[] = [];

  if (draft.track_analytics) {
    if (!draft.primary_group_id) {
      return { id: null, error: 'Primary analytics group is required.' };
    }
    primary_group_id = draft.primary_group_id;
    tagIds = draft.analytics_tag_ids ?? [];
  }

  const payload = {
    user_id: userId,
    name,
    tool_id: draft.tool_id,
    target_shape_id: draft.target_shape_id,
    track_analytics: draft.track_analytics,
    primary_group_id,
    default_target_shape: sanitizeTargetsForShape(
      draft.target_shape_id,
      draft.default_target_shape,
    ),
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

  const links = await replaceTagLinks(id, tagIds);
  if (links.error) return { id: null, error: links.error };

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
