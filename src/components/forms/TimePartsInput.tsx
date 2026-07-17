import { Fragment, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Show faint HH / MM / SS labels above this picker (does not change box height). */
  showLabels?: boolean;
  /**
   * When true (default), 00:00:00 commits as null — “unset”, same as distance 0.
   * Set false for exercise/cluster duration while track_duration is on.
   */
  emptyAsNull?: boolean;
};

type PartKey = 'h' | 'm' | 's';
type Parts = Record<PartKey, string>;

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export function parseTimeParts(value: string | null): Parts {
  if (!value) return { h: '00', m: '00', s: '00' };
  const parts = value.split(':');
  return {
    h: pad2(Number.parseInt(parts[0] ?? '0', 10) || 0),
    m: pad2(Number.parseInt(parts[1] ?? '0', 10) || 0),
    s: pad2(Number.parseInt(parts[2] ?? '0', 10) || 0),
  };
}

export function formatTimeParts(h: string, m: string, s: string): string {
  const hours = Number.parseInt(h, 10) || 0;
  const minutes = Number.parseInt(m, 10) || 0;
  const seconds = Number.parseInt(s, 10) || 0;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  const normalizedHours = Math.floor(totalSeconds / 3600);
  const normalizedMinutes = Math.floor((totalSeconds % 3600) / 60);
  const normalizedSeconds = totalSeconds % 60;

  return `${pad2(normalizedHours)}:${pad2(normalizedMinutes)}:${pad2(normalizedSeconds)}`;
}

/**
 * Editable hh:mm:ss picker. Values normalize on blur, carrying overflow:
 * 00:90:00 → 01:30:00 and 01:60:00 → 02:00:00.
 *
 * showLabels draws faint HH/MM/SS above the boxes without changing box size.
 * For the sets table, prefer putting those labels in the Time column header
 * so set rows stay vertically aligned.
 */
export function TimePartsInput({
  value,
  onChange,
  showLabels = false,
  emptyAsNull = true,
}: Props) {
  const [parts, setParts] = useState<Parts>(() => parseTimeParts(value));
  const [focusedPart, setFocusedPart] = useState<PartKey | null>(null);

  useEffect(() => {
    if (!focusedPart) setParts(parseTimeParts(value));
  }, [focusedPart, value]);

  const setPart = (key: PartKey, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setParts((current) => ({ ...current, [key]: digits }));
  };

  const normalize = () => {
    const normalized = formatTimeParts(parts.h, parts.m, parts.s);
    const p = parseTimeParts(normalized);
    const totalSeconds =
      (Number.parseInt(p.h, 10) || 0) * 3600 +
      (Number.parseInt(p.m, 10) || 0) * 60 +
      (Number.parseInt(p.s, 10) || 0);

    setParts(p);
    // Zero duration is "not set" for set/override metrics.
    onChange(emptyAsNull && totalSeconds === 0 ? null : normalized);
    setFocusedPart(null);
  };

  return (
    <View style={styles.wrap}>
      {showLabels ? (
        <View style={styles.labelRow} pointerEvents="none">
          <Text style={[styles.partLabel, styles.partSlot]}>HH</Text>
          <Text style={styles.labelColon}>:</Text>
          <Text style={[styles.partLabel, styles.partSlot]}>MM</Text>
          <Text style={styles.labelColon}>:</Text>
          <Text style={[styles.partLabel, styles.partSlot]}>SS</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        {(['h', 'm', 's'] as const).map((key, index) => (
          <Fragment key={key}>
            {index > 0 ? <Text style={styles.sep}>:</Text> : null}
            <TextInput
              value={parts[key]}
              onChangeText={(text) => setPart(key, text)}
              onFocus={() => setFocusedPart(key)}
              onBlur={normalize}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={4}
              style={styles.part}
              accessibilityLabel={
                key === 'h' ? 'Hours' : key === 'm' ? 'Minutes' : 'Seconds'
              }
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  partLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.textDim,
    textAlign: 'center',
  },
  partSlot: {
    width: 38,
  },
  labelColon: {
    width: 7,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    color: colors.textDim,
    opacity: 0.35,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  part: {
    width: 38,
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 2,
    textAlign: 'center',
    fontFamily: typography.font,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  sep: {
    width: 7,
    textAlign: 'center',
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textDim,
  },
});
