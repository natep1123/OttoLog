import { supabase } from './supabase';
import {
  CLUSTER_LABEL_NULL_ID,
  GENERAL_BLOCK_LABEL_ID,
  NO_TOOL_ID,
  UNCATEGORIZED_ID,
} from '../constants/sentinelIds';

export type TaxonomyKind =
  | 'tool'
  | 'primary_group'
  | 'analytics_tag'
  | 'session_label'
  | 'block_label'
  | 'cluster_label';

export type TaxonomyOption = {
  id: string;
  label: string;
  /** Global sentinel — always listed, never creatable/editable */
  isSystem?: boolean;
  /** Soft-archived; pickers hide these unless currently selected */
  isArchived?: boolean;
};

export type ManagedTaxonomyRow = {
  id: string;
  name: string;
  archivedAt: string | null;
  isSystem: boolean;
  usageCount: number;
};

type SentinelTable =
  | 'tools'
  | 'session_categories'
  | 'block_labels'
  | 'cluster_labels';

function isLabelKind(
  kind: TaxonomyKind,
): kind is 'session_label' | 'block_label' | 'cluster_label' {
  return (
    kind === 'session_label' ||
    kind === 'block_label' ||
    kind === 'cluster_label'
  );
}

function labelTable(
  kind: 'session_label' | 'block_label' | 'cluster_label',
): SentinelTable {
  if (kind === 'session_label') return 'session_categories';
  if (kind === 'block_label') return 'block_labels';
  return 'cluster_labels';
}

function systemNullId(kind: TaxonomyKind): string | null {
  if (kind === 'tool') return NO_TOOL_ID;
  if (kind === 'session_label') return UNCATEGORIZED_ID;
  if (kind === 'block_label') return GENERAL_BLOCK_LABEL_ID;
  if (kind === 'cluster_label') return CLUSTER_LABEL_NULL_ID;
  return null;
}

function uniqueViolationMessage(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'A tool with that name already exists.';
  if (kind === 'primary_group') {
    return 'A primary group with that name already exists.';
  }
  if (kind === 'analytics_tag') return 'A tag with that name already exists.';
  if (kind === 'session_label') {
    return 'A session label with that name already exists.';
  }
  if (kind === 'block_label') {
    return 'A block label with that name already exists.';
  }
  return 'A sequence label with that name already exists.';
}

function mapWriteError(kind: TaxonomyKind, message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('duplicate') ||
    lower.includes('unique') ||
    lower.includes('_user_name_unique')
  ) {
    return uniqueViolationMessage(kind);
  }
  if (lower.includes('foreign key') || lower.includes('restrict')) {
    return 'Still referenced by templates. Archive instead, or remove references first.';
  }
  return message;
}

function toolLabel(id: string, name: string, isSystem: boolean): string {
  return id === NO_TOOL_ID || isSystem ? 'None' : name;
}

function displayLabelName(
  kind: TaxonomyKind,
  id: string,
  name: string,
  isSystem: boolean,
): string {
  if (kind === 'tool') return toolLabel(id, name, isSystem);
  return name;
}

async function countColumnValues(
  table:
    | 'exercise_templates'
    | 'analytics_tag_links'
    | 'session_templates'
    | 'block_templates'
    | 'cluster_templates',
  column:
    | 'tool_id'
    | 'primary_group_id'
    | 'tag_id'
    | 'category_id'
    | 'label_id',
  ids: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;

  const { data, error } = await supabase.from(table).select(column).in(column, ids);
  if (error) return counts;

  for (const row of data ?? []) {
    const id = (row as Record<string, string | null>)[column];
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Seed Strength/Warmup/Superset etc. for the current user (idempotent). */
export async function ensureDefaultTemplateLabels(): Promise<{
  error: string | null;
}> {
  const { error } = await supabase.rpc('ensure_default_template_labels');
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Picker lists (active only) ─────────────────────────────────────────────

async function listSentinelOptions(
  kind: 'tool' | 'session_label' | 'block_label' | 'cluster_label',
): Promise<{ data: TaxonomyOption[]; error: string | null }> {
  const table =
    kind === 'tool'
      ? 'tools'
      : labelTable(kind);
  const nullId = systemNullId(kind);

  const { data, error } = await supabase
    .from(table)
    .select('id, name, is_system_default')
    .is('archived_at', null)
    .order('is_system_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) return { data: [], error: error.message };

  const options: TaxonomyOption[] = (data ?? []).map((row) => ({
    id: row.id,
    label: displayLabelName(
      kind,
      row.id,
      row.name,
      Boolean(row.is_system_default),
    ),
    isSystem: Boolean(row.is_system_default),
  }));

  options.sort((a, b) => {
    if (nullId && a.id === nullId) return -1;
    if (nullId && b.id === nullId) return 1;
    if (a.isSystem && !b.isSystem) return -1;
    if (!a.isSystem && b.isSystem) return 1;
    return a.label.localeCompare(b.label);
  });

  return { data: options, error: null };
}

export async function listTools(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  return listSentinelOptions('tool');
}

export async function listSessionLabels(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  await ensureDefaultTemplateLabels();
  return listSentinelOptions('session_label');
}

export async function listBlockLabels(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  await ensureDefaultTemplateLabels();
  return listSentinelOptions('block_label');
}

export async function listClusterLabels(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  await ensureDefaultTemplateLabels();
  return listSentinelOptions('cluster_label');
}

async function createSentinelOwned(
  kind: 'tool' | 'session_label' | 'block_label' | 'cluster_label',
  userId: string,
  name: string,
  emptyError: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: emptyError };

  const table =
    kind === 'tool' ? 'tools' : labelTable(kind);

  const { data: existing } = await supabase
    .from(table)
    .select('id, name, is_system_default')
    .eq('user_id', userId)
    .is('archived_at', null)
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) {
    return {
      data: {
        id: existing.id,
        label: displayLabelName(
          kind,
          existing.id,
          existing.name,
          Boolean(existing.is_system_default),
        ),
        isSystem: false,
      },
      error: null,
    };
  }

  const { data, error } = await supabase
    .from(table)
    .insert({
      user_id: userId,
      name: trimmed,
      is_system_default: false,
    })
    .select('id, name')
    .single();

  if (error) return { data: null, error: mapWriteError(kind, error.message) };
  return { data: { id: data.id, label: data.name, isSystem: false }, error: null };
}

export async function createTool(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  return createSentinelOwned('tool', userId, name, 'Tool name is required.');
}

export async function createSessionLabel(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  return createSentinelOwned(
    'session_label',
    userId,
    name,
    'Label name is required.',
  );
}

export async function createBlockLabel(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  return createSentinelOwned(
    'block_label',
    userId,
    name,
    'Label name is required.',
  );
}

export async function createClusterLabel(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  return createSentinelOwned(
    'cluster_label',
    userId,
    name,
    'Label name is required.',
  );
}

export async function listPrimaryGroups(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('analytics_primary_groups')
    .select('id, name')
    .is('archived_at', null)
    .order('name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row) => ({ id: row.id, label: row.name })),
    error: null,
  };
}

export async function createPrimaryGroup(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: 'Group name is required.' };

  const { data: existing } = await supabase
    .from('analytics_primary_groups')
    .select('id, name')
    .eq('user_id', userId)
    .is('archived_at', null)
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) {
    return { data: { id: existing.id, label: existing.name }, error: null };
  }

  const { data, error } = await supabase
    .from('analytics_primary_groups')
    .insert({ user_id: userId, name: trimmed })
    .select('id, name')
    .single();

  if (error) {
    return { data: null, error: mapWriteError('primary_group', error.message) };
  }
  return { data: { id: data.id, label: data.name }, error: null };
}

export async function listAnalyticsTags(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('analytics_tags')
    .select('id, name')
    .is('archived_at', null)
    .order('name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row) => ({ id: row.id, label: row.name })),
    error: null,
  };
}

export async function createAnalyticsTag(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: 'Tag name is required.' };

  const { data: existing } = await supabase
    .from('analytics_tags')
    .select('id, name')
    .eq('user_id', userId)
    .is('archived_at', null)
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) {
    return { data: { id: existing.id, label: existing.name }, error: null };
  }

  const { data, error } = await supabase
    .from('analytics_tags')
    .insert({ user_id: userId, name: trimmed })
    .select('id, name')
    .single();

  if (error) {
    return { data: null, error: mapWriteError('analytics_tag', error.message) };
  }
  return { data: { id: data.id, label: data.name }, error: null };
}

/** Resolve labels by id (including archived) so editors can show existing selections. */
export async function resolveTaxonomyOptions(
  kind: TaxonomyKind,
  ids: string[],
): Promise<{ data: TaxonomyOption[]; error: string | null }> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { data: [], error: null };

  if (kind === 'tool' || isLabelKind(kind)) {
    const table = kind === 'tool' ? 'tools' : labelTable(kind);
    const { data, error } = await supabase
      .from(table)
      .select('id, name, is_system_default, archived_at')
      .in('id', unique);
    if (error) return { data: [], error: error.message };
    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        label: displayLabelName(
          kind,
          row.id,
          row.name,
          Boolean(row.is_system_default),
        ),
        isSystem: Boolean(row.is_system_default),
        isArchived: row.archived_at != null,
      })),
      error: null,
    };
  }

  const table =
    kind === 'primary_group' ? 'analytics_primary_groups' : 'analytics_tags';
  const { data, error } = await supabase
    .from(table)
    .select('id, name, archived_at')
    .in('id', unique);
  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      label: row.name,
      isArchived: row.archived_at != null,
    })),
    error: null,
  };
}

export function mergeTaxonomyOptions(
  active: TaxonomyOption[],
  resolved: TaxonomyOption[],
): TaxonomyOption[] {
  const byId = new Map(active.map((o) => [o.id, o]));
  for (const row of resolved) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

// ─── Account management ─────────────────────────────────────────────────────

export async function listManagedTaxonomy(
  kind: TaxonomyKind,
  includeArchived: boolean,
): Promise<{ data: ManagedTaxonomyRow[]; error: string | null }> {
  if (kind === 'session_label' || kind === 'block_label' || kind === 'cluster_label') {
    await ensureDefaultTemplateLabels();
  }

  if (kind === 'tool' || isLabelKind(kind)) {
    const table = kind === 'tool' ? 'tools' : labelTable(kind);
    let query = supabase
      .from(table)
      .select('id, name, is_system_default, archived_at')
      .order('is_system_default', { ascending: false })
      .order('name', { ascending: true });
    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const ids = (data ?? [])
      .filter((row) => !row.is_system_default)
      .map((row) => row.id);

    let usage = new Map<string, number>();
    if (kind === 'tool') {
      usage = await countColumnValues('exercise_templates', 'tool_id', ids);
    } else if (kind === 'session_label') {
      usage = await countColumnValues('session_templates', 'category_id', ids);
    } else if (kind === 'block_label') {
      usage = await countColumnValues('block_templates', 'label_id', ids);
    } else {
      usage = await countColumnValues('cluster_templates', 'label_id', ids);
    }

    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        name: displayLabelName(
          kind,
          row.id,
          row.name,
          Boolean(row.is_system_default),
        ),
        archivedAt: row.archived_at,
        isSystem: Boolean(row.is_system_default),
        usageCount: usage.get(row.id) ?? 0,
      })),
      error: null,
    };
  }

  const table =
    kind === 'primary_group' ? 'analytics_primary_groups' : 'analytics_tags';
  let query = supabase
    .from(table)
    .select('id, name, archived_at')
    .order('name', { ascending: true });
  if (!includeArchived) query = query.is('archived_at', null);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  const ids = (data ?? []).map((row) => row.id);
  const usage =
    kind === 'primary_group'
      ? await countColumnValues('exercise_templates', 'primary_group_id', ids)
      : await countColumnValues('analytics_tag_links', 'tag_id', ids);

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      archivedAt: row.archived_at,
      isSystem: false,
      usageCount: usage.get(row.id) ?? 0,
    })),
    error: null,
  };
}

async function isSystemRow(kind: TaxonomyKind, id: string): Promise<boolean> {
  const nullId = systemNullId(kind);
  if (nullId && id === nullId) return true;
  if (kind !== 'tool' && !isLabelKind(kind)) return false;

  const table = kind === 'tool' ? 'tools' : labelTable(kind);
  const { data } = await supabase
    .from(table)
    .select('is_system_default')
    .eq('id', id)
    .maybeSingle();
  return Boolean(data?.is_system_default);
}

function tableForKind(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'tools';
  if (kind === 'primary_group') return 'analytics_primary_groups';
  if (kind === 'analytics_tag') return 'analytics_tags';
  return labelTable(kind);
}

export async function renameTaxonomy(
  kind: TaxonomyKind,
  id: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Name is required.' };
  if (await isSystemRow(kind, id)) {
    return { error: 'System defaults cannot be renamed.' };
  }

  const { error } = await supabase
    .from(tableForKind(kind))
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: mapWriteError(kind, error.message) };
  return { error: null };
}

export async function setTaxonomyArchived(
  kind: TaxonomyKind,
  id: string,
  archived: boolean,
): Promise<{ error: string | null }> {
  if (await isSystemRow(kind, id)) {
    return { error: 'System defaults cannot be archived.' };
  }

  const { error } = await supabase
    .from(tableForKind(kind))
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: mapWriteError(kind, error.message) };
  return { error: null };
}

export async function deleteTaxonomy(
  kind: TaxonomyKind,
  id: string,
): Promise<{ error: string | null }> {
  if (await isSystemRow(kind, id)) {
    return { error: 'System defaults cannot be deleted.' };
  }

  let usage = new Map<string, number>();
  if (kind === 'tool') {
    usage = await countColumnValues('exercise_templates', 'tool_id', [id]);
  } else if (kind === 'primary_group') {
    usage = await countColumnValues('exercise_templates', 'primary_group_id', [
      id,
    ]);
  } else if (kind === 'analytics_tag') {
    usage = await countColumnValues('analytics_tag_links', 'tag_id', [id]);
  } else if (kind === 'session_label') {
    usage = await countColumnValues('session_templates', 'category_id', [id]);
  } else if (kind === 'block_label') {
    usage = await countColumnValues('block_templates', 'label_id', [id]);
  } else {
    usage = await countColumnValues('cluster_templates', 'label_id', [id]);
  }

  if ((usage.get(id) ?? 0) > 0) {
    return {
      error:
        'Still referenced. Archive it instead, or remove it from templates first.',
    };
  }

  const { error } = await supabase.from(tableForKind(kind)).delete().eq('id', id);
  if (error) return { error: mapWriteError(kind, error.message) };
  return { error: null };
}

export function taxonomyKindLabel(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'Tools';
  if (kind === 'primary_group') return 'Primary groups';
  if (kind === 'analytics_tag') return 'Analytics tags';
  if (kind === 'session_label') return 'Session labels';
  if (kind === 'block_label') return 'Block labels';
  return 'Sequence labels';
}

export function taxonomyKindSingular(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'tool';
  if (kind === 'primary_group') return 'primary group';
  if (kind === 'analytics_tag') return 'tag';
  if (kind === 'session_label') return 'session label';
  if (kind === 'block_label') return 'block label';
  return 'sequence label';
}

export async function createManagedTaxonomy(
  kind: TaxonomyKind,
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  if (kind === 'tool') return createTool(userId, name);
  if (kind === 'primary_group') return createPrimaryGroup(userId, name);
  if (kind === 'analytics_tag') return createAnalyticsTag(userId, name);
  if (kind === 'session_label') return createSessionLabel(userId, name);
  if (kind === 'block_label') return createBlockLabel(userId, name);
  return createClusterLabel(userId, name);
}
