import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import {
  dateKeyToDayjs,
  formatSessionDateLabel,
  shiftDateKey,
  todayDateKey,
} from '../../lib/localTime';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  value: string;
  onChange: (dateKey: string) => void;
  /** Sheet eyebrow; defaults to "Session date". */
  eyebrow?: string;
  /** Stretch trigger to parent width (Insights date fields). */
  fill?: boolean;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * Session log date control — same visual height as the Tools trigger.
 * Shows "Monday, May 5, 2026"; tap opens a month grid for back-dating.
 * Future dates are not selectable.
 */
export function SessionDateControl({
  value,
  onChange,
  eyebrow = 'Session date',
  fill = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [cursorMonth, setCursorMonth] = useState(() =>
    dateKeyToDayjs(value).startOf('month'),
  );

  const today = todayDateKey();
  const label = formatSessionDateLabel(value);
  const isToday = value === today;
  const canGoNextMonth = cursorMonth.isBefore(
    dayjs(today).startOf('month'),
    'month',
  );
  const setDate = (dateKey: string) => {
    if (dateKey > today) return;
    onChange(dateKey);
  };

  const days = useMemo(() => {
    const start = cursorMonth.startOf('month');
    const mondayOffset = (start.day() + 6) % 7;
    const gridStart = start.subtract(mondayOffset, 'day');
    return Array.from({ length: 42 }, (_, i) => {
      const day = gridStart.add(i, 'day');
      const key = day.format('YYYY-MM-DD');
      return {
        key,
        date: day.date(),
        inMonth: day.month() === cursorMonth.month(),
        isSelected: key === value,
        isToday: key === today,
        isFuture: key > today,
      };
    });
  }, [cursorMonth, value, today]);

  const openPicker = () => {
    setCursorMonth(dateKeyToDayjs(value).startOf('month'));
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`Session date ${label}. Tap to change.`}
        style={({ pressed }) => [
          styles.trigger,
          fill && styles.triggerFill,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet} accessibilityRole="summary">
            <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
            <Text style={styles.sheetTitle}>{label}</Text>

            <View style={styles.monthNav}>
              <Pressable
                onPress={() => setCursorMonth((m) => m.subtract(1, 'month'))}
                accessibilityLabel="Previous month"
                style={({ pressed }) => [
                  styles.navBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.navGlyph}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {cursorMonth.format('MMMM YYYY')}
              </Text>
              <Pressable
                onPress={() => {
                  if (!canGoNextMonth) return;
                  setCursorMonth((m) => m.add(1, 'month'));
                }}
                disabled={!canGoNextMonth}
                accessibilityLabel="Next month"
                style={({ pressed }) => [
                  styles.navBtn,
                  !canGoNextMonth && styles.navBtnDisabled,
                  pressed && canGoNextMonth && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.navGlyph,
                    !canGoNextMonth && styles.navGlyphDisabled,
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d, i) => (
                <Text key={`${d}-${i}`} style={styles.weekday}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {days.map((day) => (
                <Pressable
                  key={day.key}
                  onPress={() => {
                    if (day.isFuture) return;
                    setDate(day.key);
                    setOpen(false);
                  }}
                  disabled={day.isFuture}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: day.isSelected,
                    disabled: day.isFuture,
                  }}
                  style={({ pressed }) => [
                    styles.dayCell,
                    day.isSelected && styles.daySelected,
                    day.isToday && !day.isSelected && styles.dayToday,
                    day.isFuture && styles.dayFuture,
                    pressed && !day.isFuture && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      (!day.inMonth || day.isFuture) && styles.dayMuted,
                      day.isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day.date}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => {
                  setDate(shiftDateKey(value, -1));
                }}
                style={({ pressed }) => [
                  styles.quickBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.quickLabel}>← Day</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDate(today);
                  setCursorMonth(dayjs().startOf('month'));
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.quickBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.quickLabel}>Today</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (isToday) return;
                  setDate(shiftDateKey(value, 1));
                }}
                disabled={isToday}
                style={({ pressed }) => [
                  styles.quickBtn,
                  isToday && styles.quickBtnDisabled,
                  pressed && !isToday && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.quickLabel,
                    isToday && styles.quickLabelDisabled,
                  ]}
                >
                  Day →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '72%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
  },
  triggerFill: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.8,
  },
  triggerLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.textMuted,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetEyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  sheetTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navGlyph: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.text,
    lineHeight: 26,
  },
  navGlyphDisabled: {
    color: colors.textDim,
  },
  monthLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    color: colors.textDim,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  daySelected: {
    backgroundColor: colors.sunrise,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.sunrise,
  },
  dayFuture: {
    opacity: 0.35,
  },
  dayText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.text,
  },
  dayMuted: {
    color: colors.textDim,
  },
  dayTextSelected: {
    color: colors.onPrimary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
  },
  quickBtnDisabled: {
    opacity: 0.35,
  },
  quickLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  quickLabelDisabled: {
    color: colors.textDim,
  },
});
