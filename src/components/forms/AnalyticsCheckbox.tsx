import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme/tokens';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
};

/** Prototype set-analytics checkbox — orange square when on. */
export function AnalyticsCheckbox({
  checked,
  onChange,
  accessibilityLabel = 'Include in analytics',
}: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.box, checked && styles.boxOn]}
    >
      {checked ? <View style={styles.mark} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: colors.sunrise,
    borderColor: colors.sunrise,
  },
  mark: {
    width: 8,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.onPrimary,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
