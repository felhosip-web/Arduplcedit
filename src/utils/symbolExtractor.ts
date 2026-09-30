import {
  Rung,
  Subroutine,
  PLCConstant,
  PLCVariable,
  PLCArray,
  Task,
  FBDDiagram,
  StateMachine,
  InterruptsConfig,
  LadderElement
} from '../types';

export interface UsedSymbolsResult {
  inputPins: Set<string>;
  outputPins: Set<string>;
  analogPins: Set<string>;
  markerBits: Set<string>; // M0, M1, M2, ...
  usedConstants: PLCConstant[];
  usedVariables: PLCVariable[];
  usedArrays: PLCArray[];
}

export function extractUsedSymbols(
  rungs: Rung[],
  setupRungs: Rung[] = [],
  subroutines: Subroutine[] = [],
  tasks?: Task[],
  constants: PLCConstant[] = [],
  variables: PLCVariable[] = [],
  arrays: PLCArray[] = [],
  stateMachines: StateMachine[] = [],
  interrupts?: InterruptsConfig
): UsedSymbolsResult {
  const inputPins = new Set<string>();
  const outputPins = new Set<string>();
  const analogPins = new Set<string>();
  const markerBits = new Set<string>();
  const referencedSymbolNames = new Set<string>();

  // Gather ladder execution rungs
  const allRungsList: Rung[] = [...rungs, ...setupRungs];
  subroutines.forEach((sub) => {
    allRungsList.push(...sub.rungs);
  });

  if (tasks && tasks.length > 0) {
    tasks.forEach((t) => {
      t.programs.forEach((p) => {
        if (p.type === 'ladder' && p.rungs) {
          allRungsList.push(...p.rungs);
        }
      });
    });
  }

  // Gather FBD programs
  const fbdDiagramsList: FBDDiagram[] = [];
  if (tasks && tasks.length > 0) {
    tasks.forEach((t) => {
      t.programs.forEach((p) => {
        if (p.type === 'fbd' && p.fbd) {
          fbdDiagramsList.push(p.fbd);
        }
      });
    });
  }

  // Analyze FBD diagrams
  fbdDiagramsList.forEach((fbd) => {
    fbd.blocks.forEach((block) => {
      if (block.properties?.variable) {
        const v = block.properties.variable.trim();
        referencedSymbolNames.add(v);
        if (/^M\d+$/i.test(v)) markerBits.add(v.toUpperCase());
        if (/^D\d+$/i.test(v)) {
          if (block.type === 'INPUT') inputPins.add(v.toUpperCase());
          if (block.type === 'OUTPUT') outputPins.add(v.toUpperCase());
        }
        if (/^A\d+$/i.test(v)) analogPins.add(v.toUpperCase());
      }
    });
  });

  function inspectString(val?: string) {
    if (!val) return;
    const str = val.trim();
    if (!str) return;

    referencedSymbolNames.add(str);

    if (/^M\d+$/i.test(str)) {
      markerBits.add(str.toUpperCase());
    }

    if (/^D\d+$/i.test(str)) {
      // Physical digital pin
    } else if (/^A\d+$/i.test(str)) {
      analogPins.add(str.toUpperCase());
    }
  }

  function analyzeElement(el: LadderElement) {
    if (el.pin) {
      if (el.pin.startsWith('A')) analogPins.add(el.pin);
      else if (el.pin.startsWith('D')) {
        if (el.category === 'contact') inputPins.add(el.pin);
        else if (el.category === 'coil' || el.category === 'library_module') outputPins.add(el.pin);
      }
    }

    inspectString(el.variable);
    inspectString(el.sourceVariable);
    inspectString(el.targetVariable);
    inspectString(el.operandB);
    inspectString(el.operandC);
    inspectString(el.pointerVar);
    inspectString(el.dallasTargetVar);
    inspectString(el.expanderTargetVar);
    inspectString(el.modbusValueVar);
    inspectString(el.modbusTargetVar);
    inspectString(el.arrayName);
    inspectString(el.sourceArray);
    inspectString(el.destArray);

    if (el.mathExpression) {
      // Find identifiers in math expressions
      const tokens = el.mathExpression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      tokens.forEach((t) => referencedSymbolNames.add(t));
    }

    if (el.assignExpression) {
      const tokens = el.assignExpression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      tokens.forEach((t) => referencedSymbolNames.add(t));
    }
  }

  allRungsList.forEach((r) => {
    r.branches.forEach((b) => b.elements.forEach(analyzeElement));
    r.coils.forEach(analyzeElement);
  });

  // State machine inspect
  stateMachines.forEach((sm) => {
    referencedSymbolNames.add(`SM_${sm.id}_STATE`);
    referencedSymbolNames.add(`SM_${sm.id}_ENTERED_AT`);
  });

  // Interrupts inspect
  if (interrupts) {
    if (interrupts.int0.enabled && interrupts.int0.targetVariable) inspectString(interrupts.int0.targetVariable);
    if (interrupts.int1.enabled && interrupts.int1.targetVariable) inspectString(interrupts.int1.targetVariable);
    if (interrupts.timer1.enabled && interrupts.timer1.targetVariable) inspectString(interrupts.timer1.targetVariable);
  }

  // Filter constants, variables, arrays
  const usedConstants = constants.filter((c) => referencedSymbolNames.has(c.name));
  const usedVariables = variables.filter(
    (v) => referencedSymbolNames.has(v.name) || v.isSystem || v.isRetentive
  );
  const usedArrays = arrays.filter(
    (a) => referencedSymbolNames.has(a.name)
  );

  return {
    inputPins,
    outputPins,
    analogPins,
    markerBits,
    usedConstants,
    usedVariables,
    usedArrays
  };
}
