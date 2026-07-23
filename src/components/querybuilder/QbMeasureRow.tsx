import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { qbMeasureChip } from './qbTokens';
import { type MeasureResult } from './engine';
import {
  defaultOpForField,
  type MeasureField,
  type MeasureNode,
  type MeasureOp,
} from './types';

const OPS: MeasureOp[] = ['sum', 'avg', 'max', 'min', 'count'];
const FIELDS: MeasureField[] = ['reps', 'time', 'distance', 'load', 'sets'];

const OP_WORD: Record<MeasureOp, string> = {
  sum: 'sum',
  avg: 'avg',
  max: 'max',
  min: 'min',
  count: 'count',
};

const FIELD_WORD: Record<MeasureField, string> = {
  reps: 'reps',
  time: 'time',
  distance: 'distance',
  load: 'load',
  sets: 'sets',
};

type Props = {
  measure: MeasureNode;
  result: MeasureResult | null;
  /** Fields the Subject actually logged in-window (falls back to all). */
  availableFields?: MeasureField[];
  onChange: (next: MeasureNode) => void;
  onRemove: () => void;
  canRemove: boolean;
};

/**
 * Measure leaf — op × field, as one **chip sentence** (`sum reps`), not a
 * Field/Op grid. Tap the left word to cycle the operation, the right word to
 * cycle the field. `count` and `field:'sets'` are the same state (field
 * selector moot) — shown as `count · sets`. No field yet → a dashed
 * "+ Pick a measure" chip that seeds the first available field. NULL
 * discipline: a muted note, never a fake zero.
 */
export function QbMeasureRow({
  measure,
  result,
  availableFields,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const fields = availableFields && availableFields.length ? availableFields : FIELDS;
  const hasField = measure.field != null;
  const isCount = measure.field === 'sets' || measure.op === 'count';
  const noData = hasField && result != null && result.value == null;

  const initMeasure = () => {
    const first = fields[0];
    onChange({ ...measure, field: first, op: defaultOpForField(first) });
  };

  const cycleField = () => {
    if (!hasField) {
      initMeasure();
      return;
    }
    const idx = fields.indexOf(measure.field as MeasureField);
    const nextField = fields[(idx + 1) % fields.length];
    const nextOp =
      nextField === 'sets'
        ? 'count'
        : measure.field === 'sets'
          ? defaultOpForField(nextField)
          : measure.op;
    onChange({ ...measure, field: nextField, op: nextOp });
  };

  const cycleOp = () => {
    if (!hasField || isCount) return;
    const idx = OPS.indexOf(measure.op);
    const nextOp = OPS[(idx + 1) % OPS.length];
    const nextField = nextOp === 'count' ? 'sets' : measure.field;
    onChange({ ...measure, op: nextOp, field: nextField });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.leafBullet}>◦</Text>

        {!hasField ? (
          <Pressable
            onPress={initMeasure}
            accessibilityRole="button"
            accessibilityLabel="Pick a measure"
            style={({ pressed }) => [styles.addChip, pressed && styles.pressed]}
          >
            <Text style={styles.addChipText}>+ Pick a measure</Text>
          </Pressable>
        ) : (
          <View style={styles.chip}>
            <Pressable
              onPress={cycleOp}
              disabled={isCount}
              accessibilityRole="button"
              accessibilityLabel={`Change operation — currently ${
                isCount ? 'count' : OP_WORD[measure.op]
              }`}
              style={({ pressed }) => [
                styles.chipSegment,
                pressed && !isCount && styles.chipSegmentPressed,
              ]}
            >
              <Text style={[styles.chipText, isCount && styles.chipTextDim]}>
                {isCount ? 'count' : OP_WORD[measure.op]}
              </Text>
            </Pressable>
            <View style={styles.chipDivider} />
            <Pressable
              onPress={cycleField}
              accessibilityRole="button"
              accessibilityLabel={`Change field — currently ${
                isCount ? 'sets' : FIELD_WORD[measure.field as MeasureField]
              }`}
              style={({ pressed }) => [
                styles.chipSegment,
                pressed && styles.chipSegmentPressed,
              ]}
            >
              <Text style={styles.chipText}>
                {isCount ? 'sets' : FIELD_WORD[measure.field as MeasureField]}
              </Text>
            </Pressable>
          </View>
        )}

        {canRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel="Remove measure"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {noData ? (
        <Text style={styles.noData}>No sets logged this in-window</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leafBullet: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: qbMeasureChip.color,
    width: 14,
    textAlign: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.sm,
    borderColor: qbMeasureChip.border,
    backgroundColor: qbMeasureChip.background,
    overflow: 'hidden',
  },
  chipSegment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipSegmentPressed: {
    opacity: 0.7,
  },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: qbMeasureChip.border,
  },
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: qbMeasureChip.color,
  },
  chipTextDim: {
    opacity: 0.55,
  },
  addChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: qbMeasureChip.border,
    borderRadius: radii.sm,
  },
  addChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: qbMeasureChip.color,
  },
  noData: {
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.textDim,
    marginLeft: 22,
  },
  removeBtn: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeText: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  pressed: {
    opacity: 0.7,
  },
});
