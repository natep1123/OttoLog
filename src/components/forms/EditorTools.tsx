import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layer, radii, spacing, typography } from '../../theme/tokens';
import {
  ExpansionControllerProvider,
  useExpansionController,
} from './ExpansionController';
import {
  LockControllerProvider,
  useLockController,
} from './LockController';

type ToolAction = {
  id: string;
  label: string;
  hint: string;
  onPress: () => void;
  /** Optional glyph accent; defaults to exercise gold. */
  kind?: 'session' | 'block' | 'cluster' | 'exercise';
  glyph?: string;
};

const MENU_WIDTH = 300;

type EditorChromeProps = {
  children: ReactNode;
  /** Optional leading control on the tools row (e.g. session log date). */
  toolbarLeading?: ReactNode;
  /**
   * Library review: start with this lock id locked so the tree opens in
   * view mode (expanded + LockedOutline) until the user unlocks.
   */
  reviewLockId?: string;
};

/**
 * Wraps a builder's form tree: Tools tray + expansion/lock controllers.
 */
export function EditorChrome({
  children,
  toolbarLeading,
  reviewLockId,
}: EditorChromeProps) {
  return (
    <ExpansionControllerProvider>
      <LockControllerProvider
        initialLockedIds={reviewLockId ? [reviewLockId] : undefined}
      >
        <View style={styles.chrome}>
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeading}>{toolbarLeading}</View>
            <EditorTools />
          </View>
          {children}
        </View>
      </LockControllerProvider>
    </ExpansionControllerProvider>
  );
}

/**
 * Editor QoL tray — sits outside the nested form chrome.
 * Collapse exercises + unlock & expand all; room for reset / undo later.
 */
export function EditorTools() {
  const expansion = useExpansionController();
  const locks = useLockController();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const triggerRef = useRef<View>(null);

  if (!expansion) return null;

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  const actions: ToolAction[] = [
    {
      id: 'collapse-exercises',
      label: 'Collapse exercises',
      hint: 'Fold every exercise card — leave blocks & sequences open',
      kind: 'exercise',
      glyph: '▸▸',
      onPress: () => {
        expansion.collapseAllExercises();
        close();
      },
    },
    {
      id: 'unlock-expand-all',
      label: 'Unlock & Expand All',
      hint: 'Clear every lock and open every card in this template',
      kind: 'session',
      glyph: '◌',
      onPress: () => {
        locks?.unlockAll();
        expansion.expandAll();
        close();
      },
    },
  ];

  return (
    <View style={styles.toolsWrap}>
      <View ref={triggerRef} collapsable={false} style={styles.anchor}>
        <Pressable
          onPress={() => (open ? close() : openMenu())}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel="Editor tools"
          style={({ pressed }) => [
            styles.trigger,
            open && styles.triggerOpen,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.triggerLabel, open && styles.triggerLabelOpen]}>
            Tools
          </Text>
          <Text
            style={[styles.triggerChevron, open && styles.triggerChevronOpen]}
          >
            ▾
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View
            style={[
              styles.menu,
              {
                top: anchor.y + anchor.h + spacing.sm,
                left: Math.max(spacing.md, anchor.x + anchor.w - MENU_WIDTH),
              },
            ]}
            accessibilityRole="menu"
          >
            <Text style={styles.menuEyebrow}>Workspace</Text>
            {actions.map((action, index) => {
              const accent = layer[action.kind ?? 'exercise'].chip;
              return (
                <Pressable
                  key={action.id}
                  onPress={action.onPress}
                  accessibilityRole="menuitem"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.action,
                    index < actions.length - 1 && styles.actionDivider,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.actionGlyph,
                      {
                        borderColor: accent.color,
                        backgroundColor: accent.background,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.actionGlyphText, { color: accent.color }]}
                    >
                      {action.glyph ?? '▸▸'}
                    </Text>
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionHint}>{action.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toolbarLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  toolsWrap: {
    alignItems: 'flex-end',
  },
  anchor: {
    alignSelf: 'flex-end',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
  },
  triggerOpen: {
    borderColor: colors.sunrise,
    backgroundColor: colors.amberGlow,
  },
  pressed: {
    opacity: 0.8,
  },
  triggerLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  triggerLabelOpen: {
    color: colors.sunrise,
  },
  triggerChevron: {
    fontFamily: typography.fontMedium,
    fontSize: 12,
    lineHeight: 14,
    color: colors.textDim,
  },
  triggerChevronOpen: {
    transform: [{ rotate: '180deg' }],
    color: colors.sunrise,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuEyebrow: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textDim,
    paddingHorizontal: spacing.xs,
    paddingBottom: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  actionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 0,
  },
  actionPressed: {
    backgroundColor: colors.pressedWash,
  },
  actionGlyph: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
  },
  actionGlyphText: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    letterSpacing: -1,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
  actionLabel: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.text,
  },
  actionHint: {
    fontFamily: typography.font,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
});
