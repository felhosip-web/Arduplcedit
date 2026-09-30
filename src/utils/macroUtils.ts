import { Rung, Subroutine } from '../types';

export interface MacroInsertionContext {
  activeSubroutineId?: string | null;
  subroutines: Subroutine[];
  effectiveMainRungs: Rung[];
}

export interface MacroInsertionResult {
  updatedSubroutines?: Subroutine[];
  updatedMainRungs?: Rung[];
}

/**
 * Pure helper for inserting template rungs from a macro into either active subroutine or main ladder.
 */
export function insertMacroRungs(
  macroRungs: Rung[],
  context: MacroInsertionContext
): MacroInsertionResult {
  const { activeSubroutineId, subroutines, effectiveMainRungs } = context;

  if (activeSubroutineId) {
    const targetSub = subroutines.find((s) => s.id === activeSubroutineId);
    const currentSubRungs = targetSub?.rungs || [];
    const startNum = currentSubRungs.length;
    const renumbered = macroRungs.map((r, i) => ({
      ...r,
      number: startNum + i
    }));

    const updatedSubroutines = subroutines.map((sub) =>
      sub.id === activeSubroutineId
        ? { ...sub, rungs: [...sub.rungs, ...renumbered] }
        : sub
    );

    return { updatedSubroutines };
  } else {
    const startNum = effectiveMainRungs.length;
    const renumbered = macroRungs.map((r, i) => ({
      ...r,
      number: startNum + i
    }));

    const updatedMainRungs = [...effectiveMainRungs, ...renumbered];

    return { updatedMainRungs };
  }
}
