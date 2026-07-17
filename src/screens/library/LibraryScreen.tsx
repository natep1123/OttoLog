import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { listExerciseTemplates } from '../../lib/exerciseTemplates';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import { TARGET_SHAPE_LABELS } from '../../constants/targetShapeFields';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onOpenExercise: (id: string) => void;
  /** Bump to refetch when returning from editor */
  refreshKey?: number;
};

export function LibraryScreen({
  onBrandPress,
  onOpenExercise,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<ExerciseTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Library"
        subtitle="Saved exercise templates. Open one to edit."
        onBrandPress={onBrandPress}
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
              No exercise templates yet. Create → Build templates → Exercise.
            </Text>
          ) : null}
          {rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => onOpenExercise(row.id)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <Text style={styles.itemTitle}>{row.name}</Text>
              <Text style={styles.itemMeta}>
                {TARGET_SHAPE_LABELS[row.target_shape_id] ?? 'Exercise'}
                {row.track_analytics ? ' · Analytics on' : ''}
              </Text>
            </Pressable>
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
