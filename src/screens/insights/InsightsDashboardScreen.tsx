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
import { Disclosure } from '../../components/forms/Disclosure';
import { SessionDateControl } from '../../components/forms/SessionDateControl';
import { ToggleChip } from '../../components/forms/ToggleChip';
import { SearchableSelect } from '../../components/forms/SearchableSelect';
import {
  defaultInsightQuery,
  formatFacetDisplay,
  loadInsightQuery,
  pgToolIds,
  pgVariationIds,
  type InsightQuery,
  type InsightQueryResult,
  type PgPanelResult,
  type SetType,
} from '../../lib/insights';
import {
  PRIMARY_GROUP_CATEGORIES,
  type PrimaryGroupCategory,
} from '../../constants/primaryGroupCategories';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import {
  listAnalyticsTags,
  listBlockLabels,
  listClusterLabels,
  listPrimaryGroups,
  listPrimaryGroupSuggestedTagIds,
  listSessionLabels,
  listTools,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
};

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

/** Global Scope count: nest labels + set type only. Identity filters live per PG. */
function activeScopeCount(query: InsightQuery): number {
  let n = 0;
  if (query.sessionCategoryIds.length) n += 1;
  if (query.blockLabelIds.length) n += 1;
  if (query.sequenceLabelIds.length) n += 1;
  const nonDefaultSetTypes =
    query.setTypes.length !== 1 ||
    query.setTypes[0] !== 'Working' ||
    query.includeWarmups;
  if (nonDefaultSetTypes) n += 1;
  return n;
}

type PgScopeCardProps = {
  pgId: string;
  name: string;
  panel: PgPanelResult | null;
  loading: boolean;
  variations: TaxonomyOption[];
  tools: TaxonomyOption[];
  variationIds: string[];
  toolIds: string[];
  suggestedIds: string[];
  onVariationsChange: (ids: string[]) => void;
  onToolsChange: (ids: string[]) => void;
  onVariationsOptionsChange: (next: TaxonomyOption[]) => void;
  onToolsOptionsChange: (next: TaxonomyOption[]) => void;
};

/**
 * One editable card per selected Primary Group (Phase 3 shape).
 * Identity filters (Variations / Tools) are scoped to this PG only — soft
 * suggestions, never enforced. Facets follow what was logged for this PG.
 */
function PgScopeCard({
  pgId,
  name,
  panel,
  loading,
  variations,
  tools,
  variationIds,
  toolIds,
  suggestedIds,
  onVariationsChange,
  onToolsChange,
  onVariationsOptionsChange,
  onToolsOptionsChange,
}: PgScopeCardProps) {
  const filterCount =
    (variationIds.length ? 1 : 0) + (toolIds.length ? 1 : 0);

  return (
    <View style={styles.panel}>
      <View style={styles.cardHeader}>
        <Text style={styles.panelTitle}>{name}</Text>
        {filterCount > 0 ? (
          <Text style={styles.cardScopeBadge}>Scoped · {filterCount}</Text>
        ) : null}
      </View>

      <View style={styles.cardFilters}>
        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Variations</Text>
          <SearchableSelect
            mode="multi"
            options={variations}
            onOptionsChange={onVariationsOptionsChange}
            value={variationIds}
            onChange={onVariationsChange}
            suggestedIds={suggestedIds}
            onCreate={async () => ({
              data: null,
              error: 'Create variations under Account → Taxonomy.',
            })}
            placeholder="All variations…"
            emptyLabel="All variations"
            fill
            accessibilityLabel={`Variations for ${name}`}
          />
        </View>

        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Tools</Text>
          <SearchableSelect
            mode="multi"
            options={tools}
            onOptionsChange={onToolsOptionsChange}
            value={toolIds}
            onChange={onToolsChange}
            onCreate={async () => ({
              data: null,
              error: 'Create tools under Account → Taxonomy.',
            })}
            placeholder="All tools…"
            emptyLabel="All tools"
            fill
            accessibilityLabel={`Tools for ${name}`}
          />
        </View>
      </View>

      {loading && !panel ? (
        <View style={styles.cardLoading}>
          <ActivityIndicator color={colors.sunrise} size="small" />
        </View>
      ) : panel && panel.setCount > 0 ? (
        <View style={styles.facetList}>
          {panel.facets.map((facet) => (
            <View key={facet.id} style={styles.facetRow}>
              <Text style={styles.facetLabel}>{facet.label}</Text>
              <Text style={styles.facetValue}>
                {formatFacetDisplay(facet)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyRow}>
          {filterCount > 0
            ? 'No tracked sets match this scope in this window.'
            : 'No tracked sets for this Primary Group in this window.'}
        </Text>
      )}
    </View>
  );
}

/**
 * Insights Dashboard — quick PG-first facet readout over complete session logs.
 * Draft only (not saved). Reusable named/lockable analytics live in the Query
 * builder (see `docs/Analytics_Overhaul_Proposal.md`).
 */
export function InsightsDashboardScreen({ onBrandPress, onBack }: Props) {
  const [query, setQuery] = useState<InsightQuery>(() => defaultInsightQuery());
  const [result, setResult] = useState<InsightQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);

  const [primaryGroups, setPrimaryGroups] = useState<TaxonomyOption[]>([]);
  const [sessionLabels, setSessionLabels] = useState<TaxonomyOption[]>([]);
  const [blockLabels, setBlockLabels] = useState<TaxonomyOption[]>([]);
  const [sequenceLabels, setSequenceLabels] = useState<TaxonomyOption[]>([]);
  const [variations, setVariations] = useState<TaxonomyOption[]>([]);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);
  /** Soft suggested variation ids per PG (for each card's Variations picker). */
  const [suggestedByPg, setSuggestedByPg] = useState<Record<string, string[]>>(
    {},
  );
  /** Insights half-step: browse PGs by category (null = All). Survives Phase 3. */
  const [pgCategoryFilter, setPgCategoryFilter] =
    useState<PrimaryGroupCategory | null>(null);

  const loadMeta = useCallback(async () => {
    const [pgs, labels, blocks, sequences, tags, toolRows] = await Promise.all([
      listPrimaryGroups(),
      listSessionLabels(),
      listBlockLabels(),
      listClusterLabels(),
      listAnalyticsTags(),
      listTools(),
    ]);
    setPrimaryGroups(pgs.data);
    setSessionLabels(labels.data);
    setBlockLabels(blocks.data);
    setSequenceLabels(sequences.data);
    setVariations(tags.data);
    setTools(toolRows.data);
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (query.primaryGroupIds.length === 0) {
        setResult(null);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const { data, error: loadError } = await loadInsightQuery(query);
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
      if (loadError) {
        setError(loadError);
        setResult(null);
        return;
      }
      setResult(data);
    },
    [query],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load soft suggested variations for each selected PG (per-card hints).
  useEffect(() => {
    const ids = query.primaryGroupIds;
    if (ids.length === 0) {
      setSuggestedByPg({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const { data } = await listPrimaryGroupSuggestedTagIds(id);
          return [id, data] as const;
        }),
      );
      if (cancelled) return;
      setSuggestedByPg(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [query.primaryGroupIds]);

  const patchQuery = (patch: Partial<InsightQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch }));
  };

  /** Update PG selection; drop per-PG identity filters for removed PGs. */
  const setPrimaryGroupIds = (primaryGroupIds: string[]) => {
    setQuery((prev) => {
      const keep = new Set(primaryGroupIds);
      const pruneMap = (map: Record<string, string[]>) =>
        Object.fromEntries(
          Object.entries(map).filter(([pgId]) => keep.has(pgId)),
        );
      return {
        ...prev,
        primaryGroupIds,
        variationIdsByPg: pruneMap(prev.variationIdsByPg),
        toolIdsByPg: pruneMap(prev.toolIdsByPg),
      };
    });
  };

  const setPgVariations = (pgId: string, ids: string[]) => {
    setQuery((prev) => ({
      ...prev,
      variationIdsByPg: { ...prev.variationIdsByPg, [pgId]: ids },
    }));
  };

  const setPgTools = (pgId: string, ids: string[]) => {
    setQuery((prev) => ({
      ...prev,
      toolIdsByPg: { ...prev.toolIdsByPg, [pgId]: ids },
    }));
  };

  const scopeCount = activeScopeCount(query);
  const scopeLabel =
    scopeCount > 0 ? `Scope · ${scopeCount}` : 'Scope';

  const toggleWarmups = () => {
    setQuery((prev) => {
      const next = !prev.includeWarmups;
      let setTypes = [...prev.setTypes];
      if (setTypes.length === 0) setTypes = ['Working'];
      if (next && !setTypes.includes('Warmup')) setTypes = [...setTypes, 'Warmup'];
      if (!next) setTypes = setTypes.filter((t) => t !== 'Warmup');
      if (setTypes.length === 0) setTypes = ['Working'];
      return { ...prev, includeWarmups: next, setTypes };
    });
  };

  const hasSubject = query.primaryGroupIds.length > 0;

  const pgCategoriesPresent = useMemo(() => {
    const present = new Set(
      primaryGroups
        .map((pg) => pg.category)
        .filter((c): c is PrimaryGroupCategory =>
          Boolean(c && PRIMARY_GROUP_CATEGORIES.includes(c as PrimaryGroupCategory)),
        ),
    );
    return PRIMARY_GROUP_CATEGORIES.filter((c) => present.has(c));
  }, [primaryGroups]);

  /** Filter picker pool by category; keep selected PGs visible so they can clear. */
  const pgPickerOptions = useMemo(() => {
    if (!pgCategoryFilter) return primaryGroups;
    return primaryGroups.filter(
      (pg) =>
        pg.category === pgCategoryFilter ||
        query.primaryGroupIds.includes(pg.id),
    );
  }, [pgCategoryFilter, primaryGroups, query.primaryGroupIds]);

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
        title="Dashboard"
        subtitle="Quick per-Primary-Group facets for a window. Not saved."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Primary Groups</Text>
        <Text style={styles.hint}>Required. Results stack one panel per group.</Text>
        {pgCategoriesPresent.length > 1 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
            style={styles.categoryChipScroll}
          >
            <ToggleChip
              label="All"
              active={pgCategoryFilter === null}
              onPress={() => setPgCategoryFilter(null)}
              size="compact"
            />
            {pgCategoriesPresent.map((cat) => (
              <ToggleChip
                key={cat}
                label={cat}
                active={pgCategoryFilter === cat}
                onPress={() =>
                  setPgCategoryFilter((prev) => (prev === cat ? null : cat))
                }
                size="compact"
              />
            ))}
          </ScrollView>
        ) : null}
        <SearchableSelect
          mode="multi"
          options={pgPickerOptions}
          onOptionsChange={(next) => {
            // Picker may be category-filtered — merge, don't replace the full pool.
            setPrimaryGroups((prev) => {
              const byId = new Map(prev.map((pg) => [pg.id, pg]));
              for (const opt of next) byId.set(opt.id, opt);
              return [...byId.values()].sort((a, b) =>
                a.label.localeCompare(b.label),
              );
            });
          }}
          value={query.primaryGroupIds}
          onChange={setPrimaryGroupIds}
          onCreate={async () => ({
            data: null,
            error: 'Create Primary Groups under Account → Taxonomy.',
          })}
          placeholder="Select Primary Groups…"
          emptyLabel="None selected"
          fill
          accessibilityLabel="Primary Groups for this insight"
        />

        <Disclosure
          label={scopeLabel}
          open={scopeOpen}
          onToggle={() => setScopeOpen((o) => !o)}
          hint="Narrow where the work happened: nest labels and set type. Variations and tools scope per Primary Group below."
          style={styles.scopeDisclosure}
        >
          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Session label</Text>
            <SearchableSelect
              mode="multi"
              options={sessionLabels}
              onOptionsChange={setSessionLabels}
              value={query.sessionCategoryIds}
              onChange={(sessionCategoryIds) =>
                patchQuery({ sessionCategoryIds })
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
              value={query.blockLabelIds}
              onChange={(blockLabelIds) => patchQuery({ blockLabelIds })}
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
            <Text style={styles.fieldLabel}>Sequence label</Text>
            <SearchableSelect
              mode="multi"
              options={sequenceLabels}
              onOptionsChange={setSequenceLabels}
              value={query.sequenceLabelIds}
              onChange={(sequenceLabelIds) => patchQuery({ sequenceLabelIds })}
              onCreate={async () => ({
                data: null,
                error: 'Create sequence labels under Account → Taxonomy.',
              })}
              placeholder="All sequence labels…"
              emptyLabel="All sequences"
              fill
              accessibilityLabel="Filter by sequence label"
            />
          </View>

          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Set type</Text>
            <SearchableSelect
              mode="multi"
              options={SET_TYPE_FILTER_OPTIONS}
              value={query.setTypes}
              onChange={(setTypes) => {
                const next = setTypes as SetType[];
                patchQuery({
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
        </Disclosure>

        <Text style={[styles.sectionTitle, styles.sectionGap]}>Dates</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>From</Text>
            <SessionDateControl
              value={query.fromDate}
              onChange={(fromDate) => patchQuery({ fromDate })}
              eyebrow="From date"
              fill
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>To</Text>
            <SessionDateControl
              value={query.toDate}
              onChange={(toDate) => patchQuery({ toDate })}
              eyebrow="To date"
              fill
            />
          </View>
        </View>

        <View style={styles.toolbarRow}>
          <ToggleChip
            label={query.includeWarmups ? 'Warmups on' : 'Working only'}
            active={query.includeWarmups}
            onPress={toggleWarmups}
            size="compact"
          />
          <Pressable
            onPress={() => setQuery(defaultInsightQuery())}
            style={styles.resetBtn}
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {!hasSubject ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Select at least one Primary Group to see results.
          </Text>
        </View>
      ) : error ? (
        <StatusText tone="error">{error}</StatusText>
      ) : (
        <View style={styles.results}>
          {result ? (
            <Text style={styles.meta}>
              {result.sessionCount} complete session
              {result.sessionCount === 1 ? '' : 's'} · {result.sessionsPerWeek}
              /week
            </Text>
          ) : null}
          <Text style={styles.hint}>
            One card per Primary Group. Variations and tools scope that card
            only. Facets stay separate; don&apos;t sum across cards or unlike
            units.
          </Text>
          {query.primaryGroupIds.map((pgId) => {
            const panel =
              result?.panels.find((p) => p.primaryGroupId === pgId) ?? null;
            const name =
              panel?.name ??
              primaryGroups.find((pg) => pg.id === pgId)?.label ??
              pgId;
            return (
              <PgScopeCard
                key={pgId}
                pgId={pgId}
                name={name}
                panel={panel}
                loading={loading}
                variations={variations}
                tools={tools}
                variationIds={pgVariationIds(query, pgId)}
                toolIds={pgToolIds(query, pgId)}
                suggestedIds={suggestedByPg[pgId] ?? []}
                onVariationsChange={(ids) => setPgVariations(pgId, ids)}
                onToolsChange={(ids) => setPgTools(pgId, ids)}
                onVariationsOptionsChange={setVariations}
                onToolsOptionsChange={setTools}
              />
            );
          })}
        </View>
      )}
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
  form: {
    gap: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.sm,
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
  categoryChipScroll: {
    flexGrow: 0,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
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
  scopeDisclosure: {
    marginTop: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  emptyStateText: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  results: {
    gap: spacing.md,
  },
  meta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  panelTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardScopeBadge: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.sunrise,
  },
  cardFilters: {
    gap: spacing.sm,
  },
  cardLoading: {
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  facetList: {
    gap: 8,
  },
  facetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  facetLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  facetValue: {
    flexShrink: 1,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  emptyRow: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
  },
});
