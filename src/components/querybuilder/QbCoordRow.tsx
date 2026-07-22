import { Fragment, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  colors,
  measureChip,
  queryLayer,
  radii,
  typography,
} from '../../theme/tokens';
import { FormArrow } from '../forms/FormArrow';
import {
  formChevron,
  layerHeaderLeadingWidth,
} from '../forms/formTokens';
import type { QbLayerKind } from './qbTokens';

export type QbChipKind = QbLayerKind | 'measure';

export type QbCoordChip = {
  label: string;
  kind: QbChipKind;
};

type Props = {
  layer: QbLayerKind;
  metaChips?: Array<string | QbCoordChip>;
  /** Line 1 primary control (Section scope title, Subject PG picker, …). */
  label?: ReactNode;
  /** Single-line title used when `label` is omitted. */
  title?: ReactNode;
  trailing?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Ephemeral locked / view mode — accepted for slice 2, unused in slice 1. */
  locked?: boolean;
  onToggleLock?: () => void;
  lockDisabled?: boolean;
};

function chipColors(kind: QbChipKind) {
  if (kind === 'measure') {
    return {
      border: measureChip.border,
      background: measureChip.background,
      color: measureChip.color,
    };
  }
  const token = queryLayer[kind];
  return {
    border: token.border,
    background: token.chip.background,
    color: token.chip.color,
  };
}

/**
 * Query builder card header — cool-palette fork of `CoordRow`:
 * 1. chevron · (lock) · label|title · trailing
 * 2. scrollable chips (measure/breakdown grammar)
 */
export function QbCoordRow({
  layer,
  metaChips,
  label,
  title,
  trailing,
  expanded,
  onToggleExpand,
  locked = false,
  onToggleLock,
  lockDisabled = false,
}: Props) {
  const hasLine1 = Boolean(
    label || title || trailing || onToggleExpand || onToggleLock,
  );
  const chips = (metaChips ?? []).map((chip) =>
    typeof chip === 'string' ? { label: chip, kind: layer as QbChipKind } : chip,
  );
  if (!hasLine1 && !chips.length) return null;

  const collapsible = typeof onToggleExpand === 'function';
  const lockable = typeof onToggleLock === 'function';
  const isExpanded = expanded !== false;
  const token = queryLayer[layer];

  return (
    <View style={styles.stack}>
      {hasLine1 ? (
        <View style={[styles.row, !isExpanded && styles.rowCollapsed]}>
          {collapsible ? (
            <Pressable
              onPress={onToggleExpand}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={isExpanded ? 'Collapse card' : 'Expand card'}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
              style={({ pressed }) => [
                styles.toggle,
                pressed && styles.togglePressed,
              ]}
            >
              <Text
                style={[
                  styles.chevron,
                  { color: token.chip.color },
                  !isExpanded && styles.chevronCollapsed,
                ]}
              >
                ▾
              </Text>
            </Pressable>
          ) : (
            <View style={styles.toggleSpacer} />
          )}

          {lockable ? (
            <Pressable
              onPress={onToggleLock}
              disabled={lockDisabled}
              accessibilityRole="button"
              accessibilityState={{ checked: locked, disabled: lockDisabled }}
              accessibilityLabel={locked ? 'Unlock card' : 'Lock card'}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={({ pressed }) => [
                styles.lockToggle,
                pressed && !lockDisabled && styles.togglePressed,
                lockDisabled && styles.lockDisabled,
              ]}
            >
              <Feather
                name={locked ? 'lock' : 'unlock'}
                size={14}
                color={token.chip.color}
              />
            </Pressable>
          ) : null}

          <View style={styles.primary}>{label ? label : title}</View>

          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}

      {chips.length ? (
        <View style={styles.chipRow}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.chipViewport}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {chips.map((chip, index) => {
              const represented = chipColors(chip.kind);
              return (
                <Fragment key={`${chip.label}-${index}`}>
                  {index > 0 ? (
                    <View style={styles.chipArrow}>
                      <FormArrow color={token.chip.color} width={20} height={12} />
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.chip,
                      {
                        borderColor: represented.border,
                        backgroundColor: represented.background,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.chipText, { color: represented.color }]}
                      numberOfLines={1}
                    >
                      {chip.label}
                    </Text>
                  </View>
                </Fragment>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 6,
    paddingBottom: 4,
    zIndex: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCollapsed: {
    paddingBottom: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
  },
  toggle: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
    paddingVertical: 4,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSpacer: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
  },
  lockToggle: {
    width: layerHeaderLeadingWidth,
    flexShrink: 0,
    paddingVertical: 4,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDisabled: {
    opacity: 0.45,
  },
  togglePressed: {
    opacity: 0.75,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: formChevron.fontSize,
    lineHeight: formChevron.lineHeight,
    includeFontPadding: false,
    transform: [{ rotate: '0deg' }],
  },
  chevronCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  primary: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0,
  },
  chipViewport: {
    flex: 1,
    minWidth: 0,
  },
  chips: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  trailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  chipArrow: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
  },
});
