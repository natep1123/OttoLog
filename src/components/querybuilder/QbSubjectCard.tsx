import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, spacing, typography } from '../../theme/tokens';
import { SearchableSelect } from '../forms/SearchableSelect';
import { useNodeLock } from '../forms/LockController';
import { QbAddChildButton } from './QbAddChildButton';
import { QbLayer } from './QbLayer';
import { QbMeasureRow } from './QbMeasureRow';
import { qbLayerToken, qbLeafOverride } from './qbTokens';
import { measureToken, type SubjectResult } from './engine';
import {
  emptyMeasure,
  type MeasureNode,
  type SubjectNode,
} from './types';

const subjectToken = qbLayerToken('subject');
const subjectAccent = {
  color: subjectToken.chip.color,
  border: subjectToken.border,
  background: subjectToken.chip.background,
};

type Props = {
  subject: SubjectNode;
  /** Lock-tree parent (the Section or a Breakdown). */
  parentLockId: string;
  result: SubjectResult | null;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  /** Soft suggested variation ids for this Subject's PG. */
  suggestedIds: string[];
  onChange: (next: SubjectNode) => void;
  onRemove: () => void;
  canRemove: boolean;
};

/** Resolve a group id → label from the relevant taxonomy pool. */
function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/**
 * Subject (= Exercise) — one Primary Group in the name slot, soft
 * variations/tools, and its Measures. Inside a Breakdown it renders per-group
 * sub-rows + a totals line (credit-each).
 */
export function QbSubjectCard({
  subject,
  parentLockId,
  result,
  primaryGroups,
  onPrimaryGroupsChange,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedIds,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const { locked, forcedByAncestor, canToggle, toggle } = useNodeLock(
    subject.id,
    parentLockId,
  );
  const pgName =
    (subject.pgId ? labelFor(primaryGroups, subject.pgId) : null) ?? subject.pgId;

  // Collapsed grammar: measure value tokens (PG name lives in the title slot).
  const grammarChips = (result?.measures ?? [])
    .map((m) => measureToken(m))
    .filter((t): t is string => Boolean(t));

  const updateMeasure = (index: number, next: MeasureNode) => {
    onChange({
      ...subject,
      measures: subject.measures.map((m, i) => (i === index ? next : m)),
    });
  };

  const removeMeasure = (index: number) => {
    onChange({
      ...subject,
      measures: subject.measures.filter((_, i) => i !== index),
    });
  };

  const addMeasure = () => {
    onChange({ ...subject, measures: [...subject.measures, emptyMeasure()] });
  };

  const groupOptions =
    result?.breakdownDimension === 'tool' ? tools : variations;

  return (
    <QbLayer
      layer="subject"
      metaChips={grammarChips}
      locked={locked}
      onToggleLock={canToggle || forcedByAncestor ? toggle : undefined}
      lockDisabled={forcedByAncestor}
      label={
        locked ? (
          <Text style={styles.lockedLabel} numberOfLines={1}>
            {pgName ?? 'Subject'}
          </Text>
        ) : (
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
            accessibilityLabel="Subject Primary Group"
          />
        )
      }
      trailing={
        !locked && canRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${pgName ?? 'subject'}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null
      }
    >
      <View style={styles.filterField}>
        <Text style={styles.fieldLabel}>Variations</Text>
        <SearchableSelect
          mode="multi"
          options={variations}
          onOptionsChange={onVariationsChange}
          value={subject.variationIds}
          onChange={(variationIds) => onChange({ ...subject, variationIds })}
          suggestedIds={suggestedIds}
          accent={subjectAccent}
          onCreate={async () => ({
            data: null,
            error: 'Create variations under Account → Taxonomy.',
          })}
          placeholder="All variations…"
          emptyLabel="All variations"
          fill
          accessibilityLabel="Subject variations"
        />
      </View>

      <View style={styles.filterField}>
        <Text style={styles.fieldLabel}>Tools</Text>
        <SearchableSelect
          mode="multi"
          options={tools}
          onOptionsChange={onToolsChange}
          value={subject.toolIds}
          onChange={(toolIds) => onChange({ ...subject, toolIds })}
          accent={subjectAccent}
          onCreate={async () => ({
            data: null,
            error: 'Create tools under Account → Taxonomy.',
          })}
          placeholder="All tools…"
          emptyLabel="All tools"
          fill
          accessibilityLabel="Subject tools"
        />
      </View>

      <View style={styles.measuresBlock}>
        <Text style={styles.fieldLabel}>Measures</Text>
        {subject.measures.map((measure, index) => (
          <QbMeasureRow
            key={measure.id}
            measure={measure}
            result={
              result?.measures.find((m) => m.measureId === measure.id) ?? null
            }
            onChange={(next) => updateMeasure(index, next)}
            onRemove={() => removeMeasure(index)}
            canRemove={subject.measures.length > 1}
          />
        ))}
        {locked ? null : (
          <QbAddChildButton
            childKind="measure"
            parentTitle={pgName ?? 'Subject'}
            onPress={addMeasure}
          />
        )}
      </View>

      {result?.groups && result.groups.length > 0 ? (
        <View style={styles.groupsBlock}>
          <Text style={styles.forEachLabel}>
            For each {result.breakdownDimension}
          </Text>
          {result.groups.map((group) => {
            const tokens = group.measures
              .map((m) => measureToken(m))
              .filter((t): t is string => Boolean(t));
            return (
              <View key={group.groupId} style={styles.groupRow}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {labelFor(groupOptions, group.groupId)}
                </Text>
                <Text style={styles.groupValue} numberOfLines={1}>
                  {tokens.length ? tokens.join(' · ') : `${group.setCount} sets`}
                </Text>
              </View>
            );
          })}
          <View style={[styles.groupRow, styles.totalsRow]}>
            <Text style={styles.totalsName}>total</Text>
            <Text style={styles.totalsValue} numberOfLines={1}>
              {grammarChips.length
                ? grammarChips.join(' · ')
                : `${result.setCount} sets`}
            </Text>
          </View>
        </View>
      ) : null}
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  lockedLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
  },
  filterField: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  forEachLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: qbLeafOverride.color,
  },
  measuresBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  groupsBlock: {
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: qbLeafOverride.borderSoft,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  groupName: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  groupValue: {
    flexShrink: 1,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  totalsRow: {
    marginTop: 2,
  },
  totalsName: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    color: qbLeafOverride.color,
  },
  totalsValue: {
    flexShrink: 1,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: qbLeafOverride.color,
    textAlign: 'right',
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
