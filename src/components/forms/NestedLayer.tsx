import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { layer as layerTokens, spacing } from '../../theme/tokens';
import { CoordRow, type CoordChip } from './CoordRow';
import {
  FormNodeKind,
  nodeBorderWidth,
  nodePaddingX,
} from './formTokens';

type ExpandApi = {
  expanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

type Props = {
  layer: FormNodeKind;
  /**
   * Semantic nesting hint retained for editor call sites. Geometry is shared:
   * item containers overlap every nested card with its parent's outer bounds.
   */
  nested?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Controlled expand. When set, overrides internal state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Session/Block/Sequence: mandatory Label selector on line 1. */
  label?: ReactNode;
  /** Session/Block/Sequence: Name/Brief editor on line 2 when expanded (optional). */
  brief?: ReactNode;
  /** Resolved title on line 2 when collapsed. */
  collapsedBrief?: string | null;
  /**
   * Exercise (or legacy): single-line title. Ignored when `label` is set.
   */
  title?: ReactNode;
  /** Tinted summary chips under the brief/title. */
  metaChips?: Array<string | CoordChip>;
  trailing?: ReactNode | ((api: ExpandApi) => ReactNode);
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * Shared chrome for Session / Block / Sequence / Exercise cards:
 * monotonic bg, tinted border, left rail, per-layer radius, optional collapse.
 */
export function NestedLayer({
  layer,
  collapsible = true,
  defaultCollapsed = false,
  expanded: controlledExpanded,
  onExpandedChange,
  label,
  brief,
  collapsedBrief,
  title,
  metaChips,
  trailing,
  children,
  style,
}: Props) {
  const token = layerTokens[layer];
  const [internalExpanded, setInternalExpanded] = useState(!defaultCollapsed);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const setExpanded = (next: boolean) => {
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const api: ExpandApi = {
    expanded,
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
    toggle: () => setExpanded(!expanded),
  };

  const radius =
    layer === 'session' || layer === 'block'
      ? 10
      : layer === 'cluster'
        ? 8
        : 6;

  const trailingNode =
    typeof trailing === 'function' ? trailing(api) : trailing;
  const railGlowStyle = token.rail.glow
    ? { boxShadow: token.rail.glow }
    : null;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: token.bg,
          borderColor: token.border,
          borderRadius: radius,
          paddingHorizontal: nodePaddingX,
          paddingTop: 10,
          paddingBottom: 10,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.accentVertical,
          {
            top: -nodeBorderWidth,
            bottom: radius - 1,
            width: token.rail.width,
            backgroundColor: token.rail.color,
          },
          railGlowStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.accentCorner,
          {
            width: radius + token.rail.width,
            height: radius + token.rail.width,
            borderLeftWidth: token.rail.width,
            borderBottomWidth: token.rail.width,
            borderBottomLeftRadius: radius + 1,
            borderColor: token.rail.color,
          },
          railGlowStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.accentBottom,
          {
            left: radius - 1,
            height: token.rail.width,
            backgroundColor: token.rail.color,
          },
          railGlowStyle,
        ]}
      />
      <CoordRow
        layer={layer}
        metaChips={metaChips}
        expanded={collapsible ? expanded : undefined}
        onToggleExpand={collapsible ? api.toggle : undefined}
        label={label}
        brief={brief}
        collapsedBrief={collapsedBrief}
        title={title}
        trailing={trailingNode}
      />

      {collapsible && !expanded ? null : (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: nodeBorderWidth,
  },
  accentVertical: {
    position: 'absolute',
    left: -nodeBorderWidth,
    borderRadius: 2,
  },
  accentCorner: {
    position: 'absolute',
    left: -nodeBorderWidth,
    bottom: -nodeBorderWidth,
  },
  accentBottom: {
    position: 'absolute',
    right: -nodeBorderWidth,
    bottom: -nodeBorderWidth,
    borderRadius: 2,
  },
  body: {
    gap: spacing.xs,
  },
});
