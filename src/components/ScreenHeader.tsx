import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandWordmark } from './BrandWordmark';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onBrandPress?: () => void;
};

export function ScreenHeader({ title, subtitle, onBack, onBrandPress }: Props) {
  return (
    <View style={styles.wrap}>
      <BrandWordmark size="header" onPress={onBrandPress} />
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  backText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.sunrise,
  },
  title: {
    fontFamily: typography.fontMedium,
    fontSize: 30,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 320,
  },
});
