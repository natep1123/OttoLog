import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DISTANCE_UNIT_CODES,
  LOAD_UNIT_CODES,
} from '../../constants/lockedAtoms';
import { fieldsForTargetShape } from '../../constants/targetShapeFields';
import { ChoiceChips } from '../ChoiceChips';
import type {
  ClusterExerciseItem,
  ClusterOverridePatch,
  ClusterRoundOverride,
  ClusterTemplateInput,
  ClusterTemplateRow,
} from '../../types/clusterTemplate';
import type {
  DistanceUnitCode,
  ExerciseTarget,
  ExerciseTemplateInput,
  ExerciseTemplateRow,
  LoadUnitCode,
} from '../../types/exerciseTemplate';
import {
  colors,
  layer as layerTheme,
  override as overrideTheme,
  radii,
  spacing,
  typography,
} from '../../theme/tokens';
import {
  clusterItemToExerciseDraft,
  clusterTemplateToDraft,
  defaultClusterExerciseItem,
  exerciseDraftToClusterItem,
  formatOverrideSummary,
  getClusterTemplate,
  listClusterTemplates,
  newOverrideId,
  pruneClusterOverrides,
} from '../../lib/clusterTemplates';
import {
  buildTargets,
  coercePrimaryGroupIds,
  getExerciseTemplate,
} from '../../lib/exerciseTemplates';
import { clusterTitle, clusterUiTitle, normalizeBrief } from '../../lib/displayTitles';
import {
  outlineCluster,
  summarizeClusterChips,
} from '../../lib/targetSummaries';
import { AddChildButton } from './AddChildButton';
import { ClusterSequenceDiagram } from './ClusterSequenceDiagram';
import { Disclosure } from './Disclosure';
import { DurationTrackControl } from './DurationTrackControl';
import { ExerciseEditor } from './ExerciseEditor';
import { useExpansionController } from './ExpansionController';
import { FormSelect } from './FormSelect';
import { IconButton } from './IconButton';
import { LayerLabelSelect } from './LayerLabelSelect';
import { LOCK_ROOT, useNodeLock } from './LockController';
import { LockedOutline } from './LockedOutline';
import { LockedPreviewModal } from './LockedPreviewModal';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import { RoundStepper } from './RoundStepper';
import {
  TemplateNameSearch,
  type TemplateNameSearchHandle,
} from './TemplateNameSearch';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';
import { clusterItemsLayout } from './formTokens';
import { FormArrow } from './FormArrow';
const overrideControlAccent = {
  color: overrideTheme.color,
  border: overrideTheme.border,
  background: overrideTheme.washStrong,
};
const MAX_ROUNDS = 99;

type Props = {
  value: ClusterTemplateInput;
  onChange: (next: ClusterTemplateInput) => void;
  nested?: boolean;
  /** 0-based index among sequences in the parent block */
  orderIndex?: number;
  lockId?: string;
  parentLockId?: string | null;
  onDelete?: () => void;
  showDelete?: boolean;
};

function truncateLabel(name: string, max = 10): string {
  const t = name.trim();
  if (!t) return '…';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Coarse metrics a user can choose to override (shape-dependent). */
type OverrideMetric = 'reps' | 'time' | 'distance' | 'load';

const METRIC_LABELS: Record<OverrideMetric, string> = {
  reps: 'Reps',
  time: 'Time',
  distance: 'Distance',
  load: 'Load',
};

function metricsForShape(targetShapeId: string): OverrideMetric[] {
  const fields = fieldsForTargetShape(targetShapeId);
  const metrics: OverrideMetric[] = [];
  if (fields.includes('reps')) metrics.push('reps');
  if (fields.includes('time_duration')) metrics.push('time');
  if (fields.includes('distance_value')) metrics.push('distance');
  if (fields.includes('load_value') || fields.includes('load_unit')) {
    metrics.push('load');
  }
  return metrics;
}

function baselineTarget(item: ClusterExerciseItem): ExerciseTarget {
  const targets = item.targets?.length ? item.targets : buildTargets(1);
  return targets[0];
}

function formatBaselineReps(t: ExerciseTarget): string {
  if (t.reps == null) return '—';
  return t.is_per_side ? `${t.reps} /side` : String(t.reps);
}

function formatBaselineTime(t: ExerciseTarget): string {
  return t.time_duration?.trim() || '—';
}

function formatBaselineDistance(t: ExerciseTarget): string {
  if (t.distance_value == null) return '—';
  return `${t.distance_value} ${t.distance_unit}`;
}

function formatBaselineLoad(t: ExerciseTarget): string {
  if (t.load_unit === 'BW' && (t.load_value == null || t.load_value === 0)) {
    return 'BW';
  }
  if (t.load_value == null) return t.load_unit || '—';
  return `${t.load_value} ${t.load_unit}`;
}

type OverrideDraft = {
  exercise_id: string;
  from_round: string;
  to_round: string;
  skipped: boolean;
  notes: string;
  selectedMetrics: OverrideMetric[];
  reps: string;
  is_per_side: boolean;
  load_value: string;
  load_unit: LoadUnitCode;
  time_duration: string | null;
  distance_value: string;
  distance_unit: DistanceUnitCode;
};

function emptyOverrideDraft(
  exerciseId: string,
  rounds: number,
): OverrideDraft {
  return {
    exercise_id: exerciseId,
    from_round: '1',
    to_round: String(Math.max(1, rounds)),
    skipped: false,
    notes: '',
    selectedMetrics: [],
    reps: '',
    is_per_side: false,
    load_value: '',
    load_unit: 'BW',
    time_duration: '00:00:00',
    distance_value: '',
    distance_unit: 'mi',
  };
}

/** Rehydrate the override form from a saved exception. */
function draftFromOverride(
  override: ClusterRoundOverride,
  rounds: number,
): OverrideDraft {
  const { patch } = override;
  const selectedMetrics: OverrideMetric[] = [];
  if (!override.skipped) {
    if ('reps' in patch || 'is_per_side' in patch) selectedMetrics.push('reps');
    if ('time_duration' in patch) selectedMetrics.push('time');
    if ('distance_value' in patch || 'distance_unit' in patch) {
      selectedMetrics.push('distance');
    }
    if ('load_value' in patch || 'load_unit' in patch) {
      selectedMetrics.push('load');
    }
  }

  return {
    exercise_id: override.exercise_id,
    from_round: String(
      Math.max(1, Math.min(rounds, override.from_round)),
    ),
    to_round: String(
      Math.max(
        Math.max(1, Math.min(rounds, override.from_round)),
        Math.min(rounds, override.to_round),
      ),
    ),
    skipped: override.skipped,
    notes: override.notes ?? '',
    selectedMetrics,
    reps: patch.reps != null ? String(patch.reps) : '',
    is_per_side: patch.is_per_side ?? false,
    load_value: patch.load_value != null ? String(patch.load_value) : '',
    load_unit: patch.load_unit ?? 'BW',
    time_duration: patch.time_duration ?? '00:00:00',
    distance_value:
      patch.distance_value != null ? String(patch.distance_value) : '',
    distance_unit: patch.distance_unit ?? 'mi',
  };
}

function seedMetricFromBaseline(
  draft: OverrideDraft,
  metric: OverrideMetric,
  baseline: ExerciseTarget,
): OverrideDraft {
  switch (metric) {
    case 'reps':
      return {
        ...draft,
        reps: baseline.reps != null ? String(baseline.reps) : '',
        is_per_side: baseline.is_per_side,
      };
    case 'time':
      return {
        ...draft,
        time_duration: baseline.time_duration ?? '00:00:00',
      };
    case 'distance':
      return {
        ...draft,
        distance_value:
          baseline.distance_value != null
            ? String(baseline.distance_value)
            : '',
        distance_unit: baseline.distance_unit,
      };
    case 'load':
      return {
        ...draft,
        load_value:
          baseline.load_value != null ? String(baseline.load_value) : '',
        load_unit: baseline.load_unit,
      };
    default:
      return draft;
  }
}


/**
 * Nestable sequence editor — rounds (each) model with sequence strip,
 * per-round ExerciseEditor subitems, and sparse round-range overrides.
 */
export function ClusterEditor({
  value,
  onChange,
  nested = false,
  orderIndex = 0,
  lockId = LOCK_ROOT.cluster,
  parentLockId = null,
  onDelete,
  showDelete = false,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const collapseChildrenSignal = expansion?.collapseChildrenSignal ?? 0;
  const collapseChildrenParentId = expansion?.collapseChildrenParentId ?? null;
  const {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle,
    toggle: toggleLock,
  } = useNodeLock(lockId, parentLockId, () =>
    value.items.map((item) => item.id),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  // Builder root starts open (library review: locked + expanded outline).
  // Nested cards that remount own-locked after a parent unlock start collapsed.
  const [expanded, setExpanded] = useState(() =>
    parentLockId == null ? true : !locked,
  );
  const [visualizeOpen, setVisualizeOpen] = useState(false);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const nameSearchRef = useRef<TemplateNameSearchHandle>(null);
  const [addingOverride, setAddingOverride] = useState(false);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== parentLockId) return;
    setExpanded(false);
    setMoreOpen(false);
  }, [collapseChildrenSignal, collapseChildrenParentId, parentLockId]);

  useEffect(() => {
    if (locked) {
      setMoreOpen(false);
      setVisualizeOpen(false);
      setOverridesOpen(false);
      setAddingOverride(false);
    }
  }, [locked]);

  useEffect(() => {
    if (!moreOpen || !focusNamePending) return;
    const id = requestAnimationFrame(() => {
      nameSearchRef.current?.focus();
      setFocusNamePending(false);
    });
    return () => cancelAnimationFrame(id);
  }, [moreOpen, focusNamePending]);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(
    null,
  );
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(
    null,
  );
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const rounds = Math.max(1, Math.min(MAX_ROUNDS, value.rounds || 1));

  const patch = (partial: Partial<ClusterTemplateInput>) => {
    onChange({ ...value, ...partial });
  };

  const setRounds = (nextRaw: number) => {
    const next = Math.max(1, Math.min(MAX_ROUNDS, Math.floor(nextRaw) || 1));
    patch({
      rounds: next,
      overrides: pruneClusterOverrides(
        value.overrides ?? [],
        value.items,
        next,
      ),
    });
  };

  const onToggleDuration = () => {
    const track_duration = !value.track_duration;
    patch({
      track_duration,
      duration: track_duration ? value.duration ?? '00:00:00' : null,
    });
  };

  const updateItem = (index: number, draft: ExerciseTemplateInput) => {
    const items = [...value.items];
    const clamped: ExerciseTemplateInput = {
      ...draft,
      default_target_shape: buildTargets(1, draft.default_target_shape),
    };
    items[index] = exerciseDraftToClusterItem(clamped, items[index].id);
    patch({ items });
  };

  const removeItem = (index: number) => {
    const items = value.items.filter((_, i) => i !== index);
    patch({
      items,
      overrides: pruneClusterOverrides(
        value.overrides ?? [],
        items,
        rounds,
      ),
    });
  };

  const addItem = () => {
    patch({ items: [...value.items, defaultClusterExerciseItem()] });
  };

  const onPickClusterTemplate = async (row: ClusterTemplateRow) => {
    const { data, error } = await getClusterTemplate(row.id);
    if (error || !data) return;
    onChange(clusterTemplateToDraft(data));
  };

  const onPickExerciseTemplate = async (
    index: number,
    row: ExerciseTemplateRow,
  ) => {
    const { data, error } = await getExerciseTemplate(row.id);
    if (error || !data) return;
    const targets = Array.isArray(data.default_target_shape)
      ? data.default_target_shape
      : [];
    // Nested copy: keep first target as the per-round default when the
    // library exercise had many consecutive sets.
    const perRound =
      targets.length > 1 ? [targets[0]] : targets.length ? targets : buildTargets(1);
    updateItem(index, {
      name: data.name ?? '',
      tool_ids: data.tool_ids?.length ? data.tool_ids : [data.tool_id],
      tool_name:
        (data.tool_names ?? [])
          .filter((n) => n && n !== 'None')
          .join(', ') || null,
      target_shape_id: data.target_shape_id,
      track_analytics: data.track_analytics,
      primary_group_ids: coercePrimaryGroupIds({
        primary_group_ids: data.primary_group_ids,
        primary_group_id: data.primary_group_id,
      }),
      primary_group_id: data.primary_group_id,
      analytics_tag_ids: data.analytics_tag_ids,
      muscle_group_ids: data.muscle_group_ids,
      default_target_shape: perRound.map((t, i) => ({ ...t, set: i + 1 })),
      track_duration: data.track_duration,
      duration: data.duration,
      notes: data.notes,
    });
  };

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of value.items) map.set(item.id, item.name);
    return map;
  }, [value.items]);

  const startAddOverride = () => {
    if (value.items.length === 0) return;
    setOverrideError(null);
    setEditingOverrideId(null);
    setOverrideDraft(emptyOverrideDraft(value.items[0].id, rounds));
    setAddingOverride(true);
    setOverridesOpen(true);
    setExpanded(true);
  };

  const startEditOverride = (override: ClusterRoundOverride) => {
    setOverrideError(null);
    setEditingOverrideId(override.id);
    setOverrideDraft(draftFromOverride(override, rounds));
    setAddingOverride(true);
    setOverridesOpen(true);
    setExpanded(true);
  };

  const cancelAddOverride = () => {
    setAddingOverride(false);
    setEditingOverrideId(null);
    setOverrideDraft(null);
    setOverrideError(null);
  };

  const commitOverride = () => {
    if (!overrideDraft) return;
    const from = Math.floor(Number(overrideDraft.from_round));
    const to = Math.floor(Number(overrideDraft.to_round));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
      setOverrideError('Round range must be valid (from ≤ to, starting at 1).');
      return;
    }
    if (to > rounds) {
      setOverrideError(`Rounds cannot exceed ${rounds}.`);
      return;
    }
    const item = value.items.find((i) => i.id === overrideDraft.exercise_id);
    if (!item) {
      setOverrideError('Pick an exercise in this sequence.');
      return;
    }

    const notes = overrideDraft.notes.trim() || null;
    const patchFields: ClusterOverridePatch = {};
    const selected = new Set(overrideDraft.selectedMetrics);
    const shapeFields = fieldsForTargetShape(item.target_shape_id);

    if (!overrideDraft.skipped) {
      if (selected.has('reps')) {
        const repsTrim = overrideDraft.reps.trim();
        if (repsTrim === '') {
          setOverrideError('Enter override reps.');
          return;
        }
        const reps = Number(repsTrim);
        if (!Number.isFinite(reps)) {
          setOverrideError('Reps must be a number.');
          return;
        }
        patchFields.reps = reps;
        if (shapeFields.includes('is_per_side')) {
          patchFields.is_per_side = overrideDraft.is_per_side;
        }
      }
      if (selected.has('time')) {
        const t = overrideDraft.time_duration;
        patchFields.time_duration =
          !t || t === '00:00:00' ? null : t;
      }
      if (selected.has('distance')) {
        const distTrim = overrideDraft.distance_value.trim();
        if (distTrim === '') {
          patchFields.distance_value = null;
        } else {
          const distance_value = Number(distTrim);
          if (!Number.isFinite(distance_value)) {
            setOverrideError('Distance must be a number.');
            return;
          }
          // 0 means unset — same as time 00:00:00 → null.
          patchFields.distance_value =
            distance_value === 0 ? null : distance_value;
        }
        patchFields.distance_unit = overrideDraft.distance_unit;
      }
      if (selected.has('load')) {
        if (overrideDraft.load_unit === 'BW') {
          patchFields.load_value = null;
        } else {
          const loadTrim = overrideDraft.load_value.trim();
          if (loadTrim === '') {
            patchFields.load_value = null;
          } else {
            const load_value = Number(loadTrim);
            if (!Number.isFinite(load_value)) {
              setOverrideError('Load must be a number.');
              return;
            }
            patchFields.load_value = load_value;
          }
        }
        patchFields.load_unit = overrideDraft.load_unit;
      }
    }

    if (
      !overrideDraft.skipped &&
      Object.keys(patchFields).length === 0 &&
      !notes
    ) {
      setOverrideError('Skip, choose a metric to change, or add a note.');
      return;
    }

    const next: ClusterRoundOverride = {
      id: editingOverrideId ?? newOverrideId(),
      exercise_id: overrideDraft.exercise_id,
      from_round: from,
      to_round: to,
      skipped: overrideDraft.skipped,
      notes,
      patch: overrideDraft.skipped ? {} : patchFields,
    };

    const existing = value.overrides ?? [];
    patch({
      overrides: editingOverrideId
        ? existing.map((o) => (o.id === editingOverrideId ? next : o))
        : [...existing, next],
    });
    cancelAddOverride();
  };

  const selectedOverrideItem = value.items.find(
    (i) => i.id === overrideDraft?.exercise_id,
  );
  const availableMetrics = selectedOverrideItem
    ? metricsForShape(selectedOverrideItem.target_shape_id)
    : [];
  const baseline = selectedOverrideItem
    ? baselineTarget(selectedOverrideItem)
    : null;
  const shapeFields = selectedOverrideItem
    ? fieldsForTargetShape(selectedOverrideItem.target_shape_id)
    : [];

  // Drop metric toggles that no longer exist when the exercise shape changes
  // while the override form is open (e.g. reps → time).
  useEffect(() => {
    if (!selectedOverrideItem) return;
    const allowed = new Set(
      metricsForShape(selectedOverrideItem.target_shape_id),
    );
    setOverrideDraft((prev) => {
      if (!prev) return prev;
      const nextSelected = prev.selectedMetrics.filter((m) => allowed.has(m));
      if (nextSelected.length === prev.selectedMetrics.length) return prev;
      return { ...prev, selectedMetrics: nextSelected };
    });
  }, [selectedOverrideItem?.id, selectedOverrideItem?.target_shape_id]);

  // Keep override range inside the current sequence rounds.
  useEffect(() => {
    setOverrideDraft((prev) => {
      if (!prev) return prev;
      const fromRaw = Number.parseInt(prev.from_round, 10);
      const toRaw = Number.parseInt(prev.to_round, 10);
      const from = Math.max(
        1,
        Math.min(rounds, Number.isFinite(fromRaw) ? fromRaw : 1),
      );
      const to = Math.max(
        from,
        Math.min(rounds, Number.isFinite(toRaw) ? toRaw : rounds),
      );
      if (
        String(from) === prev.from_round &&
        String(to) === prev.to_round
      ) {
        return prev;
      }
      return {
        ...prev,
        from_round: String(from),
        to_round: String(to),
      };
    });
  }, [rounds]);

  const toggleMetric = (metric: OverrideMetric) => {
    if (!overrideDraft || !baseline) return;
    const on = overrideDraft.selectedMetrics.includes(metric);
    if (on) {
      setOverrideDraft({
        ...overrideDraft,
        selectedMetrics: overrideDraft.selectedMetrics.filter(
          (m) => m !== metric,
        ),
      });
      return;
    }
    setOverrideDraft(
      seedMetricFromBaseline(
        {
          ...overrideDraft,
          selectedMetrics: [...overrideDraft.selectedMetrics, metric],
        },
        metric,
        baseline,
      ),
    );
  };

  const onOverrideExerciseChange = (exercise_id: string) => {
    if (!overrideDraft) return;
    setOverrideDraft({
      ...emptyOverrideDraft(exercise_id, rounds),
      from_round: overrideDraft.from_round,
      to_round: overrideDraft.to_round,
      skipped: overrideDraft.skipped,
      notes: overrideDraft.notes,
    });
  };

  const removeOverride = (id: string) => {
    patch({
      overrides: (value.overrides ?? []).filter((o) => o.id !== id),
    });
  };

  return (
    <>
    <NestedLayer
      layer="cluster"
      nested={nested}
      expanded={expanded}
      onExpandedChange={(next) => {
        const opening = next && !expanded;
        setExpanded(next);
        if (!next) setMoreOpen(false);
        if (opening) expansion?.collapseChildrenOf(lockId);
      }}
      locked={locked}
      onToggleLock={
        canToggle || forcedByAncestor
          ? () => {
              const unlocking = ownLocked;
              toggleLock();
              if (unlocking) expansion?.collapseChildrenOf(lockId);
            }
          : undefined
      }
      lockDisabled={forcedByAncestor}
      metaChips={summarizeClusterChips(value).map((label) => ({
        label,
        kind: 'exercise',
      }))}
      label={
        locked ? (
          <Text style={styles.lockedLabel} numberOfLines={1}>
            {value.label_name?.trim() || 'Sequence'}
          </Text>
        ) : (
          <LayerLabelSelect
            kind="cluster_label"
            value={value.label_id}
            labelName={value.label_name}
            onChange={(label_id, label_name) =>
              patch({
                label_id,
                label_name,
                cluster_type:
                  label_name.trim().toLowerCase() === 'circuit'
                    ? 'circuit'
                    : 'superset',
              })
            }
            accessibilityLabel="Sequence label"
          />
        )
      }
      collapsedBrief={clusterTitle(
        value.label_id,
        value.label_name,
        value.name,
        orderIndex,
      )}
      trailing={
        locked ? (
          <IconButton
            kind="cluster"
            icon="maximize-2"
            accessibilityLabel="Open screenshot view"
            onPress={() => setPreviewOpen(true)}
          />
        ) : ({ expand }) => (
              <>
                <IconButton
                  kind="cluster"
                  icon="search"
                  active={moreOpen && (nameFocused || focusNamePending)}
                  accessibilityLabel="Name, brief, or search library"
                  onPress={() => {
                    expand();
                    setMoreOpen(true);
                    setFocusNamePending(true);
                  }}
                />
                <IconButton
                  kind="cluster"
                  active={moreOpen}
                  onPress={() => {
                    expand();
                    setMoreOpen((o) => !o);
                  }}
                />
              </>
            )
      }
    >
      {locked ? (
        <LockedOutline
          node={outlineCluster(value, { orderIndex })}
          layer="cluster"
        />
      ) : (
        <>
          <MorePanel open={moreOpen} kind="cluster">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name / Brief</Text>
              <TemplateNameSearch
                ref={nameSearchRef}
                kind="cluster"
                value={value.name}
                onChangeText={(name) => patch({ name })}
                listTemplates={listClusterTemplates}
                getDisplayTitle={(row) =>
                  clusterTitle(row.label_id, row.label_name, row.name, 0)
                }
                onPickTemplate={(row) => {
                  void onPickClusterTemplate(row);
                }}
                onFocusChange={setNameFocused}
                placeholder="Search library or type a brief…"
                accessibilityLabel="Sequence name or brief"
                style={styles.nameField}
              />
            </View>

            <DurationTrackControl
              tracked={value.track_duration}
              duration={value.duration}
              onToggle={onToggleDuration}
              onChangeDuration={(duration) => patch({ duration })}
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sequence Notes</Text>
              <TextInput
                value={value.notes ?? ''}
                onChangeText={(notes) => patch({ notes: notes || null })}
                onFocus={() => setNotesFocused(true)}
                onBlur={() => setNotesFocused(false)}
                placeholder="e.g., Minimal rest between exercises. Three rounds…"
                placeholderTextColor={colors.textDim}
                multiline
                style={[
                  styles.fieldInput,
                  styles.notes,
                  notesFocused && styles.notesFocused,
                ]}
              />
            </View>

            {showDelete && onDelete ? (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && styles.deletePressed,
                ]}
              >
                <Text style={styles.deleteText}>Delete sequence</Text>
              </Pressable>
            ) : null}
          </MorePanel>

          <View style={styles.eachRoundHeader}>
            <View style={styles.eachRoundTitleRow}>
              <View style={styles.eachRoundSide}>
                <Text style={styles.sectionTitle}>Exercises</Text>
              </View>
              <Pressable
                onPress={() => setVisualizeOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ selected: visualizeOpen }}
                accessibilityLabel={visualizeOpen ? 'Hide map' : 'Show map'}
                style={({ pressed }) => [
                  styles.mapToggle,
                  { borderColor: layerTheme.cluster.chip.color },
                  visualizeOpen && {
                    backgroundColor: layerTheme.cluster.chip.background,
                  },
                  pressed && styles.mapTogglePressed,
                ]}
              >
                <Text
                  style={[
                    styles.mapToggleText,
                    { color: layerTheme.cluster.chip.color },
                  ]}
                >
                  {visualizeOpen ? 'MAP ON' : 'MAP OFF'}
                </Text>
              </Pressable>
              <View style={[styles.eachRoundSide, styles.eachRoundSideRight]}>
                <View style={styles.roundsInline}>
                  <Text style={styles.roundsInlineLabel}>ROUNDS</Text>
                  <TextInput
                    value={String(rounds)}
                    onChangeText={(raw) =>
                      setRounds(
                        Math.max(
                          1,
                          Math.min(MAX_ROUNDS, Number.parseInt(raw, 10) || 1),
                        ),
                      )
                    }
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={styles.roundsInput}
                    accessibilityLabel="Number of rounds"
                  />
                </View>
              </View>
            </View>
          </View>

          {visualizeOpen ? (
            <ClusterSequenceDiagram items={value.items} showLabel={false} />
          ) : null}

          <View style={styles.items}>
            {value.items.map((item: ClusterExerciseItem, index: number) => (
              <ExerciseEditor
                key={item.id}
                value={clusterItemToExerciseDraft(item)}
                onChange={(draft) => updateItem(index, draft)}
                nested
                subitem
                orderIndex={index}
                lockId={item.id}
                parentLockId={lockId}
                showDelete
                onDelete={() => removeItem(index)}
                onPickTemplate={(row) => {
                  void onPickExerciseTemplate(index, row);
                }}
              />
            ))}
          </View>

          <AddChildButton
            childKind="exercise"
            parentTitle={clusterUiTitle(value.label_name)}
            onPress={addItem}
            style={styles.addBtn}
          />

          <View
            style={[
              styles.overrides,
              !overridesOpen && styles.overridesCollapsed,
            ]}
          >
            <Disclosure
              label="Overrides"
              open={overridesOpen}
              onToggle={() => setOverridesOpen((o) => !o)}
              tight
              accentColor={overrideTheme.color}
              hint="Changes for selected rounds."
            >
        {(value.overrides ?? []).length === 0 && !addingOverride ? (
          <Text style={styles.overridesEmpty}>No overrides yet.</Text>
        ) : null}

        {(value.overrides ?? [])
          .filter((o) => o.id !== editingOverrideId)
          .map((o) => (
          <View key={o.id} style={styles.overrideRow}>
            <Text style={styles.overrideText}>
              {formatOverrideSummary(
                o,
                nameById.get(o.exercise_id) ?? 'Exercise',
              )}
            </Text>
            <View style={styles.overrideRowActions}>
              <Pressable
                onPress={() => startEditOverride(o)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit override"
                style={({ pressed }) => [
                  styles.overrideIconBtn,
                  pressed && styles.overrideIconBtnPressed,
                ]}
              >
                <Feather name="edit-2" size={15} color={overrideTheme.color} />
              </Pressable>
              <Pressable
                onPress={() => removeOverride(o.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove override"
              >
                <Text style={styles.overrideRemove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {addingOverride && overrideDraft ? (
          <View style={styles.overrideForm}>
            <Text style={styles.fieldLabel}>Exercise</Text>
            <ChoiceChips
              options={value.items.map((item) => ({
                id: item.id,
                label: truncateLabel(item.name || 'Untitled', 14),
              }))}
              value={overrideDraft.exercise_id}
              onChange={onOverrideExerciseChange}
              accent={overrideControlAccent}
            />

            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <Text style={styles.fieldLabel}>From round</Text>
                <RoundStepper
                  value={Math.max(
                    1,
                    Math.min(
                      rounds,
                      Number.parseInt(overrideDraft.from_round, 10) || 1,
                    ),
                  )}
                  onChange={(from) => {
                    const to = Math.max(
                      from,
                      Math.min(
                        rounds,
                        Number.parseInt(overrideDraft.to_round, 10) || from,
                      ),
                    );
                    setOverrideDraft({
                      ...overrideDraft,
                      from_round: String(from),
                      to_round: String(to),
                    });
                  }}
                  min={1}
                  max={rounds}
                  accessibilityLabel="From round"
                  accent={overrideControlAccent}
                />
              </View>
              <View style={styles.rangeField}>
                <Text style={styles.fieldLabel}>To round</Text>
                <RoundStepper
                  value={Math.max(
                    1,
                    Math.min(
                      rounds,
                      Number.parseInt(overrideDraft.to_round, 10) || rounds,
                    ),
                  )}
                  onChange={(to) => {
                    const from = Math.min(
                      to,
                      Math.max(
                        1,
                        Number.parseInt(overrideDraft.from_round, 10) || 1,
                      ),
                    );
                    setOverrideDraft({
                      ...overrideDraft,
                      from_round: String(from),
                      to_round: String(to),
                    });
                  }}
                  min={1}
                  max={rounds}
                  accessibilityLabel="To round"
                  accent={overrideControlAccent}
                />
              </View>
            </View>

            <ToggleChip
              label={overrideDraft.skipped ? 'Skipped' : 'Skip these rounds'}
              active={overrideDraft.skipped}
              accent={overrideControlAccent}
              onPress={() =>
                setOverrideDraft({
                  ...overrideDraft,
                  skipped: !overrideDraft.skipped,
                  selectedMetrics: !overrideDraft.skipped
                    ? []
                    : overrideDraft.selectedMetrics,
                })
              }
            />
            {overrideDraft.skipped ? (
              <Text style={styles.skippedHint}>
                Skipped rounds are not logged as zero-rep sets.
              </Text>
            ) : null}

            {!overrideDraft.skipped && baseline ? (
              <View style={styles.overrideFields}>
                <Text style={styles.fieldLabel}>Change</Text>
                <View style={styles.metricRow}>
                  {availableMetrics.map((metric) => {
                    const active =
                      overrideDraft.selectedMetrics.includes(metric);
                    return (
                      <Pressable
                        key={metric}
                        onPress={() => toggleMetric(metric)}
                        style={({ pressed }) => [
                          styles.metricChip,
                          active && styles.metricChipActive,
                          pressed && styles.metricChipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.metricChipText,
                            active && styles.metricChipTextActive,
                          ]}
                        >
                          {METRIC_LABELS[metric]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {overrideDraft.selectedMetrics.includes('reps') ? (
                  <View style={styles.compareRow}>
                    <Text style={styles.compareCurrent} numberOfLines={1}>
                      {formatBaselineReps(baseline)}
                    </Text>
                    <Text style={styles.compareArrow}>→</Text>
                    <View style={styles.compareEdit}>
                      <TextInput
                        value={overrideDraft.reps}
                        onChangeText={(reps) =>
                          setOverrideDraft({ ...overrideDraft, reps })
                        }
                        keyboardType="number-pad"
                        selectTextOnFocus
                        style={styles.compareInput}
                        accessibilityLabel="Override reps"
                      />
                      {shapeFields.includes('is_per_side') ? (
                        <ToggleChip
                          label={
                            overrideDraft.is_per_side ? 'Per side' : 'Total'
                          }
                          active={overrideDraft.is_per_side}
                          size="compact"
                          accent={overrideControlAccent}
                          onPress={() =>
                            setOverrideDraft({
                              ...overrideDraft,
                              is_per_side: !overrideDraft.is_per_side,
                            })
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {overrideDraft.selectedMetrics.includes('time') ? (
                  <View style={styles.compareRow}>
                    <Text style={styles.compareCurrent} numberOfLines={1}>
                      {formatBaselineTime(baseline)}
                    </Text>
                    <Text style={styles.compareArrow}>→</Text>
                    <View style={styles.compareEdit}>
                      <TimePartsInput
                        value={overrideDraft.time_duration}
                        onChange={(time_duration) =>
                          setOverrideDraft({
                            ...overrideDraft,
                            time_duration,
                          })
                        }
                      />
                    </View>
                  </View>
                ) : null}

                {overrideDraft.selectedMetrics.includes('distance') ? (
                  <View style={styles.compareRow}>
                    <Text style={styles.compareCurrent} numberOfLines={1}>
                      {formatBaselineDistance(baseline)}
                    </Text>
                    <Text style={styles.compareArrow}>→</Text>
                    <View style={styles.compareEdit}>
                      <TextInput
                        value={overrideDraft.distance_value}
                        onChangeText={(distance_value) =>
                          setOverrideDraft({
                            ...overrideDraft,
                            distance_value,
                          })
                        }
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        style={styles.compareInput}
                        accessibilityLabel="Override distance"
                      />
                      <FormSelect
                        options={DISTANCE_UNIT_CODES.map((u) => ({
                          id: u,
                          label: u,
                        }))}
                        value={overrideDraft.distance_unit}
                        onChange={(distance_unit) =>
                          setOverrideDraft({
                            ...overrideDraft,
                            distance_unit: distance_unit as DistanceUnitCode,
                          })
                        }
                        compact
                        accent={overrideControlAccent}
                        accessibilityLabel="Override distance unit"
                      />
                    </View>
                  </View>
                ) : null}

                {overrideDraft.selectedMetrics.includes('load') ? (
                  <View style={styles.compareRow}>
                    <Text style={styles.compareCurrent} numberOfLines={1}>
                      {formatBaselineLoad(baseline)}
                    </Text>
                    <Text style={styles.compareArrow}>→</Text>
                    <View style={styles.compareEdit}>
                      <TextInput
                        value={
                          overrideDraft.load_unit === 'BW'
                            ? ''
                            : overrideDraft.load_value
                        }
                        onChangeText={(load_value) =>
                          setOverrideDraft({ ...overrideDraft, load_value })
                        }
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        editable={overrideDraft.load_unit !== 'BW'}
                        style={[
                          styles.compareInput,
                          overrideDraft.load_unit === 'BW' &&
                            styles.compareInputDisabled,
                        ]}
                        placeholder="—"
                        placeholderTextColor={colors.textDim}
                        accessibilityLabel="Override load"
                      />
                      <FormSelect
                        options={LOAD_UNIT_CODES.map((u) => ({
                          id: u,
                          label: u,
                        }))}
                        value={overrideDraft.load_unit}
                        onChange={(load_unit) =>
                          setOverrideDraft({
                            ...overrideDraft,
                            load_unit: load_unit as LoadUnitCode,
                            ...(load_unit === 'BW'
                              ? { load_value: '' }
                              : {}),
                          })
                        }
                        compact
                        accent={overrideControlAccent}
                        accessibilityLabel="Override load unit"
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={overrideDraft.notes}
                onChangeText={(notes) =>
                  setOverrideDraft({ ...overrideDraft, notes })
                }
                placeholder="Why this override, or a note for these rounds…"
                placeholderTextColor={colors.textDim}
                multiline
                style={[
                  styles.fieldInput,
                  styles.notes,
                  styles.overrideInput,
                ]}
              />
            </View>

            {overrideError ? (
              <Text style={styles.overrideError}>{overrideError}</Text>
            ) : null}

            <View style={styles.overrideActions}>
              <Pressable
                onPress={commitOverride}
                style={({ pressed }) => [
                  styles.overrideSave,
                  pressed && styles.overridePressed,
                ]}
              >
                <Text style={styles.overrideSaveText}>
                  {editingOverrideId ? 'Save changes' : 'Add override'}
                </Text>
              </Pressable>
              <Pressable onPress={cancelAddOverride} hitSlop={8}>
                <Text style={styles.overrideCancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={startAddOverride}
            disabled={value.items.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Add override to ${clusterUiTitle(
              value.label_name,
            )}`}
            style={({ pressed }) => [
              styles.addOverrideBtn,
              pressed && styles.overridePressed,
              value.items.length === 0 && styles.addDisabled,
            ]}
          >
            <View style={styles.addOverrideContent}>
              <Text style={styles.addOverrideText} numberOfLines={1}>
                + Add override
              </Text>
              <View style={styles.addOverrideArrowSlot}>
                <FormArrow color={colors.textDim} />
              </View>
              <Text
                style={styles.addOverrideReference}
                numberOfLines={1}
              >
                {clusterUiTitle(value.label_name)}
              </Text>
            </View>
          </Pressable>
        )}
            </Disclosure>
          </View>
        </>
      )}
    </NestedLayer>

    <LockedPreviewModal
      visible={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={clusterUiTitle(value.label_name)}
      subtitle={normalizeBrief(value.name)}
      layer="cluster"
      node={outlineCluster(value, { orderIndex })}
    />
    </>
  );
}

const styles = StyleSheet.create({
  titleField: {
    flex: 1,
    minWidth: 0,
  },
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
  nameField: {
    width: '100%',
    minWidth: 0,
  },
  field: {
    width: '100%',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  fieldInput: {
    fontFamily: typography.font,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  notesFocused: {
    borderColor: layerTheme.cluster.chip.color,
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 76, 0.35)',
    borderRadius: radii.sm,
  },
  deletePressed: {
    backgroundColor: 'rgba(232, 93, 76, 0.12)',
    borderColor: colors.sunset,
  },
  deleteText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.sunset,
  },
  eachRoundHeader: {
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 16,
  },
  eachRoundTitleRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eachRoundSide: {
    flex: 1,
    minWidth: 0,
  },
  eachRoundSideRight: {
    alignItems: 'flex-end',
  },
  roundsInline: {
    position: 'relative',
    width: 56,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsInlineLabel: {
    position: 'absolute',
    top: -16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  roundsInput: {
    width: 44,
    textAlign: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  mapToggle: {
    height: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  mapTogglePressed: {
    opacity: 0.75,
  },
  mapToggleText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  items: {
    gap: spacing.sm,
    marginTop: 0,
    ...clusterItemsLayout,
  },
  addBtn: {
    // Match session/block: items inset + body gap above; even space to the
    // overrides rule below (overrides.marginTop pairs with this).
    marginTop: 0,
    marginBottom: 0,
  },
  addPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  addDisabled: {
    opacity: 0.4,
  },
  overrides: {
    // Even with space above + Add exercise (body gap 4 + this 8 ≈ 12).
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: overrideTheme.borderSoft,
  },
  overridesCollapsed: {
    marginBottom: spacing.xs,
  },
  overridesEmpty: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: overrideTheme.border,
    borderRadius: radii.sm,
    backgroundColor: overrideTheme.wash,
  },
  overrideText: {
    flex: 1,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.text,
  },
  overrideRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  overrideIconBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: overrideTheme.border,
    borderRadius: radii.sm,
    backgroundColor: overrideTheme.wash,
  },
  overrideIconBtnPressed: {
    opacity: 0.7,
  },
  overrideRemove: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunset,
  },
  overrideForm: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: overrideTheme.border,
    borderRadius: radii.md,
    backgroundColor: overrideTheme.wash,
  },
  overrideFields: {
    gap: spacing.sm,
  },
  skippedHint: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: overrideTheme.borderSoft,
    backgroundColor: colors.bgInset,
  },
  metricChipActive: {
    borderColor: overrideTheme.color,
    backgroundColor: overrideTheme.washStrong,
  },
  metricChipPressed: {
    borderColor: overrideTheme.color,
  },
  metricChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  metricChipTextActive: {
    color: overrideTheme.color,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: overrideTheme.borderSoft,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  compareCurrent: {
    flexShrink: 1,
    minWidth: 52,
    maxWidth: 88,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textDim,
  },
  compareArrow: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.dusk,
  },
  compareEdit: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  compareInput: {
    minWidth: 52,
    maxWidth: 72,
    textAlign: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: overrideTheme.border,
    borderRadius: radii.sm,
  },
  overrideInput: {
    borderColor: overrideTheme.border,
    backgroundColor: colors.bgInset,
  },
  compareInputDisabled: {
    opacity: 0.35,
  },
  unchangedHint: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textDim,
  },
  clearField: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: colors.dusk,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rangeField: {
    flex: 1,
    gap: 6,
  },
  overrideError: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.sunset,
  },
  overrideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  // Outline style like + Add override (not the full pink wash).
  overrideSave: {
    height: 32,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: overrideTheme.color,
  },
  overrideSaveText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: overrideTheme.color,
  },
  overrideCancel: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  overridePressed: {
    opacity: 0.72,
  },
  addOverrideBtn: {
    width: '92%',
    height: 32,
    alignSelf: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: overrideTheme.color,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  addOverrideContent: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOverrideText: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: overrideTheme.color,
    textAlign: 'left',
  },
  addOverrideArrowSlot: {
    width: 28,
    flexShrink: 0,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOverrideReference: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: overrideTheme.color,
    opacity: 0.62,
    textAlign: 'left',
  },
});
