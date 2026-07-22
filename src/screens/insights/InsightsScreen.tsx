import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusText } from '../../components/StatusText';
import { SessionDateControl } from '../../components/forms/SessionDateControl';
import { ToggleChip } from '../../components/forms/ToggleChip';
import {
  defaultInsightsFilters,
  formatMetricDisplay,
  INSIGHTS_LENS_OPTIONS,
  INSIGHTS_METRIC_OPTIONS,
  lensDoubleCounts,
  lensLabel,
  loadInsightsSnapshot,
  metricLabel,
  type InsightsFilters,
  type InsightsLens,
  type InsightsMetric,
  type InsightsMetricMode,
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

function TotalsList({
  rows,
  empty,
  mixedMetrics,
}: {
  rows: NamedTotal[];
  empty: string;
  /** When true (Auto with mixed units), skip relative bar widths. */
  mixedMetrics?: boolean;
}) {
  if (rows.length === 0) {
    return <Text style={styles.emptyRow}>{empty}</Text>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sameMetric =
    !mixedMetrics && rows.every((r) => r.metric === rows[0]?.metric);
  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <View key={row.id} style={styles.barRow}>
          <View style={styles.barMeta}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.barValue}>
              {formatMetricDisplay(row.value, row.metric)}
            </Text>
          </View>
          {sameMetric ? (
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(4, (row.value / max) * 100)}%` },
                ]}
              />
            </View>
          ) : (
            <View style={styles.barTrackMuted}>
              <View style={[styles.barFill, { width: '100%', opacity: 0.35 }]} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function activeFilterCount(filters: InsightsFilters): number {
  let n = 0;
  if (filters.sessionCategoryIds.length) n += 1;
  if (filters.blockLabelIds.length) n += 1;
  if (filters.variationIds.length) n += 1;
  if (filters.toolIds.length) n += 1;
  const nonDefaultSetTypes =
    filters.setTypes.length !== 1 ||
    filters.setTypes[0] !== 'Working' ||
    filters.includeWarmups;
  if (nonDefaultSetTypes) n += 1;
  return n;
}

/** Phase 1a — metric-aware Insights over complete session logs. */
export function InsightsScreen({ onBrandPress }: Props) {
  const [filters, setFilters] = useState<InsightsFilters>(() =>
    defaultInsightsFilters(),
  );
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const filterCount = activeFilterCount(filters);

  const volumeMixed = useMemo(() => {
    if (!snapshot || snapshot.metricMode !== 'auto') return false;
    const metrics = new Set(snapshot.volumeByLens.map((r) => r.metric));
    return metrics.size > 1;
  }, [snapshot]);

  const balanceMixed = useMemo(() => {
    if (!snapshot || snapshot.metricMode !== 'auto') return false;
    const metrics = new Set(snapshot.balanceByCategory.map((r) => r.metric));
    return metrics.size > 1;
  }, [snapshot]);

  const volumeHint = useMemo(() => {
    const credit = lensDoubleCounts(filters.lens)
      ? 'Credits each — do not sum these into one total.'
      : 'Each set counted once (honest partition).';
    if (filters.metric === 'auto') {
      return `Auto picks distance → time → reps per row (until PG Counts as). ${credit} Never sum mixed units.`;
    }
    return `${metricLabel(filters.metric)} only. ${credit}`;
  }, [filters.lens, filters.metric]);

  const toggleWarmups = () => {
    setFilters((prev) => {
      const next = !prev.includeWarmups;
      let setTypes = [...prev.setTypes];
      if (setTypes.length === 0) setTypes = ['Working'];
      if (next && !setTypes.includes('Warmup')) setTypes = [...setTypes, 'Warmup'];
      if (!next) setTypes = setTypes.filter((t) => t !== 'Warmup');
      if (setTypes.length === 0) setTypes = ['Working'];
      return { ...prev, includeWarmups: next, setTypes };
    });
  };

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
        subtitle="Pick a metric and lens. Complete logs only."
        onBrandPress={onBrandPress}
      />

      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>Metric</Text>
        <Text style={styles.hint}>
          What the headline chart counts. Auto never mixes units into one total.
        </Text>
        <View style={styles.chipRow}>
          {INSIGHTS_METRIC_OPTIONS.map((opt) => {
            const active = filters.metric === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() =>
                  patchFilters({ metric: opt.id as InsightsMetricMode })
                }
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

        <Text style={[styles.sectionTitle, styles.controlGap]}>Lens</Text>
        <Text style={styles.hint}>What each bar groups by.</Text>
        <View style={styles.chipRow}>
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

        <Text style={[styles.sectionTitle, styles.controlGap]}>Dates</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>From</Text>
            <SessionDateControl
              value={filters.fromDate}
              onChange={(fromDate) => patchFilters({ fromDate })}
              eyebrow="From date"
              fill
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>To</Text>
            <SessionDateControl
              value={filters.toDate}
              onChange={(toDate) => patchFilters({ toDate })}
              eyebrow="To date"
              fill
            />
          </View>
        </View>

        <View style={styles.toolbarRow}>
          <ToggleChip
            label={
              filters.includeWarmups ? 'Warmups on' : 'Working only'
            }
            active={filters.includeWarmups}
            onPress={toggleWarmups}
            size="compact"
          />
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={styles.filtersBtn}
            accessibilityRole="button"
          >
            <Text style={styles.filtersBtnText}>
              Filters{filterCount > 0 ? ` · ${filterCount}` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilters(defaultInsightsFilters())}
            style={styles.resetBtn}
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
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
            {snapshot.sessionsPerWeek}/week · {snapshot.workingSetsTotal}{' '}
            working set{snapshot.workingSetsTotal === 1 ? '' : 's'}
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {filters.metric === 'auto' ? 'By' : metricLabel(filters.metric)}{' '}
              by {activeLensLabel}
            </Text>
            <Text style={styles.hint}>{volumeHint}</Text>
            <TotalsList
              rows={snapshot.volumeByLens}
              empty={
                filters.metric === 'auto'
                  ? 'No tracked volume in this window.'
                  : `No ${metricLabel(filters.metric).toLowerCase()} in this window.`
              }
              mixedMetrics={volumeMixed}
            />
            {snapshot.omittedForMetric.length > 0 ? (
              <Text style={styles.caption}>
                Logged but no {metricLabel(filters.metric).toLowerCase()}:{' '}
                {snapshot.omittedForMetric.join(', ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Balance by category</Text>
            <Text style={styles.hint}>
              Same metric as above. Credits each — do not sum. Empty categories
              hidden.
            </Text>
            <TotalsList
              rows={snapshot.balanceByCategory}
              empty="No category volume yet — appears once you log tracked Primary Groups."
              mixedMetrics={balanceMixed}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Working sets × muscle</Text>
            <Text style={styles.hint}>
              Counts Working sets only. Multi-muscle exercises credit each muscle
              — do not sum. Total working sets (once): {snapshot.workingSetsTotal}.
            </Text>
            <TotalsList
              rows={snapshot.workingSetsByMuscle}
              empty="No working sets with muscles in this window."
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tonnage by Primary Group</Text>
            <Text style={styles.hint}>
              Load × effective reps where load is lbs/kg. Multi-PG double-counts
              by design. Session tonnage (once):{' '}
              {formatMetricDisplay(snapshot.tonnageTotal, 'tonnage' as InsightsMetric)}.
            </Text>
            <TotalsList
              rows={snapshot.tonnageByPrimaryGroup}
              empty="No load×reps sets in this window."
            />
          </View>
        </View>
      ) : null}

      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setFiltersOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetEyebrow}>Filters</Text>
              <Pressable
                onPress={() => setFiltersOpen(false)}
                accessibilityRole="button"
              >
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
            >
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
                  onChange={(setTypes) => {
                    const next = setTypes as SetType[];
                    patchFilters({
                      setTypes: next.length ? next : ['Working'],
                      includeWarmups: next.includes('Warmup'),
                    });
                  }}
                  onCreate={async () => ({
                    data: null,
                    error: 'Set types are fixed.',
                  })}
                  placeholder="Working only…"
                  emptyLabel="Working only"
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
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  controls: {
    gap: spacing.sm,
  },
  controlGap: {
    marginTop: spacing.sm,
  },
  chipRow: {
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
    gap: 6,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  filtersBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  filtersBtnText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
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
    paddingVertical: 6,
    paddingHorizontal: 4,
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
  caption: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textDim,
    marginTop: 2,
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
  barTrackMuted: {
    height: 3,
    borderRadius: 2,
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgPanel,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sheetEyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  sheetDone: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.sunrise,
  },
  sheetBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
