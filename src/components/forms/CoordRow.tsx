import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { layer as layerTokens, radii, typography } from '../../theme/tokens';
import {
  FormNodeKind,
  formChevron,
  layerHeaderLeadingWidth,
} from './formTokens';

type Props = {
  layer?: FormNodeKind;
  /** @deprecated Prefer metaChips. */
  meta?: string;
  /** Tinted summary chips that scroll between title and trailing controls. */
  metaChips?: string[];
  coord?: string | null;
  onCoordPress?: () => void;
  title?: ReactNode;
  trailing?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Top card line: chevron · name · scrollable summary chips · trailing.
 * Chevron is tinted to the layer rail and rotates -90deg when collapsed.
 */
export function CoordRow({
  layer = 'exercise',
  meta,
  metaChips,
  coord,
  onCoordPress,
  title,
  trailing,
  expanded,
  onToggleExpand,
}: Props) {
  if (!meta && !metaChips?.length && !coord && !title && !trailing) return null;

  const collapsible = typeof onToggleExpand === 'function';
  const isExpanded = expanded !== false;
  const token = layerTokens[layer];
  const chipLabels = metaChips?.length ? metaChips : meta ? [meta] : [];

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

      {chipLabels.length || coord ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipViewport}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {chipLabels.map((chipLabel, index) => (
            <View
              key={`${chipLabel}-${index}`}
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
          ))}
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
        </ScrollView>
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    minWidth: 0,
  },
  chipViewport: {
    width: 76,
    flexShrink: 0,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 2,
  },
  trailing: {
    flexShrink: 0,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignSelf: 'center',
    justifyContent: 'center',
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
