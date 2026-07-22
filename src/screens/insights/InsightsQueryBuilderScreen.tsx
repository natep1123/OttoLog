import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack?: () => void;
};

const PLANNED: { title: string; body: string }[] = [
  {
    title: 'Nested query form',
    body: 'Build an ask the way you build a log or template: collapsing dropdowns, layer by layer, with madlib-style selectors for operations.',
  },
  {
    title: 'Lock per layer',
    body: 'Lock a dropdown to a grammar-condensed line, or expand it to edit. A preview modal shows the full locked outline.',
  },
  {
    title: 'Save and revisit',
    body: 'Save an ask like a template. Reopening shows the clean locked view of everything you chose, re-run against current data.',
  },
  {
    title: 'Per-exercise breakdown',
    body: 'Each exercise query splits into its modifiers, loads, and variations across the data, then a totals line.',
  },
];

/** Placeholder for the nested, savable Insights query builder (in progress). */
export function InsightsQueryBuilderScreen({ onBrandPress, onBack }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Query builder"
        subtitle="Nested, savable analytics. In progress."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <Text style={styles.lead}>
        The plan: mirror the log and template builders for querying your data.
        Author a readable ask, lock it into clean grammar, save it, and reopen it
        any time. For now this is a placeholder while it comes together.
      </Text>

      <View style={styles.list}>
        {PLANNED.map((item) => (
          <View key={item.title} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Use Dashboard for a quick look while this is built.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lead: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  cardTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  cardBody: {
    fontFamily: typography.font,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  footnote: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
  },
});
