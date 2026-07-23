import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, spacing, typography } from '../../theme/tokens';
import { IconButton } from '../forms/IconButton';
import { LockedOutline } from '../forms/LockedOutline';
import { LockedPreviewModal } from '../forms/LockedPreviewModal';
import { ToggleChip } from '../forms/ToggleChip';
import { useExpansionController } from '../forms/ExpansionController';
import { useNodeLock } from '../forms/LockController';
import { QbAddChildButton } from './QbAddChildButton';
import { QbLayer } from './QbLayer';
import { QbSubjectCard } from './QbSubjectCard';
import { outlineBreakdown } from './qbOutline';
import { qbFormKind, qbLayerToken } from './qbTokens';
import type { SectionResult } from './engine';
import {
  emptySubject,
  type BreakdownDimension,
  type BreakdownNode,
  type SubjectNode,
} from './types';

const breakdownToken = qbLayerToken('breakdown');
const breakdownAccent = {
  color: breakdownToken.chip.color,
  border: breakdownToken.border,
  background: breakdownToken.chip.background,
};

const BREAKDOWN_KIND = qbFormKind('breakdown');

const DIMENSIONS: { id: BreakdownDimension; label: string }[] = [
  { id: 'variation', label: 'Variation' },
  { id: 'tool', label: 'Tool' },
];

type Props = {
  breakdown: BreakdownNode;
  /** Lock-tree parent (the Section). */
  parentLockId: string;
  results: SectionResult;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  sessionLabels: TaxonomyOption[];
  blockLabels: TaxonomyOption[];
  sequenceLabels: TaxonomyOption[];
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  suggestedByPg: Record<string, string[]>;
  onChange: (next: BreakdownNode) => void;
  onRemove: () => void;
};

/**
 * Breakdown (= Sequence) — the loop. `For each <dimension>` wraps 1+ Subjects
 * and fans each into per-group rows + a totals line. Locked + expanded →
 * outline with grouped sub-rows; maximize → preview.
 */
export function QbBreakdownCard({
  breakdown,
  parentLockId,
  results,
  primaryGroups,
  onPrimaryGroupsChange,
  sessionLabels,
  blockLabels,
  sequenceLabels,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedByPg,
  onChange,
  onRemove,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const collapseChildrenSignal = expansion?.collapseChildrenSignal ?? 0;
  const collapseChildrenParentId = expansion?.collapseChildrenParentId ?? null;

  const { locked, ownLocked, forcedByAncestor, canToggle, toggle } = useNodeLock(
    breakdown.id,
    parentLockId,
    () => breakdown.subjects.map((s) => s.id),
  );

  const [expanded, setExpanded] = useState(() =>
    parentLockId == null ? true : !locked,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const outline = outlineBreakdown(breakdown, results, {
    primaryGroups,
    sessionLabels,
    blockLabels,
    sequenceLabels,
    variations,
    tools,
  });

  const subjectChips = breakdown.subjects.map((s) => {
    const name = s.pgId
      ? (primaryGroups.find((p) => p.id === s.pgId)?.label ?? 'Subject')
      : 'Subject';
    return { label: name, kind: 'subject' as const };
  });

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== parentLockId) return;
    setExpanded(false);
  }, [collapseChildrenSignal, collapseChildrenParentId, parentLockId]);

  const updateSubject = (index: number, next: SubjectNode) => {
    onChange({
      ...breakdown,
      subjects: breakdown.subjects.map((s, i) => (i === index ? next : s)),
    });
  };

  const removeSubject = (index: number) => {
    onChange({
      ...breakdown,
      subjects: breakdown.subjects.filter((_, i) => i !== index),
    });
  };

  const addSubject = () => {
    onChange({
      ...breakdown,
      subjects: [...breakdown.subjects, emptySubject()],
    });
  };

  const lockedTitle = `For each ${breakdown.dimension}`;

  return (
    <>
      <QbLayer
        layer="breakdown"
        expanded={expanded}
        onExpandedChange={(next) => {
          const opening = next && !expanded;
          setExpanded(next);
          if (opening) expansion?.collapseChildrenOf(breakdown.id);
        }}
        metaChips={
          locked && expanded
            ? undefined
            : subjectChips.length
              ? subjectChips
              : undefined
        }
        locked={locked}
        onToggleLock={
          canToggle || forcedByAncestor
            ? () => {
                const unlocking = ownLocked;
                toggle();
                if (unlocking) expansion?.collapseChildrenOf(breakdown.id);
              }
            : undefined
        }
        lockDisabled={forcedByAncestor}
        label={
          locked ? (
            <Text style={styles.lockedLabel} numberOfLines={1}>
              {lockedTitle}
            </Text>
          ) : (
            <View style={styles.dimRow}>
              <Text style={styles.forEach}>For each</Text>
              {DIMENSIONS.map((d) => (
                <ToggleChip
                  key={d.id}
                  label={d.label}
                  active={breakdown.dimension === d.id}
                  onPress={() => onChange({ ...breakdown, dimension: d.id })}
                  size="compact"
                  accent={breakdownAccent}
                />
              ))}
            </View>
          )
        }
        trailing={
          locked ? (
            <IconButton
              kind={BREAKDOWN_KIND}
              icon="maximize-2"
              accessibilityLabel="Open screenshot view"
              onPress={() => setPreviewOpen(true)}
            />
          ) : (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove breakdown"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.removeBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )
        }
      >
        {locked ? (
          <LockedOutline node={outline} layer={BREAKDOWN_KIND} />
        ) : (
          <View style={styles.subjects}>
            {breakdown.subjects.map((subject, index) => (
              <QbSubjectCard
                key={subject.id}
                subject={subject}
                parentLockId={breakdown.id}
                result={results[subject.id] ?? null}
                primaryGroups={primaryGroups}
                onPrimaryGroupsChange={onPrimaryGroupsChange}
                sessionLabels={sessionLabels}
                blockLabels={blockLabels}
                sequenceLabels={sequenceLabels}
                variations={variations}
                onVariationsChange={onVariationsChange}
                tools={tools}
                onToolsChange={onToolsChange}
                suggestedIds={
                  subject.pgId ? (suggestedByPg[subject.pgId] ?? []) : []
                }
                onChange={(next) => updateSubject(index, next)}
                onRemove={() => removeSubject(index)}
                canRemove={breakdown.subjects.length > 1}
              />
            ))}
            <QbAddChildButton
              childKind="subject"
              parentTitle={`For each ${breakdown.dimension}`}
              onPress={addSubject}
            />
          </View>
        )}
      </QbLayer>

      <LockedPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={lockedTitle}
        subtitle={null}
        layer={BREAKDOWN_KIND}
        node={outline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  forEach: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    color: breakdownToken.chip.color,
  },
  subjects: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  pressed: {
    opacity: 0.7,
  },
});
