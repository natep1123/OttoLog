import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { listExerciseTemplates } from '../lib/exerciseTemplates';
import type { TaxonomyKind } from '../lib/taxonomy';
import { MainTab } from '../navigation/tabs';
import { AccountDangerScreen } from './account/AccountDangerScreen';
import { AccountHubScreen } from './account/AccountHubScreen';
import { AccountSettingsScreen } from './account/AccountSettingsScreen';
import { TaxonomyHubScreen } from './account/TaxonomyHubScreen';
import { TaxonomyListScreen } from './account/TaxonomyListScreen';
import { CreateHubScreen } from './create/CreateHubScreen';
import { TemplateHubScreen } from './create/TemplateHubScreen';
import { ExerciseBuilderScreen } from './create/ExerciseBuilderScreen';
import { ClusterBuilderScreen } from './create/ClusterBuilderScreen';
import { BlockBuilderScreen } from './create/BlockBuilderScreen';
import { SessionBuilderScreen } from './create/SessionBuilderScreen';
import { HomeDashboardScreen } from './home/HomeDashboardScreen';
import { LibraryHubScreen } from './library/LibraryHubScreen';
import { LibraryTemplatesHubScreen } from './library/LibraryTemplatesHubScreen';
import { LibraryScreen } from './library/LibraryScreen';
import { LibraryClustersScreen } from './library/LibraryClustersScreen';
import { LibraryBlocksScreen } from './library/LibraryBlocksScreen';
import { LibrarySessionsScreen } from './library/LibrarySessionsScreen';
import type { ExerciseTemplateRow } from '../types/exerciseTemplate';
import { spacing } from '../theme/tokens';

type Props = {
  /** Brand tap stays on / returns to Home when logged in */
  onBrandPress?: () => void;
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

type CreateStack =
  | { screen: 'hub' }
  | { screen: 'templates' }
  | { screen: 'exercise'; templateId?: string | null }
  | { screen: 'cluster'; templateId?: string | null }
  | { screen: 'block'; templateId?: string | null }
  | { screen: 'session'; templateId?: string | null };

type LibraryStack =
  | { screen: 'hub' }
  | { screen: 'templates' }
  | { screen: 'exercises' }
  | { screen: 'exercise'; templateId: string }
  | { screen: 'clusters' }
  | { screen: 'cluster'; templateId: string }
  | { screen: 'blocks' }
  | { screen: 'block'; templateId: string }
  | { screen: 'sessions' }
  | { screen: 'session'; templateId: string };

type AccountStack =
  | { screen: 'hub' }
  | { screen: 'taxonomy' }
  | { screen: 'taxonomyList'; kind: TaxonomyKind }
  | { screen: 'settings' }
  | { screen: 'danger' };

/** Signed-in shell with bottom tabs + Create / Library / Account stacks. */
export function HomeScreen({ onBrandPress, activeTab, onChangeTab }: Props) {
  const { profile, user, signOut } = useAuth();
  const name = profile?.username ?? user?.email ?? 'there';

  const [createStack, setCreateStack] = useState<CreateStack>({ screen: 'hub' });
  const [libraryStack, setLibraryStack] = useState<LibraryStack>({
    screen: 'hub',
  });
  const [accountStack, setAccountStack] = useState<AccountStack>({
    screen: 'hub',
  });
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [recentTemplates, setRecentTemplates] = useState<ExerciseTemplateRow[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Reset nested stacks when leaving those tabs
  useEffect(() => {
    if (activeTab !== 'create') {
      setCreateStack({ screen: 'hub' });
    }
    if (activeTab !== 'library') {
      setLibraryStack({ screen: 'hub' });
    }
    if (activeTab !== 'account') {
      setAccountStack({ screen: 'hub' });
    }
  }, [activeTab]);

  const goHomeBrand = () => {
    setCreateStack({ screen: 'hub' });
    setLibraryStack({ screen: 'hub' });
    setAccountStack({ screen: 'hub' });
    onBrandPress?.();
  };

  const loadRecentTemplates = useCallback(async () => {
    setRecentError(null);
    const { data, error } = await listExerciseTemplates();
    if (error) {
      setRecentError(error);
      setRecentTemplates([]);
      return;
    }
    setRecentTemplates(data.slice(0, 4));
  }, []);

  useEffect(() => {
    void loadRecentTemplates();
  }, [loadRecentTemplates, libraryRefreshKey]);

  const goBuildExercise = () => {
    setCreateStack({ screen: 'exercise', templateId: null });
    onChangeTab('create');
  };

  const goBrowseExercises = () => {
    setLibraryStack({ screen: 'exercises' });
    onChangeTab('library');
  };

  const goManageTaxonomy = () => {
    setAccountStack({ screen: 'taxonomy' });
    onChangeTab('account');
  };

  const goOpenRecentExercise = (id: string) => {
    setLibraryStack({ screen: 'exercise', templateId: id });
    onChangeTab('library');
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
          onDeleted={() => {
            setCreateStack({ screen: 'templates' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (createStack.screen === 'cluster') {
      return (
        <ClusterBuilderScreen
          templateId={createStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => setCreateStack({ screen: 'templates' })}
          onSaved={(id) => {
            setCreateStack({ screen: 'cluster', templateId: id });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onDeleted={() => {
            setCreateStack({ screen: 'templates' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (createStack.screen === 'block') {
      return (
        <BlockBuilderScreen
          templateId={createStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => setCreateStack({ screen: 'templates' })}
          onSaved={(id) => {
            setCreateStack({ screen: 'block', templateId: id });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onDeleted={() => {
            setCreateStack({ screen: 'templates' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (createStack.screen === 'session') {
      return (
        <SessionBuilderScreen
          templateId={createStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => setCreateStack({ screen: 'templates' })}
          onSaved={(id) => {
            setCreateStack({ screen: 'session', templateId: id });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onDeleted={() => {
            setCreateStack({ screen: 'templates' });
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
          onCluster={() =>
            setCreateStack({ screen: 'cluster', templateId: null })
          }
          onBlock={() => setCreateStack({ screen: 'block', templateId: null })}
          onSession={() =>
            setCreateStack({ screen: 'session', templateId: null })
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
            setLibraryStack({ screen: 'exercises' });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onSaved={() => setLibraryRefreshKey((k) => k + 1)}
          onDeleted={() => {
            setLibraryStack({ screen: 'exercises' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (libraryStack.screen === 'cluster') {
      return (
        <ClusterBuilderScreen
          templateId={libraryStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => {
            setLibraryStack({ screen: 'clusters' });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onSaved={() => setLibraryRefreshKey((k) => k + 1)}
          onDeleted={() => {
            setLibraryStack({ screen: 'clusters' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (libraryStack.screen === 'block') {
      return (
        <BlockBuilderScreen
          templateId={libraryStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => {
            setLibraryStack({ screen: 'blocks' });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onSaved={() => setLibraryRefreshKey((k) => k + 1)}
          onDeleted={() => {
            setLibraryStack({ screen: 'blocks' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (libraryStack.screen === 'session') {
      return (
        <SessionBuilderScreen
          templateId={libraryStack.templateId}
          onBrandPress={goHomeBrand}
          onBack={() => {
            setLibraryStack({ screen: 'sessions' });
            setLibraryRefreshKey((k) => k + 1);
          }}
          onSaved={() => setLibraryRefreshKey((k) => k + 1)}
          onDeleted={() => {
            setLibraryStack({ screen: 'sessions' });
            setLibraryRefreshKey((k) => k + 1);
          }}
        />
      );
    }
    if (libraryStack.screen === 'exercises') {
      return (
        <LibraryScreen
          onBrandPress={goHomeBrand}
          onBack={() => setLibraryStack({ screen: 'templates' })}
          refreshKey={libraryRefreshKey}
          onOpenExercise={(id) =>
            setLibraryStack({ screen: 'exercise', templateId: id })
          }
        />
      );
    }
    if (libraryStack.screen === 'clusters') {
      return (
        <LibraryClustersScreen
          onBrandPress={goHomeBrand}
          onBack={() => setLibraryStack({ screen: 'templates' })}
          refreshKey={libraryRefreshKey}
          onOpenCluster={(id) =>
            setLibraryStack({ screen: 'cluster', templateId: id })
          }
        />
      );
    }
    if (libraryStack.screen === 'blocks') {
      return (
        <LibraryBlocksScreen
          onBrandPress={goHomeBrand}
          onBack={() => setLibraryStack({ screen: 'templates' })}
          refreshKey={libraryRefreshKey}
          onOpenBlock={(id) =>
            setLibraryStack({ screen: 'block', templateId: id })
          }
        />
      );
    }
    if (libraryStack.screen === 'sessions') {
      return (
        <LibrarySessionsScreen
          onBrandPress={goHomeBrand}
          onBack={() => setLibraryStack({ screen: 'templates' })}
          refreshKey={libraryRefreshKey}
          onOpenSession={(id) =>
            setLibraryStack({ screen: 'session', templateId: id })
          }
        />
      );
    }
    if (libraryStack.screen === 'templates') {
      return (
        <LibraryTemplatesHubScreen
          onBrandPress={goHomeBrand}
          onBack={() => setLibraryStack({ screen: 'hub' })}
          onExercises={() => setLibraryStack({ screen: 'exercises' })}
          onClusters={() => setLibraryStack({ screen: 'clusters' })}
          onBlocks={() => setLibraryStack({ screen: 'blocks' })}
          onSessions={() => setLibraryStack({ screen: 'sessions' })}
        />
      );
    }
    return (
      <LibraryHubScreen
        onBrandPress={goHomeBrand}
        onTemplates={() => setLibraryStack({ screen: 'templates' })}
        onLogs={() => {}}
      />
    );
  };

  const renderAccount = () => {
    if (accountStack.screen === 'taxonomyList') {
      return (
        <TaxonomyListScreen
          kind={accountStack.kind}
          onBrandPress={goHomeBrand}
          onBack={() => setAccountStack({ screen: 'taxonomy' })}
        />
      );
    }
    if (accountStack.screen === 'taxonomy') {
      return (
        <TaxonomyHubScreen
          onBrandPress={goHomeBrand}
          onBack={() => setAccountStack({ screen: 'hub' })}
          onOpenList={(kind) =>
            setAccountStack({ screen: 'taxonomyList', kind })
          }
        />
      );
    }
    if (accountStack.screen === 'danger') {
      return (
        <AccountDangerScreen
          onBrandPress={goHomeBrand}
          onBack={() => setAccountStack({ screen: 'settings' })}
        />
      );
    }
    if (accountStack.screen === 'settings') {
      return (
        <AccountSettingsScreen
          onBrandPress={goHomeBrand}
          onBack={() => setAccountStack({ screen: 'hub' })}
          onDangerZone={() => setAccountStack({ screen: 'danger' })}
        />
      );
    }
    return (
      <AccountHubScreen
        username={profile?.username ?? ''}
        email={user?.email ?? ''}
        onBrandPress={goHomeBrand}
        onTaxonomy={() => setAccountStack({ screen: 'taxonomy' })}
        onSettings={() => setAccountStack({ screen: 'settings' })}
      />
    );
  };

  const renderHome = () => (
    <HomeDashboardScreen
      name={name}
      recentTemplates={recentTemplates}
      recentError={recentError}
      onBuildExercise={goBuildExercise}
      onBrowseExercises={goBrowseExercises}
      onManageTaxonomy={goManageTaxonomy}
      onOpenExercise={goOpenRecentExercise}
      onBrandPress={goHomeBrand}
    />
  );

  const hideBottomNav =
    (activeTab === 'create' &&
      (createStack.screen === 'exercise' ||
        createStack.screen === 'cluster' ||
        createStack.screen === 'block' ||
        createStack.screen === 'session')) ||
    (activeTab === 'library' &&
      (libraryStack.screen === 'exercise' ||
        libraryStack.screen === 'cluster' ||
        libraryStack.screen === 'block' ||
        libraryStack.screen === 'session'));

  const showAccountActions =
    activeTab === 'account' && accountStack.screen === 'hub';

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
        {showAccountActions ? (
          <View style={styles.accountActions}>
            <Button label="Log out" variant="ghost" onPress={() => signOut()} />
          </View>
        ) : null}
        {!hideBottomNav ? (
          <BottomNav activeTab={activeTab} onChangeTab={onChangeTab} />
        ) : null}
      </View>
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
  bottom: {
    gap: spacing.md,
  },
  accountActions: {
    gap: spacing.sm,
  },
});
