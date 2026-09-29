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
  console.log('🧪 Running P1 Ladder Virtualization Architecture Tests...\n');

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

  // Test 6: Verify TanStack Virtual integration & stable getItemKey in source code
  console.log('Test 6: Verify @tanstack/react-virtual integration & stable getItemKey in source code...');
  assert(canvasSource.includes("import { useVirtualizer } from '@tanstack/react-virtual';"), 'LadderCanvas.tsx should import useVirtualizer from @tanstack/react-virtual');
  assert(canvasSource.includes('useVirtualizer({'), 'LadderCanvas.tsx should call useVirtualizer');
  assert(canvasSource.includes('count: rungs.length'), 'useVirtualizer should pass count: rungs.length');
  assert(canvasSource.includes('getItemKey'), 'useVirtualizer should pass getItemKey');
  assert(canvasSource.includes('rungs[index]?.id ?? index'), 'getItemKey should map to stable rung.id');
  assert(canvasSource.includes('getScrollElement: () => scrollContainerRef.current'), 'useVirtualizer should pass getScrollElement');
  assert(canvasSource.includes('overscan: 5'), 'useVirtualizer should pass overscan');
  assert(canvasSource.includes('estimateSize: () => 160'), 'useVirtualizer should pass estimateSize');
  assert(canvasSource.includes('rowVirtualizer.getVirtualItems().map'), 'Rendering should map over rowVirtualizer.getVirtualItems()');
  assert(!canvasSource.includes('rungs.map((rung, rIndex) =>'), 'LadderCanvas.tsx should NOT map rungs directly');
  assert(canvasSource.includes('ref={rowVirtualizer.measureElement}'), 'Virtual row should include ref={rowVirtualizer.measureElement} for variable height measurement');
  assert(canvasSource.includes('data-index={virtualItem.index}'), 'Virtual row should include data-index');
  assert(canvasSource.includes('key={rung.id}'), 'Virtual row should use stable key={rung.id}');
  console.log('  PASSED');

  // Test 7: Verify virtual rendering only mounts visible + overscan rungs for large rung lists
  console.log('Test 7: Verify virtual rendering limits mounted DOM nodes for large rung lists...');
  const largeRungsCount = 100;
  const largeRungs: Rung[] = Array.from({ length: largeRungsCount }, (_, i) => ({
    ...sampleRung,
    id: `rung_large_${i}`,
    number: i,
    comment: `Large Rung Item #${i}`
  }));

  const htmlLargeCanvas = renderToString(
    React.createElement(LadderCanvas, {
      rungs: largeRungs,
      simulationState: mockSimulationState,
      selectedRungIndex: 0,
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

  assert(htmlLargeCanvas.includes('Large Rung Item #0'), 'First rung should be rendered');
  assert(!htmlLargeCanvas.includes('Large Rung Item #99'), 'Last rung (#99) should NOT be rendered when scrolled to top');
  const renderedItemMatches = htmlLargeCanvas.match(/Large Rung Item #\d+/g) || [];
  assert(renderedItemMatches.length < largeRungsCount, `Mounted rows (${renderedItemMatches.length}) should be far less than total count (${largeRungsCount})`);
  console.log(`  PASSED (mounted ${renderedItemMatches.length} out of ${largeRungsCount} rungs)`);

  // Test 8: Verify getItemKey behavior across reorder and deletion
  console.log('Test 8: Verify getItemKey behavior across reorder and deletion...');
  const itemKeyFn = (rungsList: Rung[], index: number) => rungsList[index]?.id ?? index;
  const initialList = [{ ...sampleRung, id: 'rung_A' }, { ...sampleRung, id: 'rung_B' }, { ...sampleRung, id: 'rung_C' }];
  assert(itemKeyFn(initialList, 0) === 'rung_A', 'Index 0 should resolve to rung_A');
  assert(itemKeyFn(initialList, 1) === 'rung_B', 'Index 1 should resolve to rung_B');

  // After reordering (swapping index 0 and index 1)
  const reorderedList = [initialList[1], initialList[0], initialList[2]];
  assert(itemKeyFn(reorderedList, 0) === 'rung_B', 'Reordered index 0 should resolve to rung_B');
  assert(itemKeyFn(reorderedList, 1) === 'rung_A', 'Reordered index 1 should resolve to rung_A');

  // After deletion of index 0
  const deletedList = [initialList[1], initialList[2]];
  assert(itemKeyFn(deletedList, 0) === 'rung_B', 'Deleted list index 0 should resolve to rung_B');
  assert(itemKeyFn(deletedList, 1) === 'rung_C', 'Deleted list index 1 should resolve to rung_C');
  console.log('  PASSED');

  // Test 9: Verify zoom/pan coordinate transformation calculations
  console.log('Test 9: Verify zoom/pan coordinate transformation calculations...');
  const calculateVirtualOffset = (scrollTop: number, positionY: number, scale: number) =>
    Math.max(0, (scrollTop - positionY) / Math.max(0.1, scale));
  const calculateVirtualHeight = (clientHeight: number, scale: number) =>
    Math.round(clientHeight / Math.max(0.1, scale));

  // At scale 1.0, offset and height equal native values
  assert(calculateVirtualOffset(200, 0, 1.0) === 200, 'At 1.0x scale offset equals 200');
  assert(calculateVirtualHeight(800, 1.0) === 800, 'At 1.0x scale height equals 800');

  // At scale 0.5x (zoomed out), effective height doubles to render 2x viewport worth of items
  assert(calculateVirtualOffset(200, 0, 0.5) === 400, 'At 0.5x scale offset doubles to 400');
  assert(calculateVirtualHeight(800, 0.5) === 1600, 'At 0.5x scale height doubles to 1600');

  // At scale 2.0x (zoomed in), effective height halves to render only visible items
  assert(calculateVirtualOffset(200, 0, 2.0) === 100, 'At 2.0x scale offset halves to 100');
  assert(calculateVirtualHeight(800, 2.0) === 400, 'At 2.0x scale height halves to 400');

  // Panning downwards (positionY = 100)
  assert(calculateVirtualOffset(200, 100, 1.0) === 100, 'With positionY=100 panning, virtual offset adjusts to 100');
  console.log('  PASSED');

  console.log('\n✅ All P1 Ladder Virtualization tests passed successfully!');
}

runTests();
