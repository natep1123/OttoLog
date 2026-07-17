import { supabase } from './supabase';
import { defaultClusterDraft } from './clusterTemplates';
import type {
  BlockClusterItem,
  BlockContent,
  BlockTemplateInput,
  BlockTemplateRow,
} from '../types/blockTemplate';
import type { ClusterTemplateInput } from '../types/clusterTemplate';

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

export function defaultBlockDraft(): BlockTemplateInput {
  return {
    name: '',
    notes: null,
    track_duration: false,
    duration: null,
    items: [defaultBlockClusterItem()],
  };
}

export function normalizeClusterItem(raw: unknown): BlockClusterItem {
  const base = defaultClusterDraft();
  if (!raw || typeof raw !== 'object') {
    return { kind: 'cluster', id: newClusterId(), ...base };
  }
  const r = raw as Record<string, unknown>;
  const draft: ClusterTemplateInput = {
    name: typeof r.name === 'string' ? r.name : '',
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

function normalizeContent(raw: unknown): BlockContent {
  if (!raw || typeof raw !== 'object') {
    return {
      notes: null,
      track_duration: false,
      duration: null,
      items: [defaultBlockClusterItem()],
    };
  }
  const c = raw as Record<string, unknown>;
  const track_duration = Boolean(c.track_duration);
  const items = Array.isArray(c.items)
    ? c.items.map(normalizeClusterItem)
    : [defaultBlockClusterItem()];
  return {
    notes: typeof c.notes === 'string' ? c.notes : null,
    track_duration,
    duration: track_duration
      ? typeof c.duration === 'string'
        ? c.duration
        : '00:00:00'
      : null,
    items: items.length ? items : [defaultBlockClusterItem()],
  };
}

function rowFromDb(row: Record<string, unknown>): BlockTemplateRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
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
    .select('*')
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
    .select('*')
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

function validateDraft(draft: BlockTemplateInput): string | null {
  if (!draft.name.trim()) return 'Name is required.';
  if (draft.items.length === 0) return 'Add at least one cluster.';
  for (let i = 0; i < draft.items.length; i += 1) {
    if (!draft.items[i].name.trim()) {
      return `Cluster ${i + 1} needs a name.`;
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

  const name = draft.name.trim();
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

  const track_duration = draft.track_duration;
  const content: BlockContent = {
    notes: draft.notes?.trim() || null,
    track_duration,
    duration: track_duration ? draft.duration ?? '00:00:00' : null,
    items: draft.items.map((item) => ({
      ...item,
      kind: 'cluster' as const,
      name: item.name.trim(),
      notes: item.notes?.trim() || null,
    })),
  };

  const payload = {
    user_id: userId,
    name,
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
