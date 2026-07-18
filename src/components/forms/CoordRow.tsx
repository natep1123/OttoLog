import { Fragment, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, layer as layerTokens, radii, typography } from '../../theme/tokens';
import {
  FormNodeKind,
  formChevron,
  layerHeaderLeadingWidth,
} from './formTokens';

export type CoordChip = {
  label: string;
  /** The thing represented by the pill; arrows still use the host layer. */
  kind: FormNodeKind | 'set';
};

type Props = {
  layer?: FormNodeKind;
  /** @deprecated Prefer metaChips. */
  meta?: string;
  /** Full-width summary chips under the brief/title. */
  metaChips?: Array<string | CoordChip>;
  /**
   * Line 1 primary control for Session/Block/Sequence (mandatory Label selector).
   * When set, `title` is ignored for line 1.
   */
  label?: ReactNode;
  /**
   * Line 2 Name/Brief editor when expanded *and* `brief` is provided.
   * When name/brief lives in More, omit `brief` so this band only appears collapsed.
   */
  brief?: ReactNode;
  /** Resolved title shown on line 2 when collapsed. */
  collapsedBrief?: string | null;
  /** Exercise (and legacy) single-line title — used when `label` is omitted. */
  title?: ReactNode;
  trailing?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Card header bands:
 * 1. chevron · label|title · trailing
 * 2. Name/Brief (editable, if provided) or collapsed resolved title
 * 3. scrollable chips
 */
export function CoordRow({
  layer = 'exercise',
  meta,
  metaChips,
  label,
  brief,
  collapsedBrief,
  title,
  trailing,
  expanded,
  onToggleExpand,
}: Props) {
  const hasLine1 = Boolean(label || title || trailing || onToggleExpand);
  const chips = (metaChips?.length ? metaChips : meta ? [meta] : []).map(
    (chip) => (typeof chip === 'string' ? { label: chip, kind: layer } : chip),
  );
  if (!hasLine1 && !brief && !collapsedBrief && !chips.length) return null;

  const collapsible = typeof onToggleExpand === 'function';
  const isExpanded = expanded !== false;
  const token = layerTokens[layer];
  const chipToken = (kind: CoordChip['kind']) =>
    kind === 'set'
      ? {
          border: 'rgba(255, 154, 90, 0.28)',
          background: colors.amberGlow,
          color: colors.sunrise,
        }
      : {
          border: layerTokens[kind].border,
          background: layerTokens[kind].chip.background,
          color: layerTokens[kind].chip.color,
        };
  // Expanded brief band only when an editor is passed; otherwise show
  // the resolved title solely while collapsed (name lives in More).
  const showBriefBand =
    Boolean(label) &&
    ((isExpanded && Boolean(brief)) ||
      (!isExpanded && Boolean(collapsedBrief)));

  return (
    <View style={styles.stack}>
      {hasLine1 ? (
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
          ) : (
            <View style={styles.toggleSpacer} />
          )}

          <View style={styles.primary}>
            {label ? label : title}
          </View>

          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}

      {showBriefBand ? (
        <View style={styles.briefRow}>
          <View style={styles.toggleSpacer} />
          <View style={styles.brief}>
            {isExpanded && brief ? (
              brief
            ) : (
              <Text style={styles.collapsedBrief} numberOfLines={1}>
                {collapsedBrief || ' '}
              </Text>
            )}
          </View>
          {trailing ? <View style={styles.trailingSpacer} /> : null}
        </View>
      ) : null}

      {/* Exercise path: chips under the title row */}
      {!label && title && chips.length ? (
        <View style={styles.chipRow}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.chipViewport}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {chips.map((chip, index) => {
              const represented = chipToken(chip.kind);
              return (
                <Fragment key={`${chip.label}-${index}`}>
                  {index > 0 ? (
                    <Text
                      style={[styles.chipArrow, { color: token.chip.color }]}
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      →
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.chip,
                      {
                        borderColor: represented.border,
                        backgroundColor: represented.background,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: represented.color }]}
                      numberOfLines={1}
                    >
                      {chip.label}
                    </Text>
                  </View>
                </Fragment>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {label && chips.length ? (
        <View style={styles.chipRow}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.chipViewport}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {chips.map((chip, index) => {
              const represented = chipToken(chip.kind);
              return (
                <Fragment key={`${chip.label}-${index}`}>
                  {index > 0 ? (
                    <Text
                      style={[styles.chipArrow, { color: token.chip.color }]}
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      →
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.chip,
                      {
                        borderColor: represented.border,
                        backgroundColor: represented.background,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: represented.color }]}
                      numberOfLines={1}
                    >
                      {chip.label}
                    </Text>
                  </View>
                </Fragment>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 6,
    paddingBottom: 8,
    zIndex: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCollapsed: {
    paddingBottom: 0,
  },
  briefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggle: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
    paddingVertical: 4,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSpacer: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
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
  primary: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0,
  },
  brief: {
    flex: 1,
    minWidth: 0,
  },
  collapsedBrief: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  chipViewport: {
    flex: 1,
    minWidth: 0,
  },
  chips: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  trailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trailingSpacer: {
    // Matches two IconButtons (32) + gap (6) in the trailing cluster
    width: 70,
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
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  chipArrow: {
    alignSelf: 'center',
    fontFamily: typography.fontMedium,
    fontSize: 12,
    lineHeight: 16,
  },
});
