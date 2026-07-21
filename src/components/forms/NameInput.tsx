import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = TextInputProps & {
  /** When true, use sunrise focus ring (legacy; prefer layer-tinted notes) */
  emphasizeFocus?: boolean;
};

/** Outlined field matching prototype inputs (bg-inset + border). */
export function NameInput({ style, emphasizeFocus, ...rest }: Props) {
  return (
    <TextInput
      placeholderTextColor={colors.textDim}
      selectionColor={colors.sunrise}
      style={[styles.input, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minWidth: 120,
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
