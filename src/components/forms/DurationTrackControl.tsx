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

/** Must equal labelRow height + pickerCol gap so the toggle lines up with the boxes. */
const LABEL_ALIGN_SPACER = 11 + 4;

/**
 * More-panel duration toggle + hh:mm:ss picker.
 *
 * Hard rules (do not regress):
 * - Never use absolute positioning for unit labels.
 * - Root is flexShrink: 0 so Name/Brief above cannot be crushed.
 * - When on, a spacer above the toggle matches the label block so the chip
 *   aligns with the input boxes (not the HH/MM/SS headers).
 * - When off, no spacer — toggle sits flush under Name/Brief.
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
          {tracked ? <View style={styles.labelAlignSpacer} /> : null}
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
        ) : null}
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
  labelAlignSpacer: {
    height: LABEL_ALIGN_SPACER,
  },
  pickerCol: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  },
  labelRow: {
    height: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  unitLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 9,
    lineHeight: 11,
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
    lineHeight: 11,
    color: colors.textDim,
    opacity: 0.35,
  },
});
