import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { spacing } from '../../theme/tokens';
import {
  FormNodeKind,
  formRadii,
  nodeAccents,
  nodePaddingX,
} from './formTokens';

type Props = {
  kind: FormNodeKind;
  /** Exercise nested under a cluster (layout hint; accent is always by kind). */
  nested?: boolean;
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Nestable card chrome (layer table):
 * session bg+sunset · block bgPanel+sunrise · cluster bgElevated+dusk · exercise bgInset+gold
 */
export function NodeShell({ kind, children, style }: Props) {
  const accent = nodeAccents[kind];

  return (
    <View
      style={[
        styles.base,
        kind === 'block' && styles.block,
        kind === 'session' && styles.session,
        {
          backgroundColor: accent.background,
          borderLeftColor: accent.borderLeft,
          borderColor: accent.border,
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
    borderLeftWidth: 3,
    borderRadius: formRadii.node,
    paddingVertical: 10,
    paddingHorizontal: nodePaddingX,
  },
  block: {
    borderRadius: formRadii.panel,
    borderLeftWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  session: {
    borderRadius: formRadii.panel,
    borderLeftWidth: 3,
  },
});
