import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, spacing, typography } from '../../theme/tokens';
import { ToggleChip } from '../forms/ToggleChip';
import { useExpansionController } from '../forms/ExpansionController';
import { QbForCard } from './QbForCard';
import { QbLayer } from './QbLayer';
import { identityPhrase } from './qbOutline';
import { qbLayerToken } from './qbTokens';
import { measureToken, type SubjectResult } from './engine';
import {
  templateAsk,
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

const SPLIT_DIMENSIONS: { id: BreakdownDimension; label: string }[] = [
  { id: 'variation', label: 'Variation' },
  { id: 'tool', label: 'Tool' },
];

type Props = {
  breakdown: BreakdownNode;
  result: SubjectResult | null;
  /** WHERE's own lock id — forwarded to the nested template FOR (doc §12
   * decision 4); this violet wrapper is not a lock node itself. */
  parentLockId: string;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  suggestedIds: string[];
  onChange: (next: BreakdownNode) => void;
  /** "Clear" — unwrap back to a plain hand-authored FOR (keeps the template ask). */
  onUnwrap: () => void;
  /** One-shot `+ Split into Insights` seed (doc §11.5, Mode C). */
  onSeed: () => void;
  onRemove: () => void;
  canRemove: boolean;
};

function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/**
 * SPLIT wrapper (doc §11.2/§11.5) — violet rail, the workout Sequence chrome
 * cousin. Wraps exactly one FOR (template mode, Mode C: hand Insights and
 * auto-partition are never both live). Owns the dimension toggle, the live
 * partition preview, and the one-shot `+ Split into Insights` seed that
 * hands the coach editable per-group Insight cards and turns SPLIT off.
 */
export function QbSplitWrapperCard({
  breakdown,
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
  onUnwrap,
  onSeed,
  onRemove,
  canRemove,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const [expanded, setExpanded] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  const subject = breakdown.subjects[0];
  const dimension = breakdown.dimension;
  const template = subject ? templateAsk(subject) : null;
  const hasPg = Boolean(subject?.pgId);

  const withPhrase = template
    ? identityPhrase(
        template.variationIds.map((id) => labelFor(variations, id)),
        template.variationMatch,
        template.toolIds.map((id) => labelFor(tools, id)),
        template.toolMatch,
      )
    : undefined;

  const setDimension = (dim: BreakdownDimension) => {
    onChange({ ...breakdown, dimension: dim });
  };

  const updateSubject = (next: SubjectNode) => {
    onChange({ ...breakdown, subjects: [next] });
  };

  const totalsChip = (result?.asks[0]?.measures ?? [])
    .map((m) => measureToken(m))
    .filter((t): t is string => Boolean(t));

  return (
    <QbLayer
      layer="breakdown"
      expanded={expanded}
      onExpandedChange={setExpanded}
      label={
        <View style={styles.headerRow}>
          <Text style={styles.word}>SPLIT</Text>
          <Text style={styles.forEach}>for each</Text>
          {SPLIT_DIMENSIONS.map((d) => (
            <ToggleChip
              key={d.id}
              label={d.label}
              active={dimension === d.id}
              onPress={() => setDimension(d.id)}
              size="compact"
              accent={breakdownAccent}
            />
          ))}
        </View>
      }
      trailing={
        <View style={styles.trailingRow}>
          <Pressable
            onPress={onUnwrap}
            accessibilityRole="button"
            accessibilityLabel="Clear split"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          {canRemove ? (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove FOR"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      {subject ? (
        <View style={styles.body}>
          <QbForCard
            subject={subject}
            mode="template"
            result={result}
            parentLockId={parentLockId}
            primaryGroups={primaryGroups}
            onPrimaryGroupsChange={onPrimaryGroupsChange}
            variations={variations}
            onVariationsChange={onVariationsChange}
            tools={tools}
            onToolsChange={onToolsChange}
            suggestedIds={suggestedIds}
            onChange={updateSubject}
          />

          {hasPg ? (
            <>
              <Pressable
                onPress={onSeed}
                accessibilityRole="button"
                accessibilityLabel="Split into Insights"
                style={({ pressed }) => [styles.seedBtn, pressed && styles.pressed]}
              >
                <Text style={styles.seedText}>+ Split into Insights</Text>
              </Pressable>
              <Text style={styles.seedHint}>
                Seeds one editable Insight per {dimension}
                {withPhrase ? ` among ${withPhrase}` : ''} — then SPLIT turns off and
                you hand-edit from there.
              </Text>

              <Pressable
                onPress={() => setPreviewOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: previewOpen }}
                accessibilityLabel={`${previewOpen ? 'Hide' : 'Show'} live split preview`}
                style={({ pressed }) => [styles.previewToggle, pressed && styles.pressed]}
              >
                <Text style={styles.chevronSmall}>{previewOpen ? '▾' : '▸'}</Text>
                <Text style={styles.previewLabel}>Live preview · for each {dimension}</Text>
              </Pressable>

              {previewOpen ? (
                result?.groups && result.groups.length > 0 ? (
                  <View style={styles.previewBody}>
                    {result.groups.map((group) => {
                      const tokens = group.measures
                        .map((m) => measureToken(m))
                        .filter((t): t is string => Boolean(t));
                      return (
                        <View key={group.groupId} style={styles.previewRow}>
                          <Text style={styles.previewName} numberOfLines={1}>
                            {labelFor(dimension === 'tool' ? tools : variations, group.groupId)}
                          </Text>
                          <Text style={styles.previewValue} numberOfLines={1}>
                            {tokens.length ? tokens.join(' · ') : `${group.setCount} sets`}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={[styles.previewRow, styles.totalsRow]}>
                      <Text style={styles.totalsName}>total</Text>
                      <Text style={styles.totalsValue} numberOfLines={1}>
                        {totalsChip.length
                          ? totalsChip.join(' · ')
                          : `${result.asks[0]?.setCount ?? 0} sets`}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.previewEmpty}>
                    {withPhrase
                      ? `No other ${dimension}s tagged on these sets.`
                      : `No ${dimension}s logged on these sets yet.`}
                  </Text>
                )
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  word: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: breakdownToken.chip.color,
  },
  forEach: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  clearText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: breakdownToken.chip.color,
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
  body: {
    gap: spacing.sm,
  },
  seedBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: breakdownToken.border,
    borderRadius: 6,
  },
  seedText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: breakdownToken.chip.color,
  },
  seedHint: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textDim,
    marginTop: -2,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  chevronSmall: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    width: 12,
    textAlign: 'center',
    color: breakdownToken.chip.color,
  },
  previewLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: breakdownToken.chip.color,
  },
  previewEmpty: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
  },
  previewBody: {
    gap: 6,
    marginTop: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  previewName: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  previewValue: {
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
    color: breakdownToken.chip.color,
  },
  totalsValue: {
    flexShrink: 1,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: breakdownToken.chip.color,
    textAlign: 'right',
  },
});
