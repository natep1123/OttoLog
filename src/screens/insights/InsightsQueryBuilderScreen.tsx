import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { QbQueryCard } from '../../components/querybuilder/QbQueryCard';
import { evaluateSection, type SectionResult } from '../../components/querybuilder/engine';
import {
  defaultQueryDraft,
  isBreakdown,
  type QueryDraft,
} from '../../components/querybuilder/types';
import { loadQueryFacts, type QueryFactsResult } from '../../lib/insights';
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
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
};

/** Collect the distinct PG ids referenced anywhere in the draft. */
function collectPgIds(draft: QueryDraft): string[] {
  const ids = new Set<string>();
  for (const child of draft.section.children) {
    if (isBreakdown(child)) {
      for (const s of child.subjects) if (s.pgId) ids.add(s.pgId);
    } else if (child.pgId) {
      ids.add(child.pgId);
    }
  }
  return [...ids];
}

/**
 * Insights Query builder — v2 slice 1 (nest skeleton, ephemeral).
 *
 * A full nested builder mirroring the log/template builders: Query → Section →
 * (optional) Breakdown → Subject → Measure, with hidden SQL meaning per layer.
 * Cool analytics palette (`querybuilder/` `Qb*` chrome). Results are computed
 * client-side over `v_log_set_facts`. No lock/preview (slice 2), no save
 * (slice 4). Draft is lost on reload — expected this slice.
 */
export function InsightsQueryBuilderScreen({ onBrandPress, onBack }: Props) {
  const [draft, setDraft] = useState<QueryDraft>(() => defaultQueryDraft());
  const [factsResult, setFactsResult] = useState<QueryFactsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryGroups, setPrimaryGroups] = useState<TaxonomyOption[]>([]);
  const [sessionLabels, setSessionLabels] = useState<TaxonomyOption[]>([]);
  const [blockLabels, setBlockLabels] = useState<TaxonomyOption[]>([]);
  const [sequenceLabels, setSequenceLabels] = useState<TaxonomyOption[]>([]);
  const [variations, setVariations] = useState<TaxonomyOption[]>([]);
  const [tools, setTools] = useState<TaxonomyOption[]>([]);
  const [suggestedByPg, setSuggestedByPg] = useState<Record<string, string[]>>(
    {},
  );

  // Load taxonomy pools once.
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

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  // Fact read depends only on window + scope + set policy (not name/measures).
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const windowKey = JSON.stringify(draft.window);
  const scopeKey = JSON.stringify(draft.section.scope);
  const policyKey = JSON.stringify(draft.section.setPolicy);

  const loadFacts = useCallback(async () => {
    const d = draftRef.current;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await loadQueryFacts(
      d.window,
      d.section.scope,
      d.section.setPolicy,
    );
    setLoading(false);
    if (loadError) {
      setError(loadError);
      setFactsResult(null);
      return;
    }
    setFactsResult(data);
  }, []);

  useEffect(() => {
    void loadFacts();
  }, [loadFacts, windowKey, scopeKey, policyKey]);

  // Soft suggested variations per referenced PG.
  const pgKey = collectPgIds(draft).sort().join(',');
  useEffect(() => {
    const ids = pgKey ? pgKey.split(',') : [];
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
      if (!cancelled) setSuggestedByPg(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [pgKey]);

  // Aggregate client-side (pure) whenever facts or the section shape change.
  const results: SectionResult = useMemo(
    () => (factsResult ? evaluateSection(factsResult.facts, draft.section) : {}),
    [factsResult, draft.section],
  );

  const meta = factsResult
    ? {
        sessionCount: factsResult.sessionCount,
        sessionsPerWeek: factsResult.sessionsPerWeek,
      }
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Query builder"
        subtitle="Build a nested ask, layer by layer. Draft only — not saved yet."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <QbQueryCard
        draft={draft}
        results={results}
        meta={meta}
        loading={loading}
        error={error}
        primaryGroups={primaryGroups}
        onPrimaryGroupsChange={setPrimaryGroups}
        sessionLabels={sessionLabels}
        onSessionLabelsChange={setSessionLabels}
        blockLabels={blockLabels}
        onBlockLabelsChange={setBlockLabels}
        sequenceLabels={sequenceLabels}
        onSequenceLabelsChange={setSequenceLabels}
        variations={variations}
        onVariationsChange={setVariations}
        tools={tools}
        onToolsChange={setTools}
        suggestedByPg={suggestedByPg}
        onChange={setDraft}
      />

      <Pressable
        onPress={() => setDraft(defaultQueryDraft())}
        style={styles.resetBtn}
        accessibilityRole="button"
      >
        <Text style={styles.resetText}>Reset draft</Text>
      </Pressable>
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
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  resetText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
  },
});
