import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Smaller chip for set-row per-side control */
  size?: 'default' | 'compact';
  accent?: {
    color: string;
    border: string;
    background: string;
  };
};

/**
 * Prototype `.duration-toggle` / `.analytics-toggle` / `.toggle-per-side`.
 * Off: muted outline. On: sunrise→gold gradient + dark label
 * ("Duration on", "Analytics on", "Reps/Side" — CSS uppercases them).
 */
export function ToggleChip({
  label,
  active,
  onPress,
  size = 'default',
  accent,
}: Props) {
  const compact = size === 'compact';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        !active && styles.off,
        !active && accent ? { borderColor: accent.border } : null,
        !active && pressed && styles.offPressed,
        !active && pressed && accent
          ? { backgroundColor: accent.background }
          : null,
        active && styles.onWrap,
      ]}
    >
      {active && accent ? (
        <View
          style={[
            styles.gradient,
            compact && styles.gradientCompact,
            {
              backgroundColor: accent.background,
              borderWidth: 1,
              borderColor: accent.border,
            },
          ]}
        >
          <Text
            style={[
              styles.labelOn,
              compact && styles.labelCompact,
              { color: accent.color },
            ]}
          >
            {label}
          </Text>
        </View>
      ) : active ? (
        <LinearGradient
          colors={[colors.sunrise, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, compact && styles.gradientCompact]}
        >
          <Text style={[styles.labelOn, compact && styles.labelCompact]}>
            {label}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.offInner, compact && styles.offInnerCompact]}>
          <Text style={[styles.labelOff, compact && styles.labelCompact]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  baseCompact: {
    minHeight: 34,
    justifyContent: 'center',
  },
  off: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  offPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 154, 90, 0.08)',
  },
  onWrap: {
    borderWidth: 0,
  },
  gradient: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCompact: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  offInner: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offInnerCompact: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  labelOn: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.onPrimary,
  },
  labelOff: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  labelCompact: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
