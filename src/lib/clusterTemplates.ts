import { CLUSTER_LABEL_NULL_ID } from '../constants/sentinelIds';
import {
  legacyClusterTypeFromLabel,
  normalizeBrief,
} from './displayTitles';
import { supabase } from './supabase';
import {
  buildTargets,
  defaultExerciseDraft,
  sanitizeTargetsForShape,
} from './exerciseTemplates';
import type {
  ExerciseTarget,
  ExerciseTemplateInput,
} from '../types/exerciseTemplate';
import type {
  ClusterContent,
  ClusterExerciseItem,
  ClusterOverridePatch,
  ClusterRoundOverride,
  ClusterTemplateInput,
  ClusterTemplateRow,
  ClusterType,
  ExpandedClusterSet,
} from '../types/clusterTemplate';

function newItemId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newOverrideId(): string {
  return `ov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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
    label_id: CLUSTER_LABEL_NULL_ID,
    label_name: 'Standard',
    cluster_type: 'superset',
    notes: null,
    track_duration: false,
    duration: null,
    rounds: 1,
    items: [defaultClusterExerciseItem()],
    overrides: [],
  };
}

/** Copy a library sequence into an editable draft (does not change save identity). */
export function clusterTemplateToDraft(
  row: ClusterTemplateRow,
): ClusterTemplateInput {
  const content = row.content;
  return {
    name: row.name ?? '',
    label_id: row.label_id || CLUSTER_LABEL_NULL_ID,
    label_name: row.label_name ?? null,
    cluster_type: row.cluster_type,
    notes: content.notes,
    track_duration: content.track_duration,
    duration: content.duration,
    rounds: content.rounds,
    items: content.items.map((item) => ({
      ...item,
      analytics_tag_ids: [...(item.analytics_tag_ids ?? [])],
      targets: item.targets.map((t) => ({ ...t })),
    })),
    overrides: (content.overrides ?? []).map((o) => ({
      ...o,
      patch: { ...o.patch },
    })),
  };
}

function normalizePatch(raw: unknown): ClusterOverridePatch {
  if (!raw || typeof raw !== 'object') return {};
  const p = raw as Record<string, unknown>;
  const patch: ClusterOverridePatch = {};
  if ('reps' in p) {
    patch.reps =
      p.reps === null || p.reps === undefined
        ? null
        : typeof p.reps === 'number'
          ? p.reps
          : Number(p.reps);
  }
  if (typeof p.is_per_side === 'boolean') patch.is_per_side = p.is_per_side;
  if ('time_duration' in p) {
    const t = typeof p.time_duration === 'string' ? p.time_duration : null;
    patch.time_duration = !t || t === '00:00:00' ? null : t;
  }
  if ('distance_value' in p) {
    const rawDist =
      p.distance_value === null || p.distance_value === undefined
        ? null
        : typeof p.distance_value === 'number'
          ? p.distance_value
          : Number(p.distance_value);
    patch.distance_value =
      rawDist == null || !Number.isFinite(rawDist) || rawDist === 0
        ? null
        : rawDist;
  }
  if (
    p.distance_unit === 'mi' ||
    p.distance_unit === 'km' ||
    p.distance_unit === 'm'
  ) {
    patch.distance_unit = p.distance_unit;
  }
  if (p.load_unit === 'lbs' || p.load_unit === 'kg' || p.load_unit === 'BW') {
    patch.load_unit = p.load_unit;
  }
  if ('load_value' in p || patch.load_unit === 'BW') {
    if (patch.load_unit === 'BW') {
      patch.load_value = null;
    } else if ('load_value' in p) {
      patch.load_value =
        p.load_value === null || p.load_value === undefined
          ? null
          : typeof p.load_value === 'number'
            ? p.load_value
            : Number(p.load_value);
    }
  }
  return patch;
}

function normalizeOverrides(raw: unknown): ClusterRoundOverride[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const from = Math.max(1, Number(r.from_round) || 1);
    const to = Math.max(from, Number(r.to_round) || from);
    return {
      id:
        typeof r.id === 'string' && r.id
          ? r.id
          : `ov_migrated_${index}_${newOverrideId()}`,
      exercise_id: typeof r.exercise_id === 'string' ? r.exercise_id : '',
      from_round: from,
      to_round: to,
      skipped: Boolean(r.skipped),
      notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim() : null,
      patch: normalizePatch(r.patch),
    };
  });
}

function normalizeContent(raw: unknown): ClusterContent {
  const empty: ClusterContent = {
    notes: null,
    track_duration: false,
    duration: null,
    rounds: 1,
    items: [],
    overrides: [],
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
      targets: buildTargets(
        1,
        targets.length
          ? (targets as ClusterExerciseItem['targets'])
          : buildTargets(1),
      ),
      track_duration: Boolean(r.track_duration),
      duration: typeof r.duration === 'string' ? r.duration : null,
      notes: typeof r.notes === 'string' ? r.notes : null,
    };
  });

  const track_duration = Boolean(c.track_duration);
  const rounds = Math.max(1, Math.min(99, Number(c.rounds) || 1));
  return {
    notes: typeof c.notes === 'string' ? c.notes : null,
    track_duration,
    duration: track_duration
      ? typeof c.duration === 'string'
        ? c.duration
        : '00:00:00'
      : null,
    rounds,
    items,
    overrides: normalizeOverrides(c.overrides),
  };
}

function rowFromDb(row: Record<string, unknown>): ClusterTemplateRow {
  const labelJoin = row.cluster_labels as
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
    label_id: (row.label_id as string) || CLUSTER_LABEL_NULL_ID,
    label_name: typeof joinedName === 'string' ? joinedName : null,
    cluster_type: (row.cluster_type as ClusterType) || 'superset',
    content: normalizeContent(row.content),
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Clamp / drop overrides that no longer fit items or rounds. */
export function pruneClusterOverrides(
  overrides: ClusterRoundOverride[],
  items: ClusterExerciseItem[],
  rounds: number,
): ClusterRoundOverride[] {
  const ids = new Set(items.map((i) => i.id));
  return overrides
    .filter((o) => ids.has(o.exercise_id))
    .map((o) => ({
      ...o,
      from_round: Math.min(Math.max(1, o.from_round), rounds),
      to_round: Math.min(Math.max(1, o.to_round), rounds),
    }))
    .filter((o) => o.from_round <= o.to_round);
}

function findOverrideForRound(
  overrides: ClusterRoundOverride[],
  exerciseId: string,
  round: number,
): ClusterRoundOverride | null {
  let hit: ClusterRoundOverride | null = null;
  for (const o of overrides) {
    if (o.exercise_id !== exerciseId) continue;
    if (round < o.from_round || round > o.to_round) continue;
    hit = o;
  }
  return hit;
}

function applyPatch(
  target: ExerciseTarget,
  patch: ClusterOverridePatch,
): ExerciseTarget {
  return {
    ...target,
    ...patch,
    set: target.set,
  };
}

/**
 * Expand compact sequence programming into per-round sets.
 * Used when denesting session logs later. Skipped slots are marked, not
 * turned into zero-rep performed sets.
 */
export function expandClusterRounds(
  draft: Pick<ClusterTemplateInput, 'rounds' | 'items' | 'overrides'>,
): ExpandedClusterSet[] {
  const rounds = Math.max(1, draft.rounds || 1);
  const out: ExpandedClusterSet[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    for (const item of draft.items) {
      const targets = item.targets.length ? item.targets : buildTargets(1);
      const override = findOverrideForRound(
        draft.overrides ?? [],
        item.id,
        round,
      );
      const skipped = Boolean(override?.skipped);

      targets.forEach((target, target_index) => {
        const base = { ...target, set: target_index + 1 };
        const next =
          !skipped && override && Object.keys(override.patch).length > 0
            ? applyPatch(base, override.patch)
            : base;
        out.push({
          round,
          exercise_id: item.id,
          exercise_name: item.name,
          target_index,
          target: next,
          skipped,
        });
      });
    }
  }

  return out;
}

/** Performed-only expansion (skips omitted for analytics volume). */
export function expandClusterPerformedSets(
  draft: Pick<ClusterTemplateInput, 'rounds' | 'items' | 'overrides'>,
): ExpandedClusterSet[] {
  return expandClusterRounds(draft).filter((s) => !s.skipped);
}

export function formatOverrideSummary(
  override: ClusterRoundOverride,
  exerciseName: string,
): string {
  const range =
    override.from_round === override.to_round
      ? `R${override.from_round}`
      : `R${override.from_round}–${override.to_round}`;
  const name = exerciseName.trim() || 'Exercise';
  const bits: string[] = [];

  if (override.skipped) bits.push('skipped');

  const { patch } = override;
  if ('reps' in patch) {
    bits.push(patch.reps == null ? 'reps cleared' : `${patch.reps} reps`);
  }
  if ('load_value' in patch || 'load_unit' in patch) {
    const v = 'load_value' in patch ? patch.load_value : undefined;
    const u = patch.load_unit ?? '';
    if (v === undefined && u) bits.push(u);
    else if (v == null && 'load_value' in patch) bits.push('load cleared');
    else if (v != null) bits.push(`${v}${u ? ` ${u}` : ''}`.trim());
  }
  if ('time_duration' in patch) {
    bits.push(patch.time_duration ? patch.time_duration : 'time cleared');
  }
  if ('distance_value' in patch || 'distance_unit' in patch) {
    const v = 'distance_value' in patch ? patch.distance_value : undefined;
    const u = patch.distance_unit ?? '';
    if (v === undefined && u) bits.push(u);
    else if (v == null && 'distance_value' in patch) bits.push('distance cleared');
    else if (v != null) bits.push(`${v}${u ? ` ${u}` : ''}`);
  }
  if (override.notes?.trim()) {
    const note = override.notes.trim();
    bits.push(
      note.length > 28 ? `“${note.slice(0, 27)}…”` : `“${note}”`,
    );
  }

  if (bits.length === 0) return `${name} · ${range}`;
  return `${name} · ${range} · ${bits.join(' · ')}`;
}

export async function listClusterTemplates(): Promise<{
  data: ClusterTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('cluster_templates')
    .select('*, cluster_labels(name)')
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
    .select('*, cluster_labels(name)')
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
  if (!draft.label_id) return 'Sequence label is required.';
  if (!Number.isFinite(draft.rounds) || draft.rounds < 1) {
    return 'Rounds must be at least 1.';
  }
  if (draft.items.length === 0) {
    return 'Add at least one exercise.';
  }
  for (let i = 0; i < draft.items.length; i += 1) {
    const item = draft.items[i];
    if (item.track_analytics && !item.primary_group_id) {
      return `Exercise ${i + 1} needs a primary analytics group.`;
    }
  }

  const itemIds = new Set(draft.items.map((i) => i.id));
  for (const o of draft.overrides ?? []) {
    if (!itemIds.has(o.exercise_id)) {
      return 'An override points at a missing exercise.';
    }
    if (o.from_round < 1 || o.to_round < o.from_round) {
      return 'Override round range is invalid.';
    }
    if (o.to_round > draft.rounds) {
      return `Override rounds cannot exceed ${draft.rounds}.`;
    }
    if (
      !o.skipped &&
      Object.keys(o.patch).length === 0 &&
      !o.notes?.trim()
    ) {
      return 'Each override must skip, change a field, or add a note.';
    }
  }
  return null;
}

export async function saveClusterTemplate(
  args: SaveClusterArgs,
): Promise<{ id: string | null; error: string | null }> {
  const { userId, templateId, draft } = args;
  const rounds = Math.max(1, Math.min(99, Math.floor(draft.rounds) || 1));
  const overrides = pruneClusterOverrides(
    draft.overrides ?? [],
    draft.items,
    rounds,
  );
  const normalized: ClusterTemplateInput = {
    ...draft,
    rounds,
    overrides,
  };

  const validationError = validateDraft(normalized);
  if (validationError) return { id: null, error: validationError };

  const name = normalizeBrief(normalized.name);

  if (name) {
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
        error: `A sequence template named “${name}” already exists.`,
      };
    }
  }

  const label_id = normalized.label_id || CLUSTER_LABEL_NULL_ID;
  const label_name = normalized.label_name?.trim() || null;
  const cluster_type = label_name
    ? legacyClusterTypeFromLabel(label_name)
    : normalized.cluster_type === 'circuit'
      ? 'circuit'
      : 'superset';

  const track_duration = normalized.track_duration;
  const content: ClusterContent = {
    notes: normalized.notes?.trim() || null,
    track_duration,
    duration: track_duration ? normalized.duration ?? '00:00:00' : null,
    rounds,
    items: normalized.items.map((item) => ({
      ...item,
      kind: 'exercise' as const,
      name: item.name.trim(),
      notes: item.notes?.trim() || null,
      primary_group_id: item.track_analytics ? item.primary_group_id : null,
      analytics_tag_ids: item.track_analytics
        ? item.analytics_tag_ids ?? []
        : [],
      duration: item.track_duration ? item.duration : null,
      targets: sanitizeTargetsForShape(
        item.target_shape_id,
        buildTargets(1, item.targets),
      ),
    })),
    overrides: overrides.map((o) => ({
      ...o,
      notes: o.notes?.trim() || null,
    })),
  };

  const payload = {
    user_id: userId,
    name,
    label_id,
    cluster_type,
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
        'This sequence is still referenced. Archive it instead of deleting.',
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
