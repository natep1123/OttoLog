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
import { listExerciseTemplates } from '../../lib/exerciseTemplates';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import { TARGET_SHAPE_LABELS } from '../../constants/targetShapeFields';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
  onOpenExercise: (id: string) => void;
  /** Bump to refetch when returning from editor */
  refreshKey?: number;
};

export function LibraryScreen({
  onBrandPress,
  onBack,
  onOpenExercise,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<ExerciseTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: listError } = await listExerciseTemplates();
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
        title="Exercises"
        subtitle="Open one to edit. Create new ones under Create."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <ListSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search exercises…"
        accessibilityLabel="Search exercises"
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
            <StatusText>No exercise templates yet.</StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>
              No templates match “{searchQuery.trim()}”.
            </StatusText>
          ) : null}
          {filteredRows.map((row) => (
            <ListCard
              key={row.id}
              title={row.name}
              meta={`${TARGET_SHAPE_LABELS[row.target_shape_id] ?? 'Exercise'}${
                row.track_analytics ? ' · Analytics on' : ''
              }`}
              onPress={() => onOpenExercise(row.id)}
            />
          ))}
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
