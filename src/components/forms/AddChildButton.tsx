import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';
import { addLayerButtonColors, type FormNodeKind } from './formTokens';

type Props = {
  childKind: FormNodeKind;
  parentTitle: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Add action with explicit destination context for nested builders. */
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
        <Text style={[styles.action, { color: token.label }]}>
          + Add {childLabel}
        </Text>
        <Text style={styles.arrow}>→</Text>
        <Text
          style={[
            styles.destination,
            { color: token.label, opacity: 0.62 },
          ]}
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
    gap: 4,
  },
  action: {
    width: 104,
    flexShrink: 0,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    textAlign: 'left',
  },
  arrow: {
    width: 16,
    flexShrink: 0,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  destination: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    textAlign: 'left',
  },
});
