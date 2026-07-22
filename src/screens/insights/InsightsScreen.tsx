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
import { StatusText } from '../../components/StatusText';
import { Disclosure } from '../../components/forms/Disclosure';
import { SessionDateControl } from '../../components/forms/SessionDateControl';
import { ToggleChip } from '../../components/forms/ToggleChip';
import { SearchableSelect } from '../../components/forms/SearchableSelect';
import {
  defaultInsightQuery,
  formatFacetDisplay,
  loadInsightQuery,
  type InsightQuery,
  type InsightQueryResult,
  type PgPanelResult,
  type SetType,
} from '../../lib/insights';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import {
  listAnalyticsTags,
  listBlockLabels,
  listClusterLabels,
  listPrimaryGroups,
  listSessionLabels,
  listTools,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
};

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

function activeScopeCount(query: InsightQuery): number {
  let n = 0;
  if (query.sessionCategoryIds.length) n += 1;
  if (query.blockLabelIds.length) n += 1;
  if (query.sequenceLabelIds.length) n += 1;
  if (query.variationIds.length) n += 1;
  if (query.toolIds.length) n += 1;
  const nonDefaultSetTypes =
    query.setTypes.length !== 1 ||
    query.setTypes[0] !== 'Working' ||
    query.includeWarmups;
  if (nonDefaultSetTypes) n += 1;
  return n;
}

function PgFacetPanel({ panel }: { panel: PgPanelResult }) {
  if (panel.setCount === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{panel.name}</Text>
        <Text style={styles.emptyRow}>
          No tracked sets for this Primary Group in this window.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{panel.name}</Text>
      <View style={styles.facetList}>
        {panel.facets.map((facet) => (
          <View key={facet.id} style={styles.facetRow}>
            <Text style={styles.facetLabel}>{facet.label}</Text>
            <Text style={styles.facetValue}>{formatFacetDisplay(facet)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Phase 2 — PG-first Insights query builder over complete session logs. */
export function InsightsScreen({ onBrandPress }: Props) {
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

  const patchQuery = (patch: Partial<InsightQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch }));
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
        subtitle="Pick Primary Groups. Facets follow what you logged."
        onBrandPress={onBrandPress}
      />

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Primary Groups</Text>
        <Text style={styles.hint}>Required. Results stack one panel per group.</Text>
        <SearchableSelect
          mode="multi"
          options={primaryGroups}
          onOptionsChange={setPrimaryGroups}
          value={query.primaryGroupIds}
          onChange={(primaryGroupIds) => patchQuery({ primaryGroupIds })}
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
          hint="Narrow where the work happened — nest labels and identity filters."
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

          <View style={styles.filterField}>
            <Text style={styles.fieldLabel}>Variations</Text>
            <SearchableSelect
              mode="multi"
              options={variations}
              onOptionsChange={setVariations}
              value={query.variationIds}
              onChange={(variationIds) => patchQuery({ variationIds })}
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
              value={query.toolIds}
              onChange={(toolIds) => patchQuery({ toolIds })}
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
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sunrise} />
        </View>
      ) : error ? (
        <StatusText tone="error">{error}</StatusText>
      ) : result ? (
        <View style={styles.results}>
          <Text style={styles.meta}>
            {result.sessionCount} complete session
            {result.sessionCount === 1 ? '' : 's'} · {result.sessionsPerWeek}
            /week
          </Text>
          <Text style={styles.hint}>
            One panel per Primary Group. Facets are separate — do not sum across
            panels or unlike units.
          </Text>
          {result.panels.map((panel) => (
            <PgFacetPanel key={panel.primaryGroupId} panel={panel} />
          ))}
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
  center: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
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
