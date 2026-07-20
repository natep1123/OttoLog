import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ExpansionControllerValue = {
  /** Bumps when Tools asks every exercise card to collapse. */
  collapseExercisesSignal: number;
  /** Bumps when Tools asks every card in the tree to expand. */
  expandAllSignal: number;
  /**
   * Bumps when a parent card is opened by the user — immediate children
   * whose `parentLockId` matches `collapseChildrenParentId` should collapse.
   * Independent of lock state. Not used by expandAll.
   */
  collapseChildrenSignal: number;
  collapseChildrenParentId: string | null;
  collapseAllExercises: () => void;
  expandAll: () => void;
  collapseChildrenOf: (parentId: string) => void;
};

const ExpansionControllerContext =
  createContext<ExpansionControllerValue | null>(null);

/**
 * Broadcasts expand/collapse across builder cards.
 * Per-card open state stays local — tools and parent-open cascade send signals.
 */
export function ExpansionControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapseExercisesSignal, setCollapseExercisesSignal] = useState(0);
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseChildrenSignal, setCollapseChildrenSignal] = useState(0);
  const [collapseChildrenParentId, setCollapseChildrenParentId] = useState<
    string | null
  >(null);

  const collapseAllExercises = useCallback(() => {
    setCollapseExercisesSignal((n) => n + 1);
  }, []);

  const expandAll = useCallback(() => {
    setExpandAllSignal((n) => n + 1);
  }, []);

  const collapseChildrenOf = useCallback((parentId: string) => {
    setCollapseChildrenParentId(parentId);
    setCollapseChildrenSignal((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      collapseExercisesSignal,
      expandAllSignal,
      collapseChildrenSignal,
      collapseChildrenParentId,
      collapseAllExercises,
      expandAll,
      collapseChildrenOf,
    }),
    [
      collapseExercisesSignal,
      expandAllSignal,
      collapseChildrenSignal,
      collapseChildrenParentId,
      collapseAllExercises,
      expandAll,
      collapseChildrenOf,
    ],
  );

  return (
    <ExpansionControllerContext.Provider value={value}>
      {children}
    </ExpansionControllerContext.Provider>
  );
}

export function useExpansionController() {
  return useContext(ExpansionControllerContext);
}
