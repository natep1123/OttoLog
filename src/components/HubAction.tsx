import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  title: string;
  body: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
};

/** Full-width hub action — not a card grid; one clear tap target. */
export function HubAction({ title, body, onPress, disabled, badge }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
  },
  pressed: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  disabled: {
    opacity: 0.45,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    color: colors.text,
  },
  badge: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  body: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.textDim,
  },
});
