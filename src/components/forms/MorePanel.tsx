import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { layer, radii, spacing, typography } from '../../theme/tokens';
import { FormNodeKind } from './formTokens';

type Props = {
  open: boolean;
  kind: FormNodeKind;
  children: ReactNode;
};

/**
 * Secondary fields behind ⋯ — centered inside a full 4px dashed layer border.
 */
export function MorePanel({ open, kind, children }: Props) {
  const token = layer[kind];

  if (!open) return null;

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: token.chip.color,
          backgroundColor: token.bg,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: token.chip.color }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    alignSelf: 'stretch',
    alignItems: 'stretch',
    gap: spacing.sm + 4,
  },
});
