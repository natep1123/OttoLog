import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ExerciseEditor } from '../../components/forms';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  buildTargets,
  defaultExerciseDraft,
  deleteExerciseTemplate,
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
  /** Called after a successful delete so the parent can leave this screen */
  onDeleted?: () => void;
};

/**
 * Solo exercise template builder — hosts the nestable ExerciseEditor leaf.
 * Footer actions (save / done / delete) live outside the form; nested hosts
 * will handle their own leaf removal later.
 */
export function ExerciseBuilderScreen({
  templateId,
  onBrandPress,
  onBack,
  onSaved,
  onDeleted,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ExerciseTemplateInput>(defaultExerciseDraft);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(templateId ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const justSavedRef = useRef(false);

  const load = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    if (justSavedRef.current) {
      justSavedRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setShowSavedHint(false);
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

  const onPickTemplate = async (templateRowId: string) => {
    setError(null);
    setShowSavedHint(false);
    const { data, error: pickError } = await getExerciseTemplate(templateRowId);
    if (pickError || !data) {
      setError(pickError ?? 'Could not load that template.');
      return;
    }
    const targets = Array.isArray(data.default_target_shape)
      ? data.default_target_shape
      : [];
    // Copy editable state only — does not change which template we're saving into.
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
  };

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
    justSavedRef.current = true;
    setShowSavedHint(true);
    onSaved(id);
  };

  const onDeleteConfirm = async () => {
    if (!user?.id || !savedId || deleting) return;
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await deleteExerciseTemplate(
      savedId,
      user.id,
    );
    setDeleting(false);
    if (deleteError) {
      setConfirmDelete(false);
      setError(deleteError);
      return;
    }
    setConfirmDelete(false);
    onDeleted?.();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.sunrise} />
      </View>
    );
  }

  const displayName = draft.name.trim() || 'this template';
  const busy = saving || deleting;

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
          onPickTemplate={(row) => {
            void onPickTemplate(row.id);
          }}
        />

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {showSavedHint ? (
            <Text style={styles.savedHint}>Saved · reopen from Library</Text>
          ) : null}

          <View style={styles.primaryActions}>
            <Button
              label={
                saving
                  ? 'Saving…'
                  : savedId
                    ? 'Save changes'
                    : 'Save template'
              }
              onPress={onSave}
              disabled={busy}
            />
            {savedId ? (
              <Button
                label="Done"
                variant="ghost"
                onPress={onBack}
                disabled={busy}
              />
            ) : null}
          </View>

          {savedId ? (
            <View style={styles.deleteSection}>
              <View style={styles.footerDivider} />
              <Button
                label="Delete template"
                variant="danger"
                onPress={() => {
                  setError(null);
                  setConfirmDelete(true);
                }}
                disabled={busy}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete template?"
        message={`Permanently delete “${displayName}”? This cannot be undone.`}
        confirmLabel="Delete forever"
        cancelLabel="Keep template"
        destructive
        busy={deleting}
        onConfirm={() => void onDeleteConfirm()}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
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
  footer: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryActions: {
    gap: spacing.sm,
  },
  deleteSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
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
});
