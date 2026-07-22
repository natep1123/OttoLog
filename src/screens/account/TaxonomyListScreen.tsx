import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ListCard } from '../../components/ListCard';
import { ListSearchBar } from '../../components/ListSearchBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusText } from '../../components/StatusText';
import { TextField } from '../../components/TextField';
import {
  createAnalyticsTag,
  createManagedTaxonomy,
  deleteTaxonomy,
  listAnalyticsTags,
  listManagedTaxonomy,
  listPrimaryGroupSuggestedTagIds,
  mergeTaxonomyOptions,
  renameTaxonomy,
  resolveTaxonomyOptions,
  setPrimaryGroupSuggestedTags,
  setSessionLabelEmpty,
  setTaxonomyArchived,
  taxonomyKindLabel,
  taxonomyKindSingular,
  type ManagedTaxonomyRow,
  type TaxonomyKind,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { SearchableSelect } from '../../components/forms/SearchableSelect';
import { ToggleChip } from '../../components/forms/ToggleChip';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  kind: TaxonomyKind;
  onBrandPress?: () => void;
  onBack: () => void;
};

type ConfirmKind = 'archive' | 'unarchive' | 'delete' | null;

/** Shared CRUD list for tools, primary groups, and variations. */
export function TaxonomyListScreen({ kind, onBrandPress, onBack }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const singular = taxonomyKindSingular(kind);

  const [rows, setRows] = useState<ManagedTaxonomyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  const [selected, setSelected] = useState<ManagedTaxonomyRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [emptyBusy, setEmptyBusy] = useState(false);
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<TaxonomyOption[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const { data, error: listError } = await listManagedTaxonomy(
        kind,
        showArchived,
      );
      setLoading(false);
      setRefreshing(false);
      if (listError) {
        setError(listError);
        return;
      }
      setRows(data);
    },
    [kind, showArchived],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const closeSheet = () => {
    if (renameBusy || confirmBusy || emptyBusy || suggestionsBusy) return;
    setSelected(null);
    setSheetError(null);
    setConfirmKind(null);
    setSuggestedTagIds([]);
    setTagOptions([]);
  };

  const openRow = (row: ManagedTaxonomyRow) => {
    if (row.isSystem) return;
    setSelected(row);
    setRenameValue(row.name);
    setSheetError(null);
    setSuggestedTagIds([]);
    setTagOptions([]);
    if (kind === 'primary_group') {
      void (async () => {
        const [suggested, tags] = await Promise.all([
          listPrimaryGroupSuggestedTagIds(row.id),
          listAnalyticsTags(),
        ]);
        const ids = suggested.data;
        const resolved = await resolveTaxonomyOptions('analytics_tag', ids);
        setSuggestedTagIds(ids);
        setTagOptions(mergeTaxonomyOptions(tags.data, resolved.data));
      })();
    }
  };

  const onChangeSuggestedTags = async (nextIds: string[]) => {
    if (!selected || kind !== 'primary_group' || suggestionsBusy) return;
    setSuggestionsBusy(true);
    setSheetError(null);
    const { error: saveError } = await setPrimaryGroupSuggestedTags(
      selected.id,
      nextIds,
    );
    setSuggestionsBusy(false);
    if (saveError) {
      setSheetError(saveError);
      return;
    }
    setSuggestedTagIds(nextIds);
  };

  const onToggleEmpty = async () => {
    if (!selected || kind !== 'session_label' || emptyBusy) return;
    const next = !Boolean(selected.isEmpty);
    setEmptyBusy(true);
    setSheetError(null);
    const { error: emptyError } = await setSessionLabelEmpty(selected.id, next);
    setEmptyBusy(false);
    if (emptyError) {
      setSheetError(emptyError);
      return;
    }
    setSelected({ ...selected, isEmpty: next });
    await load(true);
  };

  const onCreate = async () => {
    if (!userId || creating) return;
    const trimmed = createName.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    const { error: createError } = await createManagedTaxonomy(
      kind,
      userId,
      trimmed,
    );
    setCreating(false);
    if (createError) {
      setError(createError);
      return;
    }
    setCreateName('');
    await load(true);
  };

  const onRename = async () => {
    if (!selected || renameBusy) return;
    setRenameBusy(true);
    setSheetError(null);
    const { error: renameError } = await renameTaxonomy(
      kind,
      selected.id,
      renameValue,
    );
    setRenameBusy(false);
    if (renameError) {
      setSheetError(renameError);
      return;
    }
    setSelected(null);
    await load(true);
  };

  const runConfirm = async () => {
    if (!selected || !confirmKind) return;
    setConfirmBusy(true);
    setSheetError(null);

    let result: { error: string | null };
    if (confirmKind === 'delete') {
      result = await deleteTaxonomy(kind, selected.id);
    } else {
      result = await setTaxonomyArchived(
        kind,
        selected.id,
        confirmKind === 'archive',
      );
    }

    setConfirmBusy(false);
    if (result.error) {
      setConfirmKind(null);
      setSheetError(result.error);
      return;
    }
    setConfirmKind(null);
    setSelected(null);
    await load(true);
  };

  const usageLabel = (row: ManagedTaxonomyRow) => {
    if (row.isSystem) return 'System default. Locked.';
    const parts: string[] = [];
    if (kind === 'session_label' && row.isEmpty) parts.push('Empty session');
    if (row.usageCount === 0) parts.push('Unused');
    else {
      parts.push(
        `Used by ${row.usageCount} template${row.usageCount === 1 ? '' : 's'}`,
      );
    }
    return parts.join(' · ');
  };

  const confirmTitle =
    confirmKind === 'delete'
      ? `Delete ${singular}?`
      : confirmKind === 'archive'
        ? `Archive ${singular}?`
        : confirmKind === 'unarchive'
          ? `Restore ${singular}?`
          : '';

  const confirmMessage =
    confirmKind === 'delete'
      ? `Permanently delete “${selected?.name ?? ''}”? This cannot be undone.`
      : confirmKind === 'archive'
        ? `Archive “${selected?.name ?? ''}”? Pickers will hide it; existing templates keep the reference.`
        : confirmKind === 'unarchive'
          ? `Restore “${selected?.name ?? ''}” to active lists?`
          : '';

  const confirmLabel =
    confirmKind === 'delete'
      ? 'Delete forever'
      : confirmKind === 'archive'
        ? 'Archive'
        : confirmKind === 'unarchive'
          ? 'Restore'
          : 'Confirm';

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={taxonomyKindLabel(kind)}
        subtitle="Create, rename, and archive. Delete only when unused."
        onBack={onBack}
        onBrandPress={onBrandPress}
      />

      <View style={styles.createRow}>
        <View style={styles.createField}>
          <TextField
            label={`New ${singular}`}
            value={createName}
            onChangeText={setCreateName}
            placeholder={`Name…`}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void onCreate()}
          />
        </View>
        <Button
          label={creating ? 'Adding…' : 'Add'}
          onPress={() => void onCreate()}
          disabled={creating || !createName.trim()}
          style={styles.addBtn}
        />
      </View>

      <View style={styles.listControls}>
        <Pressable
          onPress={() => setShowArchived((v) => !v)}
          style={styles.toggle}
          accessibilityRole="button"
        >
          <Text style={styles.toggleText}>
            {showArchived ? 'Hide archived' : 'Show archived'}
          </Text>
        </Pressable>
        <ListSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${taxonomyKindLabel(kind).toLowerCase()}…`}
          accessibilityLabel={`Search ${taxonomyKindLabel(kind).toLowerCase()}`}
          style={styles.searchBar}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.sunrise} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.sunrise}
            />
          }
        >
          {error ? <StatusText tone="error">{error}</StatusText> : null}
          {!error && rows.length === 0 ? (
            <StatusText>
              No {taxonomyKindLabel(kind).toLowerCase()} yet.
            </StatusText>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <StatusText>
              No matches for “{searchQuery.trim()}”.
            </StatusText>
          ) : null}
          {filteredRows.map((row) => {
            const archived = row.archivedAt != null;
            return (
              <ListCard
                key={row.id}
                title={row.name}
                meta={usageLabel(row)}
                onPress={() => openRow(row)}
                disabled={row.isSystem}
                showChevron={!row.isSystem}
                badge={row.isSystem ? 'System' : undefined}
                badgeMuted={archived ? 'Archived' : undefined}
                archived={archived}
              />
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={selected != null && confirmKind == null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Edit {singular}</Text>
            <TextField
              label="Name"
              value={renameValue}
              onChangeText={setRenameValue}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {sheetError ? (
              <Text style={styles.error}>{sheetError}</Text>
            ) : null}
            {selected && selected.usageCount > 0 ? (
              <Text style={styles.hint}>{usageLabel(selected)}</Text>
            ) : null}

            <Button
              label={renameBusy ? 'Saving…' : 'Save name'}
              onPress={() => void onRename()}
              disabled={
                renameBusy ||
                emptyBusy ||
                !renameValue.trim() ||
                renameValue.trim() === selected?.name
              }
            />

            {kind === 'session_label' && selected ? (
              <View style={styles.emptyToggleRow}>
                <ToggleChip
                  label={
                    selected.isEmpty
                      ? 'Empty session on'
                      : 'Empty session off'
                  }
                  active={Boolean(selected.isEmpty)}
                  onPress={() => void onToggleEmpty()}
                />
                <Text style={styles.hint}>
                  Empty sessions cannot have blocks; notes stay editable in
                  More.
                </Text>
              </View>
            ) : null}

            {kind === 'primary_group' && selected ? (
              <View style={styles.suggestBlock}>
                <Text style={styles.fieldLabel}>Suggested variations</Text>
                <Text style={styles.hint}>
                  Soft filter in the exercise form. Empty = full A–Z variation
                  pool.
                </Text>
                <SearchableSelect
                  mode="multi"
                  options={tagOptions}
                  onOptionsChange={setTagOptions}
                  value={suggestedTagIds}
                  onChange={(ids) => void onChangeSuggestedTags(ids)}
                  onCreate={async (name) => {
                    if (!userId)
                      return { data: null, error: 'Not signed in.' };
                    return createAnalyticsTag(userId, name);
                  }}
                  placeholder="Search or create variations…"
                  emptyLabel="No suggested variations"
                  fill
                  accessibilityLabel="Suggested variations for this primary group"
                />
              </View>
            ) : null}

            {selected?.archivedAt ? (
              <Button
                label="Restore"
                variant="ghost"
                onPress={() => setConfirmKind('unarchive')}
              />
            ) : (
              <Button
                label="Archive"
                variant="ghost"
                onPress={() => setConfirmKind('archive')}
              />
            )}

            {selected && selected.usageCount === 0 ? (
              <Button
                label="Delete forever"
                variant="danger"
                onPress={() => setConfirmKind('delete')}
              />
            ) : (
              <Text style={styles.hint}>
                Delete is available only when unused. Prefer archive.
              </Text>
            )}

            <Button label="Cancel" variant="ghost" onPress={closeSheet} />
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirmKind != null}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel="Cancel"
        destructive={confirmKind === 'delete' || confirmKind === 'archive'}
        busy={confirmBusy}
        onConfirm={() => void runConfirm()}
        onCancel={() => {
          if (!confirmBusy) setConfirmKind(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  createField: {
    flex: 1,
  },
  addBtn: {
    marginBottom: 1,
    minWidth: 88,
  },
  listControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
  },
  toggle: {
    flexShrink: 0,
  },
  toggleText: {
    fontFamily: typography.fontMedium,
    fontSize: 14,
    color: colors.sunrise,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 14, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  hint: {
    fontFamily: typography.font,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  emptyToggleRow: {
    gap: spacing.sm,
  },
  suggestBlock: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
});
