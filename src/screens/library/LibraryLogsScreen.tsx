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
import {
  formatLogListTitle,
  listSessionLogs,
} from '../../lib/sessionLogs';
import { normalizeBrief } from '../../lib/displayTitles';
import { formatSessionDateLabel } from '../../lib/localTime';
import type { SessionLogListRow } from '../../types/sessionLog';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
  onOpenLog: (id: string) => void;
  refreshKey?: number;
};

export function LibraryLogsScreen({
  onBrandPress,
  onBack,
  onOpenLog,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<SessionLogListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: listError } = await listSessionLogs();
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
    return rows.filter((row) => {
      const title = formatLogListTitle(row).toLowerCase();
      const brief = row.name?.toLowerCase() ?? '';
      const label = row.label_name?.toLowerCase() ?? '';
      const date = formatSessionDateLabel(row.session_date).toLowerCase();
      return (
        title.includes(q) ||
        brief.includes(q) ||
        label.includes(q) ||
        date.includes(q)
      );
    });
  }, [rows, searchQuery]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Session logs"
        subtitle="Open one to edit. Log new ones under Create."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <ListSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search logs…"
        accessibilityLabel="Search session logs"
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
            <StatusText>No session logs yet.</StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>No logs match “{searchQuery.trim()}”.</StatusText>
          ) : null}
          {filteredRows.map((row) => {
            const blockCount = row.block_count;
            const blocksLabel = `${blockCount} ${
              blockCount === 1 ? 'block' : 'blocks'
            }`;
            const brief = normalizeBrief(row.name);
            const meta = brief ? `${brief} · ${blocksLabel}` : blocksLabel;
            return (
              <ListCard
                key={row.id}
                title={formatLogListTitle(row)}
                meta={meta}
                onPress={() => onOpenLog(row.id)}
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
