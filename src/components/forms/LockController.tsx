import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Stable ids for top-level builder roots (nested items use their blob ids). */
export const LOCK_ROOT = {
  session: 'session-root',
  block: 'block-root',
  cluster: 'cluster-root',
  exercise: 'exercise-root',
} as const;

type LockControllerValue = {
  /** Bumps after register/unregister so consumers re-read the parent tree. */
  treeVersion: number;
  /** Own lock flag for this node (ignores ancestors). */
  isOwnLocked: (id: string) => boolean;
  /** True when this node or any ancestor is locked. */
  isEffectivelyLocked: (id: string) => boolean;
  /** True when an ancestor (not self) is locked — toggle disabled. */
  isForcedByAncestor: (id: string) => boolean;
  /**
   * Lock this node. No-op when an ancestor is locked.
   */
  setLocked: (id: string, locked: boolean) => void;
  /**
   * Unlock this node and own-lock each immediate child id.
   * Child ids come from draft data (children may be unmounted while parent is locked).
   */
  unlock: (id: string, lockChildren?: string[]) => void;
  /** Clear every lock in the workspace. */
  unlockAll: () => void;
  toggleLocked: (id: string, lockChildren?: string[]) => void;
  /** Stable — safe as a useEffect dependency. */
  register: (id: string, parentId: string | null) => void;
  /** Stable — safe as a useEffect dependency. */
  unregister: (id: string) => void;
};

const LockControllerContext = createContext<LockControllerValue | null>(null);

function isForcedByAncestorIn(
  id: string,
  lockedIds: Set<string>,
  parents: Map<string, string | null>,
): boolean {
  let parent = parents.get(id) ?? null;
  while (parent) {
    if (lockedIds.has(parent)) return true;
    parent = parents.get(parent) ?? null;
  }
  return false;
}

/**
 * Ephemeral lock / view mode for template builders.
 * Orthogonal to expand/collapse; not persisted to draft JSON or the DB.
 */
export function LockControllerProvider({
  children,
  initialLockedIds,
}: {
  children: ReactNode;
  /** Pre-lock these ids on mount (e.g. library review opens locked). */
  initialLockedIds?: string[];
}) {
  const [lockedIds, setLockedIds] = useState(
    () => new Set(initialLockedIds ?? []),
  );
  const parentsRef = useRef(new Map<string, string | null>());
  const childrenRef = useRef(new Map<string, Set<string>>());
  // Re-render consumers when the parent tree changes (register after mount).
  const [treeVersion, setTreeVersion] = useState(0);

  // Intentionally stable: must not change identity or useNodeLock's effect loops.
  const register = useCallback((id: string, parentId: string | null) => {
    const prevParent = parentsRef.current.get(id);
    if (prevParent === parentId && parentsRef.current.has(id)) return;

    if (prevParent != null) {
      childrenRef.current.get(prevParent)?.delete(id);
    }
    parentsRef.current.set(id, parentId);
    if (parentId != null) {
      let kids = childrenRef.current.get(parentId);
      if (!kids) {
        kids = new Set();
        childrenRef.current.set(parentId, kids);
      }
      kids.add(id);
    }
    setTreeVersion((n) => n + 1);
  }, []);

  const unregister = useCallback((id: string) => {
    if (!parentsRef.current.has(id)) return;

    const parentId = parentsRef.current.get(id);
    if (parentId != null) {
      childrenRef.current.get(parentId)?.delete(id);
    }
    parentsRef.current.delete(id);
    childrenRef.current.delete(id);
    setLockedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTreeVersion((n) => n + 1);
  }, []);

  const isOwnLocked = useCallback(
    (id: string) => lockedIds.has(id),
    [lockedIds],
  );

  const isForcedByAncestor = useCallback(
    (id: string) =>
      isForcedByAncestorIn(id, lockedIds, parentsRef.current),
    // treeVersion: parent links live in refs; bump forces a fresh closure read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lockedIds, treeVersion],
  );

  const isEffectivelyLocked = useCallback(
    (id: string) => lockedIds.has(id) || isForcedByAncestor(id),
    [lockedIds, isForcedByAncestor],
  );

  const setLocked = useCallback((id: string, locked: boolean) => {
    setLockedIds((prev) => {
      if (isForcedByAncestorIn(id, prev, parentsRef.current)) return prev;

      if (locked) {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      }

      // Prefer unlock() so children receive own locks; plain false only clears self.
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const unlock = useCallback((id: string, lockChildren: string[] = []) => {
    setLockedIds((prev) => {
      if (isForcedByAncestorIn(id, prev, parentsRef.current)) return prev;

      const next = new Set(prev);
      next.delete(id);
      for (const childId of lockChildren) {
        if (childId && childId !== id) next.add(childId);
      }
      return next;
    });
  }, []);

  const unlockAll = useCallback(() => {
    setLockedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const toggleLocked = useCallback(
    (id: string, lockChildren: string[] = []) => {
      setLockedIds((prev) => {
        if (isForcedByAncestorIn(id, prev, parentsRef.current)) return prev;

        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          for (const childId of lockChildren) {
            if (childId && childId !== id) next.add(childId);
          }
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      treeVersion,
      isOwnLocked,
      isEffectivelyLocked,
      isForcedByAncestor,
      setLocked,
      unlock,
      unlockAll,
      toggleLocked,
      register,
      unregister,
    }),
    [
      treeVersion,
      isOwnLocked,
      isEffectivelyLocked,
      isForcedByAncestor,
      setLocked,
      unlock,
      unlockAll,
      toggleLocked,
      register,
      unregister,
    ],
  );

  return (
    <LockControllerContext.Provider value={value}>
      {children}
    </LockControllerContext.Provider>
  );
}

export function useLockController() {
  return useContext(LockControllerContext);
}

/**
 * Register a node in the lock tree and return effective lock + toggle helpers.
 * `getChildIds` supplies immediate children to own-lock when this node unlocks
 * (needed because children may be unmounted while the parent is locked).
 */
export function useNodeLock(
  id: string,
  parentId: string | null = null,
  getChildIds?: () => string[],
) {
  const controller = useLockController();
  const register = controller?.register;
  const unregister = controller?.unregister;
  const getChildIdsRef = useRef(getChildIds);
  getChildIdsRef.current = getChildIds;

  useEffect(() => {
    if (!register || !unregister) return;
    register(id, parentId);
    return () => unregister(id);
  }, [register, unregister, id, parentId]);

  const locked = controller?.isEffectivelyLocked(id) ?? false;
  const forcedByAncestor = controller?.isForcedByAncestor(id) ?? false;
  const ownLocked = controller?.isOwnLocked(id) ?? false;

  return {
    locked,
    ownLocked,
    forcedByAncestor,
    canToggle: Boolean(controller) && !forcedByAncestor,
    toggle: () =>
      controller?.toggleLocked(id, getChildIdsRef.current?.() ?? []),
    setLocked: (next: boolean) => {
      if (next) controller?.setLocked(id, true);
      else controller?.unlock(id, getChildIdsRef.current?.() ?? []);
    },
    controller,
  };
}
