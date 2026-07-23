import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import type { SetType } from '../../lib/insights';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import { colors, spacing, typography } from '../../theme/tokens';
import { SearchableSelect } from '../forms/SearchableSelect';
import { SessionDateControl } from '../forms/SessionDateControl';
import { ToggleChip } from '../forms/ToggleChip';
import { sectionScopeGrammar } from './qbOutline';
import { qbLayerToken } from './qbTokens';
import {
  matchWindowPreset,
  presetWindow,
  WINDOW_PRESET_OPTIONS,
} from './qbWindowPresets';
import type { QueryDraft } from './types';

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

const queryAccent = qbLayerToken('query').chip.color;

type Props = {
  draft: QueryDraft;
  onChange: (next: QueryDraft) => void;
  sessionLabels: TaxonomyOption[];
  onSessionLabelsChange: (next: TaxonomyOption[]) => void;
  blockLabels: TaxonomyOption[];
  onBlockLabelsChange: (next: TaxonomyOption[]) => void;
  sequenceLabels: TaxonomyOption[];
  onSequenceLabelsChange: (next: TaxonomyOption[]) => void;
};

/**
 * Query frame — madlib **IN / WHERE** (doc §2.1). Collapses Section into the
 * Query card: no separate Block-like shell, no Section lock toggle. `WHERE`
 * shows its resolved grammar inline and expands to edit; `IN` is rolling
 * presets with a Custom fallback to the existing date pickers.
 */
export function QbMadlibQueryFrame({
  draft,
  onChange,
  sessionLabels,
  onSessionLabelsChange,
  blockLabels,
  onBlockLabelsChange,
  sequenceLabels,
  onSequenceLabelsChange,
}: Props) {
  const activePreset = matchWindowPreset(draft.window);
  const [customOpen, setCustomOpen] = useState(activePreset === 'custom');
  const [whereOpen, setWhereOpen] = useState(false);

  useEffect(() => {
    if (activePreset === 'custom') setCustomOpen(true);
  }, [activePreset]);

  const scopeGrammar = sectionScopeGrammar(draft.section, {
    primaryGroups: [],
    sessionLabels,
    blockLabels,
    sequenceLabels,
    variations: [],
    tools: [],
  });

  const patchScope = (patch: Partial<QueryDraft['section']['scope']>) => {
    onChange({
      ...draft,
      section: { ...draft.section, scope: { ...draft.section.scope, ...patch } },
    });
  };

  const toggleWarmups = () => {
    const next = !draft.section.setPolicy.includeWarmups;
    let setTypes = [...draft.section.setPolicy.setTypes];
    if (setTypes.length === 0) setTypes = ['Working'];
    if (next && !setTypes.includes('Warmup')) setTypes = [...setTypes, 'Warmup'];
    if (!next) setTypes = setTypes.filter((t) => t !== 'Warmup');
    if (setTypes.length === 0) setTypes = ['Working'];
    onChange({
      ...draft,
      section: {
        ...draft.section,
        setPolicy: { setTypes, includeWarmups: next },
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.word, { color: queryAccent }]}>IN</Text>
        <View style={styles.chipsRow}>
          {WINDOW_PRESET_OPTIONS.map((p) => (
            <ToggleChip
              key={p.id}
              label={p.label}
              active={!customOpen && activePreset === p.id}
              onPress={() => {
                setCustomOpen(false);
                onChange({ ...draft, window: presetWindow(p.id) });
              }}
              size="compact"
            />
          ))}
          <ToggleChip
            label="Custom"
            active={customOpen}
            onPress={() => setCustomOpen((o) => !o)}
            size="compact"
          />
        </View>
      </View>

      {customOpen ? (
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
      ) : null}

      <Pressable
        onPress={() => setWhereOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: whereOpen }}
        accessibilityLabel={`${whereOpen ? 'Hide' : 'Show'} WHERE scope`}
        style={styles.wherePressableRow}
      >
        <Text style={[styles.chevron, { color: queryAccent }]}>
          {whereOpen ? '▾' : '▸'}
        </Text>
        <Text style={[styles.word, { color: queryAccent }]}>WHERE</Text>
        <Text style={styles.whereSummary} numberOfLines={1}>
          {scopeGrammar}
        </Text>
      </Pressable>

      {whereOpen ? (
        <View style={styles.whereBody}>
          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Session label</Text>
            <SearchableSelect
              mode="multi"
              options={sessionLabels}
              onOptionsChange={onSessionLabelsChange}
              value={draft.section.scope.sessionCategoryIds}
              onChange={(sessionCategoryIds) =>
                patchScope({ sessionCategoryIds })
              }
              onCreate={async () => ({
                data: null,
                error: 'Create session labels under Account → Taxonomy.',
              })}
              placeholder="All session labels…"
              emptyLabel="All labels"
              fill
              accessibilityLabel="Filter by session label"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Block label</Text>
            <SearchableSelect
              mode="multi"
              options={blockLabels}
              onOptionsChange={onBlockLabelsChange}
              value={draft.section.scope.blockLabelIds}
              onChange={(blockLabelIds) => patchScope({ blockLabelIds })}
              onCreate={async () => ({
                data: null,
                error: 'Create block labels under Account → Taxonomy.',
              })}
              placeholder="All block labels…"
              emptyLabel="All blocks"
              fill
              accessibilityLabel="Filter by block label"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Sequence label</Text>
            <SearchableSelect
              mode="multi"
              options={sequenceLabels}
              onOptionsChange={onSequenceLabelsChange}
              value={draft.section.scope.sequenceLabelIds}
              onChange={(sequenceLabelIds) =>
                patchScope({ sequenceLabelIds })
              }
              onCreate={async () => ({
                data: null,
                error: 'Create sequence labels under Account → Taxonomy.',
              })}
              placeholder="All sequence labels…"
              emptyLabel="All sequences"
              fill
              accessibilityLabel="Filter by sequence label"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Set type</Text>
            <SearchableSelect
              mode="multi"
              options={SET_TYPE_FILTER_OPTIONS}
              value={draft.section.setPolicy.setTypes}
              onChange={(setTypes) => {
                const next = setTypes as SetType[];
                onChange({
                  ...draft,
                  section: {
                    ...draft.section,
                    setPolicy: {
                      setTypes: next.length ? next : ['Working'],
                      includeWarmups: next.includes('Warmup'),
                    },
                  },
                });
              }}
              onCreate={async () => ({ data: null, error: 'Set types are fixed.' })}
              placeholder="Working only…"
              emptyLabel="Working only"
              fill
              accessibilityLabel="Filter by set type"
            />
          </View>
          <ToggleChip
            label={
              draft.section.setPolicy.includeWarmups
                ? 'Warmups on'
                : 'Working only'
            }
            active={draft.section.setPolicy.includeWarmups}
            onPress={toggleWarmups}
            size="compact"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  word: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    width: 52,
  },
  chipsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: 60,
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
  wherePressableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    width: 14,
    textAlign: 'center',
  },
  whereSummary: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  whereBody: {
    gap: spacing.sm,
    marginLeft: 60,
    marginTop: spacing.xs,
  },
  filterField: {
    gap: 6,
  },
});
