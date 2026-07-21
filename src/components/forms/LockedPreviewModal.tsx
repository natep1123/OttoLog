import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
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

/**
 * Full-screen locked outline for screenshots. Fixed body height; pagination
 * driven by a one-time content measure vs stable body budget.
 * Multi-page: swipe horizontally between pages; chevrons stay in sync.
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

  const singlePageBodyBudget = useMemo(
    () =>
      Math.max(
        180,
        maxCardHeight - HEADER_CHROME - BODY_INSET * 2,
      ),
    [maxCardHeight],
  );
  const paginatedBodyBudget = useMemo(
    () => Math.max(180, singlePageBodyBudget - PAGINATION_CHROME),
    [singlePageBodyBudget],
  );

  const [fullContentHeight, setFullContentHeight] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

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
    if (fullContentHeight <= singlePageBodyBudget) {
      return [node];
    }
    return paginateOutline(node, paginatedBodyBudget, {
      omitRootHeader: true,
      heightScale,
    });
  }, [node, fullContentHeight, singlePageBodyBudget, paginatedBodyBudget, heightScale]);

  const pageCount = pages.length;
  // Outer pageBody height includes padding; packing uses the inner content budget.
  const contentBudget = pageCount > 1 ? paginatedBodyBudget : singlePageBodyBudget;
  const fixedBodyHeight = contentBudget + BODY_INSET * 2;
  /** Inner pager width — falls back to card math until onLayout fires. */
  const slideWidth =
    pageWidth > 0 ? pageWidth : Math.max(1, cardWidth - BODY_INSET * 2);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;
  const measuring = visible && fullContentHeight === null;
  const ready = visible && fullContentHeight !== null;

  useEffect(() => {
    setPageIndex(0);
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  }, [pages.length]);

  const goToPage = (index: number, animated = true) => {
    const next = Math.max(0, Math.min(pageCount - 1, index));
    setPageIndex(next);
    pagerRef.current?.scrollTo({ x: next * slideWidth, animated });
  };

  const onPagerScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setPageIndex(Math.max(0, Math.min(pageCount - 1, next)));
  };

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
                <ScrollView
                  ref={pagerRef}
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onPagerScrollEnd}
                  onLayout={(event) => {
                    const w = Math.round(event.nativeEvent.layout.width);
                    if (w > 0 && w !== pageWidth) setPageWidth(w);
                  }}
                  style={styles.pager}
                  contentContainerStyle={styles.pagerContent}
                >
                  {pages.map((pageNode, index) => (
                    <View
                      key={`page-${index}`}
                      style={[
                        styles.pageSlide,
                        {
                          width: slideWidth,
                          height: contentBudget,
                        },
                      ]}
                    >
                      <LockedOutline
                        node={pageNode}
                        layer={layer}
                        hideRootTitle
                        fillContainer
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>

              {pageCount > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    onPress={() => goToPage(pageIndex - 1)}
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
                    onPress={() => goToPage(pageIndex + 1)}
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
    backgroundColor: colors.bgInset,
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
    backgroundColor: colors.bgInset,
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
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    flexGrow: 1,
  },
  pageSlide: {
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
    backgroundColor: colors.bgInset,
  },
  pageBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
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
