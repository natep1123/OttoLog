import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { MainTab } from '../navigation/tabs';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  /** Brand tap stays on / returns to Home when logged in */
  onBrandPress?: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

const tabCopy: Record<
  MainTab,
  {
    title: string;
    body: string;
  }
> = {
  home: {
    title: 'Home',
    body: 'Your starting point for recent sessions, saved templates, and training context.',
  },
  create: {
    title: 'Create',
    body: 'This will become the entry point for building templates and logging sessions.',
  },
  library: {
    title: 'Library',
    body: 'This will become the place to browse, search, and open saved sessions and templates.',
  },
  account: {
    title: 'Account',
    body: 'This is where profile details and account actions will live.',
  },
};

/** Placeholder signed-in shell with bottom tabs. */
export function HomeScreen({ onBrandPress, activeTab, onChangeTab }: Props) {
  const { profile, user, signOut } = useAuth();
  // Username is the normal path; email / "there" are fallbacks (missing profile, guest, etc.)
  const name = profile?.username ?? user?.email ?? 'there';
  const copy = tabCopy[activeTab];

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <BrandWordmark size="header" onPress={onBrandPress} />
        <Text style={styles.eyebrow}>Hey, {name}.</Text>
        <Text style={styles.greeting}>{copy.title}</Text>
        <Text style={styles.sub}>
          {copy.body}
        </Text>
      </View>

      <View style={styles.bottom}>
        {activeTab === 'account' ? (
          <Button
            label="Log out"
            variant="ghost"
            onPress={() => signOut()}
            style={styles.logout}
          />
        ) : null}
        <BottomNav activeTab={activeTab} onChangeTab={onChangeTab} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  greeting: {
    fontFamily: typography.fontMedium,
    fontSize: 30,
    color: colors.text,
    letterSpacing: -0.4,
  },
  sub: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 300,
  },
  bottom: {
    gap: spacing.md,
  },
  logout: {
    marginBottom: spacing.xs,
  },
});
