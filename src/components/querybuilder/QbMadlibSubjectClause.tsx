import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, spacing, typography } from '../../theme/tokens';
import { SearchableSelect } from '../forms/SearchableSelect';
import { ToggleChip } from '../forms/ToggleChip';
import { useExpansionController } from '../forms/ExpansionController';
import { QbAddChildButton } from './QbAddChildButton';
import { QbLayer } from './QbLayer';
import { QbMeasureRow } from './QbMeasureRow';
import { qbLayerToken, qbLeafOverride } from './qbTokens';
import { measureToken, type SubjectResult } from './engine';
import {
  emptyMeasure,
  isBreakdown,
  unwrapBreakdown,
  wrapInBreakdown,
  type BreakdownDimension,
  type MeasureNode,
  type SectionChild,
  type SectionChildSubject,
  type SubjectNode,
} from './types';

const subjectToken = qbLayerToken('subject');
const subjectAccent = {
  color: subjectToken.chip.color,
  border: subjectToken.border,
  background: subjectToken.chip.background,
};

const SPLIT_DIMENSIONS: { id: BreakdownDimension; label: string }[] = [
  { id: 'variation', label: 'Variation' },
  { id: 'tool', label: 'Tool' },
];

type Props = {
  /** Section child — a plain Subject or a Breakdown wrapping one (SPLIT on). */
  child: SectionChild;
  result: SubjectResult | null;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  /** Soft suggested variation ids for this clause's PG. */
  suggestedIds: string[];
  onChange: (next: SectionChild) => void;
  onRemove: () => void;
  canRemove: boolean;
};

function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/**
 * Subject clause-block — madlib author (doc §2.1/§3): **FOR** (Primary
 * Group) / **WITH** (variations, tools) / **SHOW** (measures) / optional
 * **SPLIT** (Breakdown dimension). One clause = one Section child. SPLIT
 * wraps/unwraps this Subject into a Breakdown of exactly one — no separate
 * unlockable Breakdown card on the author path (doc §2.1, §4, decision 3).
 */
export function QbMadlibSubjectClause({
  child,
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
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const [expanded, setExpanded] = useState(true);
  const [withOpen, setWithOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  const isSplit = isBreakdown(child);
  const subject: SubjectNode = isSplit ? child.subjects[0] : child;
  const dimension: BreakdownDimension = isSplit ? child.dimension : 'variation';
  /** Progressive disclosure (doc §6): FOR only until a Primary Group is picked. */
  const hasPg = Boolean(subject.pgId);

  const patchSubject = (next: SubjectNode) => {
    onChange(isSplit ? { ...child, subjects: [next] } : { ...next, kind: 'subject' });
  };

  const setSplit = (dim: BreakdownDimension | null) => {
    if (dim === null) {
      if (isBreakdown(child)) onChange(unwrapBreakdown(child));
      return;
    }
    const base: SectionChildSubject = isBreakdown(child)
      ? unwrapBreakdown(child)
      : child;
    onChange(wrapInBreakdown(base, dim));
  };

  const pgName =
    (subject.pgId ? labelFor(primaryGroups, subject.pgId) : null) ?? null;

  const grammarChips = (result?.measures ?? [])
    .map((m) => measureToken(m))
    .filter((t): t is string => Boolean(t));

  const updateMeasure = (index: number, next: MeasureNode) => {
    patchSubject({
      ...subject,
      measures: subject.measures.map((m, i) => (i === index ? next : m)),
    });
  };

  const removeMeasure = (index: number) => {
    patchSubject({
      ...subject,
      measures: subject.measures.filter((_, i) => i !== index),
    });
  };

  const addMeasure = () => {
    patchSubject({ ...subject, measures: [...subject.measures, emptyMeasure()] });
  };

  const groupOptions = dimension === 'tool' ? tools : variations;

  /** Collapsed WITH chip text — `all` or the soft identity picks, e.g. `Weighted`. */
  const withSummary = (() => {
    const parts = [
      ...subject.variationIds.map((id) => labelFor(variations, id)),
      ...subject.toolIds.map((id) => labelFor(tools, id)),
    ];
    return parts.length ? parts.join(' · ') : 'all';
  })();

  return (
    <QbLayer
      layer="subject"
      expanded={expanded}
      onExpandedChange={setExpanded}
      metaChips={expanded ? undefined : grammarChips}
      label={
        <View style={styles.forRow}>
          <Text style={styles.word}>FOR</Text>
          <View style={styles.forPicker}>
            <SearchableSelect
              mode="single"
              options={primaryGroups}
              onOptionsChange={onPrimaryGroupsChange}
              value={subject.pgId}
              onChange={(pgId) => patchSubject({ ...subject, pgId })}
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
          </View>
        </View>
      }
      trailing={
        canRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${pgName ?? 'clause'}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null
      }
    >
      {hasPg ? (
        <>
          <View style={styles.clauseRow}>
            <Text style={styles.word}>WITH</Text>
            <View style={styles.clauseContent}>
              <Pressable
                onPress={() => setWithOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: withOpen }}
                accessibilityLabel={`${
                  withOpen ? 'Hide' : 'Show'
                } variation and tool filters`}
                style={({ pressed }) => [
                  styles.withChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.chevronSmall}>{withOpen ? '▾' : '▸'}</Text>
                <Text style={styles.withChipText} numberOfLines={1}>
                  {withSummary}
                </Text>
              </Pressable>
              {withOpen ? (
                <View style={styles.withBody}>
                  <SearchableSelect
                    mode="multi"
                    options={variations}
                    onOptionsChange={onVariationsChange}
                    value={subject.variationIds}
                    onChange={(variationIds) =>
                      patchSubject({ ...subject, variationIds })
                    }
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
                  <SearchableSelect
                    mode="multi"
                    options={tools}
                    onOptionsChange={onToolsChange}
                    value={subject.toolIds}
                    onChange={(toolIds) => patchSubject({ ...subject, toolIds })}
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
              ) : null}
            </View>
          </View>

          <View style={styles.clauseRow}>
            <Text style={styles.word}>SHOW</Text>
            <View style={styles.clauseContent}>
              {subject.measures.map((measure, index) => (
                <QbMeasureRow
                  key={measure.id}
                  measure={measure}
                  result={
                    result?.measures.find((m) => m.measureId === measure.id) ??
                    null
                  }
                  onChange={(next) => updateMeasure(index, next)}
                  onRemove={() => removeMeasure(index)}
                  canRemove={subject.measures.length > 1}
                />
              ))}
              <QbAddChildButton
                childKind="measure"
                parentTitle={pgName ?? 'this clause'}
                onPress={addMeasure}
              />
            </View>
          </View>

          <View style={styles.clauseRow}>
            <Text style={styles.word}>SPLIT</Text>
            <View style={styles.clauseContent}>
              {!isSplit ? (
                <Pressable
                  onPress={() => setSplit('variation')}
                  accessibilityRole="button"
                  accessibilityLabel="Split this clause for each variation or tool"
                  style={({ pressed }) => [
                    styles.splitAdd,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.splitAddText}>+ Split for each…</Text>
                </Pressable>
              ) : (
                <View style={styles.splitOnRow}>
                  <Text style={styles.splitForEach}>For each</Text>
                  {SPLIT_DIMENSIONS.map((d) => (
                    <ToggleChip
                      key={d.id}
                      label={d.label}
                      active={dimension === d.id}
                      onPress={() => setSplit(d.id)}
                      size="compact"
                    />
                  ))}
                  <Pressable
                    onPress={() => setSplit(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove split"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.removeText}>Clear</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {result?.groups && result.groups.length > 0 ? (
            <View style={styles.groupsBlock}>
              <Pressable
                onPress={() => setGroupsOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: groupsOpen }}
                accessibilityLabel={`${
                  groupsOpen ? 'Hide' : 'Show'
                } live split preview`}
                style={({ pressed }) => [
                  styles.groupsToggle,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.chevronSmall}>
                  {groupsOpen ? '▾' : '▸'}
                </Text>
                <Text style={styles.forEachLabel}>
                  Live preview · for each {dimension}
                </Text>
              </Pressable>
              {groupsOpen ? (
                <View style={styles.groupsBody}>
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
                          {tokens.length
                            ? tokens.join(' · ')
                            : `${group.setCount} sets`}
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
            </View>
          ) : null}
        </>
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
  clauseRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  clauseContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  chevronSmall: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    width: 12,
    textAlign: 'center',
    color: subjectToken.chip.color,
  },
  withChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: subjectToken.border,
    borderRadius: 6,
  },
  withChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  withBody: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  splitAdd: {
    alignSelf: 'flex-start',
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
  splitOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  splitForEach: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textMuted,
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
  forEachLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: qbLeafOverride.color,
  },
  groupsBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: qbLeafOverride.borderSoft,
  },
  groupsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupsBody: {
    gap: 6,
    marginTop: 6,
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
});
