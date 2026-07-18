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
  collapseSignal: number;
  /** Bumps when Tools asks every exercise card to expand. */
  expandSignal: number;
  collapseAllExercises: () => void;
  expandAllExercises: () => void;
};

const ExpansionControllerContext =
  createContext<ExpansionControllerValue | null>(null);

/**
 * Broadcasts expand/collapse to every `ExerciseEditor` under a builder screen.
 * Keeps per-card open state local — tools only send one-shot signals.
 */
export function ExpansionControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);

  const collapseAllExercises = useCallback(() => {
    setCollapseSignal((n) => n + 1);
  }, []);

  const expandAllExercises = useCallback(() => {
    setExpandSignal((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      collapseSignal,
      expandSignal,
      collapseAllExercises,
      expandAllExercises,
    }),
    [
      collapseSignal,
      expandSignal,
      collapseAllExercises,
      expandAllExercises,
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
