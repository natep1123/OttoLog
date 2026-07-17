import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onExercises: () => void;
};

/** Library → Templates hub. Only Exercise is browsable for now. */
export function LibraryTemplatesHubScreen({
  onBrandPress,
  onBack,
  onExercises,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Templates"
        subtitle="Pick a layer to manage. Only Exercise is live for now."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Session"
          body="Full session tree blueprints."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Block"
          body="Reusable block blobs."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Cluster"
          body="Superset or circuit blueprints."
          onPress={() => {}}
          disabled
          badge="Soon"
        />
        <HubAction
          title="Exercise"
          body="Open, edit, or delete your saved exercise templates."
          onPress={onExercises}
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
