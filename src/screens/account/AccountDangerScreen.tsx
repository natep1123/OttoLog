import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  onBrandPress?: () => void;
  onBack: () => void;
};

/** Account → Settings → Danger zone — permanent account deletion. */
export function AccountDangerScreen({ onBrandPress, onBack }: Props) {
  const { profile, deleteAccount } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDeleteConfirm = async () => {
    setError(null);
    setDeleting(true);
    const { error: deleteError } = await deleteAccount();
    setDeleting(false);
    if (deleteError) {
      setConfirmDelete(false);
      setError(deleteError);
      return;
    }
    setConfirmDelete(false);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Danger zone"
        subtitle="These actions are permanent. Take care."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Delete account</Text>
        <Text style={styles.panelBody}>
          Permanently removes your profile, templates, and taxonomy. Use this
          for clearing test accounts — it cannot be undone.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Delete account"
          variant="danger"
          onPress={() => {
            setError(null);
            setConfirmDelete(true);
          }}
          disabled={deleting}
        />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        message={`This permanently deletes ${profile?.username ?? 'this account'} and cannot be undone.`}
        confirmLabel="Delete forever"
        cancelLabel="Keep account"
        destructive
        busy={deleting}
        onConfirm={() => void onDeleteConfirm()}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.lg,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.sunset,
    borderRadius: radii.md,
    backgroundColor: 'rgba(232, 93, 76, 0.06)',
  },
  panelTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  panelBody: {
    fontFamily: typography.font,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
});
