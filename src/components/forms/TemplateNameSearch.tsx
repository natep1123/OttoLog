import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, layer, radii, typography } from '../../theme/tokens';
import type { FormNodeKind } from './formTokens';

export type TemplateSearchHit = {
  id: string;
  name?: string | null;
};

export type TemplateNameSearchHandle = {
  focus: () => void;
};

type Props<T extends TemplateSearchHit> = Omit<
  TextInputProps,
  'value' | 'onChangeText'
> & {
  value: string;
  onChangeText: (text: string) => void;
  kind: FormNodeKind;
  listTemplates: () => Promise<{ data: T[]; error: string | null }>;
  onPickTemplate?: (template: T) => void;
  /** Resolve a library row to a display/search title. */
  getDisplayTitle?: (row: T) => string;
  resultMeta?: string;
  /** Notify parent when the field gains/loses focus (e.g. search icon). */
  onFocusChange?: (focused: boolean) => void;
};

/**
 * Outlined Name/Brief field with typeahead over a template library.
 * Results stay in-tree so the keyboard/focus is never stolen.
 */
function TemplateNameSearchInner<T extends TemplateSearchHit>(
  {
    value,
    onChangeText,
    kind,
    listTemplates,
    onPickTemplate,
    getDisplayTitle,
    resultMeta = 'Library template',
    style,
    placeholder,
    onFocusChange,
    ...rest
  }: Props<T>,
  ref: ForwardedRef<TemplateNameSearchHandle>,
) {
  const accent = layer[kind].chip.color;
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<T[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const titleOf = (row: T) =>
    getDisplayTitle?.(row) || row.name?.trim() || 'Untitled';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (!focused || q.length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await listTemplates();
      setLoading(false);
      const lower = q.toLowerCase();
      const matched = data
        .filter((row) => {
          const title = titleOf(row).toLowerCase();
          const brief = row.name?.toLowerCase() ?? '';
          return title.includes(lower) || brief.includes(lower);
        })
        .slice(0, 8);
      setHits(matched);
      setOpen(matched.length > 0);
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused, listTemplates, getDisplayTitle]);

  const close = () => setOpen(false);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocusChange?.(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setFocused(false);
            onFocusChange?.(false);
          }, 180);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        selectionColor={accent}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="search"
        style={[
          styles.input,
          focused && {
            borderColor: accent,
            shadowColor: accent,
            shadowOpacity: 0.35,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
        {...rest}
      />
      {open && hits.length > 0 ? (
        <View style={styles.menu}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={accent} size="small" />
            </View>
          ) : null}
          {hits.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => {
                // Keep owned brief empty if library row had none; copy loads full draft.
                onChangeText(row.name?.trim() ?? '');
                onPickTemplate?.(row);
                close();
                setFocused(false);
                onFocusChange?.(false);
              }}
              style={styles.option}
            >
              <Text style={styles.optionTitle} numberOfLines={1}>
                {titleOf(row)}
              </Text>
              <Text style={styles.optionMeta}>{resultMeta}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const TemplateNameSearch = forwardRef(TemplateNameSearchInner) as <
  T extends TemplateSearchHit,
>(
  props: Props<T> & { ref?: Ref<TemplateNameSearchHandle> },
) => ReactElement | null;

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0,
    width: '100%',
    zIndex: 20,
  },
  input: {
    width: '100%',
    fontFamily: typography.fontMedium,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
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
    maxHeight: 240,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  option: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.text,
  },
  optionMeta: {
    fontFamily: typography.font,
    fontSize: 11,
    color: colors.textDim,
  },
});
