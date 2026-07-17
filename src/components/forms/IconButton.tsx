import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { FormNodeKind, moreAccents } from './formTokens';

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
  const accent = moreAccents[kind];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        (pressed || active) && { backgroundColor: accent.iconActiveBg },
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.text,
            (pressed || active) && { color: accent.iconActive },
          ]}
        >
          {label}
        </Text>
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
    borderRadius: radii.sm,
  },
  text: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    lineHeight: 20,
    color: colors.textDim,
  },
});
