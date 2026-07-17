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
import { buildTargets } from '../../lib/exerciseTemplates';
import {
  createAnalyticsTag,
  createPrimaryGroup,
  createTool,
  listAnalyticsTags,
  listPrimaryGroups,
  listTools,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import type {
  ExerciseTarget,
  ExerciseTemplateInput,
} from '../../types/exerciseTemplate';
import { colors, radii, typography } from '../../theme/tokens';
import { CoordRow } from './CoordRow';
import { ExerciseNameSearch } from './ExerciseNameSearch';
import { FormSelect } from './FormSelect';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NodeShell } from './NodeShell';
import { SearchableSelect } from './SearchableSelect';
import { TargetsGrid } from './TargetsGrid';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  value: ExerciseTemplateInput;
  onChange: (next: ExerciseTemplateInput) => void;
  /** Nesting context for future cluster/block hosts */
  nested?: boolean;
  coord?: string | null;
  coordMeta?: string;
  onCoordPress?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  /** When search picks a library row — parent may load that template */
  onPickTemplate?: (template: ExerciseTemplateRow) => void;
};

/**
 * Nestable exercise leaf — matches session-templator exercise anatomy:
 * coord → header (tool, name search, shape, sets, ⋯) → more panel → targets grid.
 *
 * Tools / primary groups / tags are searchable create-comboboxes —
 * the only place users add those taxonomy rows for now.
 */
export function ExerciseEditor({
  value,
  onChange,
  nested = false,
  coord = null,
  coordMeta = 'Exercise',
  onCoordPress,
  onDelete,
  showDelete = false,
  onPickTemplate,
}: Props) {
  const { user } = useAuth();
  const userId = user?.id;

  const [moreOpen, setMoreOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);
  const [groups, setGroups] = useState<TaxonomyOption[]>([]);
  const [tags, setTags] = useState<TaxonomyOption[]>([]);

  const setCount = value.default_target_shape.length || 1;

  const patch = (partial: Partial<ExerciseTemplateInput>) => {
    onChange({ ...value, ...partial });
  };

  const refreshTaxonomy = useCallback(async () => {
    const [t, g, a] = await Promise.all([
      listTools(),
      listPrimaryGroups(),
      listAnalyticsTags(),
    ]);
    if (!t.error) setTools(t.data);
    if (!g.error) setGroups(g.data);
    if (!a.error) setTags(a.data);
  }, []);

  useEffect(() => {
    void refreshTaxonomy();
  }, [refreshTaxonomy]);

  const onChangeTarget = (index: number, targetPatch: Partial<ExerciseTarget>) => {
    const next = [...value.default_target_shape];
    next[index] = { ...next[index], ...targetPatch };
    patch({ default_target_shape: next });
  };

  const onChangeSetCount = (raw: string) => {
    const n = Math.max(1, Math.min(50, Number.parseInt(raw, 10) || 1));
    patch({
      default_target_shape: buildTargets(n, value.default_target_shape),
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
    <NodeShell kind="exercise" nested={nested}>
      <CoordRow meta={coordMeta} coord={coord} onCoordPress={onCoordPress} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <SearchableSelect
            variant="tool"
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
          <ExerciseNameSearch
            value={value.name}
            onChangeText={(name) => patch({ name })}
            onPickTemplate={onPickTemplate}
          />
        </View>

        <View style={styles.headerRow}>
          <View style={[styles.headerSlot, styles.headerSlotStart]}>
            <FormSelect
              options={TARGET_SHAPE_OPTIONS.map((o) => ({
                id: o.id,
                label: o.label,
              }))}
              value={value.target_shape_id}
              onChange={(target_shape_id) => patch({ target_shape_id })}
              accessibilityLabel="Target shape"
            />
          </View>
          <View style={[styles.headerSlot, styles.headerSlotCenter]}>
            <View style={styles.setsField}>
              <Text style={styles.setsLabel}>Sets</Text>
              <TextInput
                value={String(setCount)}
                onChangeText={onChangeSetCount}
                keyboardType="number-pad"
                selectTextOnFocus
                style={styles.setsInput}
                accessibilityLabel="Prescribed sets"
              />
            </View>
          </View>
          <View style={[styles.headerSlot, styles.headerSlotEnd]}>
            <IconButton
              active={moreOpen}
              onPress={() => setMoreOpen((o) => !o)}
            />
          </View>
        </View>
      </View>

      <MorePanel open={moreOpen}>
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
              />
            </View>
          ) : null}
        </View>

        <View style={styles.analyticsBlock}>
          <ToggleChip
            label={value.track_analytics ? 'Analytics on' : 'Track analytics'}
            active={value.track_analytics}
            onPress={onToggleAnalytics}
          />
          {value.track_analytics ? (
            <View style={styles.analyticsFields}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Primary analytics group</Text>
                <View style={styles.comboFull}>
                  <SearchableSelect
                    options={groups}
                    onOptionsChange={setGroups}
                    value={value.primary_group_id}
                    onChange={(primary_group_id) =>
                      patch({ primary_group_id })
                    }
                    onCreate={async (name) => {
                      if (!userId) return { data: null, error: 'Not signed in.' };
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
                    mode="multi"
                    options={tags}
                    onOptionsChange={setTags}
                    value={value.analytics_tag_ids}
                    onChange={(analytics_tag_ids) =>
                      patch({ analytics_tag_ids })
                    }
                    onCreate={async (name) => {
                      if (!userId) return { data: null, error: 'Not signed in.' };
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
            <Text style={styles.deleteText}>Delete exercise</Text>
          </Pressable>
        ) : null}
      </MorePanel>

      <TargetsGrid
        targetShapeId={value.target_shape_id}
        targets={value.default_target_shape}
        trackAnalytics={value.track_analytics}
        onChangeTarget={onChangeTarget}
      />
    </NodeShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSlot: {
    flex: 1,
  },
  headerSlotStart: {
    alignItems: 'flex-start',
  },
  headerSlotCenter: {
    alignItems: 'center',
  },
  headerSlotEnd: {
    alignItems: 'flex-end',
  },
  setsField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setsLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  setsInput: {
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
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    // Room for HH/MM/SS floating above the time boxes only
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
    gap: 10,
  },
  analyticsFields: {
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 154, 90, 0.04)',
  },
  field: {
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
    borderColor: colors.sunrise,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
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
