import { create } from 'zustand';
import { Rung, Subroutine, SimulationState, ProjectData, PLCVariable, PLCConstant, PLCArray, ProtocolConfigs, InterruptsConfig, ActionLogEntry, FeatureFlags, LadderElement, Task } from '../types';
import { EXAMPLE_PROJECTS } from '../data/exampleProjects';
import { DEFAULT_SUBROUTINES } from '../data/defaultSubroutines';
import { DEFAULT_VARIABLES, DEFAULT_CONSTANTS, DEFAULT_ARRAYS } from '../data/defaultVariables';
import { SYSTEM_VARIABLES } from '../data/systemVariables';
import { DEFAULT_PROTOCOLS } from '../data/defaultProtocols';
import { DEFAULT_INTERRUPTS } from '../data/defaultInterrupts';
import { addElementToRung, deleteElementFromRungs, createEmptyRung, duplicateRung, moveRung, addParallelBranch, deleteParallelBranch } from '../domain/ladderOperations';

const INITIAL_SIMULATION_STATE: SimulationState = {
  isRunning: false,
  cycleTimeMs: 20,
  digitalInputs: {
    D2: false, D3: false, D4: false, D5: false, D6: false, D7: false
  },
  digitalOutputs: {
    D8: false, D9: false, D10: false, D11: false, D12: false, D13: false
  },
  analogInputs: {
    A0: 512, A1: 0, DHT_TEMP: 26.0, DHT_HUM: 55, ULTRASONIC: 30
  },
  internalFlags: {
    M0: false, M1: false, M2: false, M3: false
  },
  variableValues: {
    V_TEMP_C: 24.5, V_BATCH_COUNT: 0, V_AUTO_MODE: true, V_STATUS_CODE: 1, V_FLOW_RATE: 12.4, V_QUEUE_LEN: 0, V_POPPED_VAL: 0
  },
  arrayValues: {
    RECIPE_SETPOINTS: [25, 40, 65, 80],
    ERROR_CODES: [0, 0, 0, 0, 0, 0, 0, 0],
    QUEUE_BUFFER: [0, 0, 0, 0, 0, 0, 0, 0],
    WORK_BUFFER: [0, 0, 0, 0, 0, 0, 0, 0]
  },
  dallasTemp: 24.5,
  uartLogs: [
    { id: 'uart_init', timestamp: '00:00.0', direction: 'TX', message: 'ARDUINO PLC BOOT OK - SERIAL READY' }
  ],
  i2cLogs: [],
  spiLogs: [],
  nrf24Logs: [],
  eeprom24cMemory: { '0x0010': 45.5, '0x0014': 100 },
  eeprom24cLogs: [],
  bufferLogs: [],
  bufferTriggerStates: {},
  nrf24RxBuffer: null,
  modbusLogs: [],
  rs485DePinActive: false,
  watchdogTimerMs: 0,
  watchdogTimeoutMs: 2000,
  watchdogTripCount: 0,
  powerRailVoltage: 5.0,
  brownoutTripVoltage: 4.3,
  brownoutTripCount: 0,
  mcusrFlags: { porf: true, extrf: false, borf: false, wdrf: false },
  rtcTime: { year: 2026, month: 9, day: 12, hour: 10, minute: 30, second: 0, dayOfWeek: 6 },
  sdCardMounted: true,
  sdCardLogs: [],
  timerStates: {},
  counterStates: {},
  servoAngles: { D9: 0 },
  lcdLines: ['ARDUINO PLC RUN', 'READY...        '],
  neoPixelColors: { 0: '#000000' },
  pwmOutputs: {},
  activeRungs: {},
  activeBranches: {},
  activeElements: {},
  interruptStats: { int0: { triggerCount: 0 }, int1: { triggerCount: 0 }, timer1: { triggerCount: 0 } },
  interruptLogs: [],
  globalInterruptsActive: true
};

const STORAGE_KEY = 'arduino_plc_ladder_project_v3';

export interface LadderState {
  rungs: Rung[];
  setupRungs: Rung[];
  subroutines: Subroutine[];
  variables: PLCVariable[];
  constants: PLCConstant[];
  arrays: PLCArray[];
  protocols: ProtocolConfigs;
  interrupts: InterruptsConfig;
  tasks?: Task[];
}

interface HistoryState {
  past: LadderState[];
  present: LadderState;
  future: LadderState[];
}

interface AppState {
  // Ladder State (wrapped in history for undo/redo)
  history: HistoryState;

  // Simulation State
  simulationState: SimulationState;

  // Logs & Settings
  actionLogs: ActionLogEntry[];
  featureFlags: FeatureFlags;
  activeProgramId?: string;
  setTasks: (tasks: Task[]) => void;
  setActiveProgramId: (id: string | undefined) => void;

  // Actions
  setRungs: (updater: Rung[] | ((prev: Rung[]) => Rung[])) => void;
  setSetupRungs: (updater: Rung[] | ((prev: Rung[]) => Rung[])) => void;
  setSubroutines: (updater: Subroutine[] | ((prev: Subroutine[]) => Subroutine[])) => void;
  setSimulationState: (updater: SimulationState | ((prev: SimulationState) => SimulationState)) => void;
  setVariables: (updater: PLCVariable[] | ((prev: PLCVariable[]) => PLCVariable[])) => void;
  setConstants: (updater: PLCConstant[] | ((prev: PLCConstant[]) => PLCConstant[])) => void;
  setArrays: (updater: PLCArray[] | ((prev: PLCArray[]) => PLCArray[])) => void;
  setProtocols: (updater: ProtocolConfigs | ((prev: ProtocolConfigs) => ProtocolConfigs)) => void;
  setInterrupts: (updater: InterruptsConfig | ((prev: InterruptsConfig) => InterruptsConfig)) => void;

  // Domain Actions wrapper
  logAction: (action: string, details: string) => void;
  toggleFeatureFlag: (flag: keyof FeatureFlags) => void;
  clearActionLogs: () => void;

  addRung: (isSubroutine: boolean) => void;
  deleteRung: (id: string) => void;
  duplicateRung: (id: string) => void;
  moveRung: (id: string, direction: 'up' | 'down') => void;
  updateRungComment: (id: string, comment: string) => void;
  addParallelBranch: (rungId: string) => void;
  deleteParallelBranch: (rungId: string, branchId: string) => void;
  deleteElement: (id: string) => void;
  addElement: (targetIdx: number, elementData: Partial<LadderElement>) => void;

  _updatePresent: (newPresent: LadderState) => void;

  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  clearHistory: (newState?: Partial<LadderState>) => void;
}

// Load initial state from local storage or defaults
let initialSavedState: any = null;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    initialSavedState = JSON.parse(saved);
  }
} catch (e) {
  console.error('Failed to load from storage:', e);
}

const initialLadderState: LadderState = {
  rungs: initialSavedState?.rungs?.length > 0 ? initialSavedState.rungs : EXAMPLE_PROJECTS[0].rungs,
  setupRungs: (initialSavedState?.setupRungs && Array.isArray(initialSavedState.setupRungs))
    ? initialSavedState.setupRungs
    : (EXAMPLE_PROJECTS[0].setupRungs || [
        {
          id: 'rung_setup_boot_1',
          number: 0,
          comment: 'Setup fok: Bekapcsolási inicializálás (egyszer fut le)',
          branches: [{ id: 'b_setup_boot_1', elements: [{ id: 'el_setup_boot_flag', type: 'NO_CONTACT', category: 'contact', name: 'SYS_BOOT', variable: 'V_AUTO_MODE', comment: 'Boot feltétel' }] }],
          coils: [{ id: 'el_setup_lcd_hello', type: 'LCD_PRINT', category: 'library_module', name: 'LCD BOOT', lcdText: 'ARDUINO PLC OK', comment: 'Kezdő üzenet LCD-re' }]
        }
      ]),
  subroutines: initialSavedState?.subroutines?.length > 0 ? initialSavedState.subroutines : DEFAULT_SUBROUTINES,
  variables: initialSavedState?.variables?.length > 0 ? [...SYSTEM_VARIABLES, ...initialSavedState.variables.filter(v => !v.isSystem)] : [...SYSTEM_VARIABLES, ...DEFAULT_VARIABLES],
  constants: initialSavedState?.constants?.length > 0 ? initialSavedState.constants : DEFAULT_CONSTANTS,
  arrays: initialSavedState?.arrays?.length > 0 ? initialSavedState.arrays : DEFAULT_ARRAYS,
  protocols: initialSavedState?.protocols ? { ...DEFAULT_PROTOCOLS, ...initialSavedState.protocols } : DEFAULT_PROTOCOLS,
  interrupts: initialSavedState?.interrupts ? { ...DEFAULT_INTERRUPTS, ...initialSavedState.interrupts } : DEFAULT_INTERRUPTS
,
  tasks: initialSavedState?.tasks || [{
    id: 'task_main',
    name: 'Main Task',
    type: 'cyclic',
    intervalMs: 10,
    priority: 1,
    programs: [{
      id: 'prog_main',
      name: 'Main Program',
      type: 'ladder',
      rungs: initialSavedState?.rungs?.length > 0 ? initialSavedState.rungs : EXAMPLE_PROJECTS[0].rungs
    }]
  }]
};

export const useStore = create<AppState>((set, get) => ({
  history: {
    past: [],
    present: initialLadderState,
    future: []
  },

  simulationState: INITIAL_SIMULATION_STATE,

  actionLogs: [
    { id: 'init_1', timestamp: new Date().toISOString(), action: 'APP_START', details: 'Application loaded successfully.' }
  ],

  featureFlags: {
    enableExperimentalBlocks: false,
    enableCloudSync: false,
    enableAdvancedDiagnostics: true
  },

  logAction: (action, details) => set((state) => ({
    actionLogs: [{
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      timestamp: new Date().toISOString(),
      action,
      details
    }, ...state.actionLogs].slice(0, 100) // Keep last 100
  })),

  toggleFeatureFlag: (flag) => set((state) => ({
    featureFlags: { ...state.featureFlags, [flag]: !state.featureFlags[flag] }
  })),

  clearActionLogs: () => set({ actionLogs: [] }),

  setSimulationState: (updater) => set((state) => ({
    simulationState: typeof updater === 'function' ? updater(state.simulationState) : updater
  })),

  // Internal helper to push a new state to history
  setTasks: (tasks: Task[]) => {
    const state = get();
    const newPresent = { ...state.history.present, tasks };
    get()._updatePresent(newPresent);
  },
  setActiveProgramId: (id) => set({ activeProgramId: id }),

  _updatePresent: (newPresent: LadderState) => set((state) => {
    if (JSON.stringify(state.history.present) === JSON.stringify(newPresent)) {
      return state;
    }
    return {
      history: {
        past: [...state.history.past, state.history.present],
        present: newPresent,
        future: []
      }
    };
  }),

  setRungs: (updater) => {
    const state = get();
    const newRungs = typeof updater === 'function' ? updater(state.history.present.rungs) : updater;
    get()._updatePresent({ ...state.history.present, rungs: newRungs });
  },

  setSetupRungs: (updater) => {
    const state = get();
    const newSetupRungs = typeof updater === 'function' ? updater(state.history.present.setupRungs) : updater;
    get()._updatePresent({ ...state.history.present, setupRungs: newSetupRungs });
  },

  setSubroutines: (updater) => {
    const state = get();
    const newSubroutines = typeof updater === 'function' ? updater(state.history.present.subroutines) : updater;
    get()._updatePresent({ ...state.history.present, subroutines: newSubroutines });
  },

  setVariables: (updater) => {
    const state = get();
    const newVariables = typeof updater === 'function' ? updater(state.history.present.variables) : updater;
    get()._updatePresent({ ...state.history.present, variables: newVariables });
  },

  setConstants: (updater) => {
    const state = get();
    const newConstants = typeof updater === 'function' ? updater(state.history.present.constants) : updater;
    get()._updatePresent({ ...state.history.present, constants: newConstants });
  },

  setArrays: (updater) => {
    const state = get();
    const newArrays = typeof updater === 'function' ? updater(state.history.present.arrays) : updater;
    get()._updatePresent({ ...state.history.present, arrays: newArrays });
  },

  setProtocols: (updater) => {
    const state = get();
    const newProtocols = typeof updater === 'function' ? updater(state.history.present.protocols) : updater;
    get()._updatePresent({ ...state.history.present, protocols: newProtocols });
  },

  setInterrupts: (updater) => {
    const state = get();
    const newInterrupts = typeof updater === 'function' ? updater(state.history.present.interrupts) : updater;
    get()._updatePresent({ ...state.history.present, interrupts: newInterrupts });
  },

  // --- Domain Logic Wrappers ---

  addRung: (isSubroutine) => {
    const state = get();
    const newRung = createEmptyRung(state.history.present.rungs.length, isSubroutine);
    get().setRungs(prev => [...prev, newRung]);
    get().logAction('ADD_RUNG', `Added a new empty rung (isSubroutine: ${isSubroutine})`);
  },

  deleteRung: (id) => {
    const state = get();
    const rungs = state.history.present.rungs;
    if (rungs.length <= 1) return;
    const filtered = rungs.filter(r => r.id !== id).map((r, i) => ({ ...r, number: i }));
    get().setRungs(filtered);
    get().logAction('DELETE_RUNG', `Deleted rung ID: ${id}`);
  },

  duplicateRung: (id) => {
    const state = get();
    const updated = duplicateRung(state.history.present.rungs, id);
    get().setRungs(updated);
  },

  moveRung: (id, direction) => {
    const state = get();
    const updated = moveRung(state.history.present.rungs, id, direction);
    get().setRungs(updated);
  },

  updateRungComment: (id, comment) => {
    get().setRungs(prev => prev.map(r => (r.id === id ? { ...r, comment } : r)));
  },

  addParallelBranch: (rungId) => {
    const state = get();
    const updated = addParallelBranch(state.history.present.rungs, rungId);
    get().setRungs(updated);
  },

  deleteParallelBranch: (rungId, branchId) => {
    const state = get();
    const updated = deleteParallelBranch(state.history.present.rungs, rungId, branchId);
    get().setRungs(updated);
  },

  deleteElement: (id) => {
    const state = get();
    // Also consider setupRungs and subroutines if we want to delete globally.
    // For now we just apply it to main rungs. The component logic can handle which array to update.
    const updated = deleteElementFromRungs(state.history.present.rungs, id);
    get().setRungs(updated);
    get().logAction('DELETE_ELEMENT', `Deleted element ID: ${id}`);
  },

  addElement: (targetIdx, elementData) => {
    const state = get();
    const updated = addElementToRung(state.history.present.rungs, targetIdx, elementData);
    get().setRungs(updated);
    get().logAction('ADD_ELEMENT', `Added element ${elementData.name} to rung at index ${targetIdx}`);
  },

  undo: () => set((state) => {
    const { past, present, future } = state.history;
    if (past.length === 0) return state;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    return {
      history: {
        past: newPast,
        present: previous,
        future: [present, ...future]
      }
    };
  }),

  redo: () => set((state) => {
    const { past, present, future } = state.history;
    if (future.length === 0) return state;

    const next = future[0];
    const newFuture = future.slice(1);

    return {
      history: {
        past: [...past, present],
        present: next,
        future: newFuture
      }
    };
  }),

  clearHistory: (newState?: Partial<LadderState>) => set((state) => ({
    history: {
      past: [],
      present: { ...state.history.present, ...newState },
      future: []
    }
  }))
}));
