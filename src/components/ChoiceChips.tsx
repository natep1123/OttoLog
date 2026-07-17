import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Option = { id: string; label: string };

type Props = {
  label?: string;
  options: readonly Option[] | Option[];
  value: string;
  onChange: (id: string) => void;
  /** Keep chips on one row (no wrap). Use for short enums like Type. */
  singleLine?: boolean;
};

/** Compact single-select chips for enums (target shape, units, etc.). */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  singleLine,
}: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, singleLine && styles.rowSingle]}>
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[
                styles.chip,
                singleLine && styles.chipSingle,
                selected && styles.chipSelected,
              ]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  rowSingle: {
    flexWrap: 'nowrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
  },
  chipSingle: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  chipSelected: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  chipText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.text,
  },
});
