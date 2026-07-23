import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { SessionDateControl } from '../forms/SessionDateControl';
import { ToggleChip } from '../forms/ToggleChip';
import { qbLayerToken } from './qbTokens';
import {
  matchWindowPreset,
  presetWindow,
  WINDOW_PRESET_OPTIONS,
} from './qbWindowPresets';
import type { QueryDraft } from './types';

const queryAccent = qbLayerToken('query').chip.color;

type Props = {
  draft: QueryDraft;
  onChange: (next: QueryDraft) => void;
};

/**
 * Query frame — madlib **IN** (doc §2.1/§11.2). Date window only; **WHERE**
 * is its own Block-like container card (`QbWhereCard`, §11) below this, not
 * folded into the Query frame anymore — it needs room to hold FOR/SPLIT
 * children, not just scope chips.
 */
export function QbMadlibQueryFrame({ draft, onChange }: Props) {
  const activePreset = matchWindowPreset(draft.window);
  const [customOpen, setCustomOpen] = useState(activePreset === 'custom');

  useEffect(() => {
    if (activePreset === 'custom') setCustomOpen(true);
  }, [activePreset]);

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
});
