import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { layer as layerTokens, radii, typography } from '../../theme/tokens';
import {
  FormNodeKind,
  formChevron,
  layerHeaderLeadingWidth,
} from './formTokens';

type Props = {
  layer?: FormNodeKind;
  /** @deprecated Prefer metaChip on the trailing side. */
  meta?: string;
  /** Small tinted summary chip on the right (before trailing). */
  metaChip?: string | null;
  coord?: string | null;
  onCoordPress?: () => void;
  title?: ReactNode;
  trailing?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Top card line: chevron · name · meta chip · trailing.
 * Chevron is tinted to the layer rail and rotates -90deg when collapsed.
 */
export function CoordRow({
  layer = 'exercise',
  meta,
  metaChip,
  coord,
  onCoordPress,
  title,
  trailing,
  expanded,
  onToggleExpand,
}: Props) {
  if (!meta && !metaChip && !coord && !title && !trailing) return null;

  const collapsible = typeof onToggleExpand === 'function';
  const isExpanded = expanded !== false;
  const token = layerTokens[layer];
  const chipLabel = metaChip ?? meta ?? null;

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
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
          style={({ pressed }) => [
            styles.toggle,
            pressed && styles.togglePressed,
          ]}
        >
          <Text
            style={[
              styles.chevron,
              { color: token.chip.color },
              !isExpanded && styles.chevronCollapsed,
            ]}
          >
            ▾
          </Text>
        </Pressable>
      ) : null}

      {title ? <View style={styles.title}>{title}</View> : null}

      {chipLabel || coord ? (
        <View style={styles.chips}>
          {chipLabel ? (
            <View
              style={[
                styles.chip,
                {
                  borderColor: token.border,
                  backgroundColor: token.chip.background,
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: token.chip.color }]}
                numberOfLines={1}
              >
                {chipLabel}
              </Text>
            </View>
          ) : null}
          {coord ? (
            <Pressable
              onPress={onCoordPress}
              disabled={!onCoordPress}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: token.border,
                  backgroundColor: token.chip.background,
                },
                pressed && onCoordPress && styles.chipPressed,
                !onCoordPress && styles.chipStatic,
              ]}
            >
              <Text style={[styles.chipText, { color: token.chip.color }]}>
                {coord}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
  toggle: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
    paddingVertical: 4,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePressed: {
    opacity: 0.75,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: formChevron.fontSize,
    lineHeight: formChevron.lineHeight,
    includeFontPadding: false,
    transform: [{ rotate: '0deg' }],
  },
  chevronCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  chips: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipStatic: {
    opacity: 0.9,
  },
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
