import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Option = { id: string; label: string };

type Props = {
  label?: string;
  options: readonly Option[] | Option[];
  value: string;
  onChange: (id: string) => void;
};

/** Compact single-select chips for enums (target shape, units, etc.). */
export function ChoiceChips({ label, options, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
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
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
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
