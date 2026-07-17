import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Screen } from '../components/Screen';
import { MainTab } from '../navigation/tabs';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  /** Brand tap stays on / returns to Home when logged in */
  onBrandPress?: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

const tabCopy: Record<
  Exclude<MainTab, 'account'>,
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
};

/** Placeholder signed-in shell with bottom tabs. */
export function HomeScreen({ onBrandPress, activeTab, onChangeTab }: Props) {
  const { profile, user, signOut, deleteAccount } = useAuth();
  const name = profile?.username ?? user?.email ?? 'there';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDeleteConfirm = async () => {
    setDeleteError(null);
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) {
      setConfirmDelete(false);
      setDeleteError(error);
      return;
    }
    setConfirmDelete(false);
  };

  return (
    <Screen contentStyle={styles.content}>
      {activeTab === 'account' ? (
        <View style={styles.top}>
          <BrandWordmark size="header" onPress={onBrandPress} />
          <Text style={styles.greeting}>Account</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Username</Text>
              <Text style={styles.rowValue}>
                {profile?.username ?? '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          {deleteError ? (
            <Text style={styles.error}>{deleteError}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.top}>
          <BrandWordmark size="header" onPress={onBrandPress} />
          <Text style={styles.eyebrow}>Hey, {name}.</Text>
          <Text style={styles.greeting}>{tabCopy[activeTab].title}</Text>
          <Text style={styles.sub}>{tabCopy[activeTab].body}</Text>
        </View>
      )}

      <View style={styles.bottom}>
        {activeTab === 'account' ? (
          <View style={styles.accountActions}>
            <Button label="Log out" variant="ghost" onPress={() => signOut()} />
            <Button
              label="Delete account"
              variant="danger"
              onPress={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
            />
          </View>
        ) : null}
        <BottomNav activeTab={activeTab} onChangeTab={onChangeTab} />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        message={`This permanently deletes ${profile?.username ?? 'this account'} and cannot be undone. Use this for clearing test accounts.`}
        confirmLabel="Delete forever"
        cancelLabel="Keep account"
        destructive
        busy={deleting}
        onConfirm={onDeleteConfirm}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
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
  card: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    gap: 4,
  },
  rowLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  rowValue: {
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  bottom: {
    gap: spacing.md,
  },
  accountActions: {
    gap: spacing.sm,
  },
});
