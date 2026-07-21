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
import { ConfirmDialog } from '../ConfirmDialog';
import { sessionTemplateTitle, sessionUiTitle, normalizeBrief } from '../../lib/displayTitles';
import {
  defaultSessionBlockItem,
  getSessionTemplate,
  listSessionTemplates,
  sessionTemplateToDraft,
} from '../../lib/sessionTemplates';
import { isEmptySessionLabel } from '../../lib/taxonomy';
import {
  outlineSession,
  summarizeSessionChips,
} from '../../lib/targetSummaries';
import { AddChildButton } from './AddChildButton';
import { BlockEditor } from './BlockEditor';
import { DurationTrackControl } from './DurationTrackControl';
import { useExpansionController } from './ExpansionController';
import { IconButton } from './IconButton';
import { LayerLabelSelect } from './LayerLabelSelect';
import { LOCK_ROOT, useNodeLock } from './LockController';
import { LockedOutline } from './LockedOutline';
import { LockedPreviewModal } from './LockedPreviewModal';
import { MorePanel } from './MorePanel';
import { NestedLayer } from './NestedLayer';
import {
  TemplateNameSearch,
  type TemplateNameSearchHandle,
} from './TemplateNameSearch';
import { NOTES_MAX_LENGTH, sessionItemsLayout } from './formTokens';

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
  // Session is always the builder root — open on mount (library review needs
  // locked + expanded so LockedOutline is visible immediately).
  const [expanded, setExpanded] = useState(true);
  const [notesFocused, setNotesFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [categoryIsEmpty, setCategoryIsEmpty] = useState(false);
  const [pendingEmptyLabel, setPendingEmptyLabel] = useState<{
    category_id: string;
    label_name: string;
  } | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const empty = await isEmptySessionLabel(value.category_id);
      if (!cancelled) setCategoryIsEmpty(empty);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.category_id]);

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
    if (categoryIsEmpty) return;
    patch({ blocks: [...value.blocks, defaultSessionBlockItem()] });
  };

  const removeBlock = (index: number) => {
    patch({ blocks: value.blocks.filter((_, i) => i !== index) });
  };

  const onChangeSessionLabel = (
    category_id: string,
    label_name: string,
    meta?: { isEmpty?: boolean },
  ) => {
    const nextEmpty = Boolean(meta?.isEmpty);
    if (nextEmpty && value.blocks.length > 0) {
      setPendingEmptyLabel({ category_id, label_name });
      return;
    }
    setCategoryIsEmpty(nextEmpty);
    patch({ category_id, label_name });
  };

  const confirmEmptyLabel = () => {
    if (!pendingEmptyLabel) return;
    setCategoryIsEmpty(true);
    patch({
      category_id: pendingEmptyLabel.category_id,
      label_name: pendingEmptyLabel.label_name,
      blocks: [],
    });
    setPendingEmptyLabel(null);
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

  const blockCount = value.blocks.length;
  const emptyConfirmMessage =
    blockCount === 1
      ? 'This label is for empty sessions. Remove the current block? Session Notes stay editable in More.'
      : `This label is for empty sessions. Remove all ${blockCount} blocks? Session Notes stay editable in More.`;

  return (
    <>
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
            onChange={onChangeSessionLabel}
            accessibilityLabel="Session label"
          />
        )
      }
      collapsedBrief={sessionTemplateTitle(value.label_name, value.name)}
      trailing={
        locked ? (
          <IconButton
            kind="session"
            icon="maximize-2"
            accessibilityLabel="Open screenshot view"
            onPress={() => setPreviewOpen(true)}
          />
        ) : ({ expand }) => (
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
        <LockedOutline
          node={outlineSession(value)}
          layer="session"
          hideRootTitle
        />
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

            <DurationTrackControl
              tracked={value.track_duration}
              duration={value.duration}
              onToggle={onToggleDuration}
              onChangeDuration={(duration) => patch({ duration })}
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Session Notes</Text>
              <TextInput
                value={value.notes ?? ''}
                onChangeText={(notes) => patch({ notes: notes || null })}
                onFocus={() => setNotesFocused(true)}
                onBlur={() => setNotesFocused(false)}
                placeholder="e.g., Full body day — keep rest short…"
                placeholderTextColor={colors.textDim}
                multiline
                maxLength={NOTES_MAX_LENGTH}
                style={[
                  styles.fieldInput,
                  styles.notes,
                  notesFocused && styles.notesFocused,
                ]}
              />
            </View>
          </MorePanel>

          {categoryIsEmpty ? (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintText}>
                Empty session — notes only. Blocks cannot be added with this
                label.
              </Text>
            </View>
          ) : (
            <>
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
        </>
      )}
    </NestedLayer>

    <LockedPreviewModal
      visible={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={sessionUiTitle(value.label_name)}
      subtitle={normalizeBrief(value.name)}
      layer="session"
      node={outlineSession(value)}
    />

    <ConfirmDialog
      visible={pendingEmptyLabel != null}
      title="Switch to empty session?"
      message={emptyConfirmMessage}
      confirmLabel="Remove blocks"
      cancelLabel="Cancel"
      destructive
      onConfirm={confirmEmptyLabel}
      onCancel={() => setPendingEmptyLabel(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  nameField: { width: '100%', minWidth: 0 },
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
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
    // items bottom inset (8) + body gap (4); tiny extra below before card padding.
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
  },
  emptyHintText: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
