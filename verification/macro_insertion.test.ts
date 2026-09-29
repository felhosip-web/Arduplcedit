import { useStore } from '../src/store/useStore';
import { Rung } from '../src/types';

console.log('🧪 Running Macro Insertion Unit Test...');

const store = useStore.getState();
const initialRungs = store.history.present.rungs;

const sampleRung: Rung = {
  id: 'test_inserted_rung_1',
  number: initialRungs.length,
  comment: 'Macro test rung',
  branches: [
    {
      id: 'b1',
      elements: [
        {
          id: 'el1',
          type: 'NO_CONTACT',
          variable: 'M0'
        }
      ]
    }
  ],
  coils: [
    {
      id: 'c1',
      type: 'COIL_NORMAL',
      variable: 'M1'
    }
  ]
};

useStore.getState().setRungs([...initialRungs, sampleRung]);

const updatedRungs = useStore.getState().history.present.rungs;
if (updatedRungs.length !== initialRungs.length + 1) {
  throw new Error(`Expected rung count ${initialRungs.length + 1}, got ${updatedRungs.length}`);
}

if (updatedRungs[updatedRungs.length - 1].comment !== 'Macro test rung') {
  throw new Error('Inserted rung comment mismatch');
}

console.log('✅ Macro Insertion Test Passed!');
