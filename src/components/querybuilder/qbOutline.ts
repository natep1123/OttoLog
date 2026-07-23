/**
 * LockedOutline builders for the Query builder nest.
 *
 * Emits workout-shaped `OutlineNode`s (kind = session/block/cluster/exercise) so
 * shared `LockedOutline` / `LockedPreviewModal` / pagination work unchanged.
 * Content is analytics grammar (PG, measures, breakdown groups/totals) — not
 * set prescriptions. See `docs/Insights_Query_Builder.md` §4–§5 / §7.
 */

import type { IdentityMatch } from '../../lib/insights';
import type { TaxonomyOption } from '../../lib/taxonomy';
import type { OutlineNode, OutlineOverride } from '../../lib/targetSummaries';
import {
  measureToken,
  type InsightResult,
  type SectionResult,
  type SubjectResult,
} from './engine';
import {
  isBreakdown,
  templateAsk,
  type BreakdownNode,
  type InsightNode,
  type QueryDraft,
  type SectionNode,
  type SubjectNode,
} from './types';

export type QbOutlineLabels = {
  primaryGroups: TaxonomyOption[];
  sessionLabels: TaxonomyOption[];
  blockLabels: TaxonomyOption[];
  sequenceLabels: TaxonomyOption[];
  variations: TaxonomyOption[];
  tools: TaxonomyOption[];
};

function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

function outlineNotes(notes: string | null | undefined): string | undefined {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : undefined;
}

/** Join one Insight's measure value tokens, e.g. `sum 450 reps · avg 20 lb`. */
export function insightMeasureLine(
  result: InsightResult | null | undefined,
): string | undefined {
  const tokens = (result?.measures ?? [])
    .map((m) => measureToken(m))
    .filter((t): t is string => Boolean(t));
  if (!tokens.length) return undefined;
  return tokens.join(' · ');
}

/**
 * Natural-language join for one facet's WITH names using its own match mode,
 * e.g. `Running`, `Running or Weighted` (`'any'`), `Incline and Walking`
 * (`'all'`). Reads as the filter grammar itself — no separate "(all)" suffix
 * needed. Doc §10, Option B.
 */
function facetPhrase(names: string[], match: IdentityMatch): string | undefined {
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  const conj = match === 'all' ? 'and' : 'or';
  if (names.length === 2) return `${names[0]} ${conj} ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, ${conj} ${names[names.length - 1]}`;
}

/**
 * Combined WITH identity phrase across the two independent facets (doc §12
 * decision 1: `variationMatch` / `toolMatch` split from the old shared
 * `identityMatch`). Each facet keeps its own any/all conjunction, e.g.
 * `Running or Weighted · Barbell and Dumbbell`; facets join with ` · ` only
 * when both are present.
 */
export function identityPhrase(
  variationNames: string[],
  variationMatch: IdentityMatch,
  toolNames: string[],
  toolMatch: IdentityMatch,
): string | undefined {
  const parts = [
    facetPhrase(variationNames, variationMatch),
    facetPhrase(toolNames, toolMatch),
  ].filter((p): p is string => Boolean(p));
  if (parts.length === 0) return undefined;
  return parts.join(' · ');
}

/** Only the identity facets an Insight-level helper needs — lets FOR's collapsed
 * pill row and the Insight summary row share this without the full label pool. */
type IdentityLabels = Pick<QbOutlineLabels, 'variations' | 'tools'>;

/** Soft identity filter summary for one Insight's WITH (variations/tools, any-of or all-of, independently). */
function insightIdentityMeta(
  ask: InsightNode,
  labels: IdentityLabels,
): string | undefined {
  const variationNames = ask.variationIds.map((id) => labelFor(labels.variations, id));
  const toolNames = ask.toolIds.map((id) => labelFor(labels.tools, id));
  return identityPhrase(variationNames, ask.variationMatch, toolNames, ask.toolMatch);
}

/**
 * WITH+SHOW summary line for one Insight, e.g. `Running · sum 450 reps` or
 * `all` (no data / not picked yet). Single source of truth for "what does
 * this ask say" text — shared by the outline override row, the FOR collapsed
 * pill (doc §12 decision 4), and the Insight summary row (decision 5).
 */
export function insightSummaryText(
  ask: InsightNode,
  result: InsightResult | null | undefined,
  variations: TaxonomyOption[],
  tools: TaxonomyOption[],
): string {
  const identity = insightIdentityMeta(ask, { variations, tools }) ?? 'all';
  const line = insightMeasureLine(result);
  const value =
    line ??
    (ask.measures.some((m) => m.field == null)
      ? 'Pick a measure'
      : result && result.setCount === 0
        ? 'No sets logged this in-window'
        : undefined);
  return value ? `${identity} · ${value}` : identity;
}

/** One Insight as a dusk `override`-family outline entry (§11: chrome cousin,
 * never the word "override" in copy). `WITH` phrase (or `all`) · SHOW tokens. */
function insightOverride(
  ask: InsightNode,
  result: InsightResult | null | undefined,
  labels: IdentityLabels,
): OutlineOverride {
  return { summary: insightSummaryText(ask, result, labels.variations, labels.tools) };
}

/**
 * Section scope + set-policy grammar for outline meta / header line, e.g.
 * `Challenge · Working` or `last window · Warmups`. Leads with the WHERE
 * date sub-window (doc §12 decision 2) when one is set — unset stays silent
 * here since the Query's own window already shows on the outline root.
 */
export function sectionScopeGrammar(
  section: SectionNode,
  labels: QbOutlineLabels,
): string {
  const parts: string[] = [];
  if (section.dateWindow) {
    parts.push(`${section.dateWindow.fromDate} → ${section.dateWindow.toDate}`);
  }
  for (const id of section.scope.sessionCategoryIds) {
    parts.push(labelFor(labels.sessionLabels, id));
  }
  for (const id of section.scope.blockLabelIds) {
    parts.push(labelFor(labels.blockLabels, id));
  }
  for (const id of section.scope.sequenceLabelIds) {
    parts.push(labelFor(labels.sequenceLabels, id));
  }

  const { setTypes, includeWarmups } = section.setPolicy;
  const types: string[] = setTypes.length ? [...setTypes] : ['Working'];
  if (includeWarmups && !types.includes('Warmup')) types.push('Warmup');
  parts.push(types.join(' · '));

  return parts.join(' · ');
}

/**
 * Subject outline (= FOR / Exercise leaf). Hand-authored Insights (`asks[]`)
 * render as dusk `override`-family entries — one per Insight, credit-each
 * (doc §11.4: "asks can overlap", never summed). Inside a SPLIT (Breakdown)
 * with groups: per-group sub-rows + a totals override (template Insight's
 * own filtered set).
 */
export function outlineSubject(
  subject: SubjectNode,
  result: SubjectResult | null | undefined,
  labels: Pick<QbOutlineLabels, 'primaryGroups' | 'variations' | 'tools'>,
): OutlineNode {
  const title =
    (subject.pgId
      ? labelFor(labels.primaryGroups, subject.pgId)
      : null) ?? 'Subject';

  if (result?.groups) {
    const template = templateAsk(subject);
    const meta = insightIdentityMeta(template, labels);
    const totalLine = insightMeasureLine(result.asks[0]);
    const totalSetCount = result.asks[0]?.setCount ?? 0;
    const totalOverride = totalLine
      ? [{ summary: `total · ${totalLine}` }]
      : totalSetCount > 0
        ? [
            {
              summary: `total · ${totalSetCount} set${
                totalSetCount === 1 ? '' : 's'
              }`,
            },
          ]
        : undefined;

    if (result.groups.length === 0) {
      // Sibling SPLIT (Option C) found no co-tags on this filtered set, or a
      // peer SPLIT found nothing logged at all — empty state, never a blank
      // "For each …" with no rows.
      const dim = result.breakdownDimension ?? 'tag';
      return {
        title,
        kind: 'exercise',
        meta,
        lines: [
          meta
            ? `No other ${dim}s tagged on these sets`
            : `No ${dim}s logged on these sets yet`,
        ],
        overrides: totalOverride,
      };
    }

    const groupOptions =
      result.breakdownDimension === 'tool' ? labels.tools : labels.variations;
    const lines = result.groups.map((group) => {
      const tokens = group.measures
        .map((m) => measureToken(m))
        .filter((t): t is string => Boolean(t));
      const value = tokens.length
        ? tokens.join(' · ')
        : `${group.setCount} set${group.setCount === 1 ? '' : 's'}`;
      return `${labelFor(groupOptions, group.groupId)} · ${value}`;
    });
    return {
      title,
      kind: 'exercise',
      meta,
      lines,
      overrides: totalOverride,
    };
  }

  if (subject.asks.length === 0) {
    return { title, kind: 'exercise', lines: ['Add an Insight'] };
  }
  const overrides = subject.asks.map((ask, index) =>
    insightOverride(ask, result?.asks[index], labels),
  );
  return { title, kind: 'exercise', overrides };
}

/**
 * Breakdown title grammar: `For each <dim>`, plus `· among <WITH identity>`
 * when the wrapped Subject's template Insight has a WITH filter (Option C,
 * doc §10) — e.g. `For each variation · among Running`. v1 Breakdowns wrap
 * exactly one Subject (madlib SPLIT), so its template Insight carries the
 * phrase.
 */
function breakdownTitle(breakdown: BreakdownNode, labels: QbOutlineLabels): string {
  const base = `For each ${breakdown.dimension}`;
  const subject = breakdown.subjects[0];
  const among = subject ? insightIdentityMeta(templateAsk(subject), labels) : undefined;
  return among ? `${base} · among ${among}` : base;
}

/** Breakdown outline (= Sequence): `For each <dim>` + Subject children. */
export function outlineBreakdown(
  breakdown: BreakdownNode,
  results: SectionResult,
  labels: QbOutlineLabels,
): OutlineNode {
  const children = breakdown.subjects.map((subject) =>
    outlineSubject(subject, results[subject.id], labels),
  );
  return {
    title: breakdownTitle(breakdown, labels),
    kind: 'cluster',
    children: children.length ? children : undefined,
  };
}

/**
 * Section outline (= Block): scope meta + ordered Subjects / Breakdowns.
 * **Soft-hides the "Section" word** — v1 AST is always exactly one Section,
 * so the label is dead weight on the read surface; the scope grammar (e.g.
 * `Working`) carries the meaning on its own (doc §10, decided this slice).
 */
export function outlineSection(
  section: SectionNode,
  results: SectionResult,
  labels: QbOutlineLabels,
): OutlineNode {
  const children: OutlineNode[] = [];
  for (const child of section.children) {
    if (isBreakdown(child)) {
      children.push(outlineBreakdown(child, results, labels));
    } else {
      children.push(outlineSubject(child, results[child.id], labels));
    }
  }
  return {
    title: '',
    kind: 'block',
    meta: sectionScopeGrammar(section, labels),
    children: children.length ? children : undefined,
  };
}

/** Query outline (= Session): name + window + nested Section. */
export function outlineQuery(
  draft: QueryDraft,
  results: SectionResult,
  labels: QbOutlineLabels,
): OutlineNode {
  return {
    title: draft.name?.trim() || 'Query',
    kind: 'session',
    meta: `${draft.window.fromDate} → ${draft.window.toDate}`,
    notes: outlineNotes(draft.notes),
    children: [outlineSection(draft.section, results, labels)],
  };
}
