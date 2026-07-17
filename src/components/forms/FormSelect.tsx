import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, typography } from '../../theme/tokens';

export type FormSelectOption = { id: string; label: string };

type Props = {
  options: readonly FormSelectOption[] | FormSelectOption[];
  value: string;
  onChange: (id: string) => void;
  /** sunrise-tinted like `.tool-select` */
  variant?: 'default' | 'tool';
  accessibilityLabel?: string;
  /** Compact trigger width hint */
  compact?: boolean;
};

/**
 * Compact select whose menu overlays via Modal —
 * opening never reflows the form layout.
 */
export function FormSelect({
  options,
  value,
  onChange,
  variant = 'default',
  accessibilityLabel,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const triggerRef = useRef<View>(null);
  const selected = options.find((o) => o.id === value);
  const label = selected?.label ?? '—';

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  return (
    <>
      <View
        ref={triggerRef}
        collapsable={false}
        style={[styles.wrap, compact && styles.wrapCompact]}
      >
        <Pressable
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.trigger,
            variant === 'tool' && styles.triggerTool,
            open && styles.triggerOpen,
            pressed && styles.triggerPressed,
          ]}
        >
          <Text
            style={[
              styles.triggerText,
              variant === 'tool' && styles.triggerTextTool,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text style={styles.caret}>▾</Text>
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
                top: anchor.y + anchor.h + 4,
                left: anchor.x,
                minWidth: Math.max(anchor.w, 132),
              },
            ]}
          >
            {options.map((opt) => {
              const isOn = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    onChange(opt.id);
                    close();
                  }}
                  style={[styles.option, isOn && styles.optionOn]}
                >
                  <Text style={[styles.optionText, isOn && styles.optionTextOn]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 88,
  },
  wrapCompact: {
    minWidth: 64,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
  },
  triggerTool: {
    backgroundColor: 'rgba(255, 154, 90, 0.08)',
    borderColor: colors.borderStrong,
  },
  triggerOpen: {
    borderColor: colors.sunrise,
    shadowColor: colors.sunrise,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerText: {
    flexShrink: 1,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
  },
  triggerTextTool: {
    color: colors.sunrise,
  },
  caret: {
    fontFamily: typography.font,
    fontSize: 10,
    color: colors.textDim,
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
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
    // Float above form chrome
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  option: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionOn: {
    backgroundColor: colors.amberGlow,
  },
  optionText: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.textMuted,
  },
  optionTextOn: {
    fontFamily: typography.fontMedium,
    color: colors.text,
  },
});
