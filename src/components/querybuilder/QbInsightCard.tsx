import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { SearchableSelect } from '../forms/SearchableSelect';
import { ToggleChip } from '../forms/ToggleChip';
import { QbAddChildButton } from './QbAddChildButton';
import { QbMeasureRow } from './QbMeasureRow';
import { insightSummaryText } from './qbOutline';
import { qbInsightChip } from './qbTokens';
import { type InsightResult } from './engine';
import { emptyMeasure, type InsightNode, type MeasureNode } from './types';

const insightAccent = {
  color: qbInsightChip.color,
  border: qbInsightChip.border,
  background: qbInsightChip.background,
};

type Props = {
  ask: InsightNode;
  result: InsightResult | null;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  /** Soft suggested variation ids for the parent FOR's Primary Group. */
  suggestedIds: string[];
  onChange: (next: InsightNode) => void;
  /** Omitted in SPLIT template mode — Mode C keeps exactly one Insight there. */
  onRemove?: () => void;
  /** 1-based position for the eyebrow label (`Insight 1`, `Insight 2`, …). */
  position: number;
};

/** A never-edited fresh Insight (matches `emptyInsight()`) — opens straight
 * into the editor panel instead of a near-empty summary row. */
function isFreshInsight(ask: InsightNode): boolean {
  return (
    ask.variationIds.length === 0 &&
    ask.toolIds.length === 0 &&
    ask.measures.length === 1 &&
    ask.measures[0].field == null
  );
}

/**
 * Insight (doc §11.4/§12 decision 5) — dusk chrome, the workout-**override**
 * chrome cousin (never that word in copy here). Two-state: a compact
 * **summary row** (WITH+SHOW value line + edit pencil + Remove, styled like
 * the workout Overrides list item, `workout-builder/08`) and a separate
 * **editor panel** opened by the edit tap (WITH pickers + SHOW measures +
 * Save/Cancel, styled like the workout override editor, `workout-builder/09`).
 * Cancel discards in-panel edits; Save commits the local draft back to the
 * ask. Never gets its own lock toggle — governed by its FOR, same as
 * Measure/Set never getting an independent lock today.
 */
export function QbInsightCard({
  ask,
  result,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedIds,
  onChange,
  onRemove,
  position,
}: Props) {
  const [editing, setEditing] = useState(() => isFreshInsight(ask));
  const [draft, setDraft] = useState<InsightNode>(ask);

  const summary = insightSummaryText(ask, result, variations, tools);

  const startEdit = () => {
    setDraft(ask);
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(ask);
    setEditing(false);
  };
  const saveEdit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText} numberOfLines={2}>
          Insight {position} · {summary}
        </Text>
        <View style={styles.summaryActions}>
          <Pressable
            onPress={startEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Edit Insight ${position}`}
            style={({ pressed }) => [
              styles.summaryIconBtn,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="edit-2" size={14} color={qbInsightChip.color} />
          </Pressable>
          {onRemove ? (
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove Insight ${position}`}
            >
              <Text style={styles.summaryRemove}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // Draft measure list is edited freely; Save commits `draft` → `ask`.
  const updateMeasure = (index: number, next: MeasureNode) => {
    setDraft({
      ...draft,
      measures: draft.measures.map((m, i) => (i === index ? next : m)),
    });
  };
  const removeMeasure = (index: number) => {
    setDraft({ ...draft, measures: draft.measures.filter((_, i) => i !== index) });
  };
  const addMeasure = () => {
    setDraft({ ...draft, measures: [...draft.measures, emptyMeasure()] });
  };

  const showVariationMatch = draft.variationIds.length >= 2;
  const showToolMatch = draft.toolIds.length >= 2;

  return (
    <View style={styles.editor}>
      <Text style={styles.eyebrow}>Insight {position}</Text>

      <View style={styles.clauseRow}>
        <Text style={styles.word}>WITH</Text>
        <View style={styles.clauseContent}>
          {showVariationMatch ? (
            <View style={styles.matchRow}>
              <Text style={styles.matchLabel}>Match variations</Text>
              <ToggleChip
                label="Any"
                active={draft.variationMatch !== 'all'}
                onPress={() => setDraft({ ...draft, variationMatch: 'any' })}
                size="compact"
                accent={insightAccent}
              />
              <ToggleChip
                label="All"
                active={draft.variationMatch === 'all'}
                onPress={() => setDraft({ ...draft, variationMatch: 'all' })}
                size="compact"
                accent={insightAccent}
              />
              <Text style={styles.matchHint} numberOfLines={1}>
                {draft.variationMatch === 'all' ? 'must have every one' : 'has any one'}
              </Text>
            </View>
          ) : null}
          {showToolMatch ? (
            <View style={styles.matchRow}>
              <Text style={styles.matchLabel}>Match tools</Text>
              <ToggleChip
                label="Any"
                active={draft.toolMatch !== 'all'}
                onPress={() => setDraft({ ...draft, toolMatch: 'any' })}
                size="compact"
                accent={insightAccent}
              />
              <ToggleChip
                label="All"
                active={draft.toolMatch === 'all'}
                onPress={() => setDraft({ ...draft, toolMatch: 'all' })}
                size="compact"
                accent={insightAccent}
              />
              <Text style={styles.matchHint} numberOfLines={1}>
                {draft.toolMatch === 'all' ? 'must have every one' : 'has any one'}
              </Text>
            </View>
          ) : null}
          <SearchableSelect
            mode="multi"
            options={variations}
            onOptionsChange={onVariationsChange}
            value={draft.variationIds}
            onChange={(variationIds) => setDraft({ ...draft, variationIds })}
            suggestedIds={suggestedIds}
            accent={insightAccent}
            onCreate={async () => ({
              data: null,
              error: 'Create variations under Account → Taxonomy.',
            })}
            placeholder="All variations…"
            emptyLabel="All variations"
            fill
            accessibilityLabel="Insight variations"
          />
          <SearchableSelect
            mode="multi"
            options={tools}
            onOptionsChange={onToolsChange}
            value={draft.toolIds}
            onChange={(toolIds) => setDraft({ ...draft, toolIds })}
            accent={insightAccent}
            onCreate={async () => ({
              data: null,
              error: 'Create tools under Account → Taxonomy.',
            })}
            placeholder="All tools…"
            emptyLabel="All tools"
            fill
            accessibilityLabel="Insight tools"
          />
        </View>
      </View>

      <View style={styles.clauseRow}>
        <Text style={styles.word}>SHOW</Text>
        <View style={styles.clauseContent}>
          {draft.measures.map((measure, index) => (
            <QbMeasureRow
              key={measure.id}
              measure={measure}
              result={
                result?.measures.find((m) => m.measureId === measure.id) ?? null
              }
              availableFields={result?.availableFields}
              onChange={(next) => updateMeasure(index, next)}
              onRemove={() => removeMeasure(index)}
              canRemove={draft.measures.length > 1}
            />
          ))}
          <QbAddChildButton
            childKind="measure"
            parentTitle="this Insight"
            onPress={addMeasure}
          />
        </View>
      </View>

      <View style={styles.editorActions}>
        <Pressable
          onPress={saveEdit}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        <Pressable onPress={cancelEdit} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Summary row — mirrors the workout Overrides list item.
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: qbInsightChip.border,
    borderRadius: 8,
    backgroundColor: qbInsightChip.background,
  },
  summaryText: {
    flex: 1,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.text,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  summaryIconBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: qbInsightChip.border,
    borderRadius: 6,
    backgroundColor: qbInsightChip.background,
  },
  summaryRemove: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunset,
  },
  // Editor panel — mirrors the workout override editor's dashed dusk card.
  editor: {
    gap: 4,
    padding: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: qbInsightChip.border,
    backgroundColor: qbInsightChip.background,
    borderRadius: 8,
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: qbInsightChip.color,
    opacity: 0.85,
  },
  word: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    width: 46,
    color: qbInsightChip.color,
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
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  matchLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: qbInsightChip.color,
    opacity: 0.85,
  },
  matchHint: {
    fontFamily: typography.font,
    fontSize: 12,
    color: qbInsightChip.color,
    opacity: 0.7,
    flexShrink: 1,
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 6,
  },
  // Outline recipe, not a filled wash — matches `overrideSave` in ClusterEditor.
  saveBtn: {
    height: 32,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: qbInsightChip.color,
  },
  saveText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: qbInsightChip.color,
  },
  cancelText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
