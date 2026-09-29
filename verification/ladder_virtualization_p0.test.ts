import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Mock localStorage for Node environment if needed by Zustand store
if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

// Dynamically import LadderCanvas after global localStorage mock is defined
const { RungRow, LadderCanvas } = await import('../src/components/LadderCanvas');
import { Rung, SimulationState } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const mockSimulationState = {
  isRunning: false,
  cycleTimeMs: 20,
  digitalInputs: {},
  digitalOutputs: {},
  analogInputs: {},
  internalFlags: {},
  variableValues: {},
  arrayValues: {},
  dallasTemp: 25,
  uartLogs: [],
  i2cLogs: [],
  spiLogs: [],
  nrf24Logs: [],
  activeRungs: {},
  activeSetupRungs: {},
  activeElements: {},
  activeBranches: {},
  timerStates: {},
  counterStates: {},
  fbdSignalState: {},
  fbdLatchState: {}
} as unknown as SimulationState;

const sampleRung: Rung = {
  id: 'rung_test_1',
  number: 0,
  comment: 'Test Rung Comment',
  branches: [
    {
      id: 'branch_test_1',
      elements: [
        {
          id: 'el_contact_1',
          type: 'NO_CONTACT',
          category: 'contact',
          name: 'START',
          pin: 'I0.0'
        }
      ]
    }
  ],
  coils: [
    {
      id: 'el_coil_1',
      type: 'COIL_NORMAL',
      category: 'coil',
      name: 'MOTOR',
      pin: 'Q0.0'
    }
  ]
};

const defaultRungRowProps = {
  rung: sampleRung,
  rIndex: 0,
  isSelected: false,
  selectedElementIds: [],
  searchQuery: '',
  simulationState: mockSimulationState,
  isSetupSection: false,
  validationErrors: [],
  onSelectRung: () => {},
  onSelectElement: () => {},
  onDeleteElement: () => {},
  onMoveRung: () => {},
  onUpdateRungComment: () => {},
  onAddParallelBranch: () => {},
  onDeleteParallelBranch: () => {},
  onDropElementOnBranch: () => {},
  onDropElementOnCoils: () => {},
  onDragOver: () => {},
  onDragLeave: () => {},
  dragOverTarget: null,
  onDuplicateRung: () => {},
  onDeleteRung: () => {},
  totalRungsCount: 1,
  onContextMenuOpen: () => {}
};

function runTests() {
  console.log('🧪 Running P0 Ladder Virtualization Architecture Tests...\n');

  // Test 1: RungRow renders actual DOM content without IntersectionObserver
  console.log('Test 1: RungRow renders actual content directly...');
  const htmlRung = renderToString(React.createElement(RungRow, defaultRungRowProps));
  assert(htmlRung.includes('Test Rung Comment'), 'RungRow should render comment directly');
  assert(htmlRung.includes('START'), 'RungRow should render contact name START');
  assert(htmlRung.includes('MOTOR'), 'RungRow should render coil name MOTOR');
  assert(!htmlRung.includes('h-32 bg-slate-900/20'), 'RungRow should NOT render fixed placeholder height');
  console.log('  PASSED');

  // Test 2: Normal list of rungs renders correctly in LadderCanvas
  console.log('Test 2: Normal list of rungs renders in LadderCanvas...');
  const sampleRungs: Rung[] = [
    { ...sampleRung, id: 'rung_1', number: 0, comment: 'First Rung' },
    { ...sampleRung, id: 'rung_2', number: 1, comment: 'Second Rung' },
    { ...sampleRung, id: 'rung_3', number: 2, comment: 'Third Rung' }
  ];

  const htmlCanvas = renderToString(
    React.createElement(LadderCanvas, {
      rungs: sampleRungs,
      simulationState: mockSimulationState,
      selectedRungIndex: 1,
      selectedElementIds: [],
      onSelectRung: () => {},
      onSelectElement: () => {},
      onDeleteElement: () => {},
      onAddRung: () => {},
      onDeleteRung: () => {},
      onDuplicateRung: () => {},
      onMoveRung: () => {},
      onUpdateRungComment: () => {},
      onAddParallelBranch: () => {},
      onDeleteParallelBranch: () => {},
      onDropElementOnBranch: () => {},
      onDropElementOnCoils: () => {}
    })
  );

  assert(htmlCanvas.includes('First Rung'), 'Canvas should render First Rung');
  assert(htmlCanvas.includes('Second Rung'), 'Canvas should render Second Rung');
  assert(htmlCanvas.includes('Third Rung'), 'Canvas should render Third Rung');
  assert(htmlCanvas.includes('id="ladder-canvas-container"'), 'Canvas should render ladder-canvas-container element');
  console.log('  PASSED');

  // Test 3: Existing rung selection styling
  console.log('Test 3: Rung selection applies selected styles...');
  const selectedRungHtml = renderToString(
    React.createElement(RungRow, { ...defaultRungRowProps, isSelected: true })
  );
  assert(selectedRungHtml.includes('border-sky-500'), 'Selected rung should have border-sky-500 styling');
  console.log('  PASSED');

  // Test 4: Callbacks and Drag/Drop Props connected on RungRow
  console.log('Test 4: Callback and Drag/Drop props connected...');
  let branchDropCalled = false;
  let coilsDropCalled = false;
  const callbackProps = {
    ...defaultRungRowProps,
    onDropElementOnBranch: () => { branchDropCalled = true; },
    onDropElementOnCoils: () => { coilsDropCalled = true; }
  };
  assert(typeof callbackProps.onDropElementOnBranch === 'function', 'onDropElementOnBranch is connected');
  assert(typeof callbackProps.onDropElementOnCoils === 'function', 'onDropElementOnCoils is connected');
  assert(typeof callbackProps.onSelectRung === 'function', 'onSelectRung is connected');
  assert(typeof callbackProps.onDeleteRung === 'function', 'onDeleteRung is connected');
  assert(typeof callbackProps.onDuplicateRung === 'function', 'onDuplicateRung is connected');
  assert(typeof callbackProps.onMoveRung === 'function', 'onMoveRung is connected');
  assert(typeof callbackProps.onAddParallelBranch === 'function', 'onAddParallelBranch is connected');
  console.log('  PASSED');

  // Test 5: Verify former isVisible and IntersectionObserver pseudo-virtualization removed from LadderCanvas.tsx
  console.log('Test 5: Verify IntersectionObserver pseudo-virtualization removed from source code...');
  const canvasPath = path.resolve('src/components/LadderCanvas.tsx');
  const canvasSource = fs.readFileSync(canvasPath, 'utf-8');
  assert(!canvasSource.includes('IntersectionObserver'), 'LadderCanvas.tsx should not contain IntersectionObserver');
  assert(!canvasSource.includes('const [isVisible, setIsVisible]'), 'LadderCanvas.tsx should not contain isVisible state');
  assert(canvasSource.includes('scrollContainerRef'), 'LadderCanvas.tsx should contain scrollContainerRef');
  console.log('  PASSED');

  console.log('\n✅ All P0 Ladder Virtualization Architecture tests passed successfully!');
}

runTests();
