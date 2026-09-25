import { Rung, LadderElement, ParallelBranch } from '../types';
import { isCoilOrModule } from '../utils/validationUtils';

/**
 * Pure, framework-agnostic domain logic for manipulating ladder rungs.
 */

// Adds a new element to a rung. If the element is a coil, it goes to the coils array (max 1 coil per rung).
// Otherwise, it's appended to the primary branch, or a new branch is created if none exists.
export const addElementToRung = (
  rungs: Rung[],
  targetIdx: number,
  elementData: Partial<LadderElement>
): Rung[] => {
  if (rungs.length === 0) return rungs;

  const safeIdx = Math.min(Math.max(targetIdx, 0), rungs.length - 1);
  const targetRung = rungs[safeIdx];

  const newElement: LadderElement = {
    id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: elementData.type || 'NO_CONTACT',
    category: elementData.category || 'contact',
    name: elementData.name || 'ELEM',
    pin: elementData.pin,
    variable: elementData.variable,
    libraryId: elementData.libraryId,
    presetMs: elementData.presetMs,
    presetCount: elementData.presetCount,
    servoAngle: elementData.servoAngle,
    lcdText: elementData.lcdText,
    subroutineId: elementData.subroutineId,
    subroutineBindings: elementData.subroutineBindings,
    customCppCall: elementData.customCppCall,
    comment: elementData.comment
  };

  const isOutput = isCoilOrModule(newElement.category, newElement.type);

  const updatedRungs = [...rungs];
  if (isOutput) {
    if (targetRung.coils.length >= 1) {
      // Do not allow more than 1 coil per rung
      return rungs;
    }
    updatedRungs[safeIdx] = {
      ...targetRung,
      coils: [...targetRung.coils, newElement]
    };
  } else {
    const currentBranches = [...targetRung.branches];
    if (currentBranches.length === 0) {
      currentBranches.push({ id: `b_${Date.now()}`, elements: [newElement] });
    } else {
      currentBranches[0] = {
        ...currentBranches[0],
        elements: [...currentBranches[0].elements, newElement]
      };
    }
    updatedRungs[safeIdx] = {
      ...targetRung,
      branches: currentBranches
    };
  }

  return updatedRungs;
};

// Deletes a specific element by ID from any branch or coil array
export const deleteElementFromRungs = (rungs: Rung[], elementId: string): Rung[] => {
  return rungs.map(r => ({
    ...r,
    branches: r.branches.map(b => ({
      ...b,
      elements: b.elements.filter(el => el.id !== elementId)
    })),
    coils: r.coils.filter(c => c.id !== elementId)
  }));
};

export const createEmptyRung = (index: number, isSubroutine: boolean): Rung => {
  return {
    id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    number: index,
    comment: isSubroutine ? `Alprogram logikai lépés #${index}` : '',
    branches: [{ id: `branch_${Date.now()}`, elements: [] }],
    coils: []
  };
};

export const duplicateRung = (rungs: Rung[], idToDuplicate: string): Rung[] => {
  const rungToDup = rungs.find(r => r.id === idToDuplicate);
  if (!rungToDup) return rungs;

  const dup: Rung = {
    ...rungToDup,
    id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    number: rungs.length,
    branches: rungToDup.branches.map(b => ({
      ...b,
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      elements: b.elements.map(el => ({ ...el, id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` }))
    })),
    coils: rungToDup.coils.map(c => ({ ...c, id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` }))
  };

  return [...rungs, dup];
};

export const moveRung = (rungs: Rung[], idToMove: string, direction: 'up' | 'down'): Rung[] => {
  const index = rungs.findIndex(r => r.id === idToMove);
  if (index === -1) return rungs;

  const newIdx = direction === 'up' ? index - 1 : index + 1;
  if (newIdx < 0 || newIdx >= rungs.length) return rungs;

  const copy = [...rungs];
  const temp = copy[index];
  copy[index] = copy[newIdx];
  copy[newIdx] = temp;

  // Reassign sequential numbers
  return copy.map((r, i) => ({ ...r, number: i }));
};

export const addParallelBranch = (rungs: Rung[], rungId: string): Rung[] => {
  return rungs.map(r => {
    if (r.id !== rungId) return r;
    return {
      ...r,
      branches: [...r.branches, { id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, elements: [] }]
    };
  });
};

export const deleteParallelBranch = (rungs: Rung[], rungId: string, branchId: string): Rung[] => {
  return rungs.map(r => {
    if (r.id !== rungId) return r;
    if (r.branches.length <= 1) return r; // Ensure at least 1 branch remains
    return {
      ...r,
      branches: r.branches.filter(b => b.id !== branchId)
    };
  });
};
