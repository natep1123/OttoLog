import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ListCard } from '../../components/ListCard';
import { ListSearchBar } from '../../components/ListSearchBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusText } from '../../components/StatusText';
import { listClusterTemplates } from '../../lib/clusterTemplates';
import {
  CLUSTER_TYPE_LABELS,
  type ClusterTemplateRow,
} from '../../types/clusterTemplate';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
  onOpenCluster: (id: string) => void;
  refreshKey?: number;
};

/** Library → Templates → Clusters list with name search. */
export function LibraryClustersScreen({
  onBrandPress,
  onBack,
  onOpenCluster,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<ClusterTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: listError } = await listClusterTemplates();
    setLoading(false);
    setRefreshing(false);
    if (listError) {
      setError(listError);
      return;
    }
    setRows(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Clusters"
        subtitle="Open one to edit. Create new ones under Create."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <ListSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search clusters…"
        accessibilityLabel="Search clusters"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sunrise} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.sunrise}
            />
          }
        >
          {error ? <StatusText tone="error">{error}</StatusText> : null}
          {!error && rows.length === 0 ? (
            <StatusText>No cluster templates yet.</StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>
              No templates match “{searchQuery.trim()}”.
            </StatusText>
          ) : null}
          {filteredRows.map((row) => {
            const exerciseCount = row.content.items?.length ?? 0;
            const rounds = row.content.rounds ?? 1;
            return (
              <ListCard
                key={row.id}
                title={row.name}
                meta={`${CLUSTER_TYPE_LABELS[row.cluster_type] ?? row.cluster_type} · ${rounds} ${
                  rounds === 1 ? 'round' : 'rounds'
                } · ${exerciseCount} ${
                  exerciseCount === 1 ? 'exercise' : 'exercises'
                }`}
                onPress={() => onOpenCluster(row.id)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
