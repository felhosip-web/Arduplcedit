import { insertMacroRungs } from '../src/utils/macroUtils';
import { Rung, Subroutine } from '../src/types';

console.log('🧪 Running Comprehensive Macro Insertion Test...');

// Mock macro template rungs
const macroTemplateRungs: Rung[] = [
  {
    id: 'macro_r1',
    number: 0,
    comment: 'Start Motor Macro',
    branches: [
      {
        id: 'mb1',
        elements: [
          { id: 'mel1', type: 'NO_CONTACT', variable: 'D2', category: 'contact', name: 'START' }
        ]
      }
    ],
    coils: [
      { id: 'mc1', type: 'COIL_SET', variable: 'M0', category: 'coil', name: 'MOTOR_RUN' }
    ]
  }
];

// Test Case 1: Main Ladder Insertion
console.log('Test 1: Main Ladder Insertion via insertMacroRungs...');
const initialMainRungs: Rung[] = [
  {
    id: 'main_r0',
    number: 0,
    comment: 'Existing main rung',
    branches: [{ id: 'b0', elements: [] }],
    coils: []
  }
];

const mainResult = insertMacroRungs(macroTemplateRungs, {
  activeSubroutineId: null,
  subroutines: [],
  effectiveMainRungs: initialMainRungs
});

if (!mainResult.updatedMainRungs) {
  throw new Error('Expected updatedMainRungs to be returned for main ladder insertion');
}
if (mainResult.updatedMainRungs.length !== 2) {
  throw new Error(`Expected 2 main rungs, got ${mainResult.updatedMainRungs.length}`);
}
if (mainResult.updatedMainRungs[1].number !== 1) {
  throw new Error(`Expected renumbered index 1, got ${mainResult.updatedMainRungs[1].number}`);
}
if (mainResult.updatedMainRungs[1].comment !== 'Start Motor Macro') {
  throw new Error('Macro comment mismatch on main insertion');
}
console.log('  PASSED');

// Test Case 2: Active Subroutine Insertion
console.log('Test 2: Active Subroutine Insertion via insertMacroRungs...');
const initialSubroutines: Subroutine[] = [
  {
    id: 'sub_1',
    name: 'Motor FC',
    codeIdentifier: 'FC_Motor',
    description: 'Subroutine for motor control',
    inputs: [],
    outputs: [],
    rungs: [
      {
        id: 'sub_r0',
        number: 0,
        comment: 'Existing sub rung',
        branches: [{ id: 'sb0', elements: [] }],
        coils: []
      }
    ],
    createdAt: Date.now()
  }
];

const subResult = insertMacroRungs(macroTemplateRungs, {
  activeSubroutineId: 'sub_1',
  subroutines: initialSubroutines,
  effectiveMainRungs: initialMainRungs
});

if (!subResult.updatedSubroutines) {
  throw new Error('Expected updatedSubroutines to be returned for subroutine insertion');
}
const targetSub = subResult.updatedSubroutines.find((s) => s.id === 'sub_1');
if (!targetSub) {
  throw new Error('Target subroutine sub_1 not found in updatedSubroutines');
}
if (targetSub.rungs.length !== 2) {
  throw new Error(`Expected 2 sub rungs, got ${targetSub.rungs.length}`);
}
if (targetSub.rungs[1].number !== 1) {
  throw new Error(`Expected renumbered sub rung 1, got ${targetSub.rungs[1].number}`);
}
if (targetSub.rungs[1].comment !== 'Start Motor Macro') {
  throw new Error('Macro comment mismatch on subroutine insertion');
}
console.log('  PASSED');

console.log('✅ All Macro Insertion Tests Passed Successfully!');
