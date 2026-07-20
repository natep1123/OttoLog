import { StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
};

/** Insights tab placeholder until analytics ships. */
export function InsightsComingSoonScreen({ onBrandPress }: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Insights"
        subtitle="Volume, trends, and session analytics."
        onBrandPress={onBrandPress}
      />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Coming soon</Text>
        <Text style={styles.copy}>
          Charts and drill-ins over your logged sessions will live here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.lg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.sunrise,
  },
  copy: {
    fontFamily: typography.font,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
