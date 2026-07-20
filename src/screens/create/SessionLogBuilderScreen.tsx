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
import {
  EditorChrome,
  SessionDateControl,
  SessionEditor,
} from '../../components/forms';
import { LOCK_ROOT } from '../../components/forms/LockController';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  defaultSessionLogDraft,
  deleteSessionLog,
  getSessionLog,
  saveSessionLog,
  sessionLogToDraft,
} from '../../lib/sessionLogs';
import {
  getSessionTemplate,
  sessionTemplateToDraft,
} from '../../lib/sessionTemplates';
import { todayDateKey } from '../../lib/localTime';
import type { SessionLogInput } from '../../types/sessionLog';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = {
  logId?: string | null;
  /** Seed a new log from a session template (Create → From template). */
  fromTemplateId?: string | null;
  /** Library open: start locked + expanded (view outline until unlock). */
  reviewMode?: boolean;
  onBrandPress?: () => void;
  onBack: () => void;
  onSaved: (id: string) => void;
  onDeleted?: () => void;
};

/**
 * Session log builder — same form tree as SessionBuilderScreen.
 * Extra: session date on the tools row; save denests into sql/014 tables.
 */
export function SessionLogBuilderScreen({
  logId,
  fromTemplateId = null,
  reviewMode = false,
  onBrandPress,
  onBack,
  onSaved,
  onDeleted,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<SessionLogInput>(defaultSessionLogDraft);
  const [loading, setLoading] = useState(
    Boolean(logId) || Boolean(fromTemplateId),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(logId ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const justSavedRef = useRef(false);

  const load = useCallback(async () => {
    if (logId) {
      if (justSavedRef.current) {
        justSavedRef.current = false;
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setShowSavedHint(false);
      const { data, error: loadError } = await getSessionLog(logId);
      setLoading(false);
      if (loadError || !data) {
        setError(loadError ?? 'Could not load session log.');
        return;
      }
      setDraft(sessionLogToDraft(data));
      setSavedId(data.id);
      return;
    }

    if (fromTemplateId) {
      setLoading(true);
      setError(null);
      const { data, error: loadError } = await getSessionTemplate(fromTemplateId);
      setLoading(false);
      if (loadError || !data) {
        setError(loadError ?? 'Could not load session template.');
        return;
      }
      const templateDraft = sessionTemplateToDraft(data);
      setDraft({
        ...templateDraft,
        session_date: todayDateKey(),
        status: 'complete',
        template_id: data.id,
      });
      setSavedId(null);
      return;
    }

    setLoading(false);
  }, [logId, fromTemplateId]);

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
    const { id, error: saveError } = await saveSessionLog({
      userId: user.id,
      logId: savedId,
      draft: { ...draft, status: 'complete' },
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
    if (!user?.id || !savedId || removing) return;
    setRemoving(true);
    setError(null);
    const result = await deleteSessionLog(savedId, user.id);
    setRemoving(false);
    if (result.error) {
      setConfirmDelete(false);
      setError(result.error);
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

  const displayName = draft.name.trim() || 'this session';
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
          title={savedId ? 'Edit session log' : 'Log a session'}
          subtitle={
            fromTemplateId && !savedId
              ? 'Started from a session template — edit then save.'
              : 'Same builder as templates — save writes a dated workout log.'
          }
          onBack={onBack}
          onBrandPress={onBrandPress}
        />

        <EditorChrome
          reviewLockId={reviewMode ? LOCK_ROOT.session : undefined}
          toolbarLeading={
            <SessionDateControl
              value={draft.session_date}
              onChange={(session_date) =>
                setDraft((prev) => ({ ...prev, session_date }))
              }
            />
          }
        >
          <SessionEditor
            value={draft}
            onChange={(next) =>
              setDraft((prev) => ({
                ...prev,
                ...next,
              }))
            }
          />
        </EditorChrome>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {showSavedHint ? (
            <Text style={styles.savedHint}>Saved · reopen from Library → Logs</Text>
          ) : null}
          <View style={styles.primaryActions}>
            <Button
              label={
                saving
                  ? 'Saving…'
                  : savedId
                    ? 'Save changes'
                    : 'Save session log'
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
                label="Delete forever"
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
        title="Delete forever?"
        message={`Permanently delete “${displayName}”? This cannot be undone.`}
        confirmLabel="Delete forever"
        cancelLabel="Keep log"
        destructive
        busy={removing}
        onConfirm={() => void onDeleteConfirm()}
        onCancel={() => {
          if (!removing) setConfirmDelete(false);
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
  primaryActions: { gap: spacing.sm },
  deleteSection: { gap: spacing.sm, marginTop: spacing.sm },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  savedHint: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
});
