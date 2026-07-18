import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onTemplates: () => void;
  onLogs: () => void;
};

/** Library hub — browse saved templates or logged sessions. */
export function LibraryHubScreen({
  onBrandPress,
  onTemplates,
  onLogs,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Library"
        subtitle="Saved templates and past logs."
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Templates"
          body="Exercise, cluster, block, and session blueprints."
          onPress={onTemplates}
        />
        <HubAction
          title="Logs"
          body="Browse recorded sessions."
          onPress={onLogs}
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
