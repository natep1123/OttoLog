import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import {
  FormNodeKind,
  formRadii,
  nestedExerciseAccent,
  nodeAccents,
} from './formTokens';

type Props = {
  kind: FormNodeKind;
  /** Exercise nested under a cluster → sunrise left accent */
  nested?: boolean;
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Nestable card chrome from the session templator:
 * block = panel, cluster = dusk bar, exercise = gold (sunrise when nested).
 */
export function NodeShell({ kind, nested, children, style }: Props) {
  const accent =
    kind === 'exercise' && nested
      ? nestedExerciseAccent
      : nodeAccents[kind];

  return (
    <View
      style={[
        styles.base,
        kind === 'block' && styles.block,
        {
          backgroundColor: accent.background,
          borderLeftColor: accent.borderLeft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: formRadii.node,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  block: {
    borderRadius: formRadii.panel,
    borderLeftWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
