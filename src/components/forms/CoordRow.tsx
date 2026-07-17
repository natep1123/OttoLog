import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { nodePaddingX, formChevron } from './formTokens';

type Props = {
  meta?: string;
  coord?: string | null;
  onCoordPress?: () => void;
  /**
   * Name field between the small meta label and the trailing action.
   * Shared pattern for exercise / cluster / block / session cards.
   */
  title?: ReactNode;
  /**
   * Far-right action on the coord line (typically the ⋯ more menu).
   */
  trailing?: ReactNode;
  /**
   * When set with onToggleExpand, a fixed left chevron gutter toggles
   * the card body. Title + trailing stay independently tappable.
   */
  expanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Top card line: chevron gutter · kind label (+ optional coord) · name · trailing.
 * Chevron sits in a fixed-width hit target so the name field does not shift.
 */
export function CoordRow({
  meta,
  coord,
  onCoordPress,
  title,
  trailing,
  expanded,
  onToggleExpand,
}: Props) {
  if (!meta && !coord && !title && !trailing) return null;

  const collapsible = typeof onToggleExpand === 'function';
  const isExpanded = expanded !== false;

  const metaAndCoord = (
    <>
      {meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {coord ? (
        <Pressable
          onPress={onCoordPress}
          disabled={!onCoordPress}
          style={({ pressed }) => [
            styles.chip,
            pressed && onCoordPress && styles.chipPressed,
            !onCoordPress && styles.chipStatic,
          ]}
        >
          <Text style={styles.chipText}>{coord}</Text>
        </Pressable>
      ) : null}
    </>
  );

  return (
    <View style={[styles.row, !isExpanded && styles.rowCollapsed]}>
      {collapsible ? (
        <Pressable
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={
            isExpanded ? 'Collapse card' : 'Expand card'
          }
          // Reach the accent bar (3px) sitting outside the card padding.
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
          style={({ pressed }) => [
            styles.toggle,
            pressed && styles.togglePressed,
          ]}
        >
          <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
          {metaAndCoord}
        </Pressable>
      ) : meta || coord ? (
        <View style={styles.leading}>{metaAndCoord}</View>
      ) : null}

      {title ? <View style={styles.title}>{title}</View> : null}

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    zIndex: 30,
  },
  rowCollapsed: {
    paddingBottom: 2,
  },
  /**
   * Pull flush to the NodeShell accent bar, then pad the glyph so it
   * sits a few px in from the color strip — not floating in a wide gutter.
   */
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
    marginLeft: -nodePaddingX,
    paddingLeft: 6,
    paddingRight: 2,
    paddingVertical: 4,
    minHeight: 36,
  },
  togglePressed: {
    opacity: 0.75,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingVertical: 2,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: formChevron.fontSize,
    lineHeight: formChevron.lineHeight,
    color: colors.textDim,
    // No fixed width — glyph sizes itself so we can go large without a fat gutter.
    includeFontPadding: false,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  meta: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
    flexShrink: 0,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  chipPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  chipStatic: {
    opacity: 0.9,
  },
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.sunrise,
  },
});
