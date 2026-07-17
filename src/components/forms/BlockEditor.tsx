import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BlockTemplateInput } from '../../types/blockTemplate';
import type { ClusterTemplateInput } from '../../types/clusterTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import {
  defaultBlockClusterItem,
} from '../../lib/blockTemplates';
import { ClusterEditor } from './ClusterEditor';
import { CoordRow } from './CoordRow';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NameInput } from './NameInput';
import { NodeShell } from './NodeShell';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  value: BlockTemplateInput;
  onChange: (next: BlockTemplateInput) => void;
  nested?: boolean;
  coordMeta?: string;
  showDelete?: boolean;
  onDelete?: () => void;
};

/**
 * Block editor — hosts nested ClusterEditors. Used solo or inside a session.
 */
export function BlockEditor({
  value,
  onChange,
  nested = false,
  coordMeta = 'Block',
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

  const addCluster = () => {
    patch({ items: [...value.items, defaultBlockClusterItem()] });
  };

  const removeCluster = (index: number) => {
    patch({ items: value.items.filter((_, i) => i !== index) });
  };

  const onToggleDuration = () => {
    const next = !value.track_duration;
    patch({
      track_duration: next,
      duration: next ? value.duration ?? '00:00:00' : null,
    });
  };

  return (
    <NodeShell kind="block" nested={nested}>
      <CoordRow
        meta={coordMeta}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        title={
          <NameInput
            value={value.name}
            onChangeText={(name) => patch({ name })}
            placeholder="Block name"
            accessibilityLabel="Block name"
            style={styles.titleField}
          />
        }
        trailing={
          <IconButton
            kind="block"
            active={moreOpen}
            onPress={() => {
              setExpanded(true);
              setMoreOpen((o) => !o);
            }}
          />
        }
      />

      {expanded ? (
        <>
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

          <Text style={styles.sectionTitle}>Clusters</Text>
          <View style={styles.items}>
            {value.items.map((item, index) => {
              const { kind: _k, id: _id, ...clusterDraft } = item;
              return (
                <ClusterEditor
                  key={item.id}
                  value={clusterDraft}
                  onChange={(draft) => updateCluster(index, draft)}
                  nested
                  coordMeta={`${index + 1} in block`}
                  showDelete={value.items.length > 1}
                  onDelete={() => removeCluster(index)}
                />
              );
            })}
          </View>

          <Pressable
            onPress={addCluster}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add cluster"
          >
            <Text style={styles.addText}>+ Add cluster</Text>
          </Pressable>
        </>
      ) : null}
    </NodeShell>
  );
}

const styles = StyleSheet.create({
  titleField: { flex: 1, minWidth: 0 },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  durationPicker: { position: 'relative' },
  field: { gap: 6 },
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
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  items: { gap: spacing.sm },
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
