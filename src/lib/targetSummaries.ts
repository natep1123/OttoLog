/**
 * Pure target compression + coach-shorthand summaries.
 * Persist expanded targets[]; compress only for display / grouped editing.
 */

import { fieldsForTargetShape } from '../constants/targetShapeFields';
import type {
  BlockItem,
  BlockTemplateInput,
} from '../types/blockTemplate';
import type {
  ClusterExerciseItem,
  ClusterRoundOverride,
  ClusterTemplateInput,
} from '../types/clusterTemplate';
import type {
  ExerciseTarget,
  ExerciseTemplateInput,
} from '../types/exerciseTemplate';
import type { SessionTemplateInput } from '../types/sessionTemplate';
import { emptyTarget } from './exerciseTemplates';

export type TargetGroup = {
  count: number;
  target: ExerciseTarget;
};

const GROUP_SEP = ' · ';
const MAX_CHIP = 28;

function analyticsKey(value: boolean | null | undefined): string {
  if (value === false) return 'off';
  if (value === true) return 'on';
  return 'null';
}

/** Equality key for compression. Ignores `set`; respects analytics flag. */
export function targetKey(
  target: ExerciseTarget,
  targetShapeId: string,
): string {
  const fields = new Set(fieldsForTargetShape(targetShapeId));
  const parts: string[] = [`a:${analyticsKey(target.track_analytics)}`];

  if (fields.has('reps')) parts.push(`r:${target.reps ?? '∅'}`);
  if (fields.has('is_per_side')) {
    parts.push(`ps:${target.is_per_side ? 1 : 0}`);
  }
  if (fields.has('time_duration')) {
    parts.push(`t:${target.time_duration ?? '∅'}`);
  }
  if (fields.has('distance_value')) {
    parts.push(`d:${target.distance_value ?? '∅'}`);
  }
  if (fields.has('distance_unit')) {
    parts.push(`du:${target.distance_unit}`);
  }
  if (fields.has('load_unit')) parts.push(`lu:${target.load_unit}`);
  if (fields.has('load_value')) {
    parts.push(
      `lv:${target.load_unit === 'BW' ? '∅' : (target.load_value ?? '∅')}`,
    );
  }

  return parts.join('|');
}

export function targetsEqual(
  a: ExerciseTarget,
  b: ExerciseTarget,
  targetShapeId: string,
): boolean {
  return targetKey(a, targetShapeId) === targetKey(b, targetShapeId);
}

/** Run-length encode consecutive equal targets into groups. */
export function compressTargets(
  targets: ExerciseTarget[],
  targetShapeId: string,
): TargetGroup[] {
  if (!targets.length) return [];

  const groups: TargetGroup[] = [];
  for (const target of targets) {
    const last = groups[groups.length - 1];
    if (last && targetsEqual(last.target, target, targetShapeId)) {
      last.count += 1;
    } else {
      groups.push({ count: 1, target: { ...target } });
    }
  }
  return groups;
}

/** Format duration for coach shorthand. */
export function formatDurationShort(value: string | null | undefined): string | null {
  if (!value || value === '00:00:00') return null;
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return value;
  }
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatLoad(target: ExerciseTarget): string | null {
  if (target.load_unit === 'BW') return 'BW';
  if (target.load_value == null) return null;
  return `${target.load_value} ${target.load_unit}`;
}

/** Volume fragment for one target (no count, no load). */
export function formatTargetVolume(
  target: ExerciseTarget,
  targetShapeId: string,
): string | null {
  const fields = new Set(fieldsForTargetShape(targetShapeId));
  const bits: string[] = [];

  if (fields.has('time_duration')) {
    const time = formatDurationShort(target.time_duration);
    if (time) bits.push(time);
  }
  if (fields.has('reps') && target.reps != null) {
    bits.push(target.is_per_side ? `${target.reps}/side` : String(target.reps));
  }
  if (fields.has('distance_value') && target.distance_value != null) {
    bits.push(`${target.distance_value} ${target.distance_unit}`);
  }

  if (!bits.length) return null;
  return bits.join(GROUP_SEP);
}

/** One group's prescription: `3×10 @ BW` or `10 @ BW` for a lone single. */
export function formatTargetGroup(
  group: TargetGroup,
  targetShapeId: string,
  options?: { forceCount?: boolean },
): string | null {
  const volume = formatTargetVolume(group.target, targetShapeId);
  // No volume yet (blank draft) → no summary. Default BW alone is not enough.
  if (!volume) return null;

  const load = formatLoad(group.target);
  const body = load ? `${volume} @ ${load}` : volume;
  const showCount = group.count > 1 || options?.forceCount;
  return showCount ? `${group.count}×${body}` : body;
}

/** Join groups: `1×10 @ BW · 2×8 @ BW · 5×5 @ BW`. */
export function formatTargetGroups(
  groups: TargetGroup[],
  targetShapeId: string,
): string | null {
  const multi = groups.length > 1;
  const parts = groups
    .map((g) => formatTargetGroup(g, targetShapeId, { forceCount: multi }))
    .filter((s): s is string => Boolean(s));
  if (!parts.length) return null;
  return parts.join(GROUP_SEP);
}

export function formatTargets(
  targets: ExerciseTarget[],
  targetShapeId: string,
): string | null {
  return formatTargetGroups(compressTargets(targets, targetShapeId), targetShapeId);
}

function splitSummary(value: string | null): string[] {
  return value ? value.split(GROUP_SEP).filter(Boolean) : [];
}

/** One chip for every dot-separated prescription fragment. */
export function summarizeExerciseChips(
  draft: Pick<
    ExerciseTemplateInput,
    'target_shape_id' | 'default_target_shape'
  >,
): string[] {
  const groups = compressTargets(
    draft.default_target_shape,
    draft.target_shape_id,
  );
  const forceCount = groups.length > 1;
  return groups.flatMap((group) =>
    splitSummary(
      formatTargetGroup(group, draft.target_shape_id, { forceCount }),
    ),
  );
}

function truncateChip(value: string, max = MAX_CHIP): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

/** Exercise prescription for chips / library rows. */
export function summarizeExercise(
  draft: Pick<
    ExerciseTemplateInput,
    'target_shape_id' | 'default_target_shape'
  >,
  options?: { includeName?: string | null; chip?: boolean },
): string | null {
  const prescription = formatTargets(
    draft.default_target_shape,
    draft.target_shape_id,
  );
  if (!prescription) return null;
  const name = options?.includeName?.trim();
  const full = name ? `${name}${GROUP_SEP}${prescription}` : prescription;
  return options?.chip ? truncateChip(full) : full;
}

function formatOverrideChipBit(override: ClusterRoundOverride): string {
  const range =
    override.from_round === override.to_round
      ? `R${override.from_round}`
      : `R${override.from_round}–${override.to_round}`;

  if (override.skipped) return `${range} skip`;

  const { patch } = override;
  const bits: string[] = [];
  if ('reps' in patch && patch.reps != null) bits.push(String(patch.reps));
  if ('time_duration' in patch && patch.time_duration) {
    const t = formatDurationShort(patch.time_duration);
    if (t) bits.push(t);
  }
  if ('distance_value' in patch && patch.distance_value != null) {
    bits.push(
      `${patch.distance_value}${patch.distance_unit ? ` ${patch.distance_unit}` : ''}`,
    );
  }
  if ('load_unit' in patch || 'load_value' in patch) {
    if (patch.load_unit === 'BW') bits.push('BW');
    else if (patch.load_value != null) {
      bits.push(
        `${patch.load_value}${patch.load_unit ? ` ${patch.load_unit}` : ''}`.trim(),
      );
    }
  }
  if (!bits.length && override.notes?.trim()) return `${range} note`;
  if (!bits.length) return range;
  return `${range}→${bits.join(' ')}`;
}

/** Detailed cluster chips: type, rounds, exercise names, targets, overrides. */
export function summarizeClusterChips(
  draft: Pick<
    ClusterTemplateInput,
    'rounds' | 'items' | 'overrides' | 'cluster_type'
  >,
): string[] {
  const rounds = Math.max(1, draft.rounds || 1);
  const chips: string[] = [
    draft.cluster_type === 'circuit' ? 'Circuit' : 'Superset',
    `${rounds}r`,
  ];

  for (const item of draft.items) {
    chips.push(item.name.trim() || 'Exercise');
    chips.push(
      ...summarizeExerciseChips({
        target_shape_id: item.target_shape_id,
        default_target_shape: item.targets,
      }),
    );
    chips.push(
      ...(draft.overrides ?? [])
        .filter((override) => override.exercise_id === item.id)
        .map(formatOverrideChipBit),
    );
  }

  return chips;
}

function summarizeClusterExerciseLine(
  item: ClusterExerciseItem,
  rounds: number,
  overrides: ClusterRoundOverride[],
  options?: { chip?: boolean },
): string | null {
  const target = item.targets[0] ?? emptyTarget(1);
  const volume = formatTargetVolume(target, item.target_shape_id);
  const load = formatLoad(target);
  const prescription = volume
    ? load
      ? `${volume} @ ${load}`
      : volume
    : load;

  const name = item.name.trim() || 'Exercise';
  const ownOverrides = overrides.filter((o) => o.exercise_id === item.id);
  const overrideBits = ownOverrides.map(formatOverrideChipBit);

  if (options?.chip) {
    if (!prescription && !overrideBits.length) return null;
    const base = prescription ? `${name} ${prescription}` : name;
    if (!overrideBits.length) return base;
    return `${base} (${overrideBits.join(', ')})`;
  }

  const lines: string[] = [];
  if (prescription) {
    lines.push(
      rounds > 1
        ? `${name}${GROUP_SEP}${prescription}`
        : `${name}${GROUP_SEP}${prescription}`,
    );
  } else {
    lines.push(name);
  }
  for (const bit of overrideBits) {
    lines.push(`  ${bit}`);
  }
  return lines.join('\n');
}

/**
 * Full cluster summary (multi-line detail) or compact chip (`4r · Ex 10@BW`).
 */
export function summarizeCluster(
  draft: Pick<
    ClusterTemplateInput,
    'rounds' | 'items' | 'overrides' | 'cluster_type'
  >,
  options?: { chip?: boolean },
): string | null {
  const rounds = Math.max(1, draft.rounds || 1);
  const overrides = draft.overrides ?? [];
  const exerciseBits = draft.items
    .map((item) =>
      summarizeClusterExerciseLine(item, rounds, overrides, options),
    )
    .filter((s): s is string => Boolean(s));

  if (options?.chip) {
    const head = `${rounds}r`;
    if (!exerciseBits.length) return truncateChip(head);
    return truncateChip(`${head}${GROUP_SEP}${exerciseBits.join(GROUP_SEP)}`);
  }

  const lines = [`${rounds} round${rounds === 1 ? '' : 's'}`];
  if (!exerciseBits.length) return lines[0];
  lines.push(...exerciseBits);
  return lines.join('\n');
}

function summarizeBlockItem(
  item: BlockItem,
  options?: { chip?: boolean },
): string | null {
  if (item.kind === 'cluster') {
    const { kind: _k, id: _id, ...cluster } = item;
    return summarizeCluster(cluster, options);
  }
  return summarizeExercise(
    {
      target_shape_id: item.target_shape_id,
      default_target_shape: item.targets,
    },
    { includeName: item.name, chip: options?.chip },
  );
}

/** Detailed block chips, preserving the ordered mix of exercises and clusters. */
export function summarizeBlockChips(
  draft: Pick<BlockTemplateInput, 'items'>,
): string[] {
  const chips: string[] = [];
  for (const item of draft.items ?? []) {
    chips.push(item.name.trim() || (item.kind === 'cluster' ? 'Cluster' : 'Exercise'));
    if (item.kind === 'cluster') {
      const { kind: _kind, id: _id, name: _name, ...cluster } = item;
      chips.push(...summarizeClusterChips(cluster));
    } else {
      chips.push(
        ...summarizeExerciseChips({
          target_shape_id: item.target_shape_id,
          default_target_shape: item.targets,
        }),
      );
    }
  }
  return chips;
}

/** Compact block chip / detail. */
export function summarizeBlock(
  draft: Pick<BlockTemplateInput, 'items'>,
  options?: { chip?: boolean },
): string | null {
  const items = draft.items ?? [];
  if (options?.chip) {
    if (!items.length) return null;
    const exercises = items.filter((i) => i.kind === 'exercise').length;
    const clusters = items.filter((i) => i.kind === 'cluster').length;
    const bits: string[] = [];
    if (exercises) bits.push(`${exercises} ex`);
    if (clusters) bits.push(`${clusters} cl`);
    return truncateChip(bits.join(GROUP_SEP) || `${items.length} items`);
  }

  const lines = items
    .map((item) => summarizeBlockItem(item))
    .filter((s): s is string => Boolean(s));
  return lines.length ? lines.join('\n') : null;
}

/** Compact session chip / detail. */
export function summarizeSession(
  draft: Pick<SessionTemplateInput, 'blocks'>,
  options?: { chip?: boolean },
): string | null {
  const blocks = draft.blocks ?? [];
  if (options?.chip) {
    if (!blocks.length) return null;
    const n = blocks.length;
    return truncateChip(`${n} block${n === 1 ? '' : 's'}`);
  }

  const lines = blocks
    .map((block) => {
      const name = block.name.trim() || 'Block';
      const body = summarizeBlock(block);
      return body ? `${name}\n${body}` : name;
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n\n') : null;
}

/** Detailed session chips, preserving block and item order. */
export function summarizeSessionChips(
  draft: Pick<SessionTemplateInput, 'blocks'>,
): string[] {
  const chips: string[] = [];
  for (const block of draft.blocks ?? []) {
    chips.push(block.name.trim() || 'Block');
    chips.push(...summarizeBlockChips(block));
  }
  return chips;
}
