import { ScrollView, StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { TaxonomyKind } from '../../lib/taxonomy';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onOpenList: (kind: TaxonomyKind) => void;
};

/** Taxonomy hub — template labels + analytics vocabulary. */
export function TaxonomyHubScreen({
  onBrandPress,
  onBack,
  onOpenList,
}: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Taxonomy"
        subtitle="Labels and vocabulary used by your templates."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Session labels"
          body="Strength, Cardio, Hybrid, and your own."
          onPress={() => onOpenList('session_label')}
        />
        <HubAction
          title="Block labels"
          body="Warmup, Main, Cooldown, and your own."
          onPress={() => onOpenList('block_label')}
        />
        <HubAction
          title="Sequence labels"
          body="Superset, Circuit, and your own."
          onPress={() => onOpenList('cluster_label')}
        />
        <HubAction
          title="Tools"
          body="Equipment used by exercises."
          onPress={() => onOpenList('tool')}
        />
        <HubAction
          title="Primary groups"
          body="Analytics groups for tracked exercises."
          onPress={() => onOpenList('primary_group')}
        />
        <HubAction
          title="Variations"
          body="Modifiers for tracked exercises (grip, style, discipline)."
          onPress={() => onOpenList('analytics_tag')}
        />
        <HubAction
          title="Muscle groups"
          body="Optional anatomy for tracked exercises."
          onPress={() => onOpenList('muscle_group')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  actions: {
    gap: spacing.sm,
  },
});
