/**
 * LockedOutline builders for the Query builder nest.
 *
 * Emits workout-shaped `OutlineNode`s (kind = session/block/cluster/exercise) so
 * shared `LockedOutline` / `LockedPreviewModal` / pagination work unchanged.
 * Content is analytics grammar (PG, measures, breakdown groups/totals) — not
 * set prescriptions. See `docs/Insights_Query_Builder.md` §4–§5 / §7.
 */

import type { TaxonomyOption } from '../../lib/taxonomy';
import type { OutlineNode } from '../../lib/targetSummaries';
import {
  measureToken,
  type SectionResult,
  type SubjectResult,
} from './engine';
import {
  isBreakdown,
  type BreakdownNode,
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

/** Join measure value tokens, e.g. `sum 450 reps · avg 20 lb`. */
function measureLine(result: SubjectResult | null | undefined): string | undefined {
  const tokens = (result?.measures ?? [])
    .map((m) => measureToken(m))
    .filter((t): t is string => Boolean(t));
  if (!tokens.length) return undefined;
  return tokens.join(' · ');
}

/** Soft identity filter summary (variations / tools any-of). */
function subjectIdentityMeta(
  subject: SubjectNode,
  labels: QbOutlineLabels,
): string | undefined {
  const parts: string[] = [];
  for (const id of subject.variationIds) {
    parts.push(labelFor(labels.variations, id));
  }
  for (const id of subject.toolIds) {
    parts.push(labelFor(labels.tools, id));
  }
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Section scope + set-policy grammar for outline meta / header line,
 * e.g. `Challenge · Working` or `last window · Warmups`.
 */
export function sectionScopeGrammar(
  section: SectionNode,
  labels: QbOutlineLabels,
): string {
  const parts: string[] = [];
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
 * Subject outline (= Exercise leaf). Ungrouped: measure tokens as lines.
 * Inside a Breakdown with groups: per-group sub-rows + totals as override.
 */
export function outlineSubject(
  subject: SubjectNode,
  result: SubjectResult | null | undefined,
  labels: QbOutlineLabels,
): OutlineNode {
  const title =
    (subject.pgId
      ? labelFor(labels.primaryGroups, subject.pgId)
      : null) ?? 'Subject';
  const meta = subjectIdentityMeta(subject, labels);

  if (result?.groups && result.groups.length > 0) {
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
    const totalLine = measureLine(result);
    return {
      title,
      kind: 'exercise',
      meta,
      lines: lines.length ? lines : undefined,
      overrides: totalLine
        ? [{ summary: `total · ${totalLine}` }]
        : result.setCount > 0
          ? [
              {
                summary: `total · ${result.setCount} set${
                  result.setCount === 1 ? '' : 's'
                }`,
              },
            ]
          : undefined,
    };
  }

  const line = measureLine(result);
  return {
    title,
    kind: 'exercise',
    meta,
    lines: line
      ? [line]
      : subject.measures.some((m) => m.field == null)
        ? ['Pick op × field']
        : ['No sets logged this in-window'],
  };
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
    title: `For each ${breakdown.dimension}`,
    kind: 'cluster',
    children: children.length ? children : undefined,
  };
}

/** Section outline (= Block): scope meta + ordered Subjects / Breakdowns. */
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
    title: 'Section',
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
