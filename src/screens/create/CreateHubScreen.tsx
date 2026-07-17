import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBuildTemplates: () => void;
  onLogSession: () => void;
};

export function CreateHubScreen({
  onBrandPress,
  onBuildTemplates,
  onLogSession,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Create"
        subtitle="Build reusable templates or log a session."
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Build templates"
          body="Exercise, cluster, block, and session blueprints."
          onPress={onBuildTemplates}
        />
        <HubAction
          title="Log a session"
          body="Coming next — relational session logging."
          onPress={onLogSession}
          disabled
          badge="Soon"
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
