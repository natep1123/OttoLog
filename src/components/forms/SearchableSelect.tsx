import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TaxonomyOption } from '../../lib/taxonomy';
import { colors, radii, typography } from '../../theme/tokens';

type SingleProps = {
  mode?: 'single';
  value: string | null;
  onChange: (id: string | null) => void;
};

type MultiProps = {
  mode: 'multi';
  value: string[];
  onChange: (ids: string[]) => void;
};

type SharedProps = {
  options: TaxonomyOption[];
  onOptionsChange?: (next: TaxonomyOption[]) => void;
  onCreate: (
    name: string,
  ) => Promise<{ data: TaxonomyOption | null; error: string | null }>;
  placeholder?: string;
  emptyLabel?: string;
  accessibilityLabel?: string;
  /** sunrise-tinted trigger like tool select */
  variant?: 'default' | 'tool';
  /** Allow clearing single selection */
  clearable?: boolean;
  disabled?: boolean;
  /** Fill parent width instead of fixed tool width (dense control rows). */
  fill?: boolean;
  /**
   * Soft suggestions (e.g. tags for a primary group).
   * Empty / omitted → plain A→Z pool.
   * Non-empty → Suggested section; full A→Z only after Show all (under suggestions;
   * suggested ids also appear in A→Z; one toggle flips both).
   */
  suggestedIds?: string[];
  /** Owning layer's focus/selection colors. */
  accent?: {
    color: string;
    border: string;
    background: string;
  };
};

type Props = SharedProps & (SingleProps | MultiProps);

function labelsForIds(options: TaxonomyOption[], ids: string[]): string {
  return ids
    .map((id) => {
      const hit = options.find((o) => o.id === id);
      if (!hit) return null;
      return hit.isArchived ? `${hit.label} (archived)` : hit.label;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Searchable combobox with inline “Create …” —
 * used for tools, primary groups, and analytics tags.
 * Menu overlays via Modal so layout never reflows.
 */
export function SearchableSelect(props: Props) {
  const {
    options,
    onOptionsChange,
    onCreate,
    placeholder = 'Search…',
    emptyLabel = 'None',
    accessibilityLabel,
    variant = 'default',
    clearable = false,
    disabled = false,
    fill = false,
    suggestedIds,
    accent,
  } = props;

  const multi = props.mode === 'multi';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const triggerRef = useRef<View>(null);

  const selectedIds = multi
    ? props.value
    : props.value
      ? [props.value]
      : [];

  const triggerLabel = useMemo(() => {
    if (selectedIds.length === 0) return emptyLabel;
    if (multi) {
      const text = labelsForIds(options, selectedIds);
      return text || emptyLabel;
    }
    const hit = options.find((o) => o.id === selectedIds[0]);
    if (!hit) return emptyLabel;
    return hit.isArchived ? `${hit.label} (archived)` : hit.label;
  }, [emptyLabel, multi, options, selectedIds]);

  /** Active rows + currently selected archived (so labels resolve / multi can deselect). */
  const pickerOptions = useMemo(
    () =>
      options.filter(
        (o) => !o.isArchived || selectedIds.includes(o.id),
      ),
    [options, selectedIds],
  );

  const suggestedIdSet = useMemo(() => {
    const raw = Array.isArray(suggestedIds) ? suggestedIds : [];
    return new Set(raw.filter(Boolean));
  }, [suggestedIds]);

  /** Soft mode only when at least one suggested id resolves in the picker pool. */
  const hasSuggestions = useMemo(() => {
    if (suggestedIdSet.size === 0) return false;
    return pickerOptions.some((o) => suggestedIdSet.has(o.id));
  }, [pickerOptions, suggestedIdSet]);

  const filterByQuery = (rows: TaxonomyOption[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => o.label.toLowerCase().includes(q));
  };

  /**
   * Suggested section: configured suggestions (ordered) + any selected tags
   * not in the suggestion list (so they stay reachable without Show all).
   */
  const suggestedRows = useMemo(() => {
    if (!hasSuggestions) return [];
    const byId = new Map(pickerOptions.map((o) => [o.id, o]));
    const ordered: TaxonomyOption[] = [];
    const seen = new Set<string>();
    for (const id of suggestedIds ?? []) {
      const hit = byId.get(id);
      if (!hit || seen.has(id)) continue;
      seen.add(id);
      ordered.push(hit);
    }
    for (const id of selectedIds) {
      if (seen.has(id)) continue;
      const hit = byId.get(id);
      if (!hit) continue;
      seen.add(id);
      ordered.push(hit);
    }
    return filterByQuery(ordered);
  }, [hasSuggestions, pickerOptions, selectedIds, suggestedIds, query]);

  const allRows = useMemo(
    () => filterByQuery(pickerOptions),
    [pickerOptions, query],
  );

  /** Plain mode (no suggestions): full filtered pool. Soft mode: only when showAll. */
  const libraryRows = hasSuggestions ? (showAll ? allRows : []) : allRows;

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return pickerOptions.some((o) => o.label.toLowerCase() === q);
  }, [pickerOptions, query]);

  const canCreate = query.trim().length > 0 && !exactMatch;

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    setCreateError(null);
    setShowAll(false);
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const close = () => {
    setOpen(false);
    setQuery('');
    setCreateError(null);
    setShowAll(false);
  };

  const selectSingle = (id: string | null) => {
    if (!multi) {
      props.onChange(id);
      close();
    }
  };

  const toggleMulti = (id: string) => {
    if (!multi) return;
    const has = props.value.includes(id);
    props.onChange(
      has ? props.value.filter((x) => x !== id) : [...props.value, id],
    );
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError(null);
    const { data, error } = await onCreate(name);
    setCreating(false);
    if (error || !data) {
      setCreateError(error ?? 'Could not create.');
      return;
    }
    const nextOptions = [...options.filter((o) => o.id !== data.id), data].sort(
      (a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.label.localeCompare(b.label);
      },
    );
    onOptionsChange?.(nextOptions);

    if (multi) {
      if (!props.value.includes(data.id)) {
        props.onChange([...props.value, data.id]);
      }
      setQuery('');
    } else {
      props.onChange(data.id);
      close();
    }
  };

  const renderOption = (opt: TaxonomyOption, keyPrefix = '') => {
    const selected = selectedIds.includes(opt.id);
    const label = opt.isArchived ? `${opt.label} (archived)` : opt.label;
    return (
      <Pressable
        key={`${keyPrefix}${opt.id}`}
        onPress={() => (multi ? toggleMulti(opt.id) : selectSingle(opt.id))}
        style={[
          styles.option,
          selected && styles.optionOn,
          selected && accent ? { backgroundColor: accent.background } : null,
        ]}
      >
        <Text
          style={[
            styles.optionText,
            selected && styles.optionTextOn,
            selected && accent ? { color: accent.color } : null,
          ]}
          numberOfLines={1}
        >
          {multi ? (selected ? '✓  ' : '    ') : ''}
          {label}
        </Text>
      </Pressable>
    );
  };

  const menuWidth = Math.max(anchor.w, multi ? 260 : 180);
  const menuLeft = Math.min(
    anchor.x,
    // keep on screen-ish; Modal is full window
    Math.max(8, anchor.x),
  );

  const listEmpty =
    (hasSuggestions
      ? suggestedRows.length === 0 && libraryRows.length === 0
      : libraryRows.length === 0) && !canCreate;

  return (
    <>
      <View
        ref={triggerRef}
        collapsable={false}
        style={[
          styles.triggerWrap,
          variant === 'tool' && styles.triggerWrapTool,
          fill && styles.triggerWrapFill,
        ]}
      >
        <Pressable
          onPress={openMenu}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.trigger,
            variant === 'tool' && styles.triggerTool,
            open && styles.triggerOpen,
            open && accent ? { borderColor: accent.color } : null,
            pressed && !disabled && styles.triggerPressed,
            disabled && styles.triggerDisabled,
          ]}
        >
          <Text
            style={[
              styles.triggerText,
              variant === 'tool' && styles.triggerTextTool,
              selectedIds.length === 0 && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {triggerLabel}
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
              accent ? { borderColor: accent.border } : null,
              {
                top: anchor.y + anchor.h + 4,
                left: menuLeft,
                width: menuWidth,
              },
            ]}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.textDim}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.search}
              selectionColor={accent?.color ?? colors.sunrise}
            />

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {!multi && clearable ? (
                <Pressable
                  onPress={() => selectSingle(null)}
                  style={styles.option}
                >
                  <Text style={styles.optionTextMuted}>{emptyLabel}</Text>
                </Pressable>
              ) : null}

              {hasSuggestions ? (
                <>
                  <Text style={styles.sectionLabel}>Suggested</Text>
                  {suggestedRows.map((opt) => renderOption(opt, 'sug-'))}
                  {suggestedRows.length === 0 ? (
                    <Text style={styles.empty}>No matches</Text>
                  ) : null}

                  {!showAll ? (
                    <Pressable
                      onPress={() => setShowAll(true)}
                      style={styles.showAllBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Show all tags"
                    >
                      <Text
                        style={[
                          styles.showAllText,
                          accent ? { color: accent.color } : null,
                        ]}
                      >
                        Show all
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={styles.sectionLabel}>All</Text>
                      {libraryRows.map((opt) => renderOption(opt, 'all-'))}
                      {libraryRows.length === 0 ? (
                        <Text style={styles.empty}>No matches</Text>
                      ) : null}
                      <Pressable
                        onPress={() => setShowAll(false)}
                        style={styles.showAllBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Hide full list"
                      >
                        <Text
                          style={[
                            styles.showAllText,
                            accent ? { color: accent.color } : null,
                          ]}
                        >
                          Hide all
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              ) : (
                libraryRows.map((opt) => renderOption(opt))
              )}

              {listEmpty && !hasSuggestions ? (
                <Text style={styles.empty}>No matches</Text>
              ) : null}

              {canCreate ? (
                <Pressable
                  onPress={() => void handleCreate()}
                  disabled={creating}
                  style={styles.createOption}
                >
                  {creating ? (
                    <ActivityIndicator color={colors.sunrise} size="small" />
                  ) : (
                    <Text style={styles.createText} numberOfLines={1}>
                      Create “{query.trim()}”
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {createError ? (
                <Text style={styles.error}>{createError}</Text>
              ) : null}
            </ScrollView>

            {multi ? (
              <Pressable onPress={close} style={styles.doneBar}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerWrap: {
    minWidth: 88,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  triggerWrapTool: {
    // Match FormSelect shape trigger — fixed equal width.
    width: 128,
    maxWidth: 128,
    alignSelf: 'auto',
  },
  triggerWrapFill: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
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
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerDisabled: {
    opacity: 0.5,
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
  triggerPlaceholder: {
    color: colors.textMuted,
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
    maxHeight: 320,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  search: {
    fontFamily: typography.font,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  list: {
    maxHeight: 220,
  },
  sectionLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  showAllBtn: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  showAllText: {
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.sunrise,
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
  optionTextMuted: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.textDim,
  },
  empty: {
    padding: 12,
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textDim,
  },
  createOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 154, 90, 0.08)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.sunrise,
  },
  error: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    fontFamily: typography.font,
    fontSize: 12,
    color: colors.sunset,
  },
  doneBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  doneText: {
    fontFamily: typography.fontSemiBold,
    fontSize: 14,
    color: colors.sunrise,
  },
});
