import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HubAction } from '../../components/HubAction';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TARGET_SHAPE_LABELS } from '../../constants/targetShapeFields';
import {
  greetingForLocalTime,
  localNow,
  localWeekDays,
} from '../../lib/localTime';
import type { ExerciseTemplateRow } from '../../types/exerciseTemplate';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  name: string;
  recentTemplates: ExerciseTemplateRow[];
  recentError?: string | null;
  onBuildExercise: () => void;
  onBrowseExercises: () => void;
  onManageTaxonomy: () => void;
  onOpenExercise: (id: string) => void;
  onBrandPress?: () => void;
};

/** Home dashboard: useful now, ready to evolve into session calendar later. */
export function HomeDashboardScreen({
  name,
  recentTemplates,
  recentError,
  onBuildExercise,
  onBrowseExercises,
  onManageTaxonomy,
  onOpenExercise,
  onBrandPress,
}: Props) {
  const [now, setNow] = useState(() => localNow());

  // Keep greeting + “today” in sync with the device clock while Home is open.
  useEffect(() => {
    setNow(localNow());
    const id = setInterval(() => setNow(localNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = `${greetingForLocalTime(now)}, ${name}.`;
  const week = localWeekDays(now);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Home"
        subtitle="A quiet landing place for what you are building and what you will log next."
        onBrandPress={onBrandPress}
      />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{greeting}</Text>
        <Text style={styles.heroTitle}>Ready when you are.</Text>
        <Text style={styles.heroBody}>
          Build from your own vocabulary, reopen recent templates, and keep the
          week in view.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          <HubAction
            title="Build exercise"
            body="Start a fresh exercise template."
            onPress={onBuildExercise}
          />
          <HubAction
            title="Browse exercise library"
            body="Open saved exercise templates."
            onPress={onBrowseExercises}
          />
          <HubAction
            title="Manage taxonomy"
            body="Tools, primary groups, and analytics tags."
            onPress={onManageTaxonomy}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent templates</Text>
          <Pressable onPress={onBrowseExercises} hitSlop={8}>
            <Text style={styles.sectionLink}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.panel}>
          {recentError ? <Text style={styles.error}>{recentError}</Text> : null}
          {!recentError && recentTemplates.length === 0 ? (
            <Text style={styles.empty}>
              No exercise templates yet. Build one to make Home feel lived in.
            </Text>
          ) : null}
          {recentTemplates.slice(0, 4).map((template) => (
            <Pressable
              key={template.id}
              onPress={() => onOpenExercise(template.id)}
              style={({ pressed }) => [
                styles.templateRow,
                pressed && styles.templateRowPressed,
              ]}
            >
              <View style={styles.templateCopy}>
                <Text style={styles.templateTitle}>{template.name}</Text>
                <Text style={styles.templateMeta}>
                  {TARGET_SHAPE_LABELS[template.target_shape_id] ?? 'Exercise'}
                  {template.track_analytics ? ' · Analytics on' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
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
          <Text style={styles.weekHint}>
            Session logging will turn each day into a journal entry. For now,
            this keeps the calendar shape visible without fake data.
          </Text>
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  eyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  heroTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.2,
  },
  heroBody: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
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
  sectionLink: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
  },
  actions: {
    gap: spacing.sm,
  },
  panel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
  },
  empty: {
    padding: spacing.md,
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  error: {
    padding: spacing.md,
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  templateRowPressed: {
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  templateCopy: {
    flex: 1,
    gap: 4,
  },
  templateTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 16,
    color: colors.text,
  },
  templateMeta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.textDim,
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
