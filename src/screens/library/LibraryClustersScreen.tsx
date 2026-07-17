import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ListSearchBar } from '../../components/ListSearchBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { listClusterTemplates } from '../../lib/clusterTemplates';
import {
  CLUSTER_TYPE_LABELS,
  type ClusterTemplateRow,
} from '../../types/clusterTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';

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
        subtitle="Open one to edit, archive, or delete. Create new ones under Create."
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && rows.length === 0 ? (
            <Text style={styles.empty}>
              No cluster templates yet. Create → Build templates → Cluster.
            </Text>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <Text style={styles.empty}>
              No templates match “{searchQuery.trim()}”.
            </Text>
          ) : null}
          {filteredRows.map((row) => {
            const exerciseCount = row.content.items?.length ?? 0;
            return (
              <Pressable
                key={row.id}
                onPress={() => onOpenCluster(row.id)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <Text style={styles.itemTitle}>{row.name}</Text>
                <Text style={styles.itemMeta}>
                  {CLUSTER_TYPE_LABELS[row.cluster_type] ?? row.cluster_type}
                  {' · '}
                  {exerciseCount}{' '}
                  {exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>
              </Pressable>
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
  empty: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
    gap: 4,
  },
  itemPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  itemTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 17,
    color: colors.text,
  },
  itemMeta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
});
