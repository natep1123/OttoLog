import { StyleSheet, Text, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onLogFromScratch: () => void;
  onLogFromTemplate: () => void;
  onBuildTemplates: () => void;
};

export function CreateHubScreen({
  onBrandPress,
  onLogFromScratch,
  onLogFromTemplate,
  onBuildTemplates,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Create"
        subtitle="Log a workout or build reusable templates."
        onBrandPress={onBrandPress}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log a session</Text>
        <View style={styles.actions}>
          <HubAction
            title="From scratch"
            body="Empty session with one block and one exercise."
            onPress={onLogFromScratch}
          />
          <HubAction
            title="From template"
            body="Start a log from one of your templates."
            onPress={onLogFromTemplate}
          />
          <HubAction
            title="AI-assisted"
            body="Describe the workout and AI will draft the log."
            onPress={() => {}}
            disabled
            badge="Soon"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Templates</Text>
        <View style={styles.actions}>
          <HubAction
            title="Build templates"
            body="Exercises, sequences, blocks, and sessions."
            onPress={onBuildTemplates}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  actions: {
    gap: spacing.sm,
  },
});
