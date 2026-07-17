import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Screen } from '../components/Screen';
import { MainTab } from '../navigation/tabs';
import { CreateHubScreen } from './create/CreateHubScreen';
import { TemplateHubScreen } from './create/TemplateHubScreen';
import { ExerciseBuilderScreen } from './create/ExerciseBuilderScreen';
import { LibraryScreen } from './library/LibraryScreen';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  /** Brand tap stays on / returns to Home when logged in */
  onBrandPress?: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

type CreateStack =
  | { screen: 'hub' }
  | { screen: 'templates' }
  | { screen: 'exercise'; templateId?: string | null };

type LibraryStack =
  | { screen: 'list' }
  | { screen: 'exercise'; templateId: string };

/** Signed-in shell with bottom tabs + Create / Library stacks. */
export function HomeScreen({ onBrandPress, activeTab, onChangeTab }: Props) {
  const { profile, user, signOut, deleteAccount } = useAuth();
  const name = profile?.username ?? user?.email ?? 'there';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createStack, setCreateStack] = useState<CreateStack>({ screen: 'hub' });
  const [libraryStack, setLibraryStack] = useState<LibraryStack>({
    screen: 'list',
  });
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Reset nested stacks when leaving those tabs
  useEffect(() => {
    if (activeTab !== 'create') {
      setCreateStack({ screen: 'hub' });
    }
    if (activeTab !== 'library') {
      setLibraryStack({ screen: 'list' });
    }
  }, [activeTab]);

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

  const goHomeBrand = () => {
    setCreateStack({ screen: 'hub' });
    setLibraryStack({ screen: 'list' });
    onBrandPress?.();
  };

  const renderCreate = () => {
    if (createStack.screen === 'exercise') {
      return (
        <ExerciseBuilderScreen
          templateId={createStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => setCreateStack({ screen: 'templates' })}
          onSaved={(id) => {
            setCreateStack({ screen: 'exercise', templateId: id });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (createStack.screen === 'templates') {
      return (
        <TemplateHubScreen
          onBrandPress={goHomeBrand}
          onBack={() => setCreateStack({ screen: 'hub' })}
          onExercise={() =>
            setCreateStack({ screen: 'exercise', templateId: null })
          }
        />
      );
    }
    return (
      <CreateHubScreen
        onBrandPress={goHomeBrand}
        onBuildTemplates={() => setCreateStack({ screen: 'templates' })}
        onLogSession={() => {}}
      />
    );
  };

  const renderLibrary = () => {
    if (libraryStack.screen === 'exercise') {
      return (
        <ExerciseBuilderScreen
          templateId={libraryStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => {
            setLibraryStack({ screen: 'list' });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onSaved={() => setLibraryRefreshKey((k) => k + 1)}
        />
      );
    }
    return (
      <LibraryScreen
        onBrandPress={goHomeBrand}
        refreshKey={libraryRefreshKey}
        onOpenExercise={(id) =>
          setLibraryStack({ screen: 'exercise', templateId: id })
        }
      />
    );
  };

  const renderHome = () => (
    <View style={styles.top}>
      <BrandWordmark size="header" onPress={goHomeBrand} />
      <Text style={styles.eyebrow}>Hey, {name}.</Text>
      <Text style={styles.greeting}>Home</Text>
      <Text style={styles.sub}>
        Your starting point for recent sessions, saved templates, and training
        context.
      </Text>
    </View>
  );

  const renderAccount = () => (
    <View style={styles.top}>
      <BrandWordmark size="header" onPress={goHomeBrand} />
      <Text style={styles.greeting}>Account</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{profile?.username ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
        </View>
      </View>

      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
    </View>
  );

  const hideBottomNav =
    (activeTab === 'create' && createStack.screen === 'exercise') ||
    (activeTab === 'library' && libraryStack.screen === 'exercise');

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.main}>
        {activeTab === 'home'
          ? renderHome()
          : activeTab === 'create'
            ? renderCreate()
            : activeTab === 'library'
              ? renderLibrary()
              : renderAccount()}
      </View>

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
        {!hideBottomNav ? (
          <BottomNav activeTab={activeTab} onChangeTab={onChangeTab} />
        ) : null}
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
  main: {
    flex: 1,
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
