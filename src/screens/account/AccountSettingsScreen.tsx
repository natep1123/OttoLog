import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onDangerZone: () => void;
};

/**
 * Account → Settings hub.
 * Profile / Preferences are placeholders; Danger zone holds destructive actions.
 */
export function AccountSettingsScreen({
  onBrandPress,
  onBack,
  onDangerZone,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Settings"
        subtitle="Profile, preferences, and account actions."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Profile"
          body="Edit username and email."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Preferences"
          body="Units, defaults, and display options."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Danger zone"
          body="Permanent account actions."
          onPress={onDangerZone}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
});
