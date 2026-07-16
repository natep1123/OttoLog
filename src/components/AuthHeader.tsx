import { StyleSheet, Text, View } from 'react-native';
import { BrandWordmark } from './BrandWordmark';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  title: string;
  /** Tap OttoLog wordmark — typically return to Welcome when logged out */
  onBrandPress?: () => void;
};

/** Compact auth header: brand wordmark + screen title (no back button) */
export function AuthHeader({ title, onBrandPress }: Props) {
  return (
    <View style={styles.wrap}>
      <BrandWordmark size="header" onPress={onBrandPress} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontMedium,
    fontSize: 17,
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
});
