import { supabase } from './supabase';
import { NO_TOOL_ID } from '../constants/sentinelIds';

export type TaxonomyKind = 'tool' | 'primary_group' | 'analytics_tag';

export type TaxonomyOption = {
  id: string;
  label: string;
  /** Global sentinel (e.g. No Tool) — always listed, never creatable */
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

function uniqueViolationMessage(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'A tool with that name already exists.';
  if (kind === 'primary_group') {
    return 'A primary group with that name already exists.';
  }
  return 'A tag with that name already exists.';
}

function mapWriteError(kind: TaxonomyKind, message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('duplicate') ||
    lower.includes('unique') ||
    lower.includes('tools_user_name_unique') ||
    lower.includes('analytics_primary_groups_user_name_unique') ||
    lower.includes('analytics_tags_user_name_unique')
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

async function countColumnValues(
  table: 'exercise_templates' | 'analytics_tag_links',
  column: 'tool_id' | 'primary_group_id' | 'tag_id',
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

// ─── Picker lists (active only) ─────────────────────────────────────────────

export async function listTools(): Promise<{
  data: TaxonomyOption[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, is_system_default')
    .is('archived_at', null)
    .order('is_system_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) return { data: [], error: error.message };

  const options: TaxonomyOption[] = (data ?? []).map((row) => ({
    id: row.id,
    label: toolLabel(row.id, row.name, Boolean(row.is_system_default)),
    isSystem: Boolean(row.is_system_default),
  }));

  options.sort((a, b) => {
    if (a.id === NO_TOOL_ID) return -1;
    if (b.id === NO_TOOL_ID) return 1;
    if (a.isSystem && !b.isSystem) return -1;
    if (!a.isSystem && b.isSystem) return 1;
    return a.label.localeCompare(b.label);
  });

  return { data: options, error: null };
}

export async function createTool(
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: 'Tool name is required.' };

  const { data: existing } = await supabase
    .from('tools')
    .select('id, name, is_system_default')
    .eq('user_id', userId)
    .is('archived_at', null)
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) {
    return {
      data: {
        id: existing.id,
        label: existing.name,
        isSystem: false,
      },
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('tools')
    .insert({
      user_id: userId,
      name: trimmed,
      is_system_default: false,
    })
    .select('id, name')
    .single();

  if (error) return { data: null, error: mapWriteError('tool', error.message) };
  return { data: { id: data.id, label: data.name, isSystem: false }, error: null };
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

  if (kind === 'tool') {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, is_system_default, archived_at')
      .in('id', unique);
    if (error) return { data: [], error: error.message };
    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        label: toolLabel(row.id, row.name, Boolean(row.is_system_default)),
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
  if (kind === 'tool') {
    let query = supabase
      .from('tools')
      .select('id, name, is_system_default, archived_at')
      .order('is_system_default', { ascending: false })
      .order('name', { ascending: true });
    if (!includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const ids = (data ?? [])
      .filter((row) => !row.is_system_default)
      .map((row) => row.id);
    const usage = await countColumnValues('exercise_templates', 'tool_id', ids);

    return {
      data: (data ?? []).map((row) => ({
        id: row.id,
        name: toolLabel(row.id, row.name, Boolean(row.is_system_default)),
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

export async function renameTaxonomy(
  kind: TaxonomyKind,
  id: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Name is required.' };
  if (kind === 'tool' && (id === NO_TOOL_ID || (await isSystemTool(id)))) {
    return { error: 'The system “None” tool cannot be renamed.' };
  }

  const table =
    kind === 'tool'
      ? 'tools'
      : kind === 'primary_group'
        ? 'analytics_primary_groups'
        : 'analytics_tags';

  const { error } = await supabase
    .from(table)
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
  if (kind === 'tool' && (id === NO_TOOL_ID || (await isSystemTool(id)))) {
    return { error: 'The system “None” tool cannot be archived.' };
  }

  const table =
    kind === 'tool'
      ? 'tools'
      : kind === 'primary_group'
        ? 'analytics_primary_groups'
        : 'analytics_tags';

  const { error } = await supabase
    .from(table)
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
  if (kind === 'tool' && (id === NO_TOOL_ID || (await isSystemTool(id)))) {
    return { error: 'The system “None” tool cannot be deleted.' };
  }

  const usage =
    kind === 'tool'
      ? await countColumnValues('exercise_templates', 'tool_id', [id])
      : kind === 'primary_group'
        ? await countColumnValues('exercise_templates', 'primary_group_id', [id])
        : await countColumnValues('analytics_tag_links', 'tag_id', [id]);

  if ((usage.get(id) ?? 0) > 0) {
    return {
      error:
        'Still referenced. Archive it instead, or remove it from templates first.',
    };
  }

  const table =
    kind === 'tool'
      ? 'tools'
      : kind === 'primary_group'
        ? 'analytics_primary_groups'
        : 'analytics_tags';

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return { error: mapWriteError(kind, error.message) };
  return { error: null };
}

async function isSystemTool(id: string): Promise<boolean> {
  if (id === NO_TOOL_ID) return true;
  const { data } = await supabase
    .from('tools')
    .select('is_system_default')
    .eq('id', id)
    .maybeSingle();
  return Boolean(data?.is_system_default);
}

export function taxonomyKindLabel(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'Tools';
  if (kind === 'primary_group') return 'Primary groups';
  return 'Analytics tags';
}

export function taxonomyKindSingular(kind: TaxonomyKind): string {
  if (kind === 'tool') return 'tool';
  if (kind === 'primary_group') return 'primary group';
  return 'tag';
}

export async function createManagedTaxonomy(
  kind: TaxonomyKind,
  userId: string,
  name: string,
): Promise<{ data: TaxonomyOption | null; error: string | null }> {
  if (kind === 'tool') return createTool(userId, name);
  if (kind === 'primary_group') return createPrimaryGroup(userId, name);
  return createAnalyticsTag(userId, name);
}
