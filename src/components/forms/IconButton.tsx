import { Pressable, StyleSheet, Text } from 'react-native';
import { layer, radii, typography } from '../../theme/tokens';
import { FormNodeKind } from './formTokens';

type Props = {
  label?: string;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
  /** Level accent for active ⋯ state — defaults to exercise (gold). */
  kind?: FormNodeKind;
};

/** Prototype `.btn-icon` — used for ⋯ more menus. */
export function IconButton({
  label = '⋯',
  onPress,
  active,
  accessibilityLabel = 'More options',
  kind = 'exercise',
}: Props) {
  const token = layer[kind];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: token.chip.color,
          backgroundColor: active ? token.chip.background : token.bg,
        },
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.text, { color: token.chip.color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
  },
  btnPressed: {
    opacity: 0.75,
  },
  text: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    lineHeight: 20,
  },
});
