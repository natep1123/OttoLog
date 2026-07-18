import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onExercises: () => void;
  onClusters: () => void;
  onBlocks: () => void;
  onSessions: () => void;
};

/** Library → Templates hub. */
export function LibraryTemplatesHubScreen({
  onBrandPress,
  onBack,
  onExercises,
  onClusters,
  onBlocks,
  onSessions,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Templates"
        subtitle="Pick a layer to browse."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Session"
          body="Full session tree of blocks and clusters."
          onPress={onSessions}
        />
        <HubAction
          title="Block"
          body="Ordered exercises and clusters."
          onPress={onBlocks}
        />
        <HubAction
          title="Cluster"
          body="Superset or circuit with nested exercises."
          onPress={onClusters}
        />
        <HubAction
          title="Exercise"
          body="Name, tool, target shape, and sets."
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
