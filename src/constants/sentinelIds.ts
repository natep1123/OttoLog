/**
 * Fixed UUIDs for global taxonomy sentinels.
 * Must match sql/004_taxonomy.sql, sql/011_layer_labels.sql, and sql/013 renames.
 */

export const NO_TOOL_ID = '40000000-0000-4000-8000-000000000001';
/** Session label system null — "Session" (table: session_categories) */
export const UNCATEGORIZED_ID = '40000000-0000-4000-8000-000000000002';
/** Block label system null — "Block" */
export const GENERAL_BLOCK_LABEL_ID = '50000000-0000-4000-8000-000000000001';
/** Sequence label system null — "Sequence" (internal cluster_labels table) */
export const CLUSTER_LABEL_NULL_ID = '60000000-0000-4000-8000-000000000001';
