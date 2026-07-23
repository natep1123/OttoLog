import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, typography } from '../../theme/tokens';
import { SearchableSelect } from '../forms/SearchableSelect';
import { useExpansionController } from '../forms/ExpansionController';
import { useNodeLock } from '../forms/LockController';
import { LockedOutline } from '../forms/LockedOutline';
import { QbAddChildButton } from './QbAddChildButton';
import { QbInsightCard } from './QbInsightCard';
import { QbLayer } from './QbLayer';
import { type SubjectResult } from './engine';
import { insightSummaryText, outlineSubject } from './qbOutline';
import { qbFormKind, qbLayerToken } from './qbTokens';
import {
  emptyInsight,
  type BreakdownDimension,
  type InsightNode,
  type SubjectNode,
} from './types';

const subjectToken = qbLayerToken('subject');
const subjectAccent = {
  color: subjectToken.chip.color,
  border: subjectToken.border,
  background: subjectToken.chip.background,
};
const SUBJECT_KIND = qbFormKind('subject');

type Props = {
  subject: SubjectNode;
  /**
   * `'hand'` — standalone FOR under WHERE: full `asks[]` list, `+ Add
   * Insight`, and the `+ Split for each…` affordance. `'template'` — nested
   * inside a SPLIT wrapper (Mode C, doc §11.5): exactly one Insight (the
   * partition template), no add/remove Insight, no split affordance (the
   * violet wrapper owns SPLIT).
   */
  mode: 'hand' | 'template';
  result: SubjectResult | null;
  /** WHERE's own lock id (doc §12 decision 4) — this FOR's lock-tree parent,
   * whether it hangs directly under WHERE or nested inside a SPLIT wrapper
   * (the wrapper itself is not a lock node). */
  parentLockId: string;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  /** Soft suggested variation ids for this clause's PG. */
  suggestedIds: string[];
  onChange: (next: SubjectNode) => void;
  onRemove?: () => void;
  canRemove?: boolean;
  /** Hand mode only — wrap this FOR in a SPLIT (violet Sequence) card. */
  onSplit?: (dimension: BreakdownDimension) => void;
};

function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/**
 * FOR card (doc §11.2/§11.3) — gold rail, the workout Exercise chrome cousin.
 * **PG only** on this gold surface (identity + measures moved off onto dusk
 * Insight children, §11.4). One Primary Group + a stack of Insight cards
 * (`WITH` + `SHOW` ask-slices) — replaces the old flat Subject clause.
 * Independently lockable (doc §12 decision 4) — own id, no `getChildIds`
 * (Insights stay ungoverned by their own lock, same as Sets under Exercise).
 */
export function QbForCard({
  subject,
  mode,
  result,
  parentLockId,
  primaryGroups,
  onPrimaryGroupsChange,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedIds,
  onChange,
  onRemove,
  canRemove = false,
  onSplit,
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
  } = useNodeLock(subject.id, parentLockId);
  // Mount own-locked (parent just unlocked) → start collapsed.
  const [expanded, setExpanded] = useState(() => !locked);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  // Parent (WHERE) opened — present this FOR collapsed, independent of lock.
  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== parentLockId) return;
    setExpanded(false);
  }, [collapseChildrenSignal, collapseChildrenParentId, parentLockId]);

  const hasPg = Boolean(subject.pgId);
  const pgName = subject.pgId ? labelFor(primaryGroups, subject.pgId) : null;

  const asks = subject.asks.length ? subject.asks : [emptyInsight()];

  // Collapsed child-summary pill row (doc §12 decision 4): one pill per
  // Insight's WITH+SHOW summary (decision 5's summary-row text, reused).
  const askSummaryChips = asks.map((ask, index) =>
    insightSummaryText(ask, result?.asks[index], variations, tools),
  );

  const updateAsk = (index: number, next: InsightNode) => {
    onChange({ ...subject, asks: asks.map((a, i) => (i === index ? next : a)) });
  };
  const removeAsk = (index: number) => {
    onChange({ ...subject, asks: asks.filter((_, i) => i !== index) });
  };
  const addAsk = () => {
    onChange({ ...subject, asks: [...asks, emptyInsight()] });
  };

  return (
    <QbLayer
      layer="subject"
      expanded={expanded}
      onExpandedChange={(next) => {
        const opening = next && !expanded;
        setExpanded(next);
        if (opening) expansion?.collapseChildrenOf(subject.id);
      }}
      locked={locked}
      onToggleLock={
        canToggle || forcedByAncestor
          ? () => {
              const unlocking = ownLocked;
              toggleLock();
              if (unlocking) expansion?.collapseChildrenOf(subject.id);
            }
          : undefined
      }
      lockDisabled={forcedByAncestor}
      metaChips={expanded ? undefined : askSummaryChips}
      label={
        locked ? (
          <Text style={styles.lockedLabel} numberOfLines={1}>
            {pgName ?? 'FOR'}
          </Text>
        ) : (
          <View style={styles.forRow}>
            <Text style={styles.word}>FOR</Text>
            <View style={styles.forPicker}>
              <SearchableSelect
                mode="single"
                options={primaryGroups}
                onOptionsChange={onPrimaryGroupsChange}
                value={subject.pgId}
                onChange={(pgId) => onChange({ ...subject, pgId })}
                accent={subjectAccent}
                onCreate={async () => ({
                  data: null,
                  error: 'Create Primary Groups under Account → Taxonomy.',
                })}
                placeholder="Pick a Primary Group…"
                emptyLabel="Pick a Primary Group"
                fill
                accessibilityLabel="FOR Primary Group"
              />
            </View>
          </View>
        )
      }
      trailing={
        !locked && onRemove && canRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${pgName ?? 'FOR'}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null
      }
    >
      {hasPg ? (
        locked ? (
          <LockedOutline
            node={outlineSubject(subject, result, { primaryGroups, variations, tools })}
            layer={SUBJECT_KIND}
            hideRootTitle
          />
        ) : (
          <View style={styles.asksBlock}>
            {asks.map((ask, index) => (
              <QbInsightCard
                key={ask.id}
                ask={ask}
                result={result?.asks[index] ?? null}
                variations={variations}
                onVariationsChange={onVariationsChange}
                tools={tools}
                onToolsChange={onToolsChange}
                suggestedIds={suggestedIds}
                onChange={(next) => updateAsk(index, next)}
                onRemove={
                  mode === 'hand' && asks.length > 1 ? () => removeAsk(index) : undefined
                }
                position={index + 1}
              />
            ))}

            {mode === 'hand' ? (
              <>
                <QbAddChildButton
                  childKind="insight"
                  parentTitle={pgName ?? 'this FOR'}
                  onPress={addAsk}
                />
                {onSplit ? (
                  <Pressable
                    onPress={() => onSplit('variation')}
                    accessibilityRole="button"
                    accessibilityLabel="Split this FOR for each variation or tool"
                    style={({ pressed }) => [styles.splitAdd, pressed && styles.pressed]}
                  >
                    <Text style={styles.splitAddText}>+ Split for each…</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        )
      ) : null}
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  forRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  forPicker: {
    flex: 1,
    minWidth: 0,
  },
  word: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    width: 46,
    color: subjectToken.chip.color,
  },
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
  asksBlock: {
    gap: 8,
  },
  splitAdd: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: subjectToken.border,
    borderRadius: 6,
  },
  splitAddText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: subjectToken.chip.color,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: subjectToken.chip.color,
    opacity: 0.75,
  },
  pressed: {
    opacity: 0.7,
  },
});
