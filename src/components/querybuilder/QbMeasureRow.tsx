import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { ToggleChip } from '../forms/ToggleChip';
import { qbMeasureChip } from './qbTokens';
import { measureToken, type MeasureResult } from './engine';
import {
  defaultOpForField,
  type MeasureField,
  type MeasureNode,
  type MeasureOp,
} from './types';

const OPS: MeasureOp[] = ['sum', 'avg', 'max', 'min', 'count'];
const FIELDS: MeasureField[] = ['reps', 'time', 'distance', 'load', 'sets'];

const FIELD_LABEL: Record<MeasureField, string> = {
  reps: 'Reps',
  time: 'Time',
  distance: 'Distance',
  load: 'Load',
  sets: 'Sets',
};

const OP_LABEL: Record<MeasureOp, string> = {
  sum: 'Sum',
  avg: 'Avg',
  max: 'Max',
  min: 'Min',
  count: 'Count',
};

const measureAccent = {
  color: qbMeasureChip.color,
  border: qbMeasureChip.border,
  background: qbMeasureChip.background,
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
 * Measure leaf — op × field. The home of operations. Renders a set-chip value
 * token once a field is chosen and data exists; a placeholder before that.
 * NULL discipline: no fake zero — shows an empty note instead.
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
  const token = result ? measureToken(result) : null;
  const isCount = measure.op === 'count' || measure.field === 'sets';

  const pickField = (field: MeasureField) => {
    // Smart-default op on first field pick (or when switching to/from sets).
    const nextOp =
      measure.field == null || field === 'sets' || measure.field === 'sets'
        ? defaultOpForField(field)
        : measure.op;
    onChange({ ...measure, field, op: nextOp });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.leafBullet}>◦</Text>
        {token ? (
          <View style={styles.token}>
            <Text style={styles.tokenText} numberOfLines={1}>
              {token}
            </Text>
          </View>
        ) : measure.field == null ? (
          <Text style={styles.placeholder}>Pick op × field</Text>
        ) : (
          <Text style={styles.placeholder}>No sets logged this in-window</Text>
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

      <View style={styles.pickerBlock}>
        <Text style={styles.fieldLabel}>Field</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {fields.map((f) => (
            <ToggleChip
              key={f}
              label={FIELD_LABEL[f]}
              active={measure.field === f}
              onPress={() => pickField(f)}
              size="compact"
              accent={measureAccent}
            />
          ))}
        </ScrollView>
      </View>

      {measure.field != null && measure.field !== 'sets' ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.fieldLabel}>Operation</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps="handled"
          >
            {OPS.map((op) => (
              <ToggleChip
                key={op}
                label={OP_LABEL[op]}
                active={isCount ? op === 'count' : measure.op === op}
                onPress={() => onChange({ ...measure, op })}
                size="compact"
                accent={measureAccent}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    paddingVertical: 6,
  },
  headerRow: {
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
  token: {
    flexShrink: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    borderColor: qbMeasureChip.border,
    backgroundColor: qbMeasureChip.background,
  },
  tokenText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: qbMeasureChip.color,
  },
  placeholder: {
    flex: 1,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
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
  pickerBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
});
