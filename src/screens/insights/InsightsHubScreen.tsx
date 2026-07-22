import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onDashboard: () => void;
  onQueryBuilder: () => void;
};

/** Insights hub — pick a way to read your training. */
export function InsightsHubScreen({
  onBrandPress,
  onDashboard,
  onQueryBuilder,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Insights"
        subtitle="Read your training. Pick a tool."
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Query builder"
          body="Nested, savable analytics — lock layers into clean grammar, reopen later. Same builder family as logs and templates."
          onPress={onQueryBuilder}
          badge="Building"
        />
        <HubAction
          title="Dashboard"
          body="Quick per-Primary-Group facets for a date window. Fast look — not saved."
          onPress={onDashboard}
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
