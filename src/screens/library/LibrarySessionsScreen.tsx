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
import { listSessionTemplates } from '../../lib/sessionTemplates';
import type { SessionTemplateRow } from '../../types/sessionTemplate';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
  onOpenSession: (id: string) => void;
  refreshKey?: number;
};

export function LibrarySessionsScreen({
  onBrandPress,
  onBack,
  onOpenSession,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<SessionTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: listError } = await listSessionTemplates();
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
        title="Sessions"
        subtitle="Open one to edit. Create new ones under Create."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <ListSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search sessions…"
        accessibilityLabel="Search sessions"
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
            <StatusText>No session templates yet.</StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>
              No templates match “{searchQuery.trim()}”.
            </StatusText>
          ) : null}
          {filteredRows.map((row) => {
            const blockCount = row.content.blocks?.length ?? 0;
            return (
              <ListCard
                key={row.id}
                title={row.name}
                meta={`${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`}
                onPress={() => onOpenSession(row.id)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: {
    flexGrow: 1,
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
