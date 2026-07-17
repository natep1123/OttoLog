import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { formChevron } from './formTokens';

type Props = {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Optional one-line hint under the header when open. */
  hint?: string;
  /** No gap between header and body (e.g. Visualize → chart). */
  tight?: boolean;
};

/**
 * Labeled disclosure used inside card bodies (Visualize, Overrides, …).
 * Chevron + label toggles; body mounts only while open.
 */
export function Disclosure({
  label,
  open,
  onToggle,
  children,
  hint,
  tight,
}: Props) {
  return (
    <View style={[styles.wrap, tight && styles.wrapTight]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Hide' : 'Show'} ${label}`}
        style={({ pressed }) => [
          styles.header,
          !open && styles.headerCollapsed,
          pressed && styles.headerPressed,
        ]}
      >
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {open ? (
        <View style={styles.body}>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  wrapTight: {
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  headerCollapsed: {
    paddingBottom: 0,
  },
  headerPressed: {
    opacity: 0.75,
  },  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: formChevron.fontSize,
    lineHeight: formChevron.lineHeight,
    color: colors.textDim,
    includeFontPadding: false,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  body: {
    gap: spacing.sm,
  },
  hint: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
