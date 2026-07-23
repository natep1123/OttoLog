import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, layer, radii, spacing, typography } from '../../theme/tokens';
import { IconButton } from '../forms/IconButton';
import { LockedOutline } from '../forms/LockedOutline';
import { LockedPreviewModal } from '../forms/LockedPreviewModal';
import { MorePanel } from '../forms/MorePanel';
import { NOTES_MAX_LENGTH } from '../forms/formTokens';
import { useExpansionController } from '../forms/ExpansionController';
import { useNodeLock } from '../forms/LockController';
import { StatusText } from '../StatusText';
import { QbAddChildButton } from './QbAddChildButton';
import { QbLayer } from './QbLayer';
import { QbMadlibQueryFrame } from './QbMadlibQueryFrame';
import { QbMadlibSubjectClause } from './QbMadlibSubjectClause';
import { outlineQuery, type QbOutlineLabels } from './qbOutline';
import { QB_LOCK_ROOT, QB_SECTION_ID } from './qbLockIds';
import { qbFormKind } from './qbTokens';
import type { SectionResult } from './engine';
import {
  emptySubject,
  sectionChildKey,
  sectionChildSubject,
  type QueryDraft,
  type SectionChild,
  type SectionNode,
} from './types';

type Props = {
  draft: QueryDraft;
  results: SectionResult;
  meta: { sessionCount: number; sessionsPerWeek: number } | null;
  loading: boolean;
  error: string | null;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  sessionLabels: TaxonomyOption[];
  onSessionLabelsChange: (next: TaxonomyOption[]) => void;
  blockLabels: TaxonomyOption[];
  onBlockLabelsChange: (next: TaxonomyOption[]) => void;
  sequenceLabels: TaxonomyOption[];
  onSequenceLabelsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  suggestedByPg: Record<string, string[]>;
  onChange: (next: QueryDraft) => void;
};

const QUERY_KIND = qbFormKind('query');

/**
 * Query (root · = Session) — the whole report. Label-first header (name or
 * "Query"), date window + Section in the body, name/notes behind the More panel.
 * Locked + expanded → LockedOutline grammar; maximize → LockedPreviewModal.
 */
export function QbQueryCard({
  draft,
  results,
  meta,
  loading,
  error,
  primaryGroups,
  onPrimaryGroupsChange,
  sessionLabels,
  onSessionLabelsChange,
  blockLabels,
  onBlockLabelsChange,
  sequenceLabels,
  onSequenceLabelsChange,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedByPg,
  onChange,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const { locked, ownLocked, onToggleLock, lockDisabled } = useQueryLock(draft);
  const [expanded, setExpanded] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const setSection = (section: SectionNode) => onChange({ ...draft, section });

  const updateChild = (index: number, next: SectionChild) => {
    setSection({
      ...draft.section,
      children: draft.section.children.map((c, i) => (i === index ? next : c)),
    });
  };

  const removeChild = (index: number) => {
    setSection({
      ...draft.section,
      children: draft.section.children.filter((_, i) => i !== index),
    });
  };

  const addSubjectClause = () => {
    setSection({
      ...draft.section,
      children: [...draft.section.children, emptySubject()],
    });
  };

  const labels: QbOutlineLabels = {
    primaryGroups,
    sessionLabels,
    blockLabels,
    sequenceLabels,
    variations,
    tools,
  };
  const outline = outlineQuery(draft, results, labels);

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
      nameRef.current?.focus();
      setFocusNamePending(false);
    });
    return () => cancelAnimationFrame(id);
  }, [moreOpen, focusNamePending]);

  const windowChip = `${draft.window.fromDate} → ${draft.window.toDate}`;
  const title = draft.name?.trim() || 'Query';

  return (
    <>
      <QbLayer
        layer="query"
        expanded={expanded}
        onExpandedChange={(next) => {
          const opening = next && !expanded;
          setExpanded(next);
          if (!next) setMoreOpen(false);
          if (opening) expansion?.collapseChildrenOf(QB_LOCK_ROOT);
        }}
        metaChips={locked || !expanded ? [windowChip] : undefined}
        locked={locked}
        onToggleLock={
          onToggleLock
            ? () => {
                const unlocking = ownLocked;
                onToggleLock();
                if (unlocking) expansion?.collapseChildrenOf(QB_LOCK_ROOT);
              }
            : undefined
        }
        lockDisabled={lockDisabled}
        label={
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        }
        trailing={
          locked ? (
            <>
              {loading ? (
                <ActivityIndicator
                  color={layer[QUERY_KIND].chip.color}
                  size="small"
                />
              ) : null}
              <IconButton
                kind={QUERY_KIND}
                icon="maximize-2"
                accessibilityLabel="Open screenshot view"
                onPress={() => setPreviewOpen(true)}
              />
            </>
          ) : (
            ({ expand }) => (
              <>
                {loading ? (
                  <ActivityIndicator
                    color={layer[QUERY_KIND].chip.color}
                    size="small"
                  />
                ) : null}
                <IconButton
                  kind={QUERY_KIND}
                  icon="search"
                  active={moreOpen}
                  accessibilityLabel="Name or notes"
                  onPress={() => {
                    expand();
                    setMoreOpen(true);
                    setFocusNamePending(true);
                  }}
                />
                <IconButton
                  kind={QUERY_KIND}
                  active={moreOpen}
                  onPress={() => {
                    expand();
                    setMoreOpen((o) => !o);
                  }}
                />
              </>
            )
          )
        }
      >
        {locked ? (
          <LockedOutline node={outline} layer={QUERY_KIND} hideRootTitle />
        ) : (
          <>
            <MorePanel open={moreOpen} kind={QUERY_KIND}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  ref={nameRef}
                  value={draft.name}
                  onChangeText={(name) => onChange({ ...draft, name })}
                  placeholder="Name this query (optional)"
                  placeholderTextColor={colors.textDim}
                  style={styles.nameInput}
                  accessibilityLabel="Query name"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  value={draft.notes ?? ''}
                  onChangeText={(notes) =>
                    onChange({ ...draft, notes: notes || null })
                  }
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setNotesFocused(false)}
                  placeholder="e.g., Weekly weighted-work check…"
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

            <QbMadlibQueryFrame
              draft={draft}
              onChange={onChange}
              sessionLabels={sessionLabels}
              onSessionLabelsChange={onSessionLabelsChange}
              blockLabels={blockLabels}
              onBlockLabelsChange={onBlockLabelsChange}
              sequenceLabels={sequenceLabels}
              onSequenceLabelsChange={onSequenceLabelsChange}
            />

            {meta ? (
              <Text style={styles.meta}>
                {meta.sessionCount} complete session
                {meta.sessionCount === 1 ? '' : 's'} · {meta.sessionsPerWeek}
                /week
              </Text>
            ) : null}

            {error ? <StatusText tone="error">{error}</StatusText> : null}

            <View style={styles.clauses}>
              {draft.section.children.map((child, index) => (
                <QbMadlibSubjectClause
                  key={sectionChildKey(child)}
                  child={child}
                  result={results[sectionChildKey(child)] ?? null}
                  primaryGroups={primaryGroups}
                  onPrimaryGroupsChange={onPrimaryGroupsChange}
                  variations={variations}
                  onVariationsChange={onVariationsChange}
                  tools={tools}
                  onToolsChange={onToolsChange}
                  suggestedIds={
                    sectionChildSubject(child).pgId
                      ? suggestedByPg[sectionChildSubject(child).pgId as string] ?? []
                      : []
                  }
                  onChange={(next) => updateChild(index, next)}
                  onRemove={() => removeChild(index)}
                  canRemove={draft.section.children.length > 1}
                />
              ))}
              <QbAddChildButton
                childKind="subject"
                parentTitle="Query"
                onPress={addSubjectClause}
              />
            </View>
          </>
        )}
      </QbLayer>

      <LockedPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        subtitle={
          draft.name?.trim()
            ? `${draft.window.fromDate} → ${draft.window.toDate}`
            : null
        }
        layer={QUERY_KIND}
        node={outline}
      />
    </>
  );
}

/** Query root lock — owns the single Section id as its child. */
function useQueryLock(_draft: QueryDraft) {
  const { locked, ownLocked, forcedByAncestor, canToggle, toggle } = useNodeLock(
    QB_LOCK_ROOT,
    null,
    () => [QB_SECTION_ID],
  );
  return {
    locked,
    ownLocked,
    lockDisabled: forcedByAncestor,
    onToggleLock: canToggle || forcedByAncestor ? toggle : undefined,
  };
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  nameInput: {
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
  field: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 6,
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
  clauses: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  meta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
