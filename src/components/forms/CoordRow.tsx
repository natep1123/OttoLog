import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

type Props = {
  meta?: string;
  coord?: string | null;
  onCoordPress?: () => void;
};

/** Coord meta + chip — chip opens address compass when nested. */
export function CoordRow({ meta, coord, onCoordPress }: Props) {
  if (!meta && !coord) return null;

  return (
    <View style={styles.row}>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {coord ? (
        <Pressable
          onPress={onCoordPress}
          disabled={!onCoordPress}
          style={({ pressed }) => [
            styles.chip,
            pressed && onCoordPress && styles.chipPressed,
            !onCoordPress && styles.chipStatic,
          ]}
        >
          <Text style={styles.chipText}>{coord}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  meta: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  chipPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  chipStatic: {
    opacity: 0.9,
  },
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.sunrise,
  },
});
