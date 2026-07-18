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
import { blockTitle } from '../../lib/displayTitles';
import { listBlockTemplates } from '../../lib/blockTemplates';
import type { BlockTemplateRow } from '../../types/blockTemplate';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
  onOpenBlock: (id: string) => void;
  refreshKey?: number;
};

function titleOf(row: BlockTemplateRow, index: number): string {
  return blockTitle(row.label_name, row.name, index + 1);
}

export function LibraryBlocksScreen({
  onBrandPress,
  onBack,
  onOpenBlock,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<BlockTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: listError } = await listBlockTemplates();
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
    if (!q) return rows.map((row, index) => ({ row, index }));
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => {
        const title = titleOf(row, index).toLowerCase();
        const brief = row.name?.toLowerCase() ?? '';
        const label = row.label_name?.toLowerCase() ?? '';
        return title.includes(q) || brief.includes(q) || label.includes(q);
      });
  }, [rows, searchQuery]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Blocks"
        subtitle="Open one to edit. Create new ones under Create."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <ListSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search blocks…"
        accessibilityLabel="Search blocks"
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
            <StatusText>No block templates yet.</StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>
              No templates match “{searchQuery.trim()}”.
            </StatusText>
          ) : null}
          {filteredRows.map(({ row, index }) => {
            const itemCount = row.content.items?.length ?? 0;
            return (
              <ListCard
                key={row.id}
                title={titleOf(row, index)}
                meta={`${row.label_name ?? 'General'} · ${itemCount} ${
                  itemCount === 1 ? 'item' : 'items'
                }`}
                onPress={() => onOpenBlock(row.id)}
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
