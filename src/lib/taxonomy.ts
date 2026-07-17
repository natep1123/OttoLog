import { supabase } from './supabase';
import { NO_TOOL_ID } from '../constants/sentinelIds';

export type TaxonomyOption = {
  id: string;
  label: string;
  /** Global sentinel (e.g. No Tool) — always listed, never creatable */
  isSystem?: boolean;
};

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
    label: row.id === NO_TOOL_ID || row.is_system_default ? 'None' : row.name,
    isSystem: Boolean(row.is_system_default),
  }));

  // Ensure No Tool is first even if order differs
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

  if (error) return { data: null, error: error.message };
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

  if (error) return { data: null, error: error.message };
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

  if (error) return { data: null, error: error.message };
  return { data: { id: data.id, label: data.name }, error: null };
}
