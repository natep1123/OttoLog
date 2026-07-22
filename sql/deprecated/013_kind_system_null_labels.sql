-- Rename layer-label system nulls to the bare kind words.
-- Session / Block / Sequence (was Uncategorized / General / Standard).
-- IDs stay fixed — see src/constants/sentinelIds.ts
--
-- Requires: 004_taxonomy, 011_layer_labels, 012_standard_sequence_label

update public.session_categories
set name = 'Session'
where id = '40000000-0000-4000-8000-000000000002'
  and is_system_default = true
  and user_id is null;

update public.block_labels
set name = 'Block'
where id = '50000000-0000-4000-8000-000000000001'
  and is_system_default = true
  and user_id is null;

update public.cluster_labels
set name = 'Sequence'
where id = '60000000-0000-4000-8000-000000000001'
  and is_system_default = true
  and user_id is null;

notify pgrst, 'reload schema';
