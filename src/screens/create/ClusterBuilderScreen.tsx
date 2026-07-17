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
import { ClusterEditor } from '../../components/forms';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  archiveClusterTemplate,
  defaultClusterDraft,
  deleteClusterTemplate,
  getClusterTemplate,
  isClusterTemplateReferenced,
  saveClusterTemplate,
} from '../../lib/clusterTemplates';
import type { ClusterTemplateInput } from '../../types/clusterTemplate';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  templateId?: string | null;
  onBrandPress?: () => void;
  onBack: () => void;
  onSaved: (id: string) => void;
  onDeleted?: () => void;
};

type RemoveMode = 'archive' | 'hard' | null;

/**
 * Solo cluster template builder — hosts nestable ClusterEditor (ExerciseEditor leaves).
 * Footer actions live outside the form. Prefer soft archive; hard delete when unreferenced.
 */
export function ClusterBuilderScreen({
  templateId,
  onBrandPress,
  onBack,
  onSaved,
  onDeleted,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ClusterTemplateInput>(defaultClusterDraft);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(templateId ?? null);
  const [removeMode, setRemoveMode] = useState<RemoveMode>(null);
  const [canHardDelete, setCanHardDelete] = useState(true);
  const [removing, setRemoving] = useState(false);
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
    const { data, error: loadError } = await getClusterTemplate(templateId);
    setLoading(false);
    if (loadError || !data) {
      setError(loadError ?? 'Could not load template.');
      return;
    }
    setDraft({
      name: data.name,
      cluster_type: data.cluster_type,
      notes: data.content.notes,
      track_duration: data.content.track_duration,
      duration: data.content.duration,
      items: data.content.items.length
        ? data.content.items
        : defaultClusterDraft().items,
    });
    setSavedId(data.id);

    const { referenced } = await isClusterTemplateReferenced(data.id);
    setCanHardDelete(!referenced);
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

    const { id, error: saveError } = await saveClusterTemplate({
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

  const onRemoveConfirm = async () => {
    if (!user?.id || !savedId || !removeMode || removing) return;
    setRemoving(true);
    setError(null);

    const result =
      removeMode === 'hard'
        ? await deleteClusterTemplate(savedId, user.id)
        : await archiveClusterTemplate(savedId, user.id);

    setRemoving(false);
    if (result.error) {
      setRemoveMode(null);
      setError(result.error);
      return;
    }
    setRemoveMode(null);
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
  const busy = saving || removing;

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
          title={savedId ? 'Edit cluster' : 'Cluster'}
          subtitle="Superset or circuit with nested exercises — same leaves that nest in blocks."
          onBack={onBack}
          onBrandPress={onBrandPress}
        />

        <ClusterEditor
          value={draft}
          onChange={setDraft}
          coordMeta="Cluster"
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
                label="Remove from library"
                variant="ghost"
                onPress={() => {
                  setError(null);
                  setRemoveMode('archive');
                }}
                disabled={busy}
              />
              {canHardDelete ? (
                <Button
                  label="Delete forever"
                  variant="danger"
                  onPress={() => {
                    setError(null);
                    setRemoveMode('hard');
                  }}
                  disabled={busy}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={removeMode === 'archive'}
        title="Remove from library?"
        message={`Archive “${displayName}”? It leaves your library and frees the name. Prefer this over permanent delete.`}
        confirmLabel="Archive"
        cancelLabel="Keep template"
        destructive
        busy={removing}
        onConfirm={() => void onRemoveConfirm()}
        onCancel={() => {
          if (!removing) setRemoveMode(null);
        }}
      />

      <ConfirmDialog
        visible={removeMode === 'hard'}
        title="Delete forever?"
        message={`Permanently delete “${displayName}”? This cannot be undone.`}
        confirmLabel="Delete forever"
        cancelLabel="Keep template"
        destructive
        busy={removing}
        onConfirm={() => void onRemoveConfirm()}
        onCancel={() => {
          if (!removing) setRemoveMode(null);
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
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
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
