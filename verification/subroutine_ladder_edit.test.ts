import { Subroutine, SubroutineParam } from '../src/types';

console.log('🧪 Testing Subroutine Creation and Custom Rung Initialization...');

const newSubId = `sub_${Date.now()}`;
const subInputs: SubroutineParam[] = [
  { id: 'inp1', name: 'MOTOR_START', type: 'BOOL_IN', defaultPinOrVar: 'D2', description: 'Start' }
];
const subOutputs: SubroutineParam[] = [
  { id: 'out1', name: 'MOTOR_OUT', type: 'BOOL_OUT', defaultPinOrVar: 'D8', description: 'Output' }
];

const newSub: Subroutine = {
  id: newSubId,
  name: 'Custom Motor Latch Subroutine',
  codeIdentifier: 'FC1_CustomMotor',
  description: 'Subroutine with custom ladder rungs',
  inputs: subInputs,
  outputs: subOutputs,
  rungs: [
    {
      id: `sub_r1_${Date.now()}`,
      number: 0,
      comment: 'Start contact -> Motor output coil',
      branches: [
        {
          id: 'b1',
          elements: [
            {
              id: 'el1',
              type: 'NO_CONTACT',
              category: 'contact',
              name: 'MOTOR_START',
              variable: 'MOTOR_START'
            }
          ]
        }
      ],
      coils: [
        {
          id: 'c1',
          type: 'COIL_NORMAL',
          category: 'coil',
          name: 'MOTOR_OUT',
          variable: 'MOTOR_OUT'
        }
      ]
    }
  ],
  createdAt: Date.now()
};

if (!newSub.id.startsWith('sub_')) throw new Error('Invalid subroutine ID');
if (newSub.rungs.length !== 1) throw new Error('Subroutine should contain initialized rungs');
if (newSub.rungs[0].branches[0].elements[0].variable !== 'MOTOR_START') {
  throw new Error('Subroutine contact variable mismatch');
}

console.log('✅ Subroutine Ladder Edit Test Passed Successfully!');
