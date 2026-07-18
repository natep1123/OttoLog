import { type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme/tokens';

type Props = {
  children: ReactNode;
  tone?: 'muted' | 'error';
};

/** Compact empty / error / status line for list screens. */
export function StatusText({ children, tone = 'muted' }: Props) {
  return (
    <Text style={[styles.text, tone === 'error' ? styles.error : styles.muted]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.sunset,
  },
});
