/**
 * Stable lock-tree ids for the Query builder nest (ephemeral UI state via
 * `LockController`). The Query is its own root (doc §4: "Add a `query` root
 * id") — the only static id, since exactly one Query mounts per screen.
 * WHERE (`SectionNode.id`) and each FOR (`SubjectNode.id`) use their own
 * minted draft ids (doc §12 decision 4) — dynamic, not static constants,
 * mirroring how the workout builder locks repeatable Blocks/Exercises off
 * their own blob ids rather than fixed root constants.
 */
export const QB_LOCK_ROOT = 'qb-query-root';
