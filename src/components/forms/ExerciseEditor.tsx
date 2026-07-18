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
import {
  buildTargets,
  migrateTargetsForShapeChange,
} from '../../lib/exerciseTemplates';
import { exerciseTitle } from '../../lib/displayTitles';
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
import { summarizeExerciseChips } from '../../lib/targetSummaries';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import type { ExerciseTemplateInput } from '../../types/exerciseTemplate';
import { colors, layer, radii, typography } from '../../theme/tokens';
import { ExerciseNameSearch } from './ExerciseNameSearch';
import { useExpansionController } from './ExpansionController';
import { FormSelect } from './FormSelect';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import { SearchableSelect } from './SearchableSelect';
import { TargetsGrid } from './TargetsGrid';
import { TimePartsInput } from './TimePartsInput';
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
  onDelete,
  showDelete = false,
  deleteLabel,
  onPickTemplate,
}: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const expansion = useExpansionController();
  const collapseSignal = expansion?.collapseSignal ?? 0;
  const expandSignal = expansion?.expandSignal ?? 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notesFocused, setNotesFocused] = useState(false);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);
  const [groups, setGroups] = useState<TaxonomyOption[]>([]);
  const [tags, setTags] = useState<TaxonomyOption[]>([]);

  // Tools → Collapse/Expand exercises (signals start at 0; skip initial).
  useEffect(() => {
    if (collapseSignal === 0) return;
    setExpanded(false);
    setMoreOpen(false);
  }, [collapseSignal]);

  useEffect(() => {
    if (expandSignal === 0) return;
    setExpanded(true);
  }, [expandSignal]);

  const metaChips = summarizeExerciseChips(value).map((label) => ({
    label,
    kind: 'set' as const,
  }));
  const resolvedExerciseTitle = exerciseTitle(
    value.tool_id,
    tools.find((tool) => tool.id === value.tool_id)?.label,
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

    const selectedToolIds = value.tool_id ? [value.tool_id] : [];
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
    value.tool_id,
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
    <NestedLayer
      layer="exercise"
      nested={nested}
      expanded={expanded}
      onExpandedChange={(next) => {
        setExpanded(next);
        if (!next) setMoreOpen(false);
      }}
      metaChips={metaChips}
      title={
        <ExerciseNameSearch
          value={value.name}
          onChangeText={(name) => patch({ name })}
          onPickTemplate={onPickTemplate}
          style={styles.titleField}
          placeholder="Exercise name"
          accessibilityLabel="Exercise name"
        />
      }
      trailing={({ expand }) => (
        <IconButton
          kind="exercise"
          active={moreOpen}
          onPress={() => {
            expand();
            setMoreOpen((o) => !o);
          }}
        />
      )}
    >
          <View style={styles.controlsRow}>
            <View style={styles.controlCol}>
              <Text style={styles.controlLabel}>Tool</Text>
              <SearchableSelect
                accent={exerciseControlAccent}
                fill
                options={tools}
                onOptionsChange={setTools}
                value={value.tool_id}
                onChange={(tool_id) => {
                  if (tool_id) patch({ tool_id });
                }}
                onCreate={async (name) => {
                  if (!userId) return { data: null, error: 'Not signed in.' };
                  return createTool(userId, name);
                }}
                placeholder="Search tools…"
                emptyLabel="None"
                accessibilityLabel="Tool"
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
            <View style={styles.durationRow}>
              <ToggleChip
                label={value.track_duration ? 'Duration on' : 'Track duration'}
                active={value.track_duration}
                onPress={onToggleDuration}
              />
              {value.track_duration ? (
                <View style={styles.durationPicker}>
                  <View style={styles.durationUnitLabels} pointerEvents="none">
                    <Text style={styles.durationUnitLabel}>HH</Text>
                    <Text style={styles.durationUnitColon}>:</Text>
                    <Text style={styles.durationUnitLabel}>MM</Text>
                    <Text style={styles.durationUnitColon}>:</Text>
                    <Text style={styles.durationUnitLabel}>SS</Text>
                  </View>
                  <TimePartsInput
                    value={value.duration}
                    onChange={(duration) => patch({ duration })}
                    emptyAsNull={false}
                  />
                </View>
              ) : null}
            </View>

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
    </NestedLayer>
  );
}

const styles = StyleSheet.create({
  titleField: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
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
  durationRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 10,
    // Always reserve the unit-label row so enabling duration moves nothing.
    paddingTop: 14,
  },
  durationPicker: {
    position: 'relative',
  },
  durationUnitLabels: {
    position: 'absolute',
    top: -14,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationUnitLabel: {
    width: 38,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.textDim,
  },
  durationUnitColon: {
    width: 7,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    color: colors.textDim,
    opacity: 0.35,
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
