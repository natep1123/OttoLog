import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { ExerciseEditor } from '../../components/forms';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  buildTargets,
  defaultExerciseDraft,
  getExerciseTemplate,
  saveExerciseTemplate,
} from '../../lib/exerciseTemplates';
import type { ExerciseTemplateInput } from '../../types/exerciseTemplate';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  templateId?: string | null;
  onBrandPress?: () => void;
  onBack: () => void;
  onSaved: (id: string) => void;
};

/**
 * Solo exercise template builder — hosts the nestable ExerciseEditor leaf.
 * Cluster / block / session builders will embed the same editor.
 */
export function ExerciseBuilderScreen({
  templateId,
  onBrandPress,
  onBack,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ExerciseTemplateInput>(defaultExerciseDraft);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(templateId ?? null);

  const load = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getExerciseTemplate(templateId);
    setLoading(false);
    if (loadError || !data) {
      setError(loadError ?? 'Could not load template.');
      return;
    }
    const targets = Array.isArray(data.default_target_shape)
      ? data.default_target_shape
      : [];
    setDraft({
      name: data.name,
      tool_id: data.tool_id,
      target_shape_id: data.target_shape_id,
      track_analytics: data.track_analytics,
      primary_group_id: data.primary_group_id,
      analytics_tag_ids: data.analytics_tag_ids,
      default_target_shape: targets.length ? targets : buildTargets(1),
      track_duration: data.track_duration,
      duration: data.duration,
      notes: data.notes,
    });
    setSavedId(data.id);
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    if (!user?.id) {
      setError('Not signed in.');
      return;
    }
    setSaving(true);
    setError(null);

    const { id, error: saveError } = await saveExerciseTemplate({
      userId: user.id,
      templateId: savedId,
      draft,
    });
    setSaving(false);
    if (saveError || !id) {
      setError(saveError ?? 'Save failed.');
      return;
    }
    setSavedId(id);
    onSaved(id);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.sunrise} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <ScreenHeader
          title={savedId ? 'Edit exercise' : 'Exercise'}
          subtitle="Reusable exercise blueprint — same editor that nests in clusters and blocks."
          onBack={onBack}
          onBrandPress={onBrandPress}
        />

        <ExerciseEditor
          value={draft}
          onChange={setDraft}
          coordMeta="Exercise"
          onPickTemplate={(row) => {
            onSaved(row.id);
          }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {savedId && !error ? (
          <Text style={styles.savedHint}>Saved · reopen from Library</Text>
        ) : null}

        <Button
          label={saving ? 'Saving…' : savedId ? 'Save changes' : 'Save template'}
          onPress={onSave}
          disabled={saving}
        />
        {savedId ? (
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.doneLink}>Done</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  savedHint: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.gold,
  },
  doneLink: {
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.sunrise,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
