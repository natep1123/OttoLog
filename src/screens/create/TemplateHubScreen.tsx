import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onExercise: () => void;
  onCluster: () => void;
  onBlock: () => void;
  onSession: () => void;
};

export function TemplateHubScreen({
  onBrandPress,
  onBack,
  onExercise,
  onCluster,
  onBlock,
  onSession,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Templates"
        subtitle="Pick a layer to build."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Session"
          body="Full session tree of blocks and sequences."
          onPress={onSession}
        />
        <HubAction
          title="Block"
          body="Ordered exercises and sequences."
          onPress={onBlock}
        />
        <HubAction
          title="Sequence"
          body="Superset or circuit with nested exercises."
          onPress={onCluster}
        />
        <HubAction
          title="Exercise"
          body="Name, tool, target shape, and sets."
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
