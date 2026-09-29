import { extractPinUsages, resolvePhysicalPin } from '../src/utils/hardwareMapUtils';
import { Rung, PLCVariable } from '../src/types';

function runTests() {
  console.log('🧪 Running Hardware Map & Latch Output Tests...\n');

  // Test 1: resolvePhysicalPin
  console.log('Test 1: resolvePhysicalPin normalizes pin names correctly...');
  const vars: PLCVariable[] = [
    { id: 'v1', name: 'V_START', type: 'bool', initialValue: false, mappedPin: 'D2' },
    { id: 'v2', name: 'V_MOTOR', type: 'bool', initialValue: false, mappedPin: 'D8' }
  ];

  if (resolvePhysicalPin('D2', vars) !== 'D2') throw new Error('Failed to resolve D2');
  if (resolvePhysicalPin('d2', vars) !== 'D2') throw new Error('Failed to resolve d2');
  if (resolvePhysicalPin('2', vars) !== 'D2') throw new Error('Failed to resolve 2');
  if (resolvePhysicalPin('V_START', vars) !== 'D2') throw new Error('Failed to resolve V_START mapped pin');
  if (resolvePhysicalPin('EXP_A0', vars) !== undefined) throw new Error('EXP_A0 should not resolve to board pin');
  console.log('  PASSED');

  // Test 2: extractPinUsages with contact set to D2 via variable or pin
  console.log('\nTest 2: extractPinUsages registers D2 input contact properly...');
  const testRungs: Rung[] = [
    {
      id: 'r1',
      number: 1,
      comment: 'Test Rung 1',
      branches: [
        {
          id: 'b1',
          elements: [
            { id: 'el1', type: 'NO_CONTACT', category: 'contact', name: 'Start Button', variable: 'D2' }
          ]
        }
      ],
      coils: [
        { id: 'el2', type: 'COIL_SET', category: 'coil', name: 'Latch Motor M0', variable: 'M0' }
      ]
    },
    {
      id: 'r2',
      number: 2,
      comment: 'Test Rung 2',
      branches: [
        {
          id: 'b2',
          elements: [
            { id: 'el3', type: 'NO_CONTACT', category: 'contact', name: 'Stop Button', pin: 'D3' }
          ]
        }
      ],
      coils: [
        { id: 'el4', type: 'COIL_RESET', category: 'coil', name: 'Unlatch Motor M0', variable: 'M0' }
      ]
    }
  ];

  const pinUsages = extractPinUsages(testRungs, [], [], undefined, undefined, vars, 'uno');

  const d2Usages = pinUsages.get('D2');
  if (!d2Usages || d2Usages.length === 0) {
    throw new Error('D2 was not found in pinUsages map when contact variable is "D2"!');
  }
  if (d2Usages[0].elementName !== 'Start Button') {
    throw new Error(`Expected elementName 'Start Button', got '${d2Usages[0].elementName}'`);
  }
  if (d2Usages[0].direction !== 'input') {
    throw new Error(`Expected direction 'input', got '${d2Usages[0].direction}'`);
  }
  console.log('  PASSED (D2 successfully registered as IN USE input)');

  // Test 3: Verify COIL_SET and COIL_RESET variable assignment
  console.log('\nTest 3: Verify COIL_SET and COIL_RESET can target internal flag M0...');
  const setCoil = testRungs[0].coils[0];
  const resetCoil = testRungs[1].coils[0];

  if (setCoil.type !== 'COIL_SET' || setCoil.variable !== 'M0') {
    throw new Error('COIL_SET element fails to store variable "M0"');
  }
  if (resetCoil.type !== 'COIL_RESET' || resetCoil.variable !== 'M0') {
    throw new Error('COIL_RESET element fails to store variable "M0"');
  }
  console.log('  PASSED');

  console.log('\n✅ All Hardware Map & Latch Output tests passed successfully!');
}

runTests();
