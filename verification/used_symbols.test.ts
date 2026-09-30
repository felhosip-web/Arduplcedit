import { extractUsedSymbols } from '../src/utils/symbolExtractor';
import { generateArduinoCode } from '../src/utils/codeGenerator';
import { Rung, PLCConstant, PLCVariable } from '../src/types';

console.log('🧪 Running Symbol Extractor and Unused Code Filter Test...');

const testRungs: Rung[] = [
  {
    id: 'r1',
    number: 0,
    branches: [
      {
        id: 'b1',
        elements: [
          {
            id: 'e1',
            type: 'NO_CONTACT',
            category: 'contact',
            name: 'Contact 1',
            pin: 'D2',
            variable: 'USED_VAR'
          }
        ]
      }
    ],
    coils: [
      {
        id: 'c1',
        type: 'COIL_SET',
        category: 'coil',
        name: 'Coil 1',
        pin: 'D8',
        variable: 'M0'
      }
    ]
  }
];

const constants: PLCConstant[] = [
  { id: 'c1', name: 'USED_CONST', type: 'int', value: 100 },
  { id: 'c2', name: 'UNUSED_CONST', type: 'int', value: 999 }
];

const variables: PLCVariable[] = [
  { id: 'v1', name: 'USED_VAR', type: 'int', initialValue: 0 },
  { id: 'v2', name: 'UNUSED_VAR', type: 'int', initialValue: 42 }
];

// Test symbolExtractor directly
const symbols = extractUsedSymbols(testRungs, [], [], undefined, constants, variables, []);

if (!symbols.inputPins.has('D2')) throw new Error('D2 pin should be in inputPins');
if (!symbols.outputPins.has('D8')) throw new Error('D8 pin should be in outputPins');
if (!symbols.markerBits.has('M0')) throw new Error('M0 bit should be in markerBits');

const usedConstNames = symbols.usedConstants.map((c) => c.name);
if (usedConstNames.includes('UNUSED_CONST')) throw new Error('UNUSED_CONST should be filtered out');

const usedVarNames = symbols.usedVariables.map((v) => v.name);
if (!usedVarNames.includes('USED_VAR')) throw new Error('USED_VAR should be included');
if (usedVarNames.includes('UNUSED_VAR')) throw new Error('UNUSED_VAR should be filtered out');

// Test codeGenerator filtering
const code = generateArduinoCode(testRungs, [], 'Test_Project', [], constants, variables, []);

if (code.includes('UNUSED_CONST')) throw new Error('Generated C++ code should NOT include UNUSED_CONST');
if (code.includes('UNUSED_VAR')) throw new Error('Generated C++ code should NOT include UNUSED_VAR');
if (!code.includes('USED_VAR')) throw new Error('Generated C++ code MUST include USED_VAR');

console.log('✅ Symbol Extraction and Code Generator Filtering Passed Successfully!');
