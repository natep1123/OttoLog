import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accent?: {
    color: string;
    border: string;
    background: string;
  };
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * − / value / + stepper. Typing is allowed; arrows adjust from the
 * currently typed value (committed on blur / ±).
 */
export function RoundStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  accessibilityLabel = 'Rounds',
  style,
  compact = false,
  accent,
}: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
    const next = clamp(
      Number.isFinite(parsed) ? parsed : min,
      min,
      max,
    );
    onChange(next);
    setText(String(next));
  };

  const bump = (delta: number) => {
    const typed = Number.parseInt(text.replace(/[^\d]/g, ''), 10);
    const base = Number.isFinite(typed) ? typed : value;
    commit(String(base + delta));
  };

  const typed = Number.parseInt(text.replace(/[^\d]/g, ''), 10);
  const current = Number.isFinite(typed) ? typed : value;

  return (
    <View style={[styles.controls, style]}>
      <Pressable
        onPress={() => bump(-1)}
        disabled={current <= min}
        style={({ pressed }) => [
          styles.btn,
          compact && styles.btnCompact,
          accent ? { borderColor: accent.border } : null,
          pressed && styles.btnPressed,
          pressed && accent
            ? { borderColor: accent.color, backgroundColor: accent.background }
            : null,
          current <= min && styles.btnDisabled,
        ]}
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
      >
        <Text style={[styles.btnText, accent ? { color: accent.color } : null]}>
          −
        </Text>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(raw) => {
          const digits = raw.replace(/[^\d]/g, '');
          setText(digits);
        }}
        onBlur={() => commit(text)}
        onSubmitEditing={() => commit(text)}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[
          styles.input,
          compact && styles.inputCompact,
          accent
            ? { borderColor: accent.border, color: accent.color }
            : null,
        ]}
        accessibilityLabel={accessibilityLabel}
      />
      <Pressable
        onPress={() => bump(1)}
        disabled={current >= max}
        style={({ pressed }) => [
          styles.btn,
          compact && styles.btnCompact,
          accent ? { borderColor: accent.border } : null,
          pressed && styles.btnPressed,
          pressed && accent
            ? { borderColor: accent.color, backgroundColor: accent.background }
            : null,
          current >= max && styles.btnDisabled,
        ]}
        accessibilityLabel={`Increase ${accessibilityLabel}`}
      >
        <Text style={[styles.btnText, accent ? { color: accent.color } : null]}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  btnPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  btnCompact: {
    width: 32,
    height: 32,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    color: colors.text,
  },
  input: {
    width: 52,
    textAlign: 'center',
    paddingVertical: 8,
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  inputCompact: {
    width: 46,
    paddingVertical: 6,
    fontSize: 14,
  },
});
