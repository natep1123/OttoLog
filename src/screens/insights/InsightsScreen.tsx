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
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusText } from '../../components/StatusText';
import { TextField } from '../../components/TextField';
import {
  defaultInsightsFilters,
  INSIGHTS_LENS_OPTIONS,
  lensDoubleCounts,
  lensLabel,
  loadInsightsSnapshot,
  type InsightsFilters,
  type InsightsLens,
  type InsightsSnapshot,
  type NamedTotal,
  type SetType,
} from '../../lib/insights';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import {
  listAnalyticsTags,
  listBlockLabels,
  listSessionLabels,
  listTools,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { SearchableSelect } from '../../components/forms/SearchableSelect';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
};

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function TotalsList({
  rows,
  empty,
  unit,
}: {
  rows: NamedTotal[];
  empty: string;
  unit?: string;
}) {
  if (rows.length === 0) {
    return <Text style={styles.emptyRow}>{empty}</Text>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <View key={row.id} style={styles.barRow}>
          <View style={styles.barMeta}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.barValue}>
              {formatNumber(row.value)}
              {unit ? ` ${unit}` : ''}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max(4, (row.value / max) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Base Insights — data-only rollups over complete session logs. */
export function InsightsScreen({ onBrandPress }: Props) {
  const [filters, setFilters] = useState<InsightsFilters>(() =>
    defaultInsightsFilters(),
  );
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionLabels, setSessionLabels] = useState<TaxonomyOption[]>([]);
  const [blockLabels, setBlockLabels] = useState<TaxonomyOption[]>([]);
  const [variations, setVariations] = useState<TaxonomyOption[]>([]);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);

  const loadMeta = useCallback(async () => {
    const [labels, blocks, tags, toolRows] = await Promise.all([
      listSessionLabels(),
      listBlockLabels(),
      listAnalyticsTags(),
      listTools(),
    ]);
    setSessionLabels(labels.data);
    setBlockLabels(blocks.data);
    setVariations(tags.data);
    setTools(toolRows.data);
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const { data, error: loadError } = await loadInsightsSnapshot(filters);
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
      if (loadError) {
        setError(loadError);
        setSnapshot(null);
        return;
      }
      setSnapshot(data);
    },
    [filters],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchFilters = (patch: Partial<InsightsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const activeLensLabel = useMemo(() => lensLabel(filters.lens), [filters.lens]);
  const volumeHint = lensDoubleCounts(filters.lens)
    ? 'Effective reps (×2 if per-side). Credits each — do not sum these into one total.'
    : 'Effective reps (×2 if per-side). Each set counted once (honest partition).';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.sunrise}
        />
      }
    >
      <ScreenHeader
        title="Insights"
        subtitle="Pick a lens, then narrow with filters. Complete logs only."
        onBrandPress={onBrandPress}
      />

      <View style={styles.filters}>
        <Text style={styles.sectionTitle}>Lens</Text>
        <Text style={styles.hint}>What each bar in the headline chart means.</Text>
        <View style={styles.lensRow}>
          {INSIGHTS_LENS_OPTIONS.map((opt) => {
            const active = filters.lens === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => patchFilters({ lens: opt.id as InsightsLens })}
                style={[styles.lensChip, active && styles.lensChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.lensChipText, active && styles.lensChipTextOn]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.filterHeading]}>Filters</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <TextField
              label="From"
              value={filters.fromDate}
              onChangeText={(fromDate) => patchFilters({ fromDate })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.dateField}>
            <TextField
              label="To"
              value={filters.toDate}
              onChangeText={(toDate) => patchFilters({ toDate })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Session label</Text>
          <SearchableSelect
            mode="multi"
            options={sessionLabels}
            onOptionsChange={setSessionLabels}
            value={filters.sessionCategoryIds}
            onChange={(sessionCategoryIds) =>
              patchFilters({ sessionCategoryIds })
            }
            onCreate={async () => ({
              data: null,
              error: 'Create session labels under Account → Taxonomy.',
            })}
            placeholder="All session labels…"
            emptyLabel="All labels"
            fill
            accessibilityLabel="Filter by session label"
          />
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Block label</Text>
          <SearchableSelect
            mode="multi"
            options={blockLabels}
            onOptionsChange={setBlockLabels}
            value={filters.blockLabelIds}
            onChange={(blockLabelIds) => patchFilters({ blockLabelIds })}
            onCreate={async () => ({
              data: null,
              error: 'Create block labels under Account → Taxonomy.',
            })}
            placeholder="All block labels…"
            emptyLabel="All blocks"
            fill
            accessibilityLabel="Filter by block label"
          />
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Set type</Text>
          <SearchableSelect
            mode="multi"
            options={SET_TYPE_FILTER_OPTIONS}
            value={filters.setTypes}
            onChange={(setTypes) =>
              patchFilters({ setTypes: setTypes as SetType[] })
            }
            onCreate={async () => ({
              data: null,
              error: 'Set types are fixed.',
            })}
            placeholder="All set types…"
            emptyLabel="All set types"
            fill
            accessibilityLabel="Filter by set type"
          />
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Variations</Text>
          <SearchableSelect
            mode="multi"
            options={variations}
            onOptionsChange={setVariations}
            value={filters.variationIds}
            onChange={(variationIds) => patchFilters({ variationIds })}
            onCreate={async () => ({
              data: null,
              error: 'Create variations under Account → Taxonomy.',
            })}
            placeholder="All variations…"
            emptyLabel="All variations"
            fill
            accessibilityLabel="Filter by variations"
          />
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Tools</Text>
          <SearchableSelect
            mode="multi"
            options={tools}
            onOptionsChange={setTools}
            value={filters.toolIds}
            onChange={(toolIds) => patchFilters({ toolIds })}
            onCreate={async () => ({
              data: null,
              error: 'Create tools under Account → Taxonomy.',
            })}
            placeholder="All tools…"
            emptyLabel="All tools"
            fill
            accessibilityLabel="Filter by tools"
          />
        </View>

        <Pressable
          onPress={() => setFilters(defaultInsightsFilters())}
          style={styles.resetBtn}
          accessibilityRole="button"
        >
          <Text style={styles.resetText}>Reset to last 28 days</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sunrise} />
        </View>
      ) : error ? (
        <StatusText tone="error">{error}</StatusText>
      ) : snapshot ? (
        <View style={styles.sections}>
          <Text style={styles.meta}>
            {snapshot.sessionCount} complete session
            {snapshot.sessionCount === 1 ? '' : 's'} ·{' '}
            {formatNumber(snapshot.sessionsPerWeek)}/week ·{' '}
            {snapshot.workingSetsTotal} working set
            {snapshot.workingSetsTotal === 1 ? '' : 's'}
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Volume by {activeLensLabel}</Text>
            <Text style={styles.hint}>{volumeHint}</Text>
            <TotalsList
              rows={snapshot.volumeByLens}
              empty="No tracked reps in this window."
              unit="reps"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Balance by category</Text>
            <Text style={styles.hint}>
              Volume rolled up by Primary Group category. Credits each — do not
              sum.
            </Text>
            <TotalsList
              rows={snapshot.balanceByCategory}
              empty="No category volume yet — appears once you log tracked Primary Groups (each PG carries a category)."
              unit="reps"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Working sets × muscle</Text>
            <Text style={styles.hint}>
              Counts sets with type Working only. Multi-muscle exercises credit
              each muscle — do not sum. Total working sets (once):{' '}
              {snapshot.workingSetsTotal}.
            </Text>
            <TotalsList
              rows={snapshot.workingSetsByMuscle}
              empty="No working sets with muscles in this window."
              unit="sets"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tonnage by Primary Group</Text>
            <Text style={styles.hint}>
              Load × effective reps where load is lbs/kg. Multi-PG double-counts
              by design. Session tonnage (once):{' '}
              {formatNumber(snapshot.tonnageTotal)}.
            </Text>
            <TotalsList
              rows={snapshot.tonnageByPrimaryGroup}
              empty="No load×reps sets in this window."
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  filters: {
    gap: spacing.sm,
  },
  filterHeading: {
    marginTop: spacing.sm,
  },
  lensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lensChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
  },
  lensChipOn: {
    borderColor: colors.sunrise,
    backgroundColor: colors.amberGlow,
  },
  lensChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  lensChipTextOn: {
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  filterField: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  resetText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
  },
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  sections: {
    gap: spacing.md,
  },
  meta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  bars: {
    gap: 10,
  },
  barRow: {
    gap: 4,
  },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  barLabel: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  barValue: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textMuted,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgInset,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.sunrise,
  },
  emptyRow: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
  },
});
