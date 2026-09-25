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

  // Check JMP elements for required labelName
  for (const coil of rung.coils) {
    if (coil.type === 'JMP' && (!coil.labelName || coil.labelName.trim() === '')) {
      errors.push({ rungId: rung.id, message: 'Ugrás (JMP) elem hiányzó célpont címkenévvel.' });
    }
  }

  // 1. A rung should have at least one branch with elements, or at least one coil.
  const hasElements = rung.branches.some(b => b.elements.length > 0) || rung.coils.length > 0;
  if (!hasElements) {
    errors.push({ rungId: rung.id, message: 'Üres létrafok: Adjon hozzá érintkezőket vagy tekercseket.' });
  }

  // Restrict outputs to maximum 1 coil per rung
  if (rung.coils.length > 1) {
    errors.push({ rungId: rung.id, message: 'Egy fokon csak egy kimenet (tekercs) lehet.' });
  }

  // Check missing binding on contacts and coils
  const isContactWithMissingBinding = (el: LadderElement) => {
    return ['NO_CONTACT', 'NC_CONTACT', 'RISING_EDGE', 'FALLING_EDGE'].includes(el.type) &&
      (!el.variable || el.variable.trim() === '') &&
      (!el.pin || el.pin.trim() === '');
  };

  const isCoilWithMissingBinding = (el: LadderElement) => {
    return ['COIL_NORMAL', 'COIL_INV', 'COIL_SET', 'COIL_RESET'].includes(el.type) &&
      (!el.variable || el.variable.trim() === '') &&
      (!el.pin || el.pin.trim() === '');
  };

  rung.branches.forEach(branch => {
    branch.elements.forEach(el => {
      if (isContactWithMissingBinding(el)) {
        errors.push({ rungId: rung.id, message: `Hiányzó kötés a(z) „${el.name}” érintkezőben: Nincs megadva sem pin, sem változó.` });
      }
    });
  });

  rung.coils.forEach(coil => {
    if (isCoilWithMissingBinding(coil)) {
      errors.push({ rungId: rung.id, message: `Hiányzó kötés a(z) „${coil.name}” tekercsben: Nincs megadva sem pin, sem változó.` });
    }
  });

  // 2. Coils (outputs) should only be placed in the coils section.
  rung.branches.forEach(branch => {
    branch.elements.forEach(el => {
      if (isCoilOrModule(el.category, el.type)) {
        errors.push({ rungId: rung.id, message: `Helytelen elem a bemeneti ágban: ${el.name}. Tekercset vagy modult csak a kimeneti (jobb) oldalra lehet tenni.` });
      }
    });
  });

  // 3. Only Coils and Modules should be in the coils section.
  rung.coils.forEach(coil => {
    if (!isCoilOrModule(coil.category, coil.type)) {
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

  // Check JMP targets and duplicate LBL markers within the same program rungs
  const lblRungsByName: Record<string, number[]> = {};

  rungs.forEach((rung, index) => {
    const collectLabels = (el: LadderElement) => {
      if (el.type === 'LBL' && el.labelName && el.labelName.trim() !== '') {
        const lbl = el.labelName.trim();
        if (!lblRungsByName[lbl]) {
          lblRungsByName[lbl] = [];
        }
        lblRungsByName[lbl].push(index);
      }
    };

    rung.coils.forEach(collectLabels);
    rung.branches.forEach(b => b.elements.forEach(collectLabels));
  });

  // Report duplicate labels
  for (const [lbl, indices] of Object.entries(lblRungsByName)) {
    if (indices.length > 1) {
      indices.forEach(idx => {
        allErrors.push({
          rungId: rungs[idx].id,
          message: `Duplikált LBL címkenév (${lbl}): a címkének egyedinek kell lennie a programban.`
        });
      });
    }
  }

  // Validate JMP targets
  rungs.forEach((rung, index) => {
    for (const coil of rung.coils) {
      if (coil.type === 'JMP' && coil.labelName) {
        const targetName = coil.labelName.trim();
        const targetIndices = lblRungsByName[targetName] || [];

        if (targetIndices.length === 0) {
          allErrors.push({ rungId: rung.id, message: `Hiányzó célpont LBL címke (${targetName}) a JMP utasításhoz.` });
        } else if (targetIndices.some(idx => idx < index)) {
          allErrors.push({ rungId: rung.id, message: `Visszafelé ugrás nem támogatott (${targetName}). A cél LBL címkének későbbi létrán kell lennie.` });
        }
      }
    }
  });

  // Duplicate coil / double write detection
  const writesByTarget: Record<string, { rungId: string; rungNumber: number; name: string }[]> = {};

  const registerWrite = (targetKey: string, rungId: string, rungNumber: number, name: string) => {
    if (!targetKey || targetKey.trim() === '') return;
    const key = targetKey.trim();
    if (!writesByTarget[key]) {
      writesByTarget[key] = [];
    }
    writesByTarget[key].push({ rungId, rungNumber, name });
  };

  rungs.forEach((rung) => {
    rung.coils.forEach(coil => {
      // Coils or variable assignments / operations that write to pin or variable
      if (['COIL_NORMAL', 'COIL_INV', 'COIL_SET', 'COIL_RESET'].includes(coil.type)) {
        if (coil.pin) registerWrite(`PIN:${coil.pin}`, rung.id, rung.number, coil.pin);
        if (coil.variable) registerWrite(`VAR:${coil.variable}`, rung.id, rung.number, coil.variable);
      } else if (coil.category === 'variable_op' || coil.type === 'VAR_ASSIGN') {
        if (coil.targetVariable) registerWrite(`VAR:${coil.targetVariable}`, rung.id, rung.number, coil.targetVariable);
        if (coil.variable) registerWrite(`VAR:${coil.variable}`, rung.id, rung.number, coil.variable);
      }
    });
  });

  for (const [targetKey, occurrences] of Object.entries(writesByTarget)) {
    if (occurrences.length > 1) {
      const displayName = targetKey.replace(/^(PIN|VAR):/, '');
      const rungNumbersStr = occurrences.map(o => `Fok #${o.rungNumber}`).join(', ');
      occurrences.forEach(occ => {
        allErrors.push({
          rungId: occ.rungId,
          message: `Figyelmeztetés: „${displayName}” több tekercsről / modulról is íródik (${rungNumbersStr}).`
        });
      });
    }
  }

  return allErrors;
}

/**
 * Helper to determine if an element category/type belongs to the output (coil/module) side.
 */
export function isCoilOrModule(category?: ElementCategory | string, type?: string): boolean {
  if (!category && !type) return false;
  if (category === 'contact') return false;

  const CONTACT_TYPES = [
    'NO_CONTACT',
    'NC_CONTACT',
    'RISING_EDGE',
    'FALLING_EDGE',
    'ANALOG_CMP',
    'INTERNAL_FLAG_CONTACT',
    'VAR_CMP',
    'BUFFER_EMPTY',
    'BUFFER_FULL',
    'NRF24_AVAILABLE',
    'EEPROM_24C_CHECK',
    'RTC_TIME_RANGE',
    'RTC_TIME_CMP',
    'RTC_CALENDAR_RANGE',
    'RTC_PULSE_TICK',
    'MODBUS_STATUS',
    'BOD_STATUS',
    'SD_CARD_READY'
  ];

  if (type && CONTACT_TYPES.includes(type)) {
    return false;
  }

  return ['coil', 'timer', 'counter', 'library_module', 'subroutine', 'protocol', 'variable_op', 'variable', 'rtc'].includes(category || '');
}
