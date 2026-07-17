import { useState, type ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { radii, spacing, typography } from '../../theme/tokens';
import { FormNodeKind, moreAccents } from './formTokens';

type Props = {
  open: boolean;
  kind: FormNodeKind;
  children: ReactNode;
};

/**
 * Secondary fields behind ⋯ — inset panel tinted to the node kind’s primary,
 * with a dashed accent rail so it reads as more-options, not primary chrome.
 */
export function MorePanel({ open, kind, children }: Props) {
  const accent = moreAccents[kind];
  const [railH, setRailH] = useState(0);

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - railH) > 1) setRailH(h);
  };

  if (!open) return null;

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: accent.border,
          backgroundColor: accent.wash,
        },
      ]}
      onLayout={onPanelLayout}
    >
      <View style={styles.rail} pointerEvents="none">
        {railH > 0 ? (
          <Svg width={3} height={railH}>
            <Line
              x1={1.5}
              y1={6}
              x2={1.5}
              y2={railH - 6}
              stroke={accent.rail}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}
      </View>
      <Text style={[styles.eyebrow, { color: accent.eyebrow }]}>
        More options
      </Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    paddingLeft: spacing.md + 2,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderRadius: radii.sm,
    gap: 4,
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    gap: spacing.sm + 4,
  },
});
