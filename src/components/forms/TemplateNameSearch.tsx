import { useEffect, useRef, useState } from 'react';
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
  name: string;
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
  resultMeta?: string;
};

/**
 * Outlined name field with typeahead over a template library.
 * Results stay in-tree so the keyboard/focus is never stolen.
 */
export function TemplateNameSearch<T extends TemplateSearchHit>({
  value,
  onChangeText,
  kind,
  listTemplates,
  onPickTemplate,
  resultMeta = 'Library template',
  style,
  placeholder,
  ...rest
}: Props<T>) {
  const accent = layer[kind].chip.color;
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<T[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        .filter((row) => row.name.toLowerCase().includes(lower))
        .slice(0, 8);
      setHits(matched);
      setOpen(matched.length > 0);
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused, listTemplates]);

  const close = () => setOpen(false);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 180);
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
                onChangeText(row.name);
                onPickTemplate?.(row);
                close();
                setFocused(false);
              }}
              style={styles.option}
            >
              <Text style={styles.optionTitle} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.optionMeta}>{resultMeta}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 140,
    zIndex: 20,
  },
  input: {
    width: '100%',
    fontFamily: typography.fontMedium,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
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
