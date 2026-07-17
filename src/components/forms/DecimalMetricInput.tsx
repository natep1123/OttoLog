import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  value: number | null;
  onChange: (next: number | null) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  editable?: boolean;
};

function formatFixed2(n: number): string {
  return n.toFixed(2);
}

/** Keep digits + one decimal; cap fractional digits at 2 while typing. */
function sanitizeDecimalDraft(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;

  const whole = cleaned.slice(0, dot).replace(/\./g, '');
  const frac = cleaned
    .slice(dot + 1)
    .replace(/\./g, '')
    .slice(0, 2);
  return `${whole}.${frac}`;
}

function parseDraft(text: string): number | null {
  if (text === '' || text === '.') return null;
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Single-box decimal metric (e.g. distance). Draft text is free while focused
 * so "1." / ".8" work; blur normalizes to 0.00 display (1 → 1.00, .89 → 0.89).
 * Zero commits as null (unset), matching time 00:00:00 → null.
 */
export function DecimalMetricInput({
  value,
  onChange,
  placeholder = '0.00',
  style,
  accessibilityLabel,
  editable = true,
}: Props) {
  const [text, setText] = useState(() =>
    value != null ? formatFixed2(value) : '',
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(value != null ? formatFixed2(value) : '');
    }
  }, [focused, value]);

  const commit = (draft: string) => {
    const parsed = parseDraft(draft);
    if (parsed == null) {
      setText('');
      onChange(null);
      return;
    }
    setText(formatFixed2(parsed));
    onChange(parsed);
  };

  return (
    <TextInput
      value={text}
      onChangeText={(raw) => {
        const next = sanitizeDecimalDraft(raw);
        setText(next);
        onChange(parseDraft(next));
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        commit(text);
        setFocused(false);
      }}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      selectTextOnFocus
      editable={editable}
      accessibilityLabel={accessibilityLabel}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: 56,
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
});
