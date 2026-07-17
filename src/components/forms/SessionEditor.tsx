import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BlockTemplateInput } from '../../types/blockTemplate';
import type { SessionTemplateInput } from '../../types/sessionTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { defaultSessionBlockItem } from '../../lib/sessionTemplates';
import { BlockEditor } from './BlockEditor';
import { CoordRow } from './CoordRow';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NameInput } from './NameInput';
import { NodeShell } from './NodeShell';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  value: SessionTemplateInput;
  onChange: (next: SessionTemplateInput) => void;
};

/**
 * Session editor — hosts nested BlockEditors (each with clusters).
 * Category stays Uncategorized for v1 (picker later).
 */
export function SessionEditor({ value, onChange }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notesFocused, setNotesFocused] = useState(false);

  const patch = (partial: Partial<SessionTemplateInput>) => {
    onChange({ ...value, ...partial });
  };

  const updateBlock = (index: number, draft: BlockTemplateInput) => {
    const blocks = value.blocks.map((block, i) =>
      i === index
        ? { ...block, ...draft, kind: 'block' as const, id: block.id }
        : block,
    );
    patch({ blocks });
  };

  const addBlock = () => {
    patch({ blocks: [...value.blocks, defaultSessionBlockItem()] });
  };

  const removeBlock = (index: number) => {
    patch({ blocks: value.blocks.filter((_, i) => i !== index) });
  };

  const onToggleDuration = () => {
    const next = !value.track_duration;
    patch({
      track_duration: next,
      duration: next ? value.duration ?? '00:00:00' : null,
    });
  };

  return (
    <NodeShell kind="session">
      <CoordRow
        meta="Session"
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        title={
          <NameInput
            value={value.name}
            onChangeText={(name) => patch({ name })}
            placeholder="Session name"
            accessibilityLabel="Session name"
            style={styles.titleField}
          />
        }
        trailing={
          <IconButton
            kind="session"
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
          <MorePanel open={moreOpen} kind="session">
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
                placeholder="e.g., Full body day — keep rest short…"
                placeholderTextColor={colors.textDim}
                multiline
                style={[
                  styles.fieldInput,
                  styles.notes,
                  notesFocused && styles.notesFocused,
                ]}
              />
            </View>
          </MorePanel>

          <Text style={styles.sectionTitle}>Blocks</Text>
          <View style={styles.items}>
            {value.blocks.map((block, index) => {
              const { kind: _k, id: _id, ...blockDraft } = block;
              return (
                <BlockEditor
                  key={block.id}
                  value={blockDraft}
                  onChange={(draft) => updateBlock(index, draft)}
                  nested
                  coordMeta={`${index + 1} in session`}
                  showDelete={value.blocks.length > 1}
                  onDelete={() => removeBlock(index)}
                />
              );
            })}
          </View>

          <Pressable
            onPress={addBlock}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add block"
          >
            <Text style={styles.addText}>+ Add block</Text>
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
