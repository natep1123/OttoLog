import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { paginateOutline, estimateOutlineHeight } from '../../lib/lockedPreviewPages';
import type { OutlineNode } from '../../lib/targetSummaries';
import { colors, layer as layerTokens, radii, spacing, typography } from '../../theme/tokens';
import type { FormNodeKind } from './formTokens';
import { LockedOutline } from './LockedOutline';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  layer: FormNodeKind;
  node: OutlineNode;
};

/** Stable chrome sizes — avoids measure → budget → page-count feedback loops. */
const HEADER_CHROME = 64;
const PAGINATION_CHROME = 52;
const BODY_INSET = spacing.sm;
const BODY_HEIGHT_EXTRA = spacing.lg;

/**
 * Full-screen locked outline for screenshots. Fixed body height; pagination
 * driven by a one-time content measure vs stable body budget.
 */
export function LockedPreviewModal({
  visible,
  onClose,
  title,
  subtitle,
  layer,
  node,
}: Props) {
  const token = layerTokens[layer];
  const insets = useSafeAreaInsets();
  const window = Dimensions.get('window');
  const cardWidth = window.width - spacing.lg * 2;
  const maxCardHeight =
    window.height - insets.top - insets.bottom - spacing.md * 2;

  const bodyBudget = useMemo(
    () =>
      Math.max(
        180,
        maxCardHeight -
          HEADER_CHROME -
          PAGINATION_CHROME -
          BODY_INSET * 2,
      ),
    [maxCardHeight],
  );

  const fixedBodyHeight = bodyBudget + BODY_HEIGHT_EXTRA;

  const [fullContentHeight, setFullContentHeight] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setFullContentHeight(null);
    setPageIndex(0);
  }, [visible, node]);

  const heightScale = useMemo(() => {
    if (fullContentHeight === null) return 1;
    const estimated = estimateOutlineHeight(node, { omitRootHeader: true });
    if (estimated <= 0) return 1;
    return fullContentHeight / estimated;
  }, [node, fullContentHeight]);

  const pages = useMemo(() => {
    if (fullContentHeight === null) {
      return [node];
    }
    if (fullContentHeight <= bodyBudget) {
      return [node];
    }
    return paginateOutline(node, bodyBudget, {
      omitRootHeader: true,
      heightScale,
    });
  }, [node, fullContentHeight, bodyBudget, heightScale]);

  const pageCount = pages.length;
  const pageNode = pages[pageIndex] ?? node;
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;
  const measuring = visible && fullContentHeight === null;
  const ready = visible && fullContentHeight !== null;

  useEffect(() => {
    setPageIndex(0);
  }, [pages.length]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {measuring ? (
        <SafeAreaView
          style={[styles.safe, styles.probe]}
          pointerEvents="none"
          edges={['top', 'bottom', 'left', 'right']}
        >
          <View style={[styles.stage, { width: cardWidth }]}>
            <View style={[styles.pageBody, { width: cardWidth }]}>
              <View
                onLayout={(event) => {
                  const h = Math.ceil(event.nativeEvent.layout.height);
                  if (h > 0) setFullContentHeight(h);
                }}
              >
                <LockedOutline node={node} layer={layer} hideRootTitle />
              </View>
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      {ready ? (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.stage}>
            <View
              style={[
                styles.card,
                {
                  maxHeight: maxCardHeight,
                  borderColor: token.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerCopy}>
                  <Text style={[styles.title, { color: token.chip.color }]}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close screenshot view"
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <Feather name="x" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={[styles.pageBody, { height: fixedBodyHeight }]}>
                <LockedOutline
                  node={pageNode}
                  layer={layer}
                  hideRootTitle
                  fillContainer
                />
              </View>

              {pageCount > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    onPress={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={!canPrev}
                    accessibilityRole="button"
                    accessibilityLabel="Previous page"
                    style={({ pressed }) => [
                      styles.pageBtn,
                      !canPrev && styles.pageBtnDisabled,
                      pressed && canPrev && styles.pressed,
                    ]}
                  >
                    <Feather
                      name="chevron-left"
                      size={22}
                      color={canPrev ? colors.text : colors.textDim}
                    />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    Page {pageIndex + 1} of {pageCount}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                    }
                    disabled={!canNext}
                    accessibilityRole="button"
                    accessibilityLabel="Next page"
                    style={({ pressed }) => [
                      styles.pageBtn,
                      !canNext && styles.pageBtnDisabled,
                      pressed && canNext && styles.pressed,
                    ]}
                  >
                    <Feather
                      name="chevron-right"
                      size={22}
                      color={canNext ? colors.text : colors.textDim}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  probe: {
    opacity: 0,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: typography.font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
  },
  pressed: {
    opacity: 0.8,
  },
  pageBody: {
    paddingHorizontal: BODY_INSET,
    paddingVertical: BODY_INSET,
    alignSelf: 'stretch',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  pageBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.textMuted,
    minWidth: 108,
    textAlign: 'center',
  },
});
