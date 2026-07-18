import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { layer, radii, typography } from '../../theme/tokens';
import { FormNodeKind } from './formTokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

type Props = {
  label?: string;
  /** Prefer over `label` when set — matches other form iconography. */
  icon?: FeatherName;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
  /** Level accent for active ⋯ state — defaults to exercise (gold). */
  kind?: FormNodeKind;
};

/** Prototype `.btn-icon` — used for ⋯ more menus and header shortcuts. */
export function IconButton({
  label = '⋯',
  icon,
  onPress,
  active,
  accessibilityLabel = 'More options',
  kind = 'exercise',
}: Props) {
  const token = layer[kind];
  const tint = token.chip.color;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: tint,
          backgroundColor: active ? token.chip.background : token.bg,
        },
        pressed && styles.btnPressed,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={15} color={tint} />
      ) : (
        <Text style={[styles.text, { color: tint }]}>{label}</Text>
      )}
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
