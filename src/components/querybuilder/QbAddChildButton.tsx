import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { FormArrow } from '../forms/FormArrow';
import { qbAddButtonColors, qbMeasureColors } from './qbTokens';

/** What the add control creates. `measure` uses the amber Set-analog chip token. */
export type QbAddKind = 'breakdown' | 'subject' | 'measure';

const CHILD_LABEL: Record<QbAddKind, string> = {
  breakdown: 'Breakdown',
  subject: 'Subject',
  measure: 'Measure',
};

type Props = {
  childKind: QbAddKind;
  /** Destination context (parent title) shown on the right band. */
  parentTitle: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fork of `AddChildButton` (workout accents by depth). Three bands: action ·
 * arrow · destination, so arrows stack vertically across sibling add buttons.
 */
export function QbAddChildButton({
  childKind,
  parentTitle,
  onPress,
  style,
}: Props) {
  const token =
    childKind === 'measure'
      ? qbMeasureColors()
      : qbAddButtonColors(childKind === 'breakdown' ? 'breakdown' : 'subject');
  const childLabel = CHILD_LABEL[childKind];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        {
          borderColor: token.border,
          backgroundColor: colors.bgInset,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Add ${childLabel} to ${parentTitle}`}
    >
      <View style={styles.content}>
        <Text style={[styles.action, { color: token.label }]} numberOfLines={1}>
          + Add {childLabel}
        </Text>
        <View style={styles.arrowSlot}>
          <FormArrow color={colors.textDim} />
        </View>
        <Text
          style={[styles.destination, { color: token.label, opacity: 0.62 }]}
          numberOfLines={1}
        >
          {parentTitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '92%',
    height: 32,
    alignSelf: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  content: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    textAlign: 'left',
  },
  arrowSlot: {
    width: 28,
    flexShrink: 0,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destination: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    textAlign: 'left',
  },
});
