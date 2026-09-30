import { extractPinUsages, resolvePhysicalPin } from '../src/utils/hardwareMapUtils';
import { normalizeCoilBinding } from '../src/utils/coilBindingUtils';
import { extractUsedSymbols } from '../src/utils/symbolExtractor';
import { Rung, PLCVariable, LadderElement } from '../src/types';

function runTests() {
  console.log('🧪 Running Hardware Map, Coil Binding & Symbol Extractor Tests...\n');

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
  if (resolvePhysicalPin('M0', vars) !== undefined) throw new Error('M0 marker should not resolve to board pin');
  if (resolvePhysicalPin('SM_1HZ', vars) !== undefined) throw new Error('SM_1HZ system bit should not resolve to board pin');
  console.log('  PASSED');

  // Test 2: normalizeCoilBinding - Mutual Exclusivity
  console.log('Test 2: normalizeCoilBinding enforces physical pin / internal marker mutual exclusivity...');
  const initialCoilPin: LadderElement = {
    id: 'c1',
    type: 'COIL_SET',
    category: 'coil',
    name: 'Set Motor',
    pin: 'D8',
    variable: undefined
  };

  // Switch Physical -> Marker
  const markerBinding = normalizeCoilBinding(initialCoilPin, 'var', undefined, 'M0');
  if (markerBinding.pin !== undefined) throw new Error('Marker binding must have pin = undefined');
  if (markerBinding.variable !== 'M0') throw new Error('Marker binding variable must be M0');

  // Switch Marker -> Physical
  const initialCoilMarker: LadderElement = {
    id: 'c2',
    type: 'COIL_RESET',
    category: 'coil',
    name: 'Reset Motor',
    pin: undefined,
    variable: 'M0'
  };
  const pinBinding = normalizeCoilBinding(initialCoilMarker, 'pin', 'D9', undefined);
  if (pinBinding.variable !== undefined) throw new Error('Pin binding must have variable = undefined');
  if (pinBinding.pin !== 'D9') throw new Error('Pin binding pin must be D9');
  console.log('  PASSED');

  // Test 3: Stale binding regression in Hardware Map
  console.log('Test 3: Hardware Map ignores stale physical pin when element is bound to internal marker M0...');
  const staleRungs: Rung[] = [
    {
      id: 'r_stale',
      number: 0,
      comment: 'Stale element rung',
      branches: [
        {
          id: 'b1',
          elements: [
            { id: 'el1', type: 'NO_CONTACT', category: 'contact', name: 'Start', variable: 'D2' }
          ]
        }
      ],
      coils: [
        {
          id: 'c_stale',
          type: 'COIL_SET',
          category: 'coil',
          name: 'Latch M0',
          pin: 'D8', // Stale physical pin left over from previous mode!
          variable: 'M0'
        }
      ]
    }
  ];

  const staleUsages = extractPinUsages(staleRungs, [], [], undefined, undefined, [], 'uno');
  if (staleUsages.has('D8')) {
    throw new Error('D8 should NOT be registered as in-use when coil variable is internal marker M0!');
  }
  console.log('  PASSED (Stale pin D8 correctly ignored for M0 marker coil)');

  // Test 4: extractPinUsages with contact set to D2
  console.log('Test 4: extractPinUsages registers D2 input contact properly...');
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
  console.log('  PASSED');

  // Test 5: Marker bit matching in symbolExtractor
  console.log('Test 5: Symbol Extractor strictly matches marker bits (M0, M1, M100) and ignores arbitrary identifiers (MOTOR, MAIN_STATE)...');
  const markerTestRungs: Rung[] = [
    {
      id: 'r_m',
      number: 0,
      branches: [
        {
          id: 'b_m',
          elements: [
            { id: 'e_m1', type: 'NO_CONTACT', category: 'contact', name: 'M0 Contact', variable: 'M0' },
            { id: 'e_m2', type: 'NO_CONTACT', category: 'contact', name: 'Motor Contact', variable: 'MOTOR' },
            { id: 'e_m3', type: 'NO_CONTACT', category: 'contact', name: 'State Contact', variable: 'MAIN_STATE' }
          ]
        }
      ],
      coils: [
        { id: 'c_m1', type: 'COIL_NORMAL', category: 'coil', name: 'M100 Coil', variable: 'M100' }
      ]
    }
  ];

  const symbols = extractUsedSymbols(markerTestRungs, [], [], undefined, [], [], []);
  if (!symbols.markerBits.has('M0')) throw new Error('M0 should be in markerBits');
  if (!symbols.markerBits.has('M100')) throw new Error('M100 should be in markerBits');
  if (symbols.markerBits.has('MOTOR')) throw new Error('MOTOR should NOT be in markerBits');
  if (symbols.markerBits.has('MAIN_STATE')) throw new Error('MAIN_STATE should NOT be in markerBits');
  console.log('  PASSED');

  console.log('\n✅ All Hardware Map, Coil Binding & Symbol Extractor tests passed successfully!');
}

runTests();
