import { useEffect, useId, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DISTANCE_UNIT_CODES,
  LOAD_UNIT_CODES,
} from '../../constants/lockedAtoms';
import { fieldsForTargetShape } from '../../constants/targetShapeFields';
import type {
  DistanceUnitCode,
  ExerciseTarget,
  LoadUnitCode,
} from '../../types/exerciseTemplate';
import { emptyTarget } from '../../lib/exerciseTemplates';
import {
  compressTargets,
  expandTargetGroups,
  targetKey,
  totalSetsInGroups,
  type TargetGroup,
} from '../../lib/targetSummaries';
import {
  colors,
  radii,
  spacing,
  typography,
} from '../../theme/tokens';
import { AnalyticsCheckbox } from './AnalyticsCheckbox';
import { DecimalMetricInput } from './DecimalMetricInput';
import { FormArrow } from './FormArrow';
import { FormSelect } from './FormSelect';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type EditableGroup = TargetGroup & { id: string };

type Props = {
  targetShapeId: string;
  targets: ExerciseTarget[];
  trackAnalytics: boolean;
  /** Resolved exercise title shown as the add destination. */
  referenceTitle: string;
  /**
   * Replace the full expanded targets array (group edits expand immediately).
   */
  onChangeTargets: (next: ExerciseTarget[]) => void;
  /**
   * Sequence subitems: one prescription per round — Sets locked to 1,
   * no add/remove rows.
   */
  lockedSingle?: boolean;
};

function sameExpanded(
  a: ExerciseTarget[],
  b: ExerciseTarget[],
  targetShapeId: string,
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (t, i) => targetKey(t, targetShapeId) === targetKey(b[i]!, targetShapeId),
  );
}

function toEditable(
  groups: TargetGroup[],
  idPrefix: string,
): EditableGroup[] {
  return groups.map((g, i) => ({
    ...g,
    target: { ...g.target },
    id: `${idPrefix}-${i}`,
  }));
}

/**
 * Sets table edited as explicit rows/groups. The Sets column is a plain
 * multiplier box (e.g. 2 → 2× that prescription). Storage stays one expanded
 * row per set. Groups are kept in local state so identical prescriptions do
 * not merge when "+ Add sets" appends a new line.
 */
export function TargetsGrid({
  targetShapeId,
  targets,
  trackAnalytics,
  referenceTitle,
  onChangeTargets,
  lockedSingle = false,
}: Props) {
  const idPrefix = useId();
  const seq = useRef(0);
  const nextId = () => {
    seq.current += 1;
    return `${idPrefix}-g${seq.current}`;
  };

  const [groups, setGroups] = useState<EditableGroup[]>(() =>
    toEditable(
      lockedSingle
        ? [{ count: 1, target: targets[0] ?? emptyTarget(1) }]
        : compressTargets(targets, targetShapeId),
      idPrefix,
    ),
  );
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Re-sync from parent when targets change externally (template pick, shape
  // migrate). Skip when the parent is echoing our own expand.
  useEffect(() => {
    const localExpanded = expandTargetGroups(groupsRef.current);
    if (sameExpanded(localExpanded, targets, targetShapeId)) return;

    const next = lockedSingle
      ? [{ count: 1, target: targets[0] ?? emptyTarget(1) }]
      : compressTargets(targets, targetShapeId);
    const seeded = next.length
      ? next
      : [{ count: 1, target: emptyTarget(1) }];
    setGroups(
      seeded.map((g) => ({
        ...g,
        target: { ...g.target },
        id: nextId(),
      })),
    );
  }, [targets, targetShapeId, lockedSingle]);

  const fields = fieldsForTargetShape(targetShapeId);
  const totalSets = totalSetsInGroups(groups);

  const commit = (next: EditableGroup[]) => {
    const normalized = lockedSingle
      ? next.slice(0, 1).map((g) => ({ ...g, count: 1 }))
      : next;
    setGroups(normalized);
    onChangeTargets(expandTargetGroups(normalized));
  };

  const patchGroup = (
    groupIndex: number,
    patch: Partial<ExerciseTarget> & { count?: number },
  ) => {
    const current = groups[groupIndex];
    if (!current) return;
    const { count, ...targetPatch } = patch;
    const maxForRow = Math.max(1, 50 - (totalSets - current.count));
    commit(
      groups.map((g, i) => {
        if (i !== groupIndex) return g;
        return {
          ...g,
          count:
            count != null
              ? Math.max(1, Math.min(maxForRow, Math.floor(count) || 1))
              : g.count,
          target: { ...g.target, ...targetPatch },
        };
      }),
    );
  };

  const onChangeSetsText = (groupIndex: number, raw: string) => {
    const current = groups[groupIndex];
    if (!current) return;
    const maxForRow = Math.max(1, 50 - (totalSets - current.count));
    const n = Math.max(1, Math.min(maxForRow, Number.parseInt(raw, 10) || 1));
    patchGroup(groupIndex, { count: n });
  };

  const addSetsRow = () => {
    if (totalSets >= 50) return;
    const last = groups[groups.length - 1];
    commit([
      ...groups,
      {
        id: nextId(),
        count: 1,
        target: {
          ...emptyTarget(1),
          track_analytics: last?.target.track_analytics ?? null,
        },
      },
    ]);
  };

  const removeRow = (groupIndex: number) => {
    if (groups.length <= 1) {
      commit([
        {
          id: nextId(),
          count: 1,
          target: {
            ...emptyTarget(1),
            track_analytics: groups[0]?.target.track_analytics ?? null,
          },
        },
      ]);
      return;
    }
    commit(groups.filter((_, i) => i !== groupIndex));
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.viewport}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.table}>
          <View style={styles.head}>
            <View style={[styles.colSet, styles.headCell]}>
              <Text style={styles.th}>Sets</Text>
            </View>
            {fields.includes('time_duration') ? (
              <View style={[styles.colTime, styles.headCell]}>
                <Text style={styles.th}>Time</Text>
              </View>
            ) : null}
            {fields.includes('reps') ? (
              <View style={[styles.colReps, styles.headCell]}>
                <Text style={styles.th}>Reps</Text>
              </View>
            ) : null}
            {fields.includes('distance_value') ? (
              <View style={[styles.colDist, styles.headCell]}>
                <Text style={styles.th}>Distance</Text>
              </View>
            ) : null}
            <View style={[styles.colLoad, styles.headCell]}>
              <Text style={styles.th}>Load</Text>
            </View>
            {trackAnalytics ? (
              <View style={[styles.colAnalytics, styles.headCell]}>
                <Text style={styles.th}>Analytics</Text>
              </View>
            ) : null}
            {!lockedSingle ? (
              <View style={[styles.colRemove, styles.headCell]}>
                <Text style={styles.th}> </Text>
              </View>
            ) : null}
          </View>

          {fields.includes('time_duration') ? (
            <View style={styles.unitHead}>
              <View style={styles.colSet} />
              <View style={[styles.colTime, styles.unitHeadCell]}>
                <Text style={styles.timeUnitLabel}>HH</Text>
                <Text style={styles.timeUnitColon}>:</Text>
                <Text style={styles.timeUnitLabel}>MM</Text>
                <Text style={styles.timeUnitColon}>:</Text>
                <Text style={styles.timeUnitLabel}>SS</Text>
              </View>
              {fields.includes('reps') ? <View style={styles.colReps} /> : null}
              {fields.includes('distance_value') ? (
                <View style={styles.colDist} />
              ) : null}
              <View style={styles.colLoad} />
              {trackAnalytics ? <View style={styles.colAnalytics} /> : null}
              {!lockedSingle ? <View style={styles.colRemove} /> : null}
            </View>
          ) : null}

          {groups.map((group, groupIndex) => {
            const target = group.target;
            const excluded =
              trackAnalytics && target.track_analytics === false;
            return (
              <View
                key={group.id}
                style={[styles.row, excluded && styles.rowExcluded]}
              >
                <View style={styles.colSet}>
                  {lockedSingle ? (
                    <View
                      style={[styles.setsInput, styles.setsInputLocked]}
                      accessibilityLabel="One set per round (locked)"
                    >
                      <Text style={styles.setsLockedText}>1</Text>
                    </View>
                  ) : (
                    <TextInput
                      value={String(group.count)}
                      onChangeText={(raw) =>
                        onChangeSetsText(groupIndex, raw)
                      }
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={styles.setsInput}
                      accessibilityLabel={`Sets for row ${groupIndex + 1}`}
                    />
                  )}
                </View>

                {fields.includes('time_duration') ? (
                  <View style={styles.colTime}>
                    <TimePartsInput
                      value={target.time_duration}
                      onChange={(time_duration) =>
                        patchGroup(groupIndex, { time_duration })
                      }
                    />
                  </View>
                ) : null}

                {fields.includes('reps') ? (
                  <View style={[styles.repsCell, styles.colReps]}>
                    <TextInput
                      value={target.reps != null ? String(target.reps) : ''}
                      onChangeText={(v) =>
                        patchGroup(groupIndex, {
                          reps: v === '' ? null : Number.parseInt(v, 10) || 0,
                        })
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textDim}
                      style={styles.metric}
                    />
                    {fields.includes('is_per_side') ? (
                      <ToggleChip
                        size="compact"
                        label={target.is_per_side ? 'Reps/Side' : 'Reps'}
                        active={target.is_per_side}
                        onPress={() =>
                          patchGroup(groupIndex, {
                            is_per_side: !target.is_per_side,
                          })
                        }
                      />
                    ) : null}
                  </View>
                ) : null}

                {fields.includes('distance_value') ? (
                  <View style={[styles.distCell, styles.colDist]}>
                    <DecimalMetricInput
                      value={target.distance_value}
                      onChange={(distance_value) =>
                        patchGroup(groupIndex, { distance_value })
                      }
                      accessibilityLabel="Distance"
                    />
                    <FormSelect
                      compact
                      options={DISTANCE_UNIT_CODES.map((c) => ({
                        id: c,
                        label: c,
                      }))}
                      value={target.distance_unit}
                      onChange={(id) =>
                        patchGroup(groupIndex, {
                          distance_unit: id as DistanceUnitCode,
                        })
                      }
                      accessibilityLabel="Distance unit"
                    />
                  </View>
                ) : null}

                <View style={[styles.loadCell, styles.colLoad]}>
                  <TextInput
                    value={
                      target.load_value != null
                        ? String(target.load_value)
                        : ''
                    }
                    onChangeText={(v) =>
                      patchGroup(groupIndex, {
                        load_value:
                          v === '' ? null : Number.parseFloat(v) || 0,
                      })
                    }
                    keyboardType="decimal-pad"
                    placeholder="Load"
                    placeholderTextColor={colors.textDim}
                    editable={target.load_unit !== 'BW'}
                    style={[
                      styles.metric,
                      styles.loadValue,
                      target.load_unit === 'BW' && styles.metricDisabled,
                    ]}
                  />
                  <FormSelect
                    compact
                    options={LOAD_UNIT_CODES.map((c) => ({
                      id: c,
                      label: c,
                    }))}
                    value={target.load_unit}
                    onChange={(id) =>
                      patchGroup(groupIndex, {
                        load_unit: id as LoadUnitCode,
                        ...(id === 'BW' ? { load_value: null } : {}),
                      })
                    }
                    accessibilityLabel="Load unit"
                  />
                </View>

                {trackAnalytics ? (
                  <View style={styles.colAnalytics}>
                    <AnalyticsCheckbox
                      checked={target.track_analytics !== false}
                      onChange={(on) =>
                        patchGroup(groupIndex, { track_analytics: on })
                      }
                    />
                  </View>
                ) : null}

                {!lockedSingle ? (
                  <View style={styles.colRemove}>
                    <Pressable
                      onPress={() => removeRow(groupIndex)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove sets row ${groupIndex + 1}`}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && styles.removeBtnPressed,
                      ]}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {!lockedSingle ? (
        <View style={styles.footer}>
          <Text style={styles.footerMeta}>
            {totalSets} total {totalSets === 1 ? 'set' : 'sets'}
          </Text>
          <Pressable
            onPress={addSetsRow}
            disabled={totalSets >= 50}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
              totalSets >= 50 && styles.addBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Add sets to ${referenceTitle}`}
          >
            <View style={styles.addContent}>
              <Text style={styles.addText} numberOfLines={1}>
                + Add sets
              </Text>
              <View style={styles.addArrowSlot}>
                <FormArrow color={colors.textDim} />
              </View>
              <Text style={styles.addReference} numberOfLines={1}>
                {referenceTitle}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 2,
  },
  viewport: {
    width: '100%',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  table: {
    minWidth: '100%',
  },
  head: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  headCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  th: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textDim,
    textAlign: 'center',
  },
  unitHead: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -4,
  },
  unitHeadCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  timeUnitLabel: {
    width: 38,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.textDim,
  },
  timeUnitColon: {
    width: 7,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    color: colors.textDim,
    opacity: 0.35,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 5,
  },
  rowExcluded: {
    opacity: 0.45,
  },
  colSet: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  setsInput: {
    width: 44,
    textAlign: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  setsInputLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
    backgroundColor: colors.bgElevated,
    borderColor: 'rgba(255, 180, 120, 0.08)',
  },
  setsLockedText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.textDim,
  },
  colTime: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  colReps: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  colDist: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  colLoad: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  colAnalytics: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  colRemove: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repsCell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  distCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metric: {
    width: 52,
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  loadValue: {
    width: 64,
  },
  metricDisabled: {
    opacity: 0.35,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  removeBtnPressed: {
    opacity: 0.7,
  },
  removeText: {
    fontFamily: typography.fontMedium,
    fontSize: 18,
    color: colors.textDim,
  },
  footer: {
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  footerMeta: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textMuted,
  },
  addBtn: {
    width: '92%',
    height: 32,
    alignSelf: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.sunrise,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  addBtnPressed: {
    opacity: 0.82,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addContent: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addText: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
    textAlign: 'left',
  },
  addArrowSlot: {
    width: 28,
    flexShrink: 0,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReference: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
    opacity: 0.62,
    textAlign: 'left',
  },
});
