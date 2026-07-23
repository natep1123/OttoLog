import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import type { SetType } from '../../lib/insights';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import { colors, spacing, typography } from '../../theme/tokens';
import { Disclosure } from '../forms/Disclosure';
import { useExpansionController } from '../forms/ExpansionController';
import { useNodeLock } from '../forms/LockController';
import { LockedOutline } from '../forms/LockedOutline';
import { SearchableSelect } from '../forms/SearchableSelect';
import { SessionDateControl } from '../forms/SessionDateControl';
import { ToggleChip } from '../forms/ToggleChip';
import { QbAddChildButton } from './QbAddChildButton';
import { QbForCard } from './QbForCard';
import { QbLayer } from './QbLayer';
import { QbSplitWrapperCard } from './QbSplitWrapperCard';
import { outlineSection, sectionScopeGrammar } from './qbOutline';
import { QB_LOCK_ROOT } from './qbLockIds';
import { qbFormKind, qbLayerToken } from './qbTokens';
import { seedInsightsFromGroups, type SectionResult } from './engine';
import {
  clampSectionWindow,
  emptySubject,
  isBreakdown,
  sectionChildKey,
  sectionChildSubject,
  templateAsk,
  unwrapBreakdown,
  wrapInBreakdown,
  type SectionChild,
  type SectionDateWindow,
  type SectionNode,
} from './types';

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

const sectionAccent = qbLayerToken('section').chip.color;
const SECTION_KIND = qbFormKind('section');

function labelFor(options: TaxonomyOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

type Props = {
  section: SectionNode;
  results: SectionResult;
  /** The Query's own date window — WHERE's date sub-window (§12 decision 2) clamps inside it. */
  queryWindow: SectionDateWindow;
  primaryGroups: TaxonomyOption[];
  onPrimaryGroupsChange: (next: TaxonomyOption[]) => void;
  sessionLabels: TaxonomyOption[];
  onSessionLabelsChange: (next: TaxonomyOption[]) => void;
  blockLabels: TaxonomyOption[];
  onBlockLabelsChange: (next: TaxonomyOption[]) => void;
  sequenceLabels: TaxonomyOption[];
  onSequenceLabelsChange: (next: TaxonomyOption[]) => void;
  variations: TaxonomyOption[];
  onVariationsChange: (next: TaxonomyOption[]) => void;
  tools: TaxonomyOption[];
  onToolsChange: (next: TaxonomyOption[]) => void;
  suggestedByPg: Record<string, string[]>;
  onChange: (next: SectionNode) => void;
};

function nestScopeCount(section: SectionNode): number {
  let n = 0;
  if (section.scope.sessionCategoryIds.length) n += 1;
  if (section.scope.blockLabelIds.length) n += 1;
  if (section.scope.sequenceLabelIds.length) n += 1;
  return n;
}

function setPolicyCount(section: SectionNode): number {
  const p = section.setPolicy;
  const nonDefault =
    p.setTypes.length !== 1 || p.setTypes[0] !== 'Working' || p.includeWarmups;
  return nonDefault ? 1 : 0;
}

function dateWindowLabel(section: SectionNode): string {
  return section.dateWindow ? 'Date range · custom' : 'Date range';
}

/**
 * WHERE (doc §11) — blue rail, the workout Block chrome cousin. Both a
 * **filter** (nest labels + set policy + optional date sub-window, `WHERE`
 * scope) and an **org tool**: a real container that holds the FOR / SPLIT
 * children, not a flat chip row on the Query frame. The date sub-window
 * (doc §12 decision 2) clamps inside the Query's own window; unset inherits
 * it exactly. `+ Add FOR` grows the list; each child is either a
 * plain hand-authored FOR (`QbForCard`) or a SPLIT-wrapped one
 * (`QbSplitWrapperCard`).
 */
export function QbWhereCard({
  section,
  results,
  queryWindow,
  primaryGroups,
  onPrimaryGroupsChange,
  sessionLabels,
  onSessionLabelsChange,
  blockLabels,
  onBlockLabelsChange,
  sequenceLabels,
  onSequenceLabelsChange,
  variations,
  onVariationsChange,
  tools,
  onToolsChange,
  suggestedByPg,
  onChange,
}: Props) {
  const expansion = useExpansionController();
  const expandAllSignal = expansion?.expandAllSignal ?? 0;
  const collapseChildrenSignal = expansion?.collapseChildrenSignal ?? 0;
  const collapseChildrenParentId = expansion?.collapseChildrenParentId ?? null;
  /**
   * WHERE's own lock (doc §12 decision 4) — parent is the Query root;
   * children are its FOR ids (skipping through any SPLIT wrapper, which
   * isn't a lock node itself), mirroring `BlockEditor`'s
   * `useNodeLock(lockId, parentLockId, () => value.items.map(...))`.
   */
  const {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle,
    toggle: toggleLock,
  } = useNodeLock(section.id, QB_LOCK_ROOT, () =>
    section.children.map((child) => sectionChildSubject(child).id),
  );
  // Nested card that may remount own-locked after a parent unlock starts collapsed.
  const [expanded, setExpanded] = useState(() => !locked);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [setPolicyOpen, setSetPolicyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [clampNotice, setClampNotice] = useState<string | null>(null);

  useEffect(() => {
    if (expandAllSignal === 0) return;
    setExpanded(true);
  }, [expandAllSignal]);

  // Parent (Query) opened — present WHERE collapsed, independent of lock.
  useEffect(() => {
    if (collapseChildrenSignal === 0) return;
    if (collapseChildrenParentId !== QB_LOCK_ROOT) return;
    setExpanded(false);
  }, [collapseChildrenSignal, collapseChildrenParentId]);

  const labels = {
    primaryGroups,
    sessionLabels,
    blockLabels,
    sequenceLabels,
    variations,
    tools,
  };
  const scopeGrammar = sectionScopeGrammar(section, labels);

  const patchScope = (patch: Partial<SectionNode['scope']>) => {
    onChange({ ...section, scope: { ...section.scope, ...patch } });
  };

  const toggleWarmups = () => {
    const next = !section.setPolicy.includeWarmups;
    let setTypes = [...section.setPolicy.setTypes];
    if (setTypes.length === 0) setTypes = ['Working'];
    if (next && !setTypes.includes('Warmup')) setTypes = [...setTypes, 'Warmup'];
    if (!next) setTypes = setTypes.filter((t) => t !== 'Warmup');
    if (setTypes.length === 0) setTypes = ['Working'];
    onChange({ ...section, setPolicy: { setTypes, includeWarmups: next } });
  };

  /**
   * Set/narrow WHERE's date sub-window, clamping to the Query's window (doc
   * §12 decision 2). Acceptance #3: attempting a range wider than the Query
   * clamps to the intersection immediately (clamp-on-change) and surfaces a
   * one-line hint until the next edit.
   */
  const setDateWindow = (candidate: SectionDateWindow) => {
    const clamped = clampSectionWindow(candidate, queryWindow);
    const wasClamped =
      clamped.fromDate !== candidate.fromDate || clamped.toDate !== candidate.toDate;
    setClampNotice(
      wasClamped
        ? `Clamped to the Query's window (${queryWindow.fromDate} → ${queryWindow.toDate}).`
        : null,
    );
    onChange({ ...section, dateWindow: clamped });
  };

  const clearDateWindow = () => {
    setClampNotice(null);
    onChange({ ...section, dateWindow: null });
  };

  const updateChild = (index: number, next: SectionChild) => {
    onChange({
      ...section,
      children: section.children.map((c, i) => (i === index ? next : c)),
    });
  };
  const removeChild = (index: number) => {
    onChange({
      ...section,
      children: section.children.filter((_, i) => i !== index),
    });
  };
  const addFor = () => {
    onChange({ ...section, children: [...section.children, emptySubject()] });
  };

  const scopeN = nestScopeCount(section);
  const scopeLabel = scopeN > 0 ? `Nest scope · ${scopeN}` : 'Nest scope';
  const policyN = setPolicyCount(section);
  const policyLabel = policyN > 0 ? `Set policy · ${policyN}` : 'Set policy';

  // Collapsed child-summary pill row (doc §12 decision 4, Session/Block
  // chrome): scope grammar first, then this WHERE's FOR Primary Groups.
  // Hidden only when locked+expanded — the LockedOutline body's own meta
  // line already carries the same scope grammar text there (no dup).
  const forChips = section.children.map((child) => {
    const subject = sectionChildSubject(child);
    return subject.pgId ? labelFor(primaryGroups, subject.pgId) : 'FOR';
  });
  const metaChips = [...(scopeGrammar ? [scopeGrammar] : []), ...forChips];

  return (
    <QbLayer
      layer="section"
      expanded={expanded}
      onExpandedChange={(next) => {
        const opening = next && !expanded;
        setExpanded(next);
        if (opening) expansion?.collapseChildrenOf(section.id);
      }}
      locked={locked}
      onToggleLock={
        canToggle || forcedByAncestor
          ? () => {
              const unlocking = ownLocked;
              toggleLock();
              if (unlocking) expansion?.collapseChildrenOf(section.id);
            }
          : undefined
      }
      lockDisabled={forcedByAncestor}
      label={<Text style={styles.title}>WHERE</Text>}
      metaChips={
        locked && expanded
          ? undefined
          : metaChips.length
            ? metaChips
            : undefined
      }
    >
      {locked ? (
        <LockedOutline
          node={outlineSection(section, results, labels)}
          layer={SECTION_KIND}
        />
      ) : (
      <>
      <Disclosure
        label={scopeLabel}
        open={scopeOpen}
        onToggle={() => setScopeOpen((o) => !o)}
        hint="Narrow where the work happened: session / block / sequence labels."
        accentColor={sectionAccent}
      >
        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Session label</Text>
          <SearchableSelect
            mode="multi"
            options={sessionLabels}
            onOptionsChange={onSessionLabelsChange}
            value={section.scope.sessionCategoryIds}
            onChange={(sessionCategoryIds) => patchScope({ sessionCategoryIds })}
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
            onOptionsChange={onBlockLabelsChange}
            value={section.scope.blockLabelIds}
            onChange={(blockLabelIds) => patchScope({ blockLabelIds })}
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
            onOptionsChange={onSequenceLabelsChange}
            value={section.scope.sequenceLabelIds}
            onChange={(sequenceLabelIds) => patchScope({ sequenceLabelIds })}
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
      </Disclosure>

      <Disclosure
        label={policyLabel}
        open={setPolicyOpen}
        onToggle={() => setSetPolicyOpen((o) => !o)}
        hint="Which sets count. Working only by default."
        accentColor={sectionAccent}
      >
        <View style={styles.filterField}>
          <Text style={styles.fieldLabel}>Set type</Text>
          <SearchableSelect
            mode="multi"
            options={SET_TYPE_FILTER_OPTIONS}
            value={section.setPolicy.setTypes}
            onChange={(setTypes) => {
              const next = setTypes as SetType[];
              onChange({
                ...section,
                setPolicy: {
                  setTypes: next.length ? next : ['Working'],
                  includeWarmups: next.includes('Warmup'),
                },
              });
            }}
            onCreate={async () => ({ data: null, error: 'Set types are fixed.' })}
            placeholder="Working only…"
            emptyLabel="Working only"
            fill
            accessibilityLabel="Filter by set type"
          />
        </View>
        <ToggleChip
          label={section.setPolicy.includeWarmups ? 'Warmups on' : 'Working only'}
          active={section.setPolicy.includeWarmups}
          onPress={toggleWarmups}
          size="compact"
        />
      </Disclosure>

      <Disclosure
        label={dateWindowLabel(section)}
        open={dateOpen}
        onToggle={() => setDateOpen((o) => !o)}
        hint="Optional — narrows this WHERE to fewer dates than the Query's window above."
        accentColor={sectionAccent}
      >
        {section.dateWindow ? (
          <>
            <View style={styles.dateRow}>
              <View style={styles.filterField}>
                <Text style={styles.fieldLabel}>From</Text>
                <SessionDateControl
                  value={section.dateWindow.fromDate}
                  onChange={(fromDate) =>
                    setDateWindow({ ...section.dateWindow!, fromDate })
                  }
                  eyebrow="WHERE from date"
                  fill
                />
              </View>
              <View style={styles.filterField}>
                <Text style={styles.fieldLabel}>To</Text>
                <SessionDateControl
                  value={section.dateWindow.toDate}
                  onChange={(toDate) => setDateWindow({ ...section.dateWindow!, toDate })}
                  eyebrow="WHERE to date"
                  fill
                />
              </View>
            </View>
            {clampNotice ? <Text style={styles.clampHint}>{clampNotice}</Text> : null}
            <Pressable
              onPress={clearDateWindow}
              accessibilityRole="button"
              accessibilityLabel="Clear WHERE date range, inherit the Query's window"
              style={({ pressed }) => [styles.clearDateBtn, pressed && styles.pressed]}
            >
              <Text style={styles.clearDateText}>Clear · inherit Query window</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.inheritHint}>
              Inherits the Query's window ({queryWindow.fromDate} → {queryWindow.toDate}).
            </Text>
            <Pressable
              onPress={() => setDateWindow({ ...queryWindow })}
              accessibilityRole="button"
              accessibilityLabel="Narrow WHERE to a date range"
              style={({ pressed }) => [styles.clearDateBtn, pressed && styles.pressed]}
            >
              <Text style={styles.clearDateText}>+ Narrow to a range</Text>
            </Pressable>
          </>
        )}
      </Disclosure>

      <View style={styles.children}>
        {section.children.map((child, index) => {
          const key = sectionChildKey(child);
          if (isBreakdown(child)) {
            const subject = child.subjects[0];
            const result = subject ? results[subject.id] ?? null : null;
            return (
              <QbSplitWrapperCard
                key={key}
                breakdown={child}
                result={result}
                parentLockId={section.id}
                primaryGroups={primaryGroups}
                onPrimaryGroupsChange={onPrimaryGroupsChange}
                variations={variations}
                onVariationsChange={onVariationsChange}
                tools={tools}
                onToolsChange={onToolsChange}
                suggestedIds={subject?.pgId ? suggestedByPg[subject.pgId] ?? [] : []}
                onChange={(next) => updateChild(index, next)}
                onUnwrap={() => updateChild(index, unwrapBreakdown(child))}
                onSeed={() => {
                  if (!subject) return;
                  const template = templateAsk(subject);
                  const groups = result?.groups ?? [];
                  const asks = seedInsightsFromGroups(template, child.dimension, groups);
                  updateChild(index, { ...subject, kind: 'subject', asks });
                }}
                onRemove={() => removeChild(index)}
                canRemove={section.children.length > 1}
              />
            );
          }
          return (
            <QbForCard
              key={key}
              subject={child}
              mode="hand"
              result={results[child.id] ?? null}
              parentLockId={section.id}
              primaryGroups={primaryGroups}
              onPrimaryGroupsChange={onPrimaryGroupsChange}
              variations={variations}
              onVariationsChange={onVariationsChange}
              tools={tools}
              onToolsChange={onToolsChange}
              suggestedIds={child.pgId ? suggestedByPg[child.pgId] ?? [] : []}
              onChange={(next) => updateChild(index, { ...next, kind: 'subject' })}
              onRemove={() => removeChild(index)}
              canRemove={section.children.length > 1}
              onSplit={(dimension) => updateChild(index, wrapInBreakdown(child, dimension))}
            />
          );
        })}

        <QbAddChildButton childKind="for" parentTitle="WHERE" onPress={addFor} />
      </View>
      </>
      )}
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
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
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inheritHint: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textMuted,
  },
  clampHint: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: sectionAccent,
  },
  clearDateBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearDateText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: sectionAccent,
  },
  pressed: {
    opacity: 0.7,
  },
  children: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
