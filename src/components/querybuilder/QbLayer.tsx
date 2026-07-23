import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { spacing } from '../../theme/tokens';
import { nodeBorderWidth, nodePaddingX } from '../forms/formTokens';
import { QbCoordRow, type QbCoordChip } from './QbCoordRow';
import { qbLayerToken, type QbLayerKind } from './qbTokens';

type ExpandApi = {
  expanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

type Props = {
  layer: QbLayerKind;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Controlled expand. When set, overrides internal state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Line 1 primary control (picker/title slot). */
  label?: ReactNode;
  /** Single-line title used when `label` is omitted. */
  title?: ReactNode;
  metaChips?: Array<string | QbCoordChip>;
  trailing?: ReactNode | ((api: ExpandApi) => ReactNode);
  /** Ephemeral lock — orthogonal to expand; locked+expanded shows outline. */
  locked?: boolean;
  onToggleLock?: () => void;
  lockDisabled?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * Shared query builder chrome — fork of `NestedLayer`: monotonic bg, tinted
 * border, left rail + bottom-left corner, per-layer radius, optional collapse.
 * Same geometry AND accents as the workout nest (mapped by depth in `qbTokens`).
 */
export function QbLayer({
  layer,
  collapsible = true,
  defaultCollapsed = false,
  expanded: controlledExpanded,
  onExpandedChange,
  label,
  title,
  metaChips,
  trailing,
  locked = false,
  onToggleLock,
  lockDisabled = false,
  children,
  style,
}: Props) {
  const token = qbLayerToken(layer);
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
    layer === 'query' || layer === 'section' ? 10 : layer === 'breakdown' ? 8 : 6;

  const trailingNode = typeof trailing === 'function' ? trailing(api) : trailing;
  const railGlowStyle = token.rail.glow ? { boxShadow: token.rail.glow } : null;

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
      <QbCoordRow
        layer={layer}
        metaChips={metaChips}
        expanded={collapsible ? expanded : undefined}
        onToggleExpand={collapsible ? api.toggle : undefined}
        label={label}
        title={title}
        trailing={trailingNode}
        locked={locked}
        onToggleLock={onToggleLock}
        lockDisabled={lockDisabled}
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
