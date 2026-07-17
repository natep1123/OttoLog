import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Simple centered confirm sheet matching OttoLog panels. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Button
              label={busy ? 'Deleting…' : confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              disabled={busy}
            />
            <Button
              label={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              disabled={busy}
              style={styles.cancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 14, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  message: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  cancel: {
    marginTop: 0,
  },
});
