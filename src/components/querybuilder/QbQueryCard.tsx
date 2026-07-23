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
import { MorePanel } from '../forms/MorePanel';
import { NOTES_MAX_LENGTH } from '../forms/formTokens';
import { SessionDateControl } from '../forms/SessionDateControl';
import { useNodeLock } from '../forms/LockController';
import { StatusText } from '../StatusText';
import { QbLayer } from './QbLayer';
import { QbSectionCard } from './QbSectionCard';
import { QB_LOCK_ROOT, QB_SECTION_ID } from './qbLockIds';
import { qbFormKind } from './qbTokens';
import type { SectionResult } from './engine';
import type { QueryDraft, SectionNode } from './types';

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
 * Opening it feels like opening a Session card.
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
  const { locked, onToggleLock, lockDisabled } = useQueryLock(draft);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [focusNamePending, setFocusNamePending] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const setSection = (section: SectionNode) => onChange({ ...draft, section });

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
    <QbLayer
      layer="query"
      metaChips={[windowChip]}
      locked={locked}
      onToggleLock={onToggleLock}
      lockDisabled={lockDisabled}
      label={
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      }
      trailing={
        locked
          ? loading
            ? <ActivityIndicator color={layer[QUERY_KIND].chip.color} size="small" />
            : null
          : ({ expand }) => (
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
      }
    >
      {locked ? null : (
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
              onChangeText={(notes) => onChange({ ...draft, notes: notes || null })}
              onFocus={() => setNotesFocused(true)}
              onBlur={() => setNotesFocused(false)}
              placeholder="e.g., Weekly weighted-work check…"
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={NOTES_MAX_LENGTH}
              style={[styles.fieldInput, styles.notes, notesFocused && styles.notesFocused]}
            />
          </View>
        </MorePanel>
      )}

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>From</Text>
          <SessionDateControl
            value={draft.window.fromDate}
            onChange={(fromDate) =>
              onChange({ ...draft, window: { ...draft.window, fromDate } })
            }
            eyebrow="From date"
            fill
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>To</Text>
          <SessionDateControl
            value={draft.window.toDate}
            onChange={(toDate) =>
              onChange({ ...draft, window: { ...draft.window, toDate } })
            }
            eyebrow="To date"
            fill
          />
        </View>
      </View>

      {meta ? (
        <Text style={styles.meta}>
          {meta.sessionCount} complete session
          {meta.sessionCount === 1 ? '' : 's'} · {meta.sessionsPerWeek}/week
        </Text>
      ) : null}

      {error ? <StatusText tone="error">{error}</StatusText> : null}

      <QbSectionCard
        section={draft.section}
        parentLockId={QB_LOCK_ROOT}
        results={results}
        primaryGroups={primaryGroups}
        onPrimaryGroupsChange={onPrimaryGroupsChange}
        sessionLabels={sessionLabels}
        onSessionLabelsChange={onSessionLabelsChange}
        blockLabels={blockLabels}
        onBlockLabelsChange={onBlockLabelsChange}
        sequenceLabels={sequenceLabels}
        onSequenceLabelsChange={onSequenceLabelsChange}
        variations={variations}
        onVariationsChange={onVariationsChange}
        tools={tools}
        onToolsChange={onToolsChange}
        suggestedByPg={suggestedByPg}
        onChange={setSection}
      />
    </QbLayer>
  );
}

/** Query root lock — owns the single Section id as its child. */
function useQueryLock(_draft: QueryDraft) {
  const { locked, forcedByAncestor, canToggle, toggle } = useNodeLock(
    QB_LOCK_ROOT,
    null,
    () => [QB_SECTION_ID],
  );
  return {
    locked,
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
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dateField: {
    flex: 1,
    gap: 6,
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
