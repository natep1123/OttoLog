import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme/tokens';
import { TimePartsInput } from './TimePartsInput';
import { ToggleChip } from './ToggleChip';

type Props = {
  tracked: boolean;
  duration: string | null;
  onToggle: () => void;
  onChangeDuration: (next: string | null) => void;
};

/** HH/MM/SS label line + gap above the time boxes. */
const LABEL_BLOCK = 15;

/**
 * More-panel duration toggle + hh:mm:ss picker.
 *
 * Hard rules (do not regress):
 * - Never use absolute positioning for unit labels.
 * - Root is flexShrink: 0 so Name/Brief above cannot be crushed.
 * - Labels are in-flow via TimePartsInput when tracked; an equivalent spacer
 *   is reserved when off so enabling duration does not jump the toggle up.
 * - Toggle aligns to the input boxes (flex-end), not the labels.
 */
export function DurationTrackControl({
  tracked,
  duration,
  onToggle,
  onChangeDuration,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.toggleCol}>
          <View style={styles.labelSpacer} />
          <ToggleChip
            label={tracked ? 'Duration on' : 'Track duration'}
            active={tracked}
            onPress={onToggle}
          />
        </View>

        {tracked ? (
          <View style={styles.pickerCol}>
            <View style={styles.labelRow} pointerEvents="none">
              <Text style={[styles.unitLabel, styles.unitSlot]}>HH</Text>
              <Text style={styles.unitColon}>:</Text>
              <Text style={[styles.unitLabel, styles.unitSlot]}>MM</Text>
              <Text style={styles.unitColon}>:</Text>
              <Text style={[styles.unitLabel, styles.unitSlot]}>SS</Text>
            </View>
            <TimePartsInput
              value={duration}
              onChange={onChangeDuration}
              emptyAsNull={false}
            />
          </View>
        ) : (
          <View style={styles.labelSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 10,
  },
  toggleCol: {
    flexGrow: 0,
    flexShrink: 0,
  },
  pickerCol: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 6,
  },
  labelSpacer: {
    height: LABEL_BLOCK,
  },
  labelRow: {
    height: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  unitLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.textDim,
    textAlign: 'center',
  },
  unitSlot: {
    width: 38,
  },
  unitColon: {
    width: 7,
    textAlign: 'center',
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    color: colors.textDim,
    opacity: 0.35,
  },
});
