import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  BlockTemplateInput,
  BlockTemplateRow,
} from '../../types/blockTemplate';
import type { ClusterTemplateInput } from '../../types/clusterTemplate';
import type {
  ExerciseTemplateInput,
  ExerciseTemplateRow,
} from '../../types/exerciseTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import {
  blockTemplateToDraft,
  defaultBlockClusterItem,
  defaultBlockExerciseItem,
  getBlockTemplate,
  listBlockTemplates,
} from '../../lib/blockTemplates';
import {
  clusterItemToExerciseDraft,
  exerciseDraftToClusterItem,
} from '../../lib/clusterTemplates';
import { getExerciseTemplate } from '../../lib/exerciseTemplates';
import { summarizeBlockChips } from '../../lib/targetSummaries';
import { ClusterEditor } from './ClusterEditor';
import { ExerciseEditor } from './ExerciseEditor';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import { TemplateNameSearch } from './TemplateNameSearch';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';
import {
  addLayerButtonColors,
  blockItemsLayout,
} from './formTokens';

const addClusterColors = addLayerButtonColors('cluster');
const addExerciseColors = addLayerButtonColors('exercise');

type Props = {
  value: BlockTemplateInput;
  onChange: (next: BlockTemplateInput) => void;
  nested?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
};

/**
 * Block editor — hosts an ordered mix of ExerciseEditors and ClusterEditors.
 */
export function BlockEditor({
  value,
  onChange,
  nested = false,
  showDelete = false,
  onDelete,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notesFocused, setNotesFocused] = useState(false);

  const patch = (partial: Partial<BlockTemplateInput>) => {
    onChange({ ...value, ...partial });
  };

  const updateCluster = (index: number, draft: ClusterTemplateInput) => {
    const items = value.items.map((item, i) =>
      i === index
        ? { ...item, ...draft, kind: 'cluster' as const, id: item.id }
        : item,
    );
    patch({ items });
  };

  const updateExercise = (index: number, draft: ExerciseTemplateInput) => {
    const current = value.items[index];
    if (!current || current.kind !== 'exercise') return;
    const items = value.items.map((item, i) =>
      i === index ? exerciseDraftToClusterItem(draft, current.id) : item,
    );
    patch({ items });
  };

  const addCluster = () => {
    patch({ items: [...value.items, defaultBlockClusterItem()] });
  };

  const addExercise = () => {
    patch({ items: [...value.items, defaultBlockExerciseItem()] });
  };

  const removeItem = (index: number) => {
    patch({ items: value.items.filter((_, i) => i !== index) });
  };

  const onPickBlockTemplate = async (row: BlockTemplateRow) => {
    const { data, error } = await getBlockTemplate(row.id);
    if (error || !data) return;
    onChange(blockTemplateToDraft(data));
  };

  const onPickExerciseTemplate = async (
    index: number,
    row: ExerciseTemplateRow,
  ) => {
    const { data, error } = await getExerciseTemplate(row.id);
    if (error || !data) return;
    updateExercise(index, {
      name: data.name,
      tool_id: data.tool_id,
      target_shape_id: data.target_shape_id,
      track_analytics: data.track_analytics,
      primary_group_id: data.primary_group_id,
      analytics_tag_ids: data.analytics_tag_ids,
      default_target_shape: data.default_target_shape,
      track_duration: data.track_duration,
      duration: data.duration,
      notes: data.notes,
    });
  };

  const onToggleDuration = () => {
    const next = !value.track_duration;
    patch({
      track_duration: next,
      duration: next ? value.duration ?? '00:00:00' : null,
    });
  };

  return (
    <NestedLayer
      layer="block"
      nested={nested}
      expanded={expanded}
      onExpandedChange={(next) => {
        setExpanded(next);
        if (!next) setMoreOpen(false);
      }}
      metaChips={summarizeBlockChips(value)}
      title={
        <TemplateNameSearch
          kind="block"
          value={value.name}
          onChangeText={(name) => patch({ name })}
          listTemplates={listBlockTemplates}
          onPickTemplate={(row) => {
            void onPickBlockTemplate(row);
          }}
          placeholder="Block name"
          accessibilityLabel="Block name"
          style={styles.titleField}
        />
      }
      trailing={({ expand }) => (
        <IconButton
          kind="block"
          active={moreOpen}
          onPress={() => {
            expand();
            setMoreOpen((o) => !o);
          }}
        />
      )}
    >
      <MorePanel open={moreOpen} kind="block">
        <View style={styles.durationRow}>
          <ToggleChip
            label={
              value.track_duration ? 'Duration on' : 'Track duration'
            }
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

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Coaching notes</Text>
          <TextInput
            value={value.notes ?? ''}
            onChangeText={(notes) => patch({ notes: notes || null })}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            placeholder="e.g., Warm-up block, then strength…"
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
              {nested ? 'Remove from session' : 'Delete block'}
            </Text>
          </Pressable>
        ) : null}
      </MorePanel>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Text style={styles.sectionHint}>
          Exercises and clusters in this block.
        </Text>
      </View>
      <View style={styles.items}>
        {value.items.map((item, index) => {
          if (item.kind === 'exercise') {
            return (
              <ExerciseEditor
                key={item.id}
                value={clusterItemToExerciseDraft(item)}
                onChange={(draft) => updateExercise(index, draft)}
                nested
                showDelete={value.items.length > 1}
                onDelete={() => removeItem(index)}
                deleteLabel="Remove from block"
                onPickTemplate={(row) => {
                  void onPickExerciseTemplate(index, row);
                }}
              />
            );
          }
          const { kind: _k, id: _id, ...clusterDraft } = item;
          return (
            <ClusterEditor
              key={item.id}
              value={clusterDraft}
              onChange={(draft) => updateCluster(index, draft)}
              nested
              showDelete={value.items.length > 1}
              onDelete={() => removeItem(index)}
            />
          );
        })}
      </View>

      <View style={styles.addActions}>
        <Pressable
          onPress={addCluster}
          style={({ pressed }) => [
            styles.addBtn,
            {
              borderColor: addClusterColors.border,
              backgroundColor: addClusterColors.wash,
            },
            pressed && { borderColor: addClusterColors.label },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add cluster"
        >
          <Text style={[styles.addText, { color: addClusterColors.label }]}>
            + Add cluster
          </Text>
        </Pressable>
        <Pressable
          onPress={addExercise}
          style={({ pressed }) => [
            styles.addBtn,
            {
              borderColor: addExerciseColors.border,
              backgroundColor: addExerciseColors.wash,
            },
            pressed && { borderColor: addExerciseColors.label },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
        >
          <Text style={[styles.addText, { color: addExerciseColors.label }]}>
            + Add exercise
          </Text>
        </Pressable>
      </View>
    </NestedLayer>
  );
}

const styles = StyleSheet.create({
  titleField: { flex: 1, minWidth: 0 },
  durationRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingTop: 14,
  },
  durationPicker: { position: 'relative' },
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
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
    color: colors.textDim,
  },
  durationUnitColon: {
    width: 4,
    fontFamily: typography.font,
    fontSize: 9,
    textAlign: 'center',
    color: colors.textDim,
  },
  field: { width: '100%', gap: 6 },
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
  notes: { minHeight: 64, textAlignVertical: 'top' },
  notesFocused: { borderColor: colors.sunrise },
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
  sectionHeader: {
    gap: 2,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionHint: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textDim,
  },
  items: { gap: spacing.sm, ...blockItemsLayout },
  addActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  addText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
  },
});
