import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  /** Brand tap stays on / returns to Home when logged in */
  onBrandPress?: () => void;
};

/** Placeholder post-auth home — greeting + log out only (no tabs yet). */
export function HomeScreen({ onBrandPress }: Props) {
  const { profile, user, signOut } = useAuth();
  // Username is the normal path; email / "there" are fallbacks (missing profile, guest, etc.)
  const name = profile?.username ?? user?.email ?? 'there';

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <BrandWordmark size="header" onPress={onBrandPress} />
        <Text style={styles.greeting}>Hey, {name}.</Text>
        <Text style={styles.sub}>
          You’re logged in. Home is a placeholder until tabs land.
        </Text>
      </View>

      <Button label="Log out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  greeting: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.text,
  },
  sub: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 300,
  },
});
