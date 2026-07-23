/**
 * Stable lock-tree ids for the Query builder nest (ephemeral UI state via
 * `LockController`). The Query is its own root (doc §4: "Add a `query` root id");
 * the single v1 Section has a fixed id. Breakdowns / Subjects use their node ids.
 */
export const QB_LOCK_ROOT = 'qb-query-root';
export const QB_SECTION_ID = 'qb-section';
