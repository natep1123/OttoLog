import {
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
import { colors, radii, typography } from '../../theme/tokens';
import { AnalyticsCheckbox } from './AnalyticsCheckbox';
import { DecimalMetricInput } from './DecimalMetricInput';
import { FormSelect } from './FormSelect';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  targetShapeId: string;
  targets: ExerciseTarget[];
  trackAnalytics: boolean;
  onChangeTarget: (index: number, patch: Partial<ExerciseTarget>) => void;
};

/**
 * Prototype sets table — horizontal scroll on narrow screens,
 * columns driven by target shape. Dropdowns overlay (FormSelect Modal).
 */
export function TargetsGrid({
  targetShapeId,
  targets,
  trackAnalytics,
  onChangeTarget,
}: Props) {
  const fields = fieldsForTargetShape(targetShapeId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <View style={styles.head}>
          <View style={[styles.colSet, styles.headCell]}>
            <Text style={styles.th}>Set</Text>
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
          </View>
        ) : null}

        {targets.map((target, index) => {
          const excluded =
            trackAnalytics && target.track_analytics === false;
          return (
            <View
              key={`set-${target.set}`}
              style={[styles.row, excluded && styles.rowExcluded]}
            >
              <Text style={[styles.setNum, styles.colSet]}>{target.set}</Text>

              {fields.includes('time_duration') ? (
                <View style={styles.colTime}>
                  <TimePartsInput
                    value={target.time_duration}
                    onChange={(time_duration) =>
                      onChangeTarget(index, { time_duration })
                    }
                  />
                </View>
              ) : null}

              {fields.includes('reps') ? (
                <View style={[styles.repsCell, styles.colReps]}>
                  <TextInput
                    value={target.reps != null ? String(target.reps) : ''}
                    onChangeText={(v) =>
                      onChangeTarget(index, {
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
                        onChangeTarget(index, {
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
                      onChangeTarget(index, { distance_value })
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
                      onChangeTarget(index, {
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
                    target.load_value != null ? String(target.load_value) : ''
                  }
                  onChangeText={(v) =>
                    onChangeTarget(index, {
                      load_value: v === '' ? null : Number.parseFloat(v) || 0,
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
                  options={LOAD_UNIT_CODES.map((c) => ({ id: c, label: c }))}
                  value={target.load_unit}
                  onChange={(id) =>
                    onChangeTarget(index, {
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
                      onChangeTarget(index, { track_analytics: on })
                    }
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  rowExcluded: {
    opacity: 0.45,
  },
  setNum: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  colSet: { width: 28, alignItems: 'center', justifyContent: 'center' },
  colTime: { width: 148, paddingHorizontal: 4, alignItems: 'center' },
  colReps: { minWidth: 128, paddingHorizontal: 4, alignItems: 'center' },
  colDist: { minWidth: 148, paddingHorizontal: 4, alignItems: 'center' },
  colLoad: { minWidth: 148, paddingHorizontal: 4, alignItems: 'center' },
  colAnalytics: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
});
