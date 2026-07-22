import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, queryLayer, spacing, typography } from '../../theme/tokens';
import { SessionDateControl } from '../forms/SessionDateControl';
import { StatusText } from '../StatusText';
import { QbLayer } from './QbLayer';
import { QbSectionCard } from './QbSectionCard';
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

/**
 * Query (root · = Session) — the whole report. Name + date window at the top,
 * one Section beneath. Opening it feels like opening a Session card.
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
  const setSection = (section: SectionNode) => onChange({ ...draft, section });

  const windowChip = `${draft.window.fromDate} → ${draft.window.toDate}`;

  return (
    <QbLayer
      layer="query"
      metaChips={[windowChip]}
      label={
        <TextInput
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name })}
          placeholder="Name this query (optional)"
          placeholderTextColor={colors.textDim}
          style={styles.nameInput}
          accessibilityLabel="Query name"
        />
      }
      trailing={loading ? <ActivityIndicator color={queryLayer.query.chip.color} size="small" /> : null}
    >
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

const styles = StyleSheet.create({
  nameInput: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 2,
  },
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
