import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mainTabs, MainTab } from '../navigation/tabs';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
};

/** Simple custom bottom nav for the first shell pass. */
export function BottomNav({ activeTab, onChangeTab }: Props) {
  return (
    <View style={styles.shell}>
      {mainTabs.map((tab) => {
        const active = tab.key === activeTab;
        const color = active ? colors.sunrise : colors.textDim;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChangeTab(tab.key)}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={styles.iconWrap}>
              {active ? <View style={styles.spotlight} /> : null}
              <Feather name={tab.icon} size={22} color={color} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SPOTLIGHT_SIZE = 40;

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Overall bar height — lower this to shrink the whole nav
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    // Vertical padding inside the bar shell
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Space between icon block and the label beneath it
    gap: 2,
  },
  itemPressed: {
    opacity: 0.82,
  },
  // Hit area + spotlight circle around the 24px icon
  iconWrap: {
    width: SPOTLIGHT_SIZE,
    height: SPOTLIGHT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soft amber glow centered on the active icon
  spotlight: {
    position: 'absolute',
    width: SPOTLIGHT_SIZE,
    height: SPOTLIGHT_SIZE,
    borderRadius: SPOTLIGHT_SIZE / 2,
    backgroundColor: 'rgba(255, 154, 90, 0.14)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  label: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  labelActive: {
    color: colors.sunrise,
  },
});
