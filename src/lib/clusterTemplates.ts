import { supabase } from './supabase';
import {
  buildTargets,
  defaultExerciseDraft,
} from './exerciseTemplates';
import type { ExerciseTemplateInput } from '../types/exerciseTemplate';
import type {
  ClusterContent,
  ClusterExerciseItem,
  ClusterTemplateInput,
  ClusterTemplateRow,
  ClusterType,
} from '../types/clusterTemplate';

function newItemId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function exerciseDraftToClusterItem(
  draft: ExerciseTemplateInput,
  id?: string,
): ClusterExerciseItem {
  return {
    kind: 'exercise',
    id: id ?? newItemId(),
    name: draft.name,
    tool_id: draft.tool_id,
    target_shape_id: draft.target_shape_id,
    track_analytics: draft.track_analytics,
    primary_group_id: draft.primary_group_id,
    analytics_tag_ids: draft.analytics_tag_ids ?? [],
    targets: draft.default_target_shape,
    track_duration: draft.track_duration,
    duration: draft.duration,
    notes: draft.notes,
  };
}

export function clusterItemToExerciseDraft(
  item: ClusterExerciseItem,
): ExerciseTemplateInput {
  const targets = Array.isArray(item.targets) ? item.targets : [];
  return {
    name: item.name ?? '',
    tool_id: item.tool_id,
    target_shape_id: item.target_shape_id,
    track_analytics: Boolean(item.track_analytics),
    primary_group_id: item.primary_group_id ?? null,
    analytics_tag_ids: item.analytics_tag_ids ?? [],
    default_target_shape: targets.length ? targets : buildTargets(1),
    track_duration: Boolean(item.track_duration),
    duration: item.duration ?? null,
    notes: item.notes ?? null,
  };
}

export function defaultClusterExerciseItem(): ClusterExerciseItem {
  return exerciseDraftToClusterItem(defaultExerciseDraft());
}

export function defaultClusterDraft(): ClusterTemplateInput {
  return {
    name: '',
    cluster_type: 'superset',
    notes: null,
    track_duration: false,
    duration: null,
    items: [defaultClusterExerciseItem()],
  };
}

function normalizeContent(raw: unknown): ClusterContent {
  const empty: ClusterContent = {
    notes: null,
    track_duration: false,
    duration: null,
    items: [],
  };
  if (!raw || typeof raw !== 'object') return empty;
  const c = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(c.items) ? c.items : [];
  const items: ClusterExerciseItem[] = itemsRaw.map((row, index) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const targets = Array.isArray(r.targets) ? r.targets : [];
    return {
      kind: 'exercise',
      id:
        typeof r.id === 'string' && r.id
          ? r.id
          : `ex_migrated_${index}_${newItemId()}`,
      name: typeof r.name === 'string' ? r.name : '',
      tool_id: typeof r.tool_id === 'string' ? r.tool_id : '',
      target_shape_id:
        typeof r.target_shape_id === 'string' ? r.target_shape_id : '',
      track_analytics: Boolean(r.track_analytics),
      primary_group_id:
        typeof r.primary_group_id === 'string' ? r.primary_group_id : null,
      analytics_tag_ids: Array.isArray(r.analytics_tag_ids)
        ? (r.analytics_tag_ids as string[])
        : [],
      targets: targets.length ? (targets as ClusterExerciseItem['targets']) : buildTargets(1),
      track_duration: Boolean(r.track_duration),
      duration: typeof r.duration === 'string' ? r.duration : null,
      notes: typeof r.notes === 'string' ? r.notes : null,
    };
  });

  const track_duration = Boolean(c.track_duration);
  return {
    notes: typeof c.notes === 'string' ? c.notes : null,
    track_duration,
    duration: track_duration
      ? typeof c.duration === 'string'
        ? c.duration
        : '00:00:00'
      : null,
    items,
  };
}

function rowFromDb(row: Record<string, unknown>): ClusterTemplateRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    cluster_type: row.cluster_type as ClusterType,
    content: normalizeContent(row.content),
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listClusterTemplates(): Promise<{
  data: ClusterTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('cluster_templates')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((r) => rowFromDb(r as Record<string, unknown>)),
    error: null,
  };
}

export async function getClusterTemplate(
  id: string,
): Promise<{ data: ClusterTemplateRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('cluster_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: 'Template not found.' };
  return { data: rowFromDb(row as Record<string, unknown>), error: null };
}

export type SaveClusterArgs = {
  userId: string;
  templateId?: string | null;
  draft: ClusterTemplateInput;
};

function validateDraft(draft: ClusterTemplateInput): string | null {
  const name = draft.name.trim();
  if (!name) return 'Name is required.';
  if (draft.cluster_type !== 'superset' && draft.cluster_type !== 'circuit') {
    return 'Cluster type must be Superset or Circuit.';
  }
  if (draft.items.length === 0) {
    return 'Add at least one exercise.';
  }
  for (let i = 0; i < draft.items.length; i += 1) {
    const item = draft.items[i];
    if (!item.name.trim()) {
      return `Exercise ${i + 1} needs a name.`;
    }
    if (item.track_analytics && !item.primary_group_id) {
      return `Exercise “${item.name.trim()}” needs a primary analytics group.`;
    }
  }
  return null;
}

export async function saveClusterTemplate(
  args: SaveClusterArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, templateId, draft } = args;
  const validationError = validateDraft(draft);
  if (validationError) return { id: null, error: validationError };

  const name = draft.name.trim();

  let dupeQuery = supabase
    .from('cluster_templates')
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
      error: `A cluster template named “${name}” already exists.`,
    };
  }

  const track_duration = draft.track_duration;
  const content: ClusterContent = {
    notes: draft.notes?.trim() || null,
    track_duration,
    duration: track_duration ? draft.duration ?? '00:00:00' : null,
    items: draft.items.map((item) => ({
      ...item,
      kind: 'exercise' as const,
      name: item.name.trim(),
      notes: item.notes?.trim() || null,
      primary_group_id: item.track_analytics ? item.primary_group_id : null,
      analytics_tag_ids: item.track_analytics ? item.analytics_tag_ids ?? [] : [],
      duration: item.track_duration ? item.duration : null,
    })),
  };

  const payload = {
    user_id: userId,
    name,
    cluster_type: draft.cluster_type,
    content,
    updated_at: new Date().toISOString(),
  };

  let id = templateId ?? null;

  if (id) {
    const { error } = await supabase
      .from('cluster_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { id: null, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('cluster_templates')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    id = data.id;
  }

  return { id, error: null };
}

/**
 * Soft-archive a cluster template (preferred removal).
 * Frees the active name for reuse.
 */
export async function archiveClusterTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cluster_templates')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .is('archived_at', null);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Hard-delete only when unreferenced.
 * v1: cluster_templates are never FK-referenced (JSON copy independence),
 * so this is always allowed when the row exists.
 */
export async function isClusterTemplateReferenced(
  _id: string,
): Promise<{ referenced: boolean; error: string | null }> {
  return { referenced: false, error: null };
}

export async function deleteClusterTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { referenced, error: refError } = await isClusterTemplateReferenced(id);
  if (refError) return { error: refError };
  if (referenced) {
    return {
      error:
        'This cluster is still referenced. Archive it instead of deleting.',
    };
  }

  const { error } = await supabase
    .from('cluster_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
