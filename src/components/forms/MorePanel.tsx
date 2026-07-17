import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/tokens';

type Props = {
  open: boolean;
  children: ReactNode;
};

/** Prototype `.more-panel` — secondary fields behind ⋯. */
export function MorePanel({ open, children }: Props) {
  if (!open) return null;
  return <View style={styles.panel}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm + 4,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
