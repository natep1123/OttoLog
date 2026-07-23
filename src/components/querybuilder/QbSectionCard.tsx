import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import type { SetType } from '../../lib/insights';
import { SET_TYPE_OPTIONS } from '../../constants/setTypes';
import { colors, spacing, typography } from '../../theme/tokens';
import { Disclosure } from '../forms/Disclosure';
import { SearchableSelect } from '../forms/SearchableSelect';
import { ToggleChip } from '../forms/ToggleChip';
import { useNodeLock } from '../forms/LockController';
import { QbAddChildButton } from './QbAddChildButton';
import { QbBreakdownCard } from './QbBreakdownCard';
import { QbLayer } from './QbLayer';
import { QbSubjectCard } from './QbSubjectCard';
import { QB_SECTION_ID } from './qbLockIds';
import { qbLayerToken } from './qbTokens';
import type { SectionResult } from './engine';
import {
  emptyBreakdown,
  emptySubject,
  isBreakdown,
  type SectionChild,
  type SectionNode,
} from './types';

const SET_TYPE_FILTER_OPTIONS: TaxonomyOption[] = SET_TYPE_OPTIONS.map((o) => ({
  id: o.id,
  label: o.label,
}));

type Props = {
  section: SectionNode;
  /** Lock-tree parent (the Query root). */
  parentLockId: string;
  results: SectionResult;
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

/**
 * Section (= Block) — one result table. Auto-created, exactly one in v1. Holds
 * the scope WHERE (nest labels + set policy) and an ordered list of Subjects
 * and/or Breakdowns.
 */
export function QbSectionCard({
  section,
  parentLockId,
  results,
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
  const [scopeOpen, setScopeOpen] = useState(false);
  const [setPolicyOpen, setSetPolicyOpen] = useState(false);

  const { locked, forcedByAncestor, canToggle, toggle } = useNodeLock(
    QB_SECTION_ID,
    parentLockId,
    () => section.children.map((c) => c.id),
  );
  const sectionAccent = qbLayerToken('section').chip.color;

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
    onChange({
      ...section,
      setPolicy: { setTypes, includeWarmups: next },
    });
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

  const addSubject = () => {
    onChange({ ...section, children: [...section.children, emptySubject()] });
  };

  const addBreakdown = () => {
    onChange({ ...section, children: [...section.children, emptyBreakdown()] });
  };

  const scopeN = nestScopeCount(section);
  const scopeLabel = scopeN > 0 ? `Nest scope · ${scopeN}` : 'Nest scope';
  const policyN = setPolicyCount(section);
  const policyLabel = policyN > 0 ? `Set policy · ${policyN}` : 'Set policy';

  const subjectCount = section.children.filter((c) => !isBreakdown(c)).length;

  return (
    <QbLayer
      layer="section"
      title={<Text style={styles.sectionTitle}>Section</Text>}
      metaChips={scopeN + policyN > 0 ? [scopeLabel, policyLabel] : undefined}
      locked={locked}
      onToggleLock={canToggle || forcedByAncestor ? toggle : undefined}
      lockDisabled={forcedByAncestor}
    >
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

      <View style={styles.children}>
        {section.children.map((child, index) =>
          isBreakdown(child) ? (
            <QbBreakdownCard
              key={child.id}
              breakdown={child}
              parentLockId={QB_SECTION_ID}
              results={results}
              primaryGroups={primaryGroups}
              onPrimaryGroupsChange={onPrimaryGroupsChange}
              variations={variations}
              onVariationsChange={onVariationsChange}
              tools={tools}
              onToolsChange={onToolsChange}
              suggestedByPg={suggestedByPg}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
            />
          ) : (
            <QbSubjectCard
              key={child.id}
              subject={child}
              parentLockId={QB_SECTION_ID}
              result={results[child.id] ?? null}
              primaryGroups={primaryGroups}
              onPrimaryGroupsChange={onPrimaryGroupsChange}
              variations={variations}
              onVariationsChange={onVariationsChange}
              tools={tools}
              onToolsChange={onToolsChange}
              suggestedIds={child.pgId ? suggestedByPg[child.pgId] ?? [] : []}
              onChange={(next) => updateChild(index, { ...next, kind: 'subject' })}
              onRemove={() => removeChild(index)}
              canRemove={subjectCount > 1}
            />
          ),
        )}

        {locked ? null : (
          <>
            <QbAddChildButton
              childKind="subject"
              parentTitle="Section"
              onPress={addSubject}
            />
            <QbAddChildButton
              childKind="breakdown"
              parentTitle="Section"
              onPress={addBreakdown}
            />
          </>
        )}
      </View>
    </QbLayer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
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
  children: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
