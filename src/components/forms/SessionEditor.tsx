import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BlockTemplateInput } from '../../types/blockTemplate';
import type {
  SessionTemplateInput,
  SessionTemplateRow,
} from '../../types/sessionTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import {
  defaultSessionBlockItem,
  getSessionTemplate,
  listSessionTemplates,
  sessionTemplateToDraft,
} from '../../lib/sessionTemplates';
import { summarizeSessionChips } from '../../lib/targetSummaries';
import { BlockEditor } from './BlockEditor';
import { IconButton } from './IconButton';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import { TemplateNameSearch } from './TemplateNameSearch';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';
import {
  addLayerButtonColors,
  sessionItemsLayout,
} from './formTokens';

const addBlockColors = addLayerButtonColors('block');

type Props = {
  value: SessionTemplateInput;
  onChange: (next: SessionTemplateInput) => void;
};

/**
 * Session editor — hosts nested BlockEditors.
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

  const onPickSessionTemplate = async (row: SessionTemplateRow) => {
    const { data, error } = await getSessionTemplate(row.id);
    if (error || !data) return;
    onChange(sessionTemplateToDraft(data));
  };

  return (
    <NestedLayer
      layer="session"
      expanded={expanded}
      onExpandedChange={(next) => {
        setExpanded(next);
        if (!next) setMoreOpen(false);
      }}
      metaChips={summarizeSessionChips(value)}
      title={
        <TemplateNameSearch
          kind="session"
          value={value.name}
          onChangeText={(name) => patch({ name })}
          listTemplates={listSessionTemplates}
          onPickTemplate={(row) => {
            void onPickSessionTemplate(row);
          }}
          placeholder="Session name"
          accessibilityLabel="Session name"
          style={styles.titleField}
        />
      }
      trailing={({ expand }) => (
        <IconButton
          kind="session"
          active={moreOpen}
          onPress={() => {
            expand();
            setMoreOpen((o) => !o);
          }}
        />
      )}
    >
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Blocks</Text>
        <Text style={styles.sectionHint}>
          Ordered sections within this session.
        </Text>
      </View>
      <View style={styles.items}>
        {value.blocks.map((block, index) => {
          const { kind: _k, id: _id, ...blockDraft } = block;
          return (
            <BlockEditor
              key={block.id}
              value={blockDraft}
              onChange={(draft) => updateBlock(index, draft)}
              nested
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
          {
            borderColor: addBlockColors.border,
            backgroundColor: addBlockColors.wash,
          },
          pressed && {
            borderColor: addBlockColors.label,
            backgroundColor: addBlockColors.wash,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add block"
      >
        <Text style={[styles.addText, { color: addBlockColors.label }]}>
          + Add block
        </Text>
      </Pressable>
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
  items: { gap: spacing.sm, ...sessionItemsLayout },
  addBtn: {
    marginTop: spacing.sm,
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
