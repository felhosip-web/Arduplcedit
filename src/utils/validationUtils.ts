import { Rung, LadderElement, ElementCategory, PLCVariable, PLCConstant, PLCArray } from '../types';

export interface ValidationError {
  rungId: string;
  message: string;
}

const ADDRESS_REGEX = /^(X|Y|M|T|C|D)\d+$/;

/**
 * Validates a single rung for structural, logical, and reference errors.
 */
export function validateRung(rung: Rung, variables?: PLCVariable[], constants?: PLCConstant[], arrays?: PLCArray[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. A rung should have at least one branch with elements, or at least one coil.
  const hasElements = rung.branches.some(b => b.elements.length > 0) || rung.coils.length > 0;
  if (!hasElements) {
    errors.push({ rungId: rung.id, message: 'Üres létrafok: Adjon hozzá érintkezőket vagy tekercseket.' });
  }

  // 2. Coils (outputs) should only be placed in the coils section.
  rung.branches.forEach(branch => {
    branch.elements.forEach(el => {
      if (isCoilOrModule(el.category)) {
        errors.push({ rungId: rung.id, message: `Helytelen elem a bemeneti ágban: ${el.name}. Tekercset vagy modult csak a kimeneti (jobb) oldalra lehet tenni.` });
      }
    });
  });

  // 3. Only Coils and Modules should be in the coils section.
  rung.coils.forEach(coil => {
    if (!isCoilOrModule(coil.category)) {
      errors.push({ rungId: rung.id, message: `Helytelen elem a kimeneti oldalon: ${coil.name}. Csak tekercset vagy modult tehet ide.` });
    }
  });

  // 4. Validate addressing formats (e.g. X0, Y0, M0) if they exist.
  const validateAddress = (el: LadderElement, field: string | undefined) => {
    if (field && typeof field === 'string' && ADDRESS_REGEX.test(field)) {
      // It's a formatted address, we could add further domain validation here if needed.
    } else if (field && typeof field === 'string' && field.length > 0 && !field.includes('_') && field.length <= 4 && /^[A-Z]\d+$/.test(field)) {
       if(!ADDRESS_REGEX.test(field)) {
         errors.push({ rungId: rung.id, message: `Érvénytelen címzés a(z) ${el.name} elemben: ${field}. Helyes formátum pl: X0, Y0, M0.` });
       }
    }
  };

  const validateReference = (el: LadderElement, refId?: string) => {
    if (!refId || !variables || !constants) return;

    // Check if it looks like an ID
    if (refId.startsWith('var_') || refId.startsWith('const_')) {
      const exists = variables.some(v => v.id === refId) || constants.some(c => c.id === refId);
      if (!exists) {
        errors.push({ rungId: rung.id, message: `Árva hivatkozás a(z) ${el.name} elemben. A változó vagy konstans törölve lett.` });
      }
    }
  };

  rung.branches.forEach(branch => branch.elements.forEach(el => {
    validateAddress(el, el.variable);
    validateAddress(el, el.pin);
    validateReference(el, el.variable);
    validateReference(el, el.targetVariable);
  }));

  rung.coils.forEach(coil => {
    validateAddress(coil, coil.variable);
    validateAddress(coil, coil.pin);
    validateReference(coil, coil.variable);
    validateReference(coil, coil.targetVariable);
  });

  return errors;
}

/**
 * Validates a list of rungs.
 */
export function validateRungs(rungs: Rung[], variables?: PLCVariable[], constants?: PLCConstant[], arrays?: PLCArray[]): ValidationError[] {
  let allErrors: ValidationError[] = [];
  rungs.forEach(rung => {
    allErrors = [...allErrors, ...validateRung(rung, variables, constants, arrays)];
  });
  return allErrors;
}

/**
 * Helper to determine if an element category belongs to the output (coil) side.
 */
export function isCoilOrModule(category: ElementCategory | string): boolean {
  return ['coil', 'timer', 'counter', 'library_module', 'subroutine', 'protocol'].includes(category);
}
