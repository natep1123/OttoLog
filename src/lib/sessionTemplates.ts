import { UNCATEGORIZED_ID } from '../constants/sentinelIds';
import { supabase } from './supabase';
import {
  defaultBlockDraft,
  defaultBlockExerciseItem,
  normalizeBlockItem as normalizeBlockChildItem,
  prepareBlockItemForSave,
} from './blockTemplates';
import type { BlockTemplateInput } from '../types/blockTemplate';
import type {
  SessionBlockItem,
  SessionContent,
  SessionTemplateInput,
  SessionTemplateRow,
} from '../types/sessionTemplate';

function newBlockId(): string {
  return `bl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSessionBlockItem(): SessionBlockItem {
  return {
    kind: 'block',
    id: newBlockId(),
    ...defaultBlockDraft(),
  };
}

export function defaultSessionDraft(): SessionTemplateInput {
  return {
    name: '',
    category_id: UNCATEGORIZED_ID,
    notes: null,
    track_duration: false,
    duration: null,
    blocks: [defaultSessionBlockItem()],
  };
}

/** Copy a library session into an editable draft (does not change save identity). */
export function sessionTemplateToDraft(
  row: SessionTemplateRow,
): SessionTemplateInput {
  const content = row.content;
  return {
    name: row.name,
    category_id: row.category_id || UNCATEGORIZED_ID,
    notes: content.notes,
    track_duration: content.track_duration,
    duration: content.duration,
    blocks: content.blocks.map((block) => ({
      ...block,
      items: block.items.map((item) => {
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
    })),
  };
}

function normalizeBlockItem(raw: unknown): SessionBlockItem {
  const base = defaultBlockDraft();
  if (!raw || typeof raw !== 'object') {
    return { kind: 'block', id: newBlockId(), ...base };
  }
  const r = raw as Record<string, unknown>;
  const draft: BlockTemplateInput = {
    name: typeof r.name === 'string' ? r.name : '',
    notes: typeof r.notes === 'string' ? r.notes : null,
    track_duration: Boolean(r.track_duration),
    duration:
      typeof r.duration === 'string'
        ? r.duration
        : Boolean(r.track_duration)
          ? '00:00:00'
          : null,
    items: Array.isArray(r.items)
      ? r.items.map(normalizeBlockChildItem)
      : [defaultBlockExerciseItem()],
  };
  return {
    kind: 'block',
    id: typeof r.id === 'string' ? r.id : newBlockId(),
    ...draft,
    items: draft.items.length ? draft.items : [defaultBlockExerciseItem()],
  };
}

function normalizeContent(raw: unknown): SessionContent {
  if (!raw || typeof raw !== 'object') {
    return {
      notes: null,
      track_duration: false,
      duration: null,
      blocks: [defaultSessionBlockItem()],
    };
  }
  const c = raw as Record<string, unknown>;
  const track_duration = Boolean(c.track_duration);
  const blocks = Array.isArray(c.blocks)
    ? c.blocks.map(normalizeBlockItem)
    : [defaultSessionBlockItem()];
  return {
    notes: typeof c.notes === 'string' ? c.notes : null,
    track_duration,
    duration: track_duration
      ? typeof c.duration === 'string'
        ? c.duration
        : '00:00:00'
      : null,
    blocks: blocks.length ? blocks : [defaultSessionBlockItem()],
  };
}

function rowFromDb(row: Record<string, unknown>): SessionTemplateRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    category_id: (row.category_id as string) || UNCATEGORIZED_ID,
    content: normalizeContent(row.content),
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listSessionTemplates(): Promise<{
  data: SessionTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((r) => rowFromDb(r as Record<string, unknown>)),
    error: null,
  };
}

export async function getSessionTemplate(
  id: string,
): Promise<{ data: SessionTemplateRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: 'Template not found.' };
  return { data: rowFromDb(row as Record<string, unknown>), error: null };
}

export type SaveSessionArgs = {
  userId: string;
  templateId?: string | null;
  draft: SessionTemplateInput;
};

function validateDraft(draft: SessionTemplateInput): string | null {
  if (!draft.name.trim()) return 'Name is required.';
  if (!draft.category_id) return 'Session category is required.';
  if (draft.blocks.length === 0) return 'Add at least one block.';
  for (let i = 0; i < draft.blocks.length; i += 1) {
    const block = draft.blocks[i];
    if (!block.name.trim()) {
      return `Block ${i + 1} needs a name.`;
    }
    if (block.items.length === 0) {
      return `Block ${i + 1} needs at least one cluster or exercise.`;
    }
    for (let j = 0; j < block.items.length; j += 1) {
      const item = block.items[j];
      if (!item.name.trim()) {
        const kind = item.kind === 'cluster' ? 'Cluster' : 'Exercise';
        return `${kind} ${j + 1} in Block ${i + 1} needs a name.`;
      }
      if (
        item.kind === 'exercise' &&
        item.track_analytics &&
        !item.primary_group_id
      ) {
        return `Exercise ${j + 1} in Block ${i + 1} needs a primary analytics group.`;
      }
    }
  }
  return null;
}

export async function saveSessionTemplate(
  args: SaveSessionArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, templateId, draft } = args;
  const validationError = validateDraft(draft);
  if (validationError) return { id: null, error: validationError };

  const name = draft.name.trim();
  let dupeQuery = supabase
    .from('session_templates')
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
      error: `A session template named “${name}” already exists.`,
    };
  }

  const track_duration = draft.track_duration;
  const content: SessionContent = {
    notes: draft.notes?.trim() || null,
    track_duration,
    duration: track_duration ? draft.duration ?? '00:00:00' : null,
    blocks: draft.blocks.map((block) => ({
      ...block,
      kind: 'block' as const,
      name: block.name.trim(),
      notes: block.notes?.trim() || null,
      items: block.items.map(prepareBlockItemForSave),
    })),
  };

  const payload = {
    user_id: userId,
    name,
    category_id: draft.category_id || UNCATEGORIZED_ID,
    content,
    updated_at: new Date().toISOString(),
  };

  let id = templateId ?? null;
  if (id) {
    const { error } = await supabase
      .from('session_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { id: null, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('session_templates')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    id = data.id;
  }

  return { id, error: null };
}

export async function archiveSessionTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('session_templates')
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

export async function deleteSessionTemplate(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('session_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
