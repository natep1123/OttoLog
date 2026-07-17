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
import { ListSearchBar } from '../../components/ListSearchBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import {
  createManagedTaxonomy,
  deleteTaxonomy,
  listManagedTaxonomy,
  renameTaxonomy,
  setTaxonomyArchived,
  taxonomyKindLabel,
  taxonomyKindSingular,
  type ManagedTaxonomyRow,
  type TaxonomyKind,
} from '../../lib/taxonomy';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Props = {
  kind: TaxonomyKind;
  onBrandPress?: () => void;
  onBack: () => void;
};

type ConfirmKind = 'archive' | 'unarchive' | 'delete' | null;

/** Shared CRUD list for tools, primary groups, and analytics tags. */
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
    if (renameBusy || confirmBusy) return;
    setSelected(null);
    setSheetError(null);
    setConfirmKind(null);
  };

  const openRow = (row: ManagedTaxonomyRow) => {
    if (row.isSystem) return;
    setSelected(row);
    setRenameValue(row.name);
    setSheetError(null);
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
    if (row.isSystem) return 'System default — locked';
    if (row.usageCount === 0) return 'Unused';
    if (kind === 'analytics_tag') {
      return `Used on ${row.usageCount} template${row.usageCount === 1 ? '' : 's'}`;
    }
    return `Used by ${row.usageCount} template${row.usageCount === 1 ? '' : 's'}`;
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
        subtitle="Create, rename, archive. Hard delete only when unused."
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && rows.length === 0 ? (
            <Text style={styles.empty}>
              No {taxonomyKindLabel(kind).toLowerCase()} yet.
            </Text>
          ) : null}
          {!error && rows.length > 0 && filteredRows.length === 0 ? (
            <Text style={styles.empty}>
              No matches for “{searchQuery.trim()}”.
            </Text>
          ) : null}
          {filteredRows.map((row) => {
            const archived = row.archivedAt != null;
            return (
              <Pressable
                key={row.id}
                onPress={() => openRow(row)}
                disabled={row.isSystem}
                style={({ pressed }) => [
                  styles.item,
                  archived && styles.itemArchived,
                  pressed && !row.isSystem && styles.itemPressed,
                ]}
              >
                <View style={styles.itemCopy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemTitle}>{row.name}</Text>
                    {row.isSystem ? (
                      <Text style={styles.badge}>System</Text>
                    ) : null}
                    {archived ? (
                      <Text style={styles.badgeMuted}>Archived</Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemMeta}>{usageLabel(row)}</Text>
                </View>
                {!row.isSystem ? (
                  <Text style={styles.chevron}>›</Text>
                ) : null}
              </Pressable>
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
                !renameValue.trim() ||
                renameValue.trim() === selected?.name
              }
            />

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
                Hard delete is available only when unused. Prefer archive.
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
  empty: {
    fontFamily: typography.font,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgPanel,
  },
  itemArchived: {
    opacity: 0.72,
  },
  itemPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255, 154, 90, 0.06)',
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 17,
    color: colors.text,
  },
  badge: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  badgeMuted: {
    fontFamily: typography.fontSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  itemMeta: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
  },
  chevron: {
    fontFamily: typography.fontMedium,
    fontSize: 22,
    color: colors.textDim,
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
});
