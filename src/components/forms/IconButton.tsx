import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  label?: string;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
};

/** Prototype `.btn-icon` — used for ⋯ more menus. */
export function IconButton({
  label = '⋯',
  onPress,
  active,
  accessibilityLabel = 'More options',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        (pressed || active) && styles.btnActive,
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.text, (pressed || active) && styles.textActive]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  btnActive: {
    backgroundColor: 'rgba(255, 154, 90, 0.08)',
  },
  text: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    lineHeight: 20,
    color: colors.textDim,
  },
  textActive: {
    color: colors.sunrise,
  },
});
