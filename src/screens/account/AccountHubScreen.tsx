import { StyleSheet, Text, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  username: string;
  email: string;
  onBrandPress?: () => void;
  onTaxonomy: () => void;
  onSettings: () => void;
};

/** Account hub — profile overview + management entry points. */
export function AccountHubScreen({
  username,
  email,
  onBrandPress,
  onTaxonomy,
  onSettings,
}: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Account"
        subtitle="Your profile and account tools."
        onBrandPress={onBrandPress}
      />

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{username || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{email || '—'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <HubAction
          title="Taxonomy"
          body="Tools, primary groups, and analytics tags."
          onPress={onTaxonomy}
        />
        <HubAction
          title="Settings"
          body="Profile, preferences, and account actions."
          onPress={onSettings}
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
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    gap: 4,
  },
  rowLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  rowValue: {
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actions: {
    gap: spacing.sm,
  },
});
