import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  title: string;
  meta?: string;
  onPress?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
  badge?: string;
  badgeMuted?: string;
  archived?: boolean;
  children?: ReactNode;
};

/** Shared library/list row: title, optional meta, badges, chevron. */
export function ListCard({
  title,
  meta,
  onPress,
  disabled,
  showChevron = true,
  badge,
  badgeMuted,
  archived,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.item,
        archived && styles.itemArchived,
        pressed && !disabled && styles.itemPressed,
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          {badgeMuted ? <Text style={styles.badgeMuted}>{badgeMuted}</Text> : null}
        </View>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {children}
      </View>
      {showChevron && !disabled ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
  },
  itemArchived: {
    opacity: 0.55,
  },
  itemPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.pressedWash,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontMedium,
    fontSize: 17,
    color: colors.text,
  },
  meta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  badge: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  badgeMuted: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.textDim,
  },
});
