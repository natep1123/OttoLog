import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ExpansionControllerProvider } from '../../components/forms/ExpansionController';
import { LockControllerProvider } from '../../components/forms/LockController';
import { QbEditorTools } from '../../components/querybuilder/QbEditorTools';
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
 * Insights Query builder — v2 slice 2 (lock grammar + preview, ephemeral).
 *
 * Nested builder: Query → Section → (optional) Breakdown → Subject → Measure.
 * Lock + expanded → LockedOutline analytics grammar; maximize → paginated
 * LockedPreviewModal. Still ephemeral — no `saved_queries` yet.
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

      <ExpansionControllerProvider>
        <LockControllerProvider>
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeading} />
            <QbEditorTools />
          </View>
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
        </LockControllerProvider>
      </ExpansionControllerProvider>

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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toolbarLeading: {
    flex: 1,
    minWidth: 0,
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
