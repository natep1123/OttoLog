import {
  CLUSTER_LABEL_NULL_ID,
  GENERAL_BLOCK_LABEL_ID,
} from '../constants/sentinelIds';
import { normalizeBrief } from './displayTitles';
import { supabase } from './supabase';
import {
  defaultClusterDraft,
  defaultClusterExerciseItem,
} from './clusterTemplates';
import {
  buildTargets,
  sanitizeTargetsForShape,
} from './exerciseTemplates';
import type {
  BlockClusterItem,
  BlockContent,
  BlockExerciseItem,
  BlockItem,
  BlockTemplateInput,
  BlockTemplateRow,
} from '../types/blockTemplate';
import type {
  ClusterExerciseItem,
  ClusterTemplateInput,
} from '../types/clusterTemplate';
import type { ExerciseTarget } from '../types/exerciseTemplate';

function newClusterId(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultBlockClusterItem(): BlockClusterItem {
  return {
    kind: 'cluster',
    id: newClusterId(),
    ...defaultClusterDraft(),
  };
}

export function defaultBlockExerciseItem(): BlockExerciseItem {
  return defaultClusterExerciseItem();
}

export function defaultBlockDraft(): BlockTemplateInput {
  return {
    name: '',
    label_id: GENERAL_BLOCK_LABEL_ID,
    label_name: 'General',
    notes: null,
    track_duration: false,
    duration: null,
    items: [defaultBlockExerciseItem()],
  };
}

/** Copy a library block into an editable draft (does not change save identity). */
export function blockTemplateToDraft(
  row: BlockTemplateRow,
): BlockTemplateInput {
  const content = row.content;
  return {
    name: row.name ?? '',
    label_id: row.label_id || GENERAL_BLOCK_LABEL_ID,
    label_name: row.label_name ?? null,
    notes: content.notes,
    track_duration: content.track_duration,
    duration: content.duration,
    items: content.items.map((item) => {
      if (item.kind === 'exercise') {
        return {
          ...item,
          analytics_tag_ids: [...(item.analytics_tag_ids ?? [])],
          targets: item.targets.map((t) => ({ ...t })),
        };
      }
      return {
        ...item,
        items: item.items.map((ex) => ({
          ...ex,
          analytics_tag_ids: [...(ex.analytics_tag_ids ?? [])],
          targets: ex.targets.map((t) => ({ ...t })),
        })),
        overrides: (item.overrides ?? []).map((o) => ({
          ...o,
          patch: { ...o.patch },
        })),
      };
    }),
  };
}

export function normalizeClusterItem(raw: unknown): BlockClusterItem {
  const base = defaultClusterDraft();
  if (!raw || typeof raw !== 'object') {
    return { kind: 'cluster', id: newClusterId(), ...base };
  }
  const r = raw as Record<string, unknown>;
  const labelId =
    typeof r.label_id === 'string' ? r.label_id : base.label_id;
  const storedLabel =
    typeof r.label_name === 'string' ? r.label_name : base.label_name ?? null;
  const labelName =
    labelId === CLUSTER_LABEL_NULL_ID &&
    (!storedLabel ||
      storedLabel.trim().toLowerCase() === 'cluster' ||
      storedLabel.trim().toLowerCase() === 'untyped cluster')
      ? 'Standard'
      : storedLabel;
  const draft: ClusterTemplateInput = {
    name: typeof r.name === 'string' ? r.name : '',
    label_id: labelId,
    label_name: labelName,
    cluster_type:
      r.cluster_type === 'circuit' || r.cluster_type === 'superset'
        ? r.cluster_type
        : base.cluster_type,
    notes: typeof r.notes === 'string' ? r.notes : null,
    track_duration: Boolean(r.track_duration),
    duration:
      typeof r.duration === 'string'
        ? r.duration
        : Boolean(r.track_duration)
          ? '00:00:00'
          : null,
    rounds: Math.max(1, Math.min(99, Number(r.rounds) || 1)),
    items: Array.isArray(r.items) ? (r.items as ClusterTemplateInput['items']) : base.items,
    overrides: Array.isArray(r.overrides)
      ? (r.overrides as ClusterTemplateInput['overrides'])
      : [],
  };
  return {
    kind: 'cluster',
    id: typeof r.id === 'string' ? r.id : newClusterId(),
    ...draft,
  };
}

function readTargets(raw: Record<string, unknown>): ExerciseTarget[] {
  if (Array.isArray(raw.targets) && raw.targets.length) {
    return raw.targets as ExerciseTarget[];
  }
  // Tolerate a mistaken solo-template shape if it was ever written.
  if (
    Array.isArray(raw.default_target_shape) &&
    raw.default_target_shape.length
  ) {
    return raw.default_target_shape as ExerciseTarget[];
  }
  return buildTargets(1);
}

export function normalizeExerciseItem(raw: unknown): BlockExerciseItem {
  const base = defaultClusterExerciseItem();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const target_shape_id =
    typeof r.target_shape_id === 'string'
      ? r.target_shape_id
      : base.target_shape_id;
  const track_analytics = Boolean(r.track_analytics);
  const item: ClusterExerciseItem = {
    kind: 'exercise',
    id: typeof r.id === 'string' ? r.id : base.id,
    name: typeof r.name === 'string' ? r.name : '',
    tool_id: typeof r.tool_id === 'string' ? r.tool_id : base.tool_id,
    tool_name:
      typeof r.tool_name === 'string' ? r.tool_name : base.tool_name ?? null,
    target_shape_id,
    track_analytics,
    primary_group_id:
      typeof r.primary_group_id === 'string' ? r.primary_group_id : null,
    analytics_tag_ids: Array.isArray(r.analytics_tag_ids)
      ? r.analytics_tag_ids.filter((id): id is string => typeof id === 'string')
      : [],
    targets: sanitizeTargetsForShape(target_shape_id, readTargets(r)),
    track_duration: Boolean(r.track_duration),
    duration:
      typeof r.duration === 'string'
        ? r.duration
        : Boolean(r.track_duration)
          ? '00:00:00'
          : null,
    notes: typeof r.notes === 'string' ? r.notes : null,
  };
  return item;
}

/** Missing/legacy kind defaults to Sequence for backward compatibility. */
export function normalizeBlockItem(raw: unknown): BlockItem {
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as Record<string, unknown>).kind === 'exercise'
  ) {
    return normalizeExerciseItem(raw);
  }
  return normalizeClusterItem(raw);
}

function normalizeContent(raw: unknown): BlockContent {
  if (!raw || typeof raw !== 'object') {
    return {
      notes: null,
      track_duration: false,
      duration: null,
      items: [defaultBlockExerciseItem()],
    };
  }
  const c = raw as Record<string, unknown>;
  const track_duration = Boolean(c.track_duration);
  const items = Array.isArray(c.items)
    ? c.items.map(normalizeBlockItem)
    : [defaultBlockExerciseItem()];
  return {
    notes: typeof c.notes === 'string' ? c.notes : null,
    track_duration,
    duration: track_duration
      ? typeof c.duration === 'string'
        ? c.duration
        : '00:00:00'
      : null,
    items: items.length ? items : [defaultBlockExerciseItem()],
  };
}

function rowFromDb(row: Record<string, unknown>): BlockTemplateRow {
  const labelJoin = row.block_labels as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const joinedName = Array.isArray(labelJoin)
    ? labelJoin[0]?.name
    : labelJoin?.name;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: typeof row.name === 'string' ? row.name : null,
    label_id: (row.label_id as string) || GENERAL_BLOCK_LABEL_ID,
    label_name: typeof joinedName === 'string' ? joinedName : null,
    content: normalizeContent(row.content),
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listBlockTemplates(): Promise<{
  data: BlockTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('block_templates')
    .select('*, block_labels(name)')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((r) => rowFromDb(r as Record<string, unknown>)),
    error: null,
  };
}

export async function getBlockTemplate(
  id: string,
): Promise<{ data: BlockTemplateRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('block_templates')
    .select('*, block_labels(name)')
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: 'Template not found.' };
  return { data: rowFromDb(row as Record<string, unknown>), error: null };
}

export type SaveBlockArgs = {
  userId: string;
  templateId?: string | null;
  draft: BlockTemplateInput;
};

export function prepareBlockItemForSave(item: BlockItem): BlockItem {
  if (item.kind === 'exercise') {
    return {
      ...item,
      kind: 'exercise',
      name: item.name.trim(),
      notes: item.notes?.trim() || null,
      primary_group_id: item.track_analytics ? item.primary_group_id : null,
      analytics_tag_ids: item.track_analytics
        ? item.analytics_tag_ids ?? []
        : [],
      targets: sanitizeTargetsForShape(item.target_shape_id, item.targets),
    };
  }
  return {
    ...item,
    kind: 'cluster',
    name: item.name.trim(),
    label_id: item.label_id || CLUSTER_LABEL_NULL_ID,
    label_name: item.label_name?.trim() || null,
    notes: item.notes?.trim() || null,
  };
}

function validateDraft(draft: BlockTemplateInput): string | null {
  if (!draft.label_id) return 'Block label is required.';
  if (draft.items.length === 0) return 'Add at least one sequence or exercise.';
  for (let i = 0; i < draft.items.length; i += 1) {
    const item = draft.items[i];
    if (item.kind === 'cluster' && !item.label_id) {
      return `Sequence ${i + 1} needs a label.`;
    }
    if (item.kind === 'exercise' && item.track_analytics && !item.primary_group_id) {
      return `Exercise ${i + 1} needs a primary analytics group.`;
    }
  }
  return null;
}

export async function saveBlockTemplate(
  args: SaveBlockArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, templateId, draft } = args;
  const validationError = validateDraft(draft);
  if (validationError) return { id: null, error: validationError };

  const name = normalizeBrief(draft.name);
  if (name) {
    let dupeQuery = supabase
      .from('block_templates')
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
        error: `A block template named “${name}” already exists.`,
      };
    }
  }

  const track_duration = draft.track_duration;
  const content: BlockContent = {
    notes: draft.notes?.trim() || null,
    track_duration,
    duration: track_duration ? draft.duration ?? '00:00:00' : null,
    items: draft.items.map(prepareBlockItemForSave),
  };

  const payload = {
    user_id: userId,
    name,
    label_id: draft.label_id || GENERAL_BLOCK_LABEL_ID,
    content,
    updated_at: new Date().toISOString(),
  };

  let id = templateId ?? null;
  if (id) {
    const { error } = await supabase
      .from('block_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { id: null, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('block_templates')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    id = data.id;
  }

  return { id, error: null };
}

export async function archiveBlockTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('block_templates')
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

export async function deleteBlockTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('block_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
