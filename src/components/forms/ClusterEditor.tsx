import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChoiceChips } from '../ChoiceChips';
import {
  CLUSTER_TYPE_OPTIONS,
  type ClusterExerciseItem,
  type ClusterTemplateInput,
} from '../../types/clusterTemplate';
import type {
  ExerciseTemplateInput,
  ExerciseTemplateRow,
} from '../../types/exerciseTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import {
  clusterItemToExerciseDraft,
  defaultClusterExerciseItem,
  exerciseDraftToClusterItem,
} from '../../lib/clusterTemplates';
import {
  buildTargets,
  getExerciseTemplate,
} from '../../lib/exerciseTemplates';
import { CoordRow } from './CoordRow';
import { ExerciseEditor } from './ExerciseEditor';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NameInput } from './NameInput';
import { NodeShell } from './NodeShell';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  value: ClusterTemplateInput;
  onChange: (next: ClusterTemplateInput) => void;
  nested?: boolean;
  coord?: string | null;
  coordMeta?: string;
  onCoordPress?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
};

/**
 * Nestable cluster editor — type, name, ⋯ (duration/notes), nested ExerciseEditor leaves.
 * Solo builder hosts this; future block/session hosts will embed the same leaf.
 */
export function ClusterEditor({
  value,
  onChange,
  nested = false,
  coord = null,
  coordMeta = 'Cluster',
  onCoordPress,
  onDelete,
  showDelete = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const patch = (partial: Partial<ClusterTemplateInput>) => {
    onChange({ ...value, ...partial });
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
    items[index] = exerciseDraftToClusterItem(draft, items[index].id);
    patch({ items });
  };

  const removeItem = (index: number) => {
    patch({ items: value.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    patch({ items: [...value.items, defaultClusterExerciseItem()] });
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
    updateItem(index, {
      name: data.name,
      tool_id: data.tool_id,
      target_shape_id: data.target_shape_id,
      track_analytics: data.track_analytics,
      primary_group_id: data.primary_group_id,
      analytics_tag_ids: data.analytics_tag_ids,
      default_target_shape: targets.length ? targets : buildTargets(1),
      track_duration: data.track_duration,
      duration: data.duration,
      notes: data.notes,
    });
  };

  return (
    <NodeShell kind="cluster" nested={nested}>
      <CoordRow meta={coordMeta} coord={coord} onCoordPress={onCoordPress} />

      <View style={styles.header}>
        <ChoiceChips
          label="Type"
          options={CLUSTER_TYPE_OPTIONS}
          value={value.cluster_type}
          onChange={(cluster_type) =>
            patch({
              cluster_type: cluster_type as ClusterTemplateInput['cluster_type'],
            })
          }
        />

        <View style={styles.nameRow}>
          <NameInput
            value={value.name}
            onChangeText={(name) => patch({ name })}
            placeholder="Cluster name"
            accessibilityLabel="Cluster name"
          />
          <IconButton
            active={moreOpen}
            onPress={() => setMoreOpen((o) => !o)}
          />
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

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Coaching notes</Text>
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
            <Text style={styles.deleteText}>Delete cluster</Text>
          </Pressable>
        ) : null}
      </MorePanel>

      <View style={styles.items}>
        {value.items.map((item: ClusterExerciseItem, index: number) => (
          <ExerciseEditor
            key={item.id}
            value={clusterItemToExerciseDraft(item)}
            onChange={(draft) => updateItem(index, draft)}
            nested
            coordMeta={`Exercise ${index + 1}`}
            showDelete
            onDelete={() => removeItem(index)}
            onPickTemplate={(row) => {
              void onPickExerciseTemplate(index, row);
            }}
          />
        ))}
      </View>

      <Pressable
        onPress={addItem}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add exercise"
      >
        <Text style={styles.addText}>+ Add exercise</Text>
      </Pressable>
    </NodeShell>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
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
  items: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 154, 90, 0.04)',
  },
  addPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  addText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.sunrise,
  },
});
