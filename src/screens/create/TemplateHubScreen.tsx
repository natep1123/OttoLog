import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onExercise: () => void;
};

export function TemplateHubScreen({ onBrandPress, onBack, onExercise }: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Templates"
        subtitle="Pick what to build. Only Exercise is live for now."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Session"
          body="Full session tree blueprint."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Block"
          body="Reusable block blob."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Cluster"
          body="Superset or circuit blueprint."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Exercise"
          body="Name, tool, target shape, sets — save to your library."
          onPress={onExercise}
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
