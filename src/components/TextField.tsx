import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radii, typography } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

/**
 * Labeled input matching prototype field / label styles.
 * RN TextInput ≈ HTML <input>; focus ring uses amberGlow like CSS box-shadow.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, style, ...rest },
  ref,
) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.sunrise}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  input: {
    fontFamily: typography.font,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.sunset,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.sunset,
  },
});
