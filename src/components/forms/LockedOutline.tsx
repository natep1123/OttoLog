import { StyleSheet, Text, View } from 'react-native';
import type { OutlineNode } from '../../lib/targetSummaries';
import {
  colors,
  layer as layerTokens,
  override as overrideTokens,
  typography,
} from '../../theme/tokens';
import type { FormNodeKind } from './formTokens';

type Props = {
  node: OutlineNode;
  /** Host card layer — tints the outline wash at the root. */
  layer?: FormNodeKind;
  /** Nesting depth for indent (0 = root of this outline). */
  depth?: number;
  /** Screenshot preview — keep root chrome, omit title (modal header covers it). */
  hideRootTitle?: boolean;
  /** Screenshot preview — root chrome fills the fixed page body. */
  fillContainer?: boolean;
};

function kindTint(kind: OutlineNode['kind'], host: FormNodeKind): string {
  if (kind === 'set') return colors.sunrise;
  if (kind && kind in layerTokens) {
    return layerTokens[kind as FormNodeKind].chip.color;
  }
  return layerTokens[host].chip.color;
}

/**
 * Compact coach-grammar tree shown when a card is locked + expanded.
 * Sparse nested rules: thin left spine colored by each child's layer.
 */
export function LockedOutline({
  node,
  layer = 'exercise',
  depth = 0,
  hideRootTitle = false,
  fillContainer = false,
}: Props) {
  const hostToken = layerTokens[layer];
  const tint = kindTint(node.kind, layer);
  const showTitle = !(depth === 0 && hideRootTitle);
  const hasBody =
    Boolean(showTitle && node.meta) ||
    Boolean(node.notes) ||
    Boolean(node.lines?.length) ||
    Boolean(node.overrides?.length) ||
    Boolean(node.children?.length);

  return (
    <View
      style={[
        styles.root,
        depth === 0 && {
          borderColor: hostToken.border,
          backgroundColor: hostToken.chip.background,
        },
        depth === 0 && fillContainer && styles.fillRoot,
        depth > 0 && [styles.nested, { borderLeftColor: tint }],
      ]}
    >
      {showTitle && node.title ? (
        <Text
          style={[
            styles.title,
            { color: tint },
            depth === 0 && styles.titleRoot,
          ]}
          numberOfLines={2}
        >
          {node.title}
        </Text>
      ) : null}
      {showTitle && node.meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {node.meta}
        </Text>
      ) : null}
      {node.notes ? (
        <Text
          style={styles.notes}
          // Inline cards stay compact; screenshot modal shows full notes.
          numberOfLines={fillContainer ? undefined : 3}
        >
          {node.notes}
        </Text>
      ) : null}
      {node.lines?.length ? (
        <View style={styles.lines}>
          {node.lines.map((line, index) => (
            <Text
              key={`${line}-${index}`}
              style={styles.line}
              numberOfLines={2}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {node.overrides?.length ? (
        <View
          style={[
            styles.overrides,
            { borderLeftColor: overrideTokens.color },
          ]}
        >
          {node.overrides.map((item, index) => (
            <View
              key={`${item.summary}-${index}`}
              style={styles.overrideItem}
            >
              {item.summary ? (
                <Text style={styles.overrideSummary} numberOfLines={2}>
                  {item.summary}
                </Text>
              ) : null}
              {item.notes ? (
                <Text
                  style={styles.overrideNotes}
                  numberOfLines={fillContainer ? undefined : 2}
                >
                  {item.notes}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {node.children?.length ? (
        <View style={styles.children}>
          {node.children.map((child, index) => (
            <LockedOutline
              key={`${child.title}-${index}`}
              node={child}
              layer={layer}
              depth={depth + 1}
              hideRootTitle={hideRootTitle}
              fillContainer={fillContainer}
            />
          ))}
        </View>
      ) : null}
      {depth === 0 && !hasBody ? (
        <Text style={styles.empty}>Nothing prescribed yet</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  fillRoot: {
    flex: 1,
    alignSelf: 'stretch',
  },
  /** Nested layer spine — thin left border (Block / Circuit / Exercise). */
  nested: {
    borderWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 0,
    paddingLeft: 10,
    marginLeft: 4,
    borderLeftWidth: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  titleRoot: {
    fontSize: 14,
  },
  meta: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  notes: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: 2,
  },
  lines: {
    gap: 2,
    marginTop: 2,
  },
  line: {
    fontFamily: typography.font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  /**
   * Override spine — same geometry as `nested`: thin left border whose ends
   * curl via borderRadius (inherited on nested from `root`). Do not invent a
   * separate L-rail / stub chrome here.
   */
  overrides: {
    gap: 6,
    marginTop: 3,
    paddingVertical: 4,
    paddingHorizontal: 0,
    paddingLeft: 10,
    marginLeft: 4,
    borderWidth: 0,
    borderLeftWidth: 1,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  overrideItem: {
    gap: 3,
  },
  overrideSummary: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    lineHeight: 17,
    color: overrideTokens.color,
  },
  overrideNotes: {
    fontFamily: typography.font,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  children: {
    gap: 6,
    marginTop: 4,
  },
  empty: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
});
