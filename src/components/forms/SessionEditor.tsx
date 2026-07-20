import { useEffect, useRef, useState } from 'react';
import {
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
import {
  colors,
  layer,
  radii,
  spacing,
  typography,
} from '../../theme/tokens';
import { sessionTemplateTitle, sessionUiTitle } from '../../lib/displayTitles';
import {
  defaultSessionBlockItem,
  getSessionTemplate,
  listSessionTemplates,
  sessionTemplateToDraft,
} from '../../lib/sessionTemplates';
import {
  outlineSession,
  summarizeSessionChips,
} from '../../lib/targetSummaries';
import { AddChildButton } from './AddChildButton';
import { BlockEditor } from './BlockEditor';
import { useExpansionController } from './ExpansionController';
import { IconButton } from './IconButton';
import { LayerLabelSelect } from './LayerLabelSelect';
import { LOCK_ROOT, useNodeLock } from './LockController';
import { LockedOutline } from './LockedOutline';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import {
  TemplateNameSearch,
  type TemplateNameSearchHandle,
} from './TemplateNameSearch';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';
import { sessionItemsLayout } from './formTokens';

type Props = {
  value: SessionTemplateInput;
  onChange: (next: SessionTemplateInput) => void;
};

/** Session editor — label-first header, hosts nested BlockEditors. */
export function SessionEditor({ value, onChange }: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle,
    toggle: toggleLock,
  } = useNodeLock(LOCK_ROOT.session, null, () =>
    value.blocks.map((block) => block.id),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => !locked);
  const [notesFocused, setNotesFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const nameSearchRef = useRef<TemplateNameSearchHandle>(null);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  useEffect(() => {
    if (locked) setMoreOpen(false);
  }, [locked]);

  useEffect(() => {
    if (!moreOpen || !focusNamePending) return;
    const id = requestAnimationFrame(() => {
      nameSearchRef.current?.focus();
      setFocusNamePending(false);
    });
    return () => cancelAnimationFrame(id);
  }, [moreOpen, focusNamePending]);

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

  const openMoreToName = (expand: () => void) => {
    expand();
    setMoreOpen(true);
    setFocusNamePending(true);
  };

  return (
    <NestedLayer
      layer="session"
      expanded={expanded}
      onExpandedChange={(next) => {
        const opening = next && !expanded;
        setExpanded(next);
        if (!next) setMoreOpen(false);
        if (opening) expansion?.collapseChildrenOf(LOCK_ROOT.session);
      }}
      locked={locked}
      onToggleLock={
        canToggle || forcedByAncestor
          ? () => {
              const unlocking = ownLocked;
              toggleLock();
              if (unlocking) {
                expansion?.collapseChildrenOf(LOCK_ROOT.session);
              }
            }
          : undefined
      }
      lockDisabled={forcedByAncestor}
      metaChips={summarizeSessionChips(value).map((label) => ({
        label,
        kind: 'block',
      }))}
      label={
        locked ? (
          <Text style={styles.lockedLabel} numberOfLines={1}>
            {value.label_name?.trim() || 'Session'}
          </Text>
        ) : (
          <LayerLabelSelect
            kind="session_label"
            value={value.category_id}
            labelName={value.label_name}
            onChange={(category_id, label_name) =>
              patch({ category_id, label_name })
            }
            accessibilityLabel="Session label"
          />
        )
      }
      collapsedBrief={sessionTemplateTitle(value.label_name, value.name)}
      trailing={
        locked
          ? undefined
          : ({ expand }) => (
              <>
                <IconButton
                  kind="session"
                  icon="search"
                  active={moreOpen && (nameFocused || focusNamePending)}
                  accessibilityLabel="Name, brief, or search library"
                  onPress={() => openMoreToName(expand)}
                />
                <IconButton
                  kind="session"
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
        <LockedOutline node={outlineSession(value)} layer="session" />
      ) : (
        <>
          <MorePanel open={moreOpen} kind="session">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name / Brief</Text>
              <TemplateNameSearch
                ref={nameSearchRef}
                kind="session"
                value={value.name}
                onChangeText={(name) => patch({ name })}
                listTemplates={listSessionTemplates}
                getDisplayTitle={(row) =>
                  sessionTemplateTitle(row.label_name, row.name)
                }
                onPickTemplate={(row) => {
                  void onPickSessionTemplate(row);
                }}
                onFocusChange={setNameFocused}
                placeholder="Search library or type a brief…"
                accessibilityLabel="Session name or brief"
                style={styles.nameField}
              />
            </View>

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
                  orderIndex={index}
                  lockId={block.id}
                  parentLockId={LOCK_ROOT.session}
                  showDelete={value.blocks.length > 1}
                  onDelete={() => removeBlock(index)}
                />
              );
            })}
          </View>

          <AddChildButton
            childKind="block"
            parentTitle={sessionUiTitle(value.label_name)}
            onPress={addBlock}
            style={styles.addBtn}
          />
        </>
      )}
    </NestedLayer>
  );
}

const styles = StyleSheet.create({
  nameField: { width: '100%', minWidth: 0 },
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
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
  notesFocused: { borderColor: layer.session.chip.color },
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
  items: { gap: spacing.sm, ...sessionItemsLayout },
  addBtn: {
    marginTop: spacing.sm,
  },
});
