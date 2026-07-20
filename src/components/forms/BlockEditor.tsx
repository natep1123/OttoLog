import { useEffect, useRef, useState } from 'react';
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
import {
  colors,
  layer,
  radii,
  spacing,
  typography,
} from '../../theme/tokens';
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
import { blockTitle, blockUiTitle, normalizeBrief } from '../../lib/displayTitles';
import { getExerciseTemplate } from '../../lib/exerciseTemplates';
import {
  outlineBlock,
  summarizeBlockChips,
} from '../../lib/targetSummaries';
import { AddChildButton } from './AddChildButton';
import { ClusterEditor } from './ClusterEditor';
import { DurationTrackControl } from './DurationTrackControl';
import { ExerciseEditor } from './ExerciseEditor';
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
import { blockItemsLayout } from './formTokens';

type Props = {
  value: BlockTemplateInput;
  onChange: (next: BlockTemplateInput) => void;
  nested?: boolean;
  /** 0-based index among blocks in the parent session */
  orderIndex?: number;
  lockId?: string;
  parentLockId?: string | null;
  showDelete?: boolean;
  onDelete?: () => void;
};

/**
 * Block editor — hosts an ordered mix of exercises and sequences.
 */
export function BlockEditor({
  value,
  onChange,
  nested = false,
  orderIndex = 0,
  lockId = LOCK_ROOT.block,
  parentLockId = null,
  showDelete = false,
  onDelete,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const collapseChildrenSignal = expansion?.collapseChildrenSignal ?? 0;
  const collapseChildrenParentId = expansion?.collapseChildrenParentId ?? null;
  const {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle,
    toggle: toggleLock,
  } = useNodeLock(lockId, parentLockId, () =>
    value.items.map((item) => item.id),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  // Builder root starts open (library review: locked + expanded outline).
  // Nested cards that remount own-locked after a parent unlock start collapsed.
  const [expanded, setExpanded] = useState(() =>
    parentLockId == null ? true : !locked,
  );
  const [notesFocused, setNotesFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const nameSearchRef = useRef<TemplateNameSearchHandle>(null);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== parentLockId) return;
    setExpanded(false);
    setMoreOpen(false);
  }, [collapseChildrenSignal, collapseChildrenParentId, parentLockId]);

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
      name: data.name ?? '',
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

  const openMoreToName = (expand: () => void) => {
    expand();
    setMoreOpen(true);
    setFocusNamePending(true);
  };

  return (
    <>
    <NestedLayer
      layer="block"
      nested={nested}
      expanded={expanded}
      onExpandedChange={(next) => {
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
      metaChips={summarizeBlockChips(value).map((label, index) => ({
        label,
        kind:
          value.items[index]?.kind === 'cluster' ? 'cluster' : 'exercise',
      }))}
      label={
        locked ? (
          <Text style={styles.lockedLabel} numberOfLines={1}>
            {value.label_name?.trim() || 'Block'}
          </Text>
        ) : (
          <LayerLabelSelect
            kind="block_label"
            value={value.label_id}
            labelName={value.label_name}
            onChange={(label_id, label_name) => patch({ label_id, label_name })}
            accessibilityLabel="Block label"
          />
        )
      }
      collapsedBrief={blockTitle(
        value.label_name,
        value.name,
        orderIndex + 1,
      )}
      trailing={
        locked ? (
          <IconButton
            kind="block"
            icon="maximize-2"
            accessibilityLabel="Open screenshot view"
            onPress={() => setPreviewOpen(true)}
          />
        ) : ({ expand }) => (
              <>
                <IconButton
                  kind="block"
                  icon="search"
                  active={moreOpen && (nameFocused || focusNamePending)}
                  accessibilityLabel="Name, brief, or search library"
                  onPress={() => openMoreToName(expand)}
                />
                <IconButton
                  kind="block"
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
          node={outlineBlock(value, { orderIndex })}
          layer="block"
        />
      ) : (
        <>
          <MorePanel open={moreOpen} kind="block">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name / Brief</Text>
              <TemplateNameSearch
                ref={nameSearchRef}
                kind="block"
                value={value.name}
                onChangeText={(name) => patch({ name })}
                listTemplates={listBlockTemplates}
                getDisplayTitle={(row) =>
                  blockTitle(row.label_name, row.name, 1)
                }
                onPickTemplate={(row) => {
                  void onPickBlockTemplate(row);
                }}
                onFocusChange={setNameFocused}
                placeholder="Search library or type a brief…"
                accessibilityLabel="Block name or brief"
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
          </View>
          <View style={styles.items}>
            {value.items.map((item, index) => {
              if (item.kind === 'exercise') {
                const exerciseOrder = value.items
                  .slice(0, index)
                  .filter((i) => i.kind === 'exercise').length;
                return (
                  <ExerciseEditor
                    key={item.id}
                    value={clusterItemToExerciseDraft(item)}
                    onChange={(draft) => updateExercise(index, draft)}
                    nested
                    orderIndex={exerciseOrder}
                    lockId={item.id}
                    parentLockId={lockId}
                    showDelete={value.items.length > 1}
                    onDelete={() => removeItem(index)}
                    deleteLabel="Remove from block"
                    onPickTemplate={(row) => {
                      void onPickExerciseTemplate(index, row);
                    }}
                  />
                );
              }
              const clusterOrder = value.items
                .slice(0, index)
                .filter((i) => i.kind === 'cluster').length;
              const { kind: _k, id: _id, ...clusterDraft } = item;
              return (
                <ClusterEditor
                  key={item.id}
                  value={clusterDraft}
                  onChange={(draft) => updateCluster(index, draft)}
                  nested
                  orderIndex={clusterOrder}
                  lockId={item.id}
                  parentLockId={lockId}
                  showDelete={value.items.length > 1}
                  onDelete={() => removeItem(index)}
                />
              );
            })}
          </View>

          <View style={styles.addActions}>
            <AddChildButton
              childKind="cluster"
              parentTitle={blockUiTitle(value.label_name)}
              onPress={addCluster}
            />
            <AddChildButton
              childKind="exercise"
              parentTitle={blockUiTitle(value.label_name)}
              onPress={addExercise}
            />
          </View>
        </>
      )}
    </NestedLayer>

    <LockedPreviewModal
      visible={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={blockUiTitle(value.label_name)}
      subtitle={normalizeBrief(value.name)}
      layer="block"
      node={outlineBlock(value, { orderIndex })}
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
  notesFocused: { borderColor: layer.block.chip.color },
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
  items: { gap: spacing.sm, ...blockItemsLayout },
  addActions: {
    // items bottom inset (8) + body gap (4) ≈ even with inter-button gap;
    // tiny extra below the stack before card padding.
    marginTop: 0,
    marginBottom: spacing.xs,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
