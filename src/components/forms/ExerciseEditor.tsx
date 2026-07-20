import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { TARGET_SHAPE_OPTIONS } from '../../constants/targetShapeFields';
import { NO_TOOL_ID } from '../../constants/sentinelIds';
import {
  buildTargets,
  migrateTargetsForShapeChange,
  normalizeToolIds,
  primaryToolId,
} from '../../lib/exerciseTemplates';
import { exerciseTitle, normalizeBrief } from '../../lib/displayTitles';
import {
  createAnalyticsTag,
  createPrimaryGroup,
  createTool,
  listAnalyticsTags,
  listPrimaryGroups,
  listTools,
  mergeTaxonomyOptions,
  resolveTaxonomyOptions,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { outlineExercise, summarizeExerciseChips } from '../../lib/targetSummaries';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import type { ExerciseTemplateInput } from '../../types/exerciseTemplate';
import { colors, layer, radii, typography } from '../../theme/tokens';
import { ExerciseNameSearch } from './ExerciseNameSearch';
import { DurationTrackControl } from './DurationTrackControl';
import { useExpansionController } from './ExpansionController';
import { FormSelect } from './FormSelect';
import { IconButton } from './IconButton';
import { LOCK_ROOT, useNodeLock } from './LockController';
import { LockedOutline } from './LockedOutline';
import { LockedPreviewModal } from './LockedPreviewModal';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import { SearchableSelect } from './SearchableSelect';
import { TargetsGrid } from './TargetsGrid';
import { ToggleChip } from './ToggleChip';

const exerciseControlAccent = {
  color: layer.exercise.chip.color,
  border: layer.exercise.border,
  background: layer.exercise.chip.background,
};

type Props = {
  value: ExerciseTemplateInput;
  onChange: (next: ExerciseTemplateInput) => void;
  /** Nesting context for sequence/block hosts */
  nested?: boolean;
  /**
   * Sequence subitem: one prescription per round. Sets multiplier locked to 1;
   * the parent `rounds` count repeats the sequence.
   */
  subitem?: boolean;
  /** 0-based index among exercises in the direct parent */
  orderIndex?: number;
  /** Stable lock-tree id; defaults to exercise-root / parent-provided. */
  lockId?: string;
  /** Parent node in the lock tree (null at builder root). */
  parentLockId?: string | null;
  onDelete?: () => void;
  showDelete?: boolean;
  deleteLabel?: string;
  /** When search picks a library row — parent may load that template */
  onPickTemplate?: (template: ExerciseTemplateRow) => void;
};

/**
 * Nestable exercise leaf — matches session-templator exercise anatomy:
 * coord → header (tool, name search, shape, ⋯) → more panel → targets grid.
 *
 * Tools / primary groups / tags are searchable create-comboboxes.
 * Full rename / archive / delete lives under Account → Taxonomy.
 * Sets multipliers live in the targets grid Sets column (group counts).
 */
export function ExerciseEditor({
  value,
  onChange,
  nested = false,
  subitem = false,
  orderIndex = 0,
  lockId = LOCK_ROOT.exercise,
  parentLockId = null,
  onDelete,
  showDelete = false,
  deleteLabel,
  onPickTemplate,
}: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const expansion = useExpansionController();
  const collapseExercisesSignal = expansion?.collapseExercisesSignal ?? 0;
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const collapseChildrenSignal = expansion?.collapseChildrenSignal ?? 0;
  const collapseChildrenParentId = expansion?.collapseChildrenParentId ?? null;
  const {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle,
    toggle: toggleLock,
  } = useNodeLock(lockId, parentLockId);

  const [moreOpen, setMoreOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Mount locked (e.g. parent just unlocked → own-locked children) → start collapsed.
  const [expanded, setExpanded] = useState(() => !locked);
  const [notesFocused, setNotesFocused] = useState(false);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);
  const [groups, setGroups] = useState<TaxonomyOption[]>([]);
  const [tags, setTags] = useState<TaxonomyOption[]>([]);

  // Tools → Collapse exercises (signals start at 0; skip initial).
  useEffect(() => {
    if (collapseExercisesSignal === 0) return;
    setExpanded(false);
    setMoreOpen(false);
  }, [collapseExercisesSignal]);

  // Tools → Unlock & Expand All
  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  // Parent opened → present this card collapsed (independent of lock).
  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== parentLockId) return;
    setExpanded(false);
    setMoreOpen(false);
  }, [collapseChildrenSignal, collapseChildrenParentId, parentLockId]);

  useEffect(() => {
    if (locked) setMoreOpen(false);
  }, [locked]);

  const metaChips = summarizeExerciseChips(value).map((label) => ({
    label,
    kind: 'set' as const,
  }));
  const toolWord =
    (value.tool_ids ?? [])
      .map((id) => {
        const hit = tools.find((tool) => tool.id === id);
        if (!hit || hit.label === 'None') return null;
        return hit.label;
      })
      .filter((label): label is string => Boolean(label))
      .join(', ') || null;
  const resolvedExerciseTitle = exerciseTitle(
    primaryToolId(value.tool_ids),
    toolWord,
    value.name,
    orderIndex + 1,
  );

  const patch = (partial: Partial<ExerciseTemplateInput>) => {
    onChange({ ...value, ...partial });
  };

  const refreshTaxonomy = useCallback(async () => {
    const [t, g, a] = await Promise.all([
      listTools(),
      listPrimaryGroups(),
      listAnalyticsTags(),
    ]);

    const selectedToolIds = value.tool_ids ?? [];
    const selectedGroupIds = value.primary_group_id
      ? [value.primary_group_id]
      : [];
    const selectedTagIds = value.analytics_tag_ids ?? [];

    const [rt, rg, ra] = await Promise.all([
      resolveTaxonomyOptions('tool', selectedToolIds),
      resolveTaxonomyOptions('primary_group', selectedGroupIds),
      resolveTaxonomyOptions('analytics_tag', selectedTagIds),
    ]);

    if (!t.error) setTools(mergeTaxonomyOptions(t.data, rt.data));
    if (!g.error) setGroups(mergeTaxonomyOptions(g.data, rg.data));
    if (!a.error) setTags(mergeTaxonomyOptions(a.data, ra.data));
  }, [
    value.analytics_tag_ids,
    value.primary_group_id,
    value.tool_ids,
  ]);

  useEffect(() => {
    void refreshTaxonomy();
  }, [refreshTaxonomy]);

  const onChangeTargets = (next: ExerciseTemplateInput['default_target_shape']) => {
    patch({
      default_target_shape: subitem
        ? buildTargets(1, next)
        : next,
    });
  };

  const onToggleAnalytics = () => {
    const track_analytics = !value.track_analytics;
    patch({
      track_analytics,
      primary_group_id: track_analytics ? value.primary_group_id : null,
      analytics_tag_ids: track_analytics ? value.analytics_tag_ids : [],
      default_target_shape: value.default_target_shape.map((t) => ({
        ...t,
        track_analytics: track_analytics ? (t.track_analytics ?? true) : null,
      })),
    });
  };

  const onToggleDuration = () => {
    const track_duration = !value.track_duration;
    patch({
      track_duration,
      duration: track_duration ? value.duration ?? '00:00:00' : null,
    });
  };

  return (
    <>
    <NestedLayer
      layer="exercise"
      nested={nested}
      // Locked exercises always present as the compact header + pills view —
      // expand/collapse do not change the layout while locked.
      expanded={locked ? false : expanded}
      onExpandedChange={(next) => {
        if (locked) return;
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
      metaChips={metaChips}
      title={
        locked ? (
          <Text style={styles.lockedTitle} numberOfLines={1}>
            {resolvedExerciseTitle}
          </Text>
        ) : (
          <ExerciseNameSearch
            value={value.name}
            onChangeText={(name) => patch({ name })}
            onPickTemplate={onPickTemplate}
            style={styles.titleField}
            placeholder="Search library or type a name…"
            accessibilityLabel="Exercise name"
          />
        )
      }
      trailing={
        locked ? (
          <IconButton
            kind="exercise"
            icon="maximize-2"
            accessibilityLabel="Open screenshot view"
            onPress={() => setPreviewOpen(true)}
          />
        ) : ({ expand }) => (
              <IconButton
                kind="exercise"
                active={moreOpen}
                onPress={() => {
                  expand();
                  setMoreOpen((o) => !o);
                }}
              />
            )
      }
    >
      {locked ? null : (
        <>
          <View style={styles.controlsRow}>
            <View style={styles.controlCol}>
              <Text style={styles.controlLabel}>Tools</Text>
              <SearchableSelect
                accent={exerciseControlAccent}
                fill
                mode="multi"
                options={tools}
                onOptionsChange={setTools}
                value={value.tool_ids}
                onChange={(next) => {
                  const prev = value.tool_ids ?? [];
                  const selectedNoTool =
                    next.includes(NO_TOOL_ID) && !prev.includes(NO_TOOL_ID);
                  const tool_ids =
                    selectedNoTool || next.length === 0
                      ? [NO_TOOL_ID]
                      : normalizeToolIds(next);
                  const tool_name =
                    tool_ids
                      .map((id) => {
                        const hit = tools.find((tool) => tool.id === id);
                        if (!hit || hit.label === 'None') return null;
                        return hit.label;
                      })
                      .filter((label): label is string => Boolean(label))
                      .join(', ') || null;
                  patch({ tool_ids, tool_name });
                }}
                onCreate={async (name) => {
                  if (!userId) return { data: null, error: 'Not signed in.' };
                  return createTool(userId, name);
                }}
                placeholder="Search tools…"
                emptyLabel="None"
                accessibilityLabel="Tools"
              />
            </View>
            <View style={styles.controlCol}>
              <Text style={styles.controlLabel}>Shape</Text>
              <FormSelect
                accent={exerciseControlAccent}
                fill
                options={TARGET_SHAPE_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                }))}
                value={value.target_shape_id}
                onChange={(target_shape_id) => {
                  if (target_shape_id === value.target_shape_id) return;
                  patch({
                    target_shape_id,
                    default_target_shape: migrateTargetsForShapeChange(
                      target_shape_id,
                      value.default_target_shape,
                    ),
                  });
                }}
                accessibilityLabel="Target shape"
              />
            </View>
          </View>

          <MorePanel open={moreOpen} kind="exercise">
            <DurationTrackControl
              tracked={value.track_duration}
              duration={value.duration}
              onToggle={onToggleDuration}
              onChangeDuration={(duration) => patch({ duration })}
            />

            <View style={styles.analyticsBlock}>
              <ToggleChip
                label={
                  value.track_analytics ? 'Analytics on' : 'Track analytics'
                }
                active={value.track_analytics}
                onPress={onToggleAnalytics}
              />
              {value.track_analytics ? (
                <View style={styles.analyticsFields}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      Primary analytics group
                    </Text>
                    <View style={styles.comboFull}>
                      <SearchableSelect
                        accent={exerciseControlAccent}
                        options={groups}
                        onOptionsChange={setGroups}
                        value={value.primary_group_id}
                        onChange={(primary_group_id) =>
                          patch({ primary_group_id })
                        }
                        onCreate={async (name) => {
                          if (!userId)
                            return { data: null, error: 'Not signed in.' };
                          return createPrimaryGroup(userId, name);
                        }}
                        placeholder="Search or create group…"
                        emptyLabel="Select a group"
                        clearable
                        accessibilityLabel="Primary analytics group"
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Analytics tags</Text>
                    <View style={styles.comboFull}>
                      <SearchableSelect
                        accent={exerciseControlAccent}
                        mode="multi"
                        options={tags}
                        onOptionsChange={setTags}
                        value={value.analytics_tag_ids}
                        onChange={(analytics_tag_ids) =>
                          patch({ analytics_tag_ids })
                        }
                        onCreate={async (name) => {
                          if (!userId)
                            return { data: null, error: 'Not signed in.' };
                          return createAnalyticsTag(userId, name);
                        }}
                        placeholder="Search or create tags…"
                        emptyLabel="No tags"
                        accessibilityLabel="Analytics tags"
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Coaching notes</Text>
              <TextInput
                value={value.notes ?? ''}
                onChangeText={(notes) => patch({ notes: notes || null })}
                onFocus={() => setNotesFocused(true)}
                onBlur={() => setNotesFocused(false)}
                placeholder="e.g., Focus on explosive hip drive. Keep pace steady…"
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
                <Text style={styles.deleteText}>
                  {deleteLabel ??
                    (subitem ? 'Remove from sequence' : 'Delete exercise')}
                </Text>
              </Pressable>
            ) : null}
          </MorePanel>

          <TargetsGrid
            targetShapeId={value.target_shape_id}
            targets={value.default_target_shape}
            trackAnalytics={value.track_analytics}
            referenceTitle={resolvedExerciseTitle}
            onChangeTargets={onChangeTargets}
            lockedSingle={subitem}
          />
        </>
      )}
    </NestedLayer>

    <LockedPreviewModal
      visible={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={resolvedExerciseTitle}
      subtitle={normalizeBrief(value.name)}
      layer="exercise"
      node={outlineExercise(
        {
          name: value.name,
          tool_id: primaryToolId(value.tool_ids),
          tool_name: toolWord,
          target_shape_id: value.target_shape_id,
          default_target_shape: value.default_target_shape,
        },
        { orderIndex },
      )}
    />
    </>
  );
}

const styles = StyleSheet.create({
  titleField: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  lockedTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 10,
  },
  controlCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    alignItems: 'stretch',
  },
  controlLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
    textAlign: 'center',
  },
  analyticsBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  analyticsFields: {
    alignSelf: 'stretch',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 154, 90, 0.04)',
  },
  field: {
    width: '100%',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  comboFull: {
    alignSelf: 'stretch',
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
    borderColor: layer.exercise.chip.color,
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
});
