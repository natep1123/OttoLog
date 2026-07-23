import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * Measure leaf — op × field, as one **chip sentence** (`sum | time`). Each
 * half is its own **dropdown** (pick op / pick field), not a tap-to-cycle
 * word — a small anchored menu (`FormSelect`/`SearchableSelect` DNA) opens
 * below the tapped half. `count` and `field:'sets'` are the same state (op
 * dropdown disables and shows `count`). No field yet → a dashed "+ Pick a
 * measure" chip that seeds the first available field. NULL discipline: a
 * muted note, never a fake zero.
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

  /** Direct field pick — mirrors the old cycle's op-pairing rules. */
  const selectField = (nextField: MeasureField) => {
    const nextOp =
      nextField === 'sets'
        ? 'count'
        : measure.field === 'sets'
          ? defaultOpForField(nextField)
          : measure.op;
    onChange({ ...measure, field: nextField, op: nextOp });
  };

  /** Direct op pick — choosing `count` forces field to `sets` (same state). */
  const selectOp = (nextOp: MeasureOp) => {
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
            <ChipDropdown
              value={isCount ? 'count' : measure.op}
              options={OPS.map((op) => ({ value: op, label: OP_WORD[op] }))}
              disabled={isCount}
              onChange={selectOp}
              accessibilityLabel={`Change operation — currently ${
                isCount ? 'count' : OP_WORD[measure.op]
              }`}
            />
            <View style={styles.chipDivider} />
            <ChipDropdown
              value={isCount ? 'sets' : (measure.field as MeasureField)}
              options={fields.map((f) => ({ value: f, label: FIELD_WORD[f] }))}
              onChange={selectField}
              accessibilityLabel={`Change field — currently ${
                isCount ? 'sets' : FIELD_WORD[measure.field as MeasureField]
              }`}
            />
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

type ChipDropdownOption<T extends string> = { value: T; label: string };

type ChipDropdownProps<T extends string> = {
  value: T;
  options: ChipDropdownOption<T>[];
  disabled?: boolean;
  accessibilityLabel: string;
  onChange: (value: T) => void;
};

/**
 * One dropdown half of the `op | field` chip. Anchored `Modal` menu (same
 * measure-in-window pattern as `FormSelect` / `SearchableSelect`) so opening
 * never reflows the madlib layout.
 */
function ChipDropdown<T extends string>({
  value,
  options,
  disabled = false,
  accessibilityLabel,
  onChange,
}: ChipDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const anchorRef = useRef<View>(null);

  const openMenu = () => {
    if (disabled) return;
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };
  const close = () => setOpen(false);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.chipSegment,
            pressed && !disabled && styles.chipSegmentPressed,
          ]}
        >
          <Text
            style={[styles.chipText, disabled && styles.chipTextDim]}
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
          {!disabled ? <Text style={styles.chipCaret}>▾</Text> : null}
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View
            style={[
              styles.menu,
              {
                top: anchor.y + anchor.h + 4,
                left: anchor.x,
                minWidth: Math.max(anchor.w, 108),
              },
            ]}
          >
            {options.map((opt) => {
              const isOn = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    close();
                  }}
                  style={[styles.menuOption, isOn && styles.menuOptionOn]}
                >
                  <Text
                    style={[styles.menuOptionText, isOn && styles.menuOptionTextOn]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 9,
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
  chipCaret: {
    fontFamily: typography.font,
    fontSize: 9,
    color: qbMeasureChip.color,
    opacity: 0.7,
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
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuOptionOn: {
    backgroundColor: colors.amberGlow,
  },
  menuOptionText: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.textMuted,
  },
  menuOptionTextOn: {
    fontFamily: typography.fontMedium,
    color: colors.text,
  },
});
