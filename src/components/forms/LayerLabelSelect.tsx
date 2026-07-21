import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { layer } from '../../theme/tokens';
import { defaultLabelWord } from '../../lib/displayTitles';
import {
  createBlockLabel,
  createClusterLabel,
  createSessionLabel,
  listBlockLabels,
  listClusterLabels,
  listSessionLabels,
  mergeTaxonomyOptions,
  resolveTaxonomyOptions,
  type TaxonomyKind,
  type TaxonomyOption,
} from '../../lib/taxonomy';
import { SearchableSelect } from './SearchableSelect';

type LabelKind = 'session_label' | 'block_label' | 'cluster_label';
type LayerKind = 'session' | 'block' | 'cluster';

type Props = {
  kind: LabelKind;
  value: string;
  labelName?: string | null;
  onChange: (
    id: string,
    labelName: string,
    meta?: { isEmpty?: boolean },
  ) => void;
  accessibilityLabel?: string;
};

async function listFor(kind: LabelKind) {
  if (kind === 'session_label') return listSessionLabels();
  if (kind === 'block_label') return listBlockLabels();
  return listClusterLabels();
}

function layerKindFor(kind: LabelKind): LayerKind {
  if (kind === 'session_label') return 'session';
  if (kind === 'block_label') return 'block';
  return 'cluster';
}

async function createFor(
  kind: LabelKind,
  userId: string,
  name: string,
) {
  if (kind === 'session_label') return createSessionLabel(userId, name);
  if (kind === 'block_label') return createBlockLabel(userId, name);
  return createClusterLabel(userId, name);
}

/** Mandatory label combobox for Session / Block / Sequence headers. */
export function LayerLabelSelect({
  kind,
  value,
  labelName,
  onChange,
  accessibilityLabel = 'Label',
}: Props) {
  const { user } = useAuth();
  const layerKind = layerKindFor(kind);
  const accent = {
    color: layer[layerKind].chip.color,
    border: layer[layerKind].border,
    background: layer[layerKind].chip.background,
  };
  const initialLabel =
    labelName?.trim() || defaultLabelWord(layerKind, value);
  const [options, setOptions] = useState<TaxonomyOption[]>(() =>
    value ? [{ id: value, label: initialLabel }] : [],
  );

  const load = useCallback(async () => {
    const { data } = await listFor(kind);
    let next = data;
    if (value) {
      const { data: resolved } = await resolveTaxonomyOptions(
        kind as TaxonomyKind,
        [value],
      );
      next = mergeTaxonomyOptions(data, resolved);
      if (
        labelName &&
        !next.some((o) => o.id === value)
      ) {
        next = [
          ...next,
          { id: value, label: labelName, isArchived: true },
        ];
      }
    }
    setOptions(next);
  }, [kind, value, labelName]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SearchableSelect
      accent={accent}
      mode="single"
      value={value}
      onChange={(id) => {
        if (!id) return;
        const hit = options.find((o) => o.id === id);
        onChange(id, hit?.label ?? labelName ?? 'Label', {
          isEmpty: hit?.isEmpty,
        });
      }}
      options={options}
      onOptionsChange={setOptions}
      onCreate={async (name) => {
        if (!user?.id) return { data: null, error: 'Not signed in.' };
        return createFor(kind, user.id, name);
      }}
      placeholder="Label"
      emptyLabel={initialLabel}
      clearable={false}
      fill
      accessibilityLabel={accessibilityLabel}
    />
  );
}
