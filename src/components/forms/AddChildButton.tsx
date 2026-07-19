import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { FormArrow } from './FormArrow';
import { addLayerButtonColors, type FormNodeKind } from './formTokens';

type Props = {
  childKind: FormNodeKind;
  parentTitle: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Add action with explicit destination context.
 * Three equal bands: action (left) · arrow (center) · destination (left-aligned
 * in the right band) so arrows stack vertically across sibling buttons.
 */
export function AddChildButton({
  childKind,
  parentTitle,
  onPress,
  style,
}: Props) {
  const token = addLayerButtonColors(childKind);
  const childLabel = childKind === 'cluster' ? 'sequence' : childKind;

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
