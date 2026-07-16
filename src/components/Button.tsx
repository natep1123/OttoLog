import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  primaryGradient,
  radii,
  spacing,
  typography,
} from '../theme/tokens';

type Variant = 'primary' | 'ghost';

type Props = {
  label: string;
  variant?: Variant;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

/**
 * Primary / ghost buttons matching `.btn-primary` / `.btn-ghost`.
 * Gradient fill needs expo-linear-gradient — CSS linear-gradient is not available on View.
 */
export function Button({
  label,
  variant = 'primary',
  onPress,
  style,
  disabled,
}: Props) {
  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.pressable,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[...primaryGradient.colors]}
          start={primaryGradient.start}
          end={primaryGradient.end}
          style={styles.primaryFill}
        >
          <Text style={styles.primaryLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        styles.ghost,
        pressed && !disabled && styles.ghostPressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
  primaryFill: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 16,
    color: colors.onPrimary,
  },
  ghost: {
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  ghostLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.textMuted,
  },
  disabled: {
    opacity: 0.55,
  },
});
