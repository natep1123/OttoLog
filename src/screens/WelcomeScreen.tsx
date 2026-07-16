import { StyleSheet, Text, View } from 'react-native';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  onLogIn: () => void;
  onCreateAccount: () => void;
};

/**
 * Auth welcome — brand, one tagline, Log in / Create account.
 * Structure from UI_Design.md; visual language from session-templator.html.
 */
export function WelcomeScreen({ onLogIn, onCreateAccount }: Props) {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <BrandWordmark size="hero" />
        <Text style={styles.tagline}>Your canvas for how you train.</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Log in" variant="primary" onPress={onLogIn} />
        <Button
          label="Create account"
          variant="ghost"
          onPress={onCreateAccount}
          style={styles.ghostGap}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  tagline: {
    fontFamily: typography.font,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textMuted,
    maxWidth: 280,
  },
  actions: {
    gap: 0,
  },
  ghostGap: {
    marginTop: spacing.sm,
  },
});
