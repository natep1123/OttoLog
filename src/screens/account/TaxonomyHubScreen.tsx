import { StyleSheet, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { TaxonomyKind } from '../../lib/taxonomy';
import { spacing } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
  onOpenList: (kind: TaxonomyKind) => void;
};

/** Taxonomy hub — three vocabulary lists. Session categories come later. */
export function TaxonomyHubScreen({
  onBrandPress,
  onBack,
  onOpenList,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Taxonomy"
        subtitle="Rename, archive, or remove vocabulary used by templates."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />
      <View style={styles.actions}>
        <HubAction
          title="Tools"
          body="Equipment and implements. System “None” is locked."
          onPress={() => onOpenList('tool')}
        />
        <HubAction
          title="Primary groups"
          body="Singular analytics buckets for tracked exercises."
          onPress={() => onOpenList('primary_group')}
        />
        <HubAction
          title="Analytics tags"
          body="Optional filters linked to tracked exercises."
          onPress={() => onOpenList('analytics_tag')}
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
