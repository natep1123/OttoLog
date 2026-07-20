import { StyleSheet, Text, View } from 'react-native';
import type { OutlineNode } from '../../lib/targetSummaries';
import { colors, layer as layerTokens, typography } from '../../theme/tokens';
import type { FormNodeKind } from './formTokens';

type Props = {
  node: OutlineNode;
  /** Host card layer — tints the outline wash at the root. */
  layer?: FormNodeKind;
  /** Nesting depth for indent (0 = root of this outline). */
  depth?: number;
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
}: Props) {
  const hostToken = layerTokens[layer];
  const tint = kindTint(node.kind, layer);
  const hasBody =
    Boolean(node.meta) ||
    Boolean(node.lines?.length) ||
    Boolean(node.children?.length);

  return (
    <View
      style={[
        styles.root,
        depth === 0 && {
          borderColor: hostToken.border,
          backgroundColor: hostToken.chip.background,
        },
        depth > 0 && [styles.nested, { borderLeftColor: tint }],
      ]}
    >
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
      {node.meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {node.meta}
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
      {node.children?.length ? (
        <View style={styles.children}>
          {node.children.map((child, index) => (
            <LockedOutline
              key={`${child.title}-${index}`}
              node={child}
              layer={layer}
              depth={depth + 1}
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
