import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, queryLayer, spacing, typography } from '../../theme/tokens';
import { ToggleChip } from '../forms/ToggleChip';
import { QbAddChildButton } from './QbAddChildButton';
import { QbLayer } from './QbLayer';
import { QbSubjectCard } from './QbSubjectCard';
import type { SectionResult } from './engine';
import {
  emptySubject,
  type BreakdownDimension,
  type BreakdownNode,
  type SubjectNode,
} from './types';

const breakdownAccent = {
  color: queryLayer.breakdown.chip.color,
  border: queryLayer.breakdown.border,
  background: queryLayer.breakdown.chip.background,
};

const DIMENSIONS: { id: BreakdownDimension; label: string }[] = [
  { id: 'variation', label: 'Variation' },
  { id: 'tool', label: 'Tool' },
];

type Props = {
  breakdown: BreakdownNode;
  results: SectionResult;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
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
 * and fans each into per-group rows + a totals line. No nested Breakdowns (v1).
 */
export function QbBreakdownCard({
  breakdown,
  results,
  primaryGroups,
  onPrimaryGroupsChange,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedByPg,
  onChange,
  onRemove,
}: Props) {
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
    // SectionChildSubject extends SubjectNode — assignable as a breakdown child.
    onChange({ ...breakdown, subjects: [...breakdown.subjects, emptySubject()] });
  };

  return (
    <QbLayer
      layer="breakdown"
      label={
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
      }
      trailing={
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove breakdown"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        >
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      }
    >
      <View style={styles.subjects}>
        {breakdown.subjects.map((subject, index) => (
          <QbSubjectCard
            key={subject.id}
            subject={subject}
            result={results[subject.id] ?? null}
            primaryGroups={primaryGroups}
            onPrimaryGroupsChange={onPrimaryGroupsChange}
            variations={variations}
            onVariationsChange={onVariationsChange}
            tools={tools}
            onToolsChange={onToolsChange}
            suggestedIds={subject.pgId ? suggestedByPg[subject.pgId] ?? [] : []}
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
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  forEach: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    color: queryLayer.breakdown.chip.color,
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
