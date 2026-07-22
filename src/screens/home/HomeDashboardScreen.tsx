import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  greetingForLocalTime,
  localNow,
  localWeekDays,
} from '../../lib/localTime';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  name: string;
  onBuildSessionTemplate: () => void;
  onBrowseExercises: () => void;
  onManageTaxonomy: () => void;
  onBrandPress?: () => void;
};

/** Home dashboard: useful now, ready to evolve into session calendar later. */
export function HomeDashboardScreen({
  name,
  onBuildSessionTemplate,
  onBrowseExercises,
  onManageTaxonomy,
  onBrandPress,
}: Props) {
  const [now, setNow] = useState(() => localNow());

  // Keep greeting + “today” in sync with the device clock while Home is open.
  useEffect(() => {
    setNow(localNow());
    const id = setInterval(() => setNow(localNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = `${greetingForLocalTime(now)}, ${name}`;
  const week = localWeekDays(now);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Home"
        subtitle="What you're building and what's next."
        onBrandPress={onBrandPress}
      />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{greeting}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          <HubAction
            title="Build session template"
            body="Start a full-day session blueprint."
            onPress={onBuildSessionTemplate}
          />
          <HubAction
            title="Browse exercise library"
            body="Open saved exercise templates."
            onPress={onBrowseExercises}
          />
          <HubAction
            title="Manage taxonomy"
            body="Tools, primary groups, and variations."
            onPress={onManageTaxonomy}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Text style={styles.badge}>Soon</Text>
        </View>
        <View style={styles.weekCard}>
          <View style={styles.weekRow}>
            {week.map((day) => (
              <View
                key={day.key}
                style={[styles.dayPill, day.isToday && styles.dayPillToday]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    day.isToday && styles.dayLabelToday,
                  ]}
                >
                  {day.label}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    day.isToday && styles.dayDateToday,
                  ]}
                >
                  {day.date}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.weekHint}>Session logging will show up here.</Text>
        </View>
      </View>
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
  hero: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.pressedWash,
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 13,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  actions: {
    gap: spacing.sm,
  },
  badge: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  weekCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
  },
  weekRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  dayPillToday: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.amberGlow,
  },
  dayLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    color: colors.textDim,
  },
  dayLabelToday: {
    color: colors.sunrise,
  },
  dayDate: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  dayDateToday: {
    color: colors.text,
  },
  weekHint: {
    fontFamily: typography.font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
