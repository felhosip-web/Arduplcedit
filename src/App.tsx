import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Rung,
  LadderElement,
  ArduinoLibrary,
  SimulationState,
  ActivePage,
  Subroutine,
  CustomModuleTemplate,
  PLCConstant,
  PLCVariable,
  PLCArray,
  ProtocolConfigs,
  InterruptsConfig,
  ProjectData
} from './types';
import { useStore } from './store/useStore';
import { migrateProjectData } from './utils/schemaValidation';
import { exportToPlcOpenXml } from './utils/plcOpenXmlUtils';
import { DEFAULT_LIBRARIES } from './data/defaultLibraries';
import { DEFAULT_SUBROUTINES } from './data/defaultSubroutines';
import { DEFAULT_CUSTOM_MODULES } from './data/defaultModules';
import { DEFAULT_CONSTANTS, DEFAULT_VARIABLES, DEFAULT_ARRAYS } from './data/defaultVariables';
import { DEFAULT_PROTOCOLS } from './data/defaultProtocols';
import { DEFAULT_INTERRUPTS } from './data/defaultInterrupts';
import { DEFAULT_MACROS } from './data/defaultMacros';
import { EXAMPLE_PROJECTS, ExampleProject } from './data/exampleProjects';
import { generateArduinoCode } from './utils/codeGenerator';
import { runSimulationStep } from './utils/simulator';

import { Navbar } from './components/Navbar';
import { EditorView } from './views/EditorView';
import { SimulatorView } from './views/SimulatorView';
import { ManagementView } from './views/ManagementView';
import { MacrosView } from './views/MacrosView';
import { CodeView } from './views/CodeView';
import { DiagnosticsView } from './views/DiagnosticsView';

import { ElementInspectorModal } from './components/ElementInspectorModal';
import { CodeViewerModal } from './components/CodeViewerModal';
import { ProjectSaveLoadModal } from './components/modals/ProjectSaveLoadModal';
import { HardwareMapModal } from './components/modals/HardwareMapModal';
import { extractPinUsages, analyzePinConflicts, ARDUINO_UNO_PINS } from './utils/hardwareMapUtils';

const STORAGE_KEY = 'arduino_plc_ladder_project_v3';

const INITIAL_SIMULATION_STATE: SimulationState = {
  isRunning: false,
  cycleTimeMs: 20,
  digitalInputs: {
    D2: false,
    D3: false,
    D4: false,
    D5: false,
    D6: false,
    D7: false
  },
  digitalOutputs: {
    D8: false,
    D9: false,
    D10: false,
    D11: false,
    D12: false,
    D13: false
  },
  analogInputs: {
    A0: 512,
    A1: 0,
    DHT_TEMP: 26.0,
    DHT_HUM: 55,
    ULTRASONIC: 30
  },
  internalFlags: {
    M0: false,
    M1: false,
    M2: false,
    M3: false
  },
  variableValues: {
    V_TEMP_C: 24.5,
    V_BATCH_COUNT: 0,
    V_AUTO_MODE: true,
    V_STATUS_CODE: 1,
    V_FLOW_RATE: 12.4,
    V_QUEUE_LEN: 0,
    V_POPPED_VAL: 0
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
  // Modbus RTU / RS485 live telemetry
  modbusLogs: [
    {
      id: 'mb_init_1',
      timestamp: '00:01.20',
      direction: 'RX',
      slaveId: 1,
      functionCode: 3,
      functionName: 'Read Holding Registers (03)',
      address: 0,
      countOrValue: 4,
      rawFrame: '01 03 00 00 00 04 44 09',
      crcHex: '4409',
      crcOk: true,
      status: 'OK',
      detail: 'HMI Lekérdezés: Reg 40001..40004 (V_TEMP, V_BATCH, V_FLOW, V_STATUS)'
    },
    {
      id: 'mb_init_2',
      timestamp: '00:01.22',
      direction: 'TX',
      slaveId: 1,
      functionCode: 3,
      functionName: 'Read Holding Registers Response',
      address: 0,
      countOrValue: 4,
      rawFrame: '01 03 08 00 F5 00 00 00 7C 00 01 2B 4D',
      crcHex: '2B4D',
      crcOk: true,
      status: 'OK',
      detail: 'Válasz elküldve: Temp=24.5°C, Batch=0, Flow=12.4, Status=1'
    }
  ],
  rs485DePinActive: false,
  // Hardware Supervisor (Watchdog & Brown-out) Live Simulation State
  watchdogTimerMs: 0,
  watchdogTimeoutMs: 2000,
  watchdogTripCount: 0,
  powerRailVoltage: 5.0,
  brownoutTripVoltage: 4.3,
  brownoutTripCount: 0,
  mcusrFlags: {
    porf: true,  // Initial boot is Power-on Reset
    extrf: false,
    borf: false,
    wdrf: false
  },
  // RTC & SD Card live telemetry
  rtcTime: {
    year: 2026,
    month: 9,
    day: 12,
    hour: 10,
    minute: 30,
    second: 0,
    dayOfWeek: 6
  },
  sdCardMounted: true,
  sdCardLogs: [
    {
      id: 'sd_init_1',
      timestamp: '10:30.00',
      fileName: 'datalog.csv',
      content: 'TIMESTAMP_MS,YEAR,MONTH,DAY,HOUR,MIN,SEC,V_TEMP_C,V_FLOW_RATE,STATUS',
      sizeBytes: 68
    },
    {
      id: 'sd_init_2',
      timestamp: '10:30.05',
      fileName: 'datalog.csv',
      content: '1000,2026,9,12,10,30,5,24.50,12.4,OK',
      sizeBytes: 37
    }
  ],
  timerStates: {},
  counterStates: {},
  servoAngles: { D9: 0 },
  lcdLines: ['ARDUINO PLC RUN', 'READY...        '],
  neoPixelColors: { 0: '#000000' },
  pwmOutputs: {},
  activeRungs: {},
  activeBranches: {},
  activeElements: {},
  interruptStats: {
    int0: { triggerCount: 0 },
    int1: { triggerCount: 0 },
    timer1: { triggerCount: 0 }
  },
  interruptLogs: [
    {
      id: 'isr_init',
      timestamp: '00:00.0',
      source: 'INT0',
      mode: 'FALLING',
      action: 'INCREMENT_VAR',
      detail: 'Megszakítás alrendszer készenlétben (INT0/INT1/Timer1)'
    }
  ],
  globalInterruptsActive: true
};

export default function App() {
  // Active Navigation Page (1. editor, 2. simulator, 3. management)
  const [activePage, setActivePage] = useState<ActivePage>('editor');

  // Currently opened subroutine for ladder editing (null = main ladder)
  const [activeSubroutineId, setActiveSubroutineId] = useState<string | null>(null);

  const {
    history,
    simulationState,
    setRungs,
    setSetupRungs,
    setSubroutines,
    setSimulationState,
    undo: undoLadder,
    redo: redoLadder,
    clearHistory: clearLadderHistory
  } = useStore();

  const { rungs, setupRungs, subroutines } = history.present;
  const canUndoLadder = history.past.length > 0;
  const canRedoLadder = history.future.length > 0;

  // Cache parsed initial state to avoid multiple localStorage parsing (for non-store states)
  const initialSavedState = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
    return null;
  }, []);

  // Setup Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndoLadder) undoLadder();
      }
      // Ctrl+Y or Cmd+Shift+Z for Redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedoLadder) redoLadder();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoLadder, redoLadder, canUndoLadder, canRedoLadder]);

  // Destructure missing global states from the store
  const { variables, constants, arrays, protocols, interrupts } = history.present;
  const { setVariables, setConstants, setArrays, setProtocols, setInterrupts } = useStore();

  // Custom Modules & Templates (Kept in local state for now, or move to store if needed)
  const [customModules, setCustomModules] = useState<CustomModuleTemplate[]>(() => {
    if (initialSavedState?.customModules?.length > 0) return initialSavedState.customModules;
    return DEFAULT_CUSTOM_MODULES;
  });

  // Arduino Libraries (Kept in local state for now)
  const [libraries, setLibraries] = useState<ArduinoLibrary[]>(() => {
    if (initialSavedState?.libraries) return initialSavedState.libraries;
    return DEFAULT_LIBRARIES;
  });

  // Project Save & Load Modal
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);

  // Hardware Map Modal (Lábkiosztási Térkép)
  const [isHardwareMapOpen, setIsHardwareMapOpen] = useState(false);

  // Inspector & Modals
  const [selectedRungIndex, setSelectedRungIndex] = useState<number>(0);
  const [selectedElement, setSelectedElement] = useState<LadderElement | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

  // Calculated Real-Time Hardware Pin Conflicts Count
  const pinConflictsCount = useMemo(() => {
    try {
      const usages = extractPinUsages(rungs, setupRungs, subroutines, protocols, interrupts, variables, 'uno');
      const conflicts = analyzePinConflicts(ARDUINO_UNO_PINS, usages, 'uno');
      return conflicts.size;
    } catch (e) {
      return 0;
    }
  }, [rungs, setupRungs, subroutines, protocols, interrupts, variables]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rungs, setupRungs, subroutines, customModules, libraries, constants, variables, arrays, protocols, interrupts })
      );
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }, [rungs, setupRungs, subroutines, customModules, libraries, constants, variables, arrays, protocols, interrupts]);

  // Simulation Loop
  const lastTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!simulationState.isRunning) return;

    lastTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      setSimulationState((prev) => runSimulationStep(rungs, prev, delta, subroutines, setupRungs, interrupts, protocols));
    }, 50);

    return () => clearInterval(interval);
  }, [simulationState.isRunning, rungs, subroutines, setupRungs, interrupts, protocols]);

  // Toggle Simulation Run / Stop
  const handleToggleSimulation = () => {
    setSimulationState((prev) => {
      const nextIsRunning = !prev.isRunning;
      if (!nextIsRunning) {
        return {
          ...prev,
          isRunning: false,
          hasExecutedSetup: false,
          activeSetupRungs: {},
          activeRungs: {},
          activeBranches: {},
          activeElements: {},
          digitalOutputs: {
            D8: false,
            D9: false,
            D10: false,
            D11: false,
            D12: false,
            D13: false
          }
        };
      }
      return {
        ...prev,
        isRunning: true
      };
    });
  };

  // Reset simulation states
  const handleResetSimulation = useCallback(() => {
    setSimulationState({
      ...INITIAL_SIMULATION_STATE,
      hasExecutedSetup: false,
      activeSetupRungs: {},
      isRunning: false
    });
  }, []);

  // Single step simulation scan
  const handleStepSimulation = useCallback(() => {
    setSimulationState((prev) => runSimulationStep(rungs, prev, 20, subroutines, setupRungs, interrupts, protocols));
  }, [rungs, subroutines, setupRungs, interrupts, protocols]);

  // Digital and Analog input controls
  const handleToggleDigitalInput = (pin: string) => {
    setSimulationState((prev) => ({
      ...prev,
      digitalInputs: {
        ...prev.digitalInputs,
        [pin]: !prev.digitalInputs[pin]
      }
    }));
  };

  const handleSetDigitalInput = (pin: string, value: boolean) => {
    setSimulationState((prev) => ({
      ...prev,
      digitalInputs: {
        ...prev.digitalInputs,
        [pin]: value
      }
    }));
  };

  const handleSetAnalogInput = (key: string, value: number) => {
    setSimulationState((prev) => ({
      ...prev,
      analogInputs: {
        ...prev.analogInputs,
        [key]: value
      }
    }));
  };

  // Subroutines CRUD
  const handleAddSubroutine = (newSub: Subroutine) => {
    setSubroutines([...subroutines, newSub]);
  };

  const handleUpdateSubroutine = (updatedSub: Subroutine) => {
    setSubroutines(subroutines.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
  };

  const handleDeleteSubroutine = (id: string) => {
    setSubroutines(subroutines.filter((s) => s.id !== id));
    if (activeSubroutineId === id) {
      setActiveSubroutineId(null);
    }
  };

  const handleDuplicateSubroutine = (id: string) => {
    const target = subroutines.find((s) => s.id === id);
    if (!target) return;
    const copy: Subroutine = {
      ...JSON.parse(JSON.stringify(target)),
      id: `sub_${Date.now()}`,
      name: `${target.name} (Másolat)`,
      codeIdentifier: `${target.codeIdentifier}_Copy`,
      createdAt: Date.now()
    };
    setSubroutines([...subroutines, copy]);
  };

  // Open subroutine in ladder editor view
  const handleEditSubroutineInLadder = (subId: string) => {
    setActiveSubroutineId(subId);
    setActivePage('editor');
  };

  // Insert subroutine as a call block to main ladder
  const handleInsertSubroutineToMain = (sub: Subroutine) => {
    const defaultBindings: Record<string, string> = {};
    sub.inputs.forEach((inp) => {
      defaultBindings[inp.name] = inp.defaultPinOrVar || 'D2';
    });
    sub.outputs.forEach((outp) => {
      defaultBindings[outp.name] = outp.defaultPinOrVar || 'D8';
    });

    const newSubCall: LadderElement = {
      id: `sub_call_${Date.now()}`,
      type: 'SUBROUTINE_CALL',
      category: 'subroutine',
      name: sub.name,
      subroutineId: sub.id,
      subroutineBindings: defaultBindings,
      comment: sub.codeIdentifier
    };

    const targetIdx = Math.min(selectedRungIndex, rungs.length - 1);
    const updated = [...rungs];
    updated[targetIdx] = {
      ...updated[targetIdx],
      coils: [...updated[targetIdx].coils, newSubCall]
    };
    setRungs(updated);
    setActivePage('editor');
  };

  // Macro Insertion handler
  const handleInsertMacroToLadder = (newRungs: Rung[], macroName: string) => {
    // Append generated rungs to main loop rungs, renumbering appropriately
    const startNum = rungs.length;
    const renumbered = newRungs.map((r, i) => ({
      ...r,
      number: startNum + i
    }));
    setRungs((prev) => [...prev, ...renumbered]);
  };

  // Custom Modules CRUD
  const handleAddCustomModule = (newMod: CustomModuleTemplate) => {
    setCustomModules([...customModules, newMod]);
  };

  const handleUpdateCustomModule = (updatedMod: CustomModuleTemplate) => {
    setCustomModules(customModules.map((m) => (m.id === updatedMod.id ? updatedMod : m)));
  };

  const handleDeleteCustomModule = (id: string) => {
    setCustomModules(customModules.filter((m) => m.id !== id));
  };

  // Library Toggle & CRUD
  const handleToggleLibrary = (id: string) => {
    setLibraries(
      libraries.map((lib) => (lib.id === id ? { ...lib, enabled: !lib.enabled } : lib))
    );
  };

  const handleAddLibrary = (newLib: ArduinoLibrary) => {
    setLibraries([...libraries, newLib]);
  };

  const handleDeleteLibrary = (id: string) => {
    setLibraries(libraries.filter((l) => l.id !== id));
  };

  // Data Management CRUD (Constants, Variables, Arrays)
  const handleAddConstant = (c: PLCConstant) => setConstants((prev) => [...prev, c]);
  const handleUpdateConstant = (c: PLCConstant) =>
    setConstants((prev) => prev.map((item) => (item.id === c.id ? c : item)));
  const handleDeleteConstant = (id: string) => setConstants((prev) => prev.filter((item) => item.id !== id));

  const handleAddVariable = (v: PLCVariable) => {
    setVariables((prev) => [...prev, v]);
    setSimulationState((prev) => ({
      ...prev,
      variableValues: {
        ...prev.variableValues,
        [v.name]: v.initialValue
      }
    }));
  };
  const handleUpdateVariable = (v: PLCVariable) =>
    setVariables((prev) => prev.map((item) => (item.id === v.id ? v : item)));
  const handleDeleteVariable = (id: string) => setVariables((prev) => prev.filter((item) => item.id !== id));

  const handleAddArray = (a: PLCArray) => {
    setArrays((prev) => [...prev, a]);
    setSimulationState((prev) => ({
      ...prev,
      arrayValues: {
        ...prev.arrayValues,
        [a.name]: [...a.values]
      }
    }));
  };
  const handleUpdateArray = (a: PLCArray) =>
    setArrays((prev) => prev.map((item) => (item.id === a.id ? a : item)));
  const handleDeleteArray = (id: string) => setArrays((prev) => prev.filter((item) => item.id !== id));

  // Protocols Update
  const handleUpdateProtocols = (newProtocols: ProtocolConfigs) => setProtocols(newProtocols);

  // Live Simulator Telemetry Setters
  const handleSetVariableValue = (name: string, val: number | boolean | string) => {
    setSimulationState((prev) => ({
      ...prev,
      variableValues: {
        ...prev.variableValues,
        [name]: val
      }
    }));
  };

  const handleSetDallasTemp = (temp: number) => {
    setSimulationState((prev) => ({
      ...prev,
      dallasTemp: temp
    }));
  };

  const handleSimulateUartReceive = (message: string) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = new Date();
    const ts = `${pad(d.getMinutes())}:${pad(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`;
    setSimulationState((prev) => ({
      ...prev,
      uartLogs: [
        {
          id: `uart_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          timestamp: ts,
          direction: 'RX',
          message
        },
        ...prev.uartLogs.slice(0, 29)
      ]
    }));
  };

  const handleSimulateNrfReceive = (payload: string) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = new Date();
    const ts = `${pad(d.getMinutes())}:${pad(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`;
    setSimulationState((prev) => ({
      ...prev,
      nrf24RxBuffer: payload,
      nrf24Logs: [
        {
          id: `nrf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          timestamp: ts,
          direction: 'RX',
          pipe: 1,
          channel: protocols.nrf24?.channel ?? 76,
          payload,
          status: 'ACK'
        },
        ...(prev.nrf24Logs || []).slice(0, 29)
      ]
    }));
  };

  const handleSetEeprom24cMemory = (address: string, value: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = new Date();
    const ts = `${pad(d.getMinutes())}:${pad(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`;
    setSimulationState((prev) => ({
      ...prev,
      eeprom24cMemory: {
        ...(prev.eeprom24cMemory || {}),
        [address]: value
      },
      eeprom24cLogs: [
        {
          id: `eeprom_manual_${Date.now()}`,
          timestamp: ts,
          op: 'WRITE',
          addressHex: protocols.eeprom24c?.addressHex || '0x50',
          dataType: 'FLOAT',
          value,
          status: 'SUCCESS'
        },
        ...(prev.eeprom24cLogs || []).slice(0, 29)
      ]
    }));
  };

  const handleSimulateSDLog = (content: string) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
    setSimulationState((prev) => {
      const newLogs = [
        {
          id: `sd_${Date.now()}`,
          timestamp: ts,
          fileName: protocols.sdCard?.logFileName || 'datalog.csv',
          content,
          sizeBytes: content.length
        },
        ...(prev.sdCardLogs || []).slice(0, 49)
      ];
      return {
        ...prev,
        sdCardLogs: newLogs,
        variableValues: {
          ...prev.variableValues,
          SD_LOG_COUNT: (Number(prev.variableValues['SD_LOG_COUNT'] || 0) + 1)
        }
      };
    });
  };

  const handleSyncRTC = () => {
    const now = new Date();
    const rtcObj = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      dayOfWeek: now.getDay() === 0 ? 7 : now.getDay()
    };
    setSimulationState((prev) => ({
      ...prev,
      rtcTime: rtcObj,
      variableValues: {
        ...prev.variableValues,
        RTC_YEAR: rtcObj.year,
        RTC_MONTH: rtcObj.month,
        RTC_DAY: rtcObj.day,
        RTC_HOUR: rtcObj.hour,
        RTC_MIN: rtcObj.minute,
        RTC_SEC: rtcObj.second,
        RTC_DOW: rtcObj.dayOfWeek
      }
    }));
  };

  const handleClearLogs = () => {
    setSimulationState((prev) => ({
      ...prev,
      uartLogs: [],
      i2cLogs: [],
      spiLogs: [],
      nrf24Logs: [],
      eeprom24cLogs: [],
      sdCardLogs: [],
      bufferLogs: [],
      nrf24RxBuffer: null
    }));
  };

  // Inspect Element
  const handleSelectElement = useCallback((el: LadderElement) => {
    setSelectedElement(el);
    setIsInspectorOpen(true);
  }, []);

  const handleSaveElement = useCallback((updatedElement: LadderElement) => {
    if (activeSubroutineId) {
      // Update in active subroutine
      const sub = subroutines.find((s) => s.id === activeSubroutineId);
      if (sub) {
        const updatedRungs = sub.rungs.map((r) => ({
          ...r,
          branches: r.branches.map((b) => ({
            ...b,
            elements: b.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el))
          })),
          coils: r.coils.map((c) => (c.id === updatedElement.id ? updatedElement : c))
        }));
        handleUpdateSubroutine({ ...sub, rungs: updatedRungs });
      }
    } else {
      // Update in main ladder
      setRungs(
        rungs.map((r) => ({
          ...r,
          branches: r.branches.map((b) => ({
            ...b,
            elements: b.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el))
          })),
          coils: r.coils.map((c) => (c.id === updatedElement.id ? updatedElement : c))
        }))
      );
      // Also update in setup ladder if element belongs to setup rungs
      setSetupRungs(
        setupRungs.map((r) => ({
          ...r,
          branches: r.branches.map((b) => ({
            ...b,
            elements: b.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el))
          })),
          coils: r.coils.map((c) => (c.id === updatedElement.id ? updatedElement : c))
        }))
      );
    }
    setIsInspectorOpen(false);
    setSelectedElement(null);
  }, [activeSubroutineId, subroutines, setSubroutines, rungs, setRungs, setupRungs, setSetupRungs]);

  // Rebind physical hardware pin for an element (from Hardware Map)
  const handleUpdateElementPin = useCallback((elementId: string, newPin: string) => {
    // 1. Update in Main Rungs
    setRungs((prevRungs) =>
      prevRungs.map((r) => ({
        ...r,
        branches: r.branches.map((b) => ({
          ...b,
          elements: b.elements.map((el) => (el.id === elementId ? { ...el, pin: newPin } : el))
        })),
        coils: r.coils.map((c) => (c.id === elementId ? { ...c, pin: newPin } : c))
      }))
    );

    // 2. Update in Setup Rungs
    setSetupRungs((prevSetup) =>
      prevSetup.map((r) => ({
        ...r,
        branches: r.branches.map((b) => ({
          ...b,
          elements: b.elements.map((el) => (el.id === elementId ? { ...el, pin: newPin } : el))
        })),
        coils: r.coils.map((c) => (c.id === elementId ? { ...c, pin: newPin } : c))
      }))
    );

    // 3. Update in Subroutines
    setSubroutines((prevSubs) =>
      prevSubs.map((sub) => ({
        ...sub,
        rungs: sub.rungs.map((r) => ({
          ...r,
          branches: r.branches.map((b) => ({
            ...b,
            elements: b.elements.map((el) => (el.id === elementId ? { ...el, pin: newPin } : el))
          })),
          coils: r.coils.map((c) => (c.id === elementId ? { ...c, pin: newPin } : c))
        }))
      }))
    );
  }, [setRungs, setSetupRungs, setSubroutines]);

  // Bind physical pin directly to a PLC process variable
  const handleUpdateVariablePin = useCallback((variableName: string, newPin: string) => {
    setVariables((prevVars) =>
      prevVars.map((v) => (v.name === variableName ? { ...v, mappedPin: newPin } : v))
    );
  }, []);

  // Examples loading
  const handleLoadExample = (example: ExampleProject) => {
    clearLadderHistory({
      rungs: example.rungs,
      setupRungs: example.setupRungs || [],
      subroutines: subroutines
    });
    setSelectedRungIndex(0);
    setActiveSubroutineId(null);
    setActivePage('editor');

    // Auto-enable required libraries
    if (example.requiredLibraries.length > 0) {
      setLibraries(
        libraries.map((l) =>
          example.requiredLibraries.includes(l.name) || example.requiredLibraries.includes(l.id)
            ? { ...l, enabled: true }
            : l
        )
      );
    }
  };

  // Export / Import
  const handleExportProject = () => {
    const data = {
      version: '3.1',
      exportedAt: new Date().toISOString(),
      rungs,
      setupRungs,
      subroutines,
      customModules,
      libraries,
      constants,
      variables,
      arrays,
      protocols,
      interrupts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arduino_PLC_Project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPlcOpenXml = () => {
    const data = {
      version: '3.1',
      name: 'Arduino_PLC_Project',
      rungs,
      setupRungs,
      subroutines,
      customModules,
      libraries,
      constants,
      variables,
      arrays,
      protocols,
      interrupts
    };
    try {
      const xmlString = exportToPlcOpenXml(data);
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Arduino_PLC_Project_${Date.now()}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('XML Export Error:', err);
      alert('Hiba történt az XML exportálás során.');
    }
  };

  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const migrated = migrateProjectData(parsed);

        clearLadderHistory({
          rungs: migrated.rungs,
          setupRungs: migrated.setupRungs,
          subroutines: migrated.subroutines,
          variables: migrated.variables,
          constants: migrated.constants,
          arrays: migrated.arrays,
          protocols: migrated.protocols,
          interrupts: migrated.interrupts
        });
        if (migrated.customModules) setCustomModules(migrated.customModules);
        if (migrated.libraries) setLibraries(migrated.libraries);

        setSelectedRungIndex(0);
        setActiveSubroutineId(null);
        setActivePage('editor');
      } catch (err) {
        console.error('Projekt importálási hiba:', err);
        alert(err instanceof Error ? err.message : 'Hibás vagy sérült projekt fájl!');
      }
    };
    reader.readAsText(file);
  };

  // Structured Project Data for Save/Load Modal
  const currentProjectData: ProjectData = {
    version: '3.1.0',
    name: 'Arduino_PLC_Program',
    lastModified: Date.now(),
    rungs,
    setupRungs,
    subroutines,
    customModules,
    libraries,
    constants,
    variables,
    arrays,
    protocols,
    interrupts
  };

  const handleLoadProject = (project: ProjectData) => {
    try {
      const migrated = migrateProjectData(project);
      clearLadderHistory({
        rungs: migrated.rungs,
        setupRungs: migrated.setupRungs,
        subroutines: migrated.subroutines,
        variables: migrated.variables,
        constants: migrated.constants,
        arrays: migrated.arrays,
        protocols: migrated.protocols,
        interrupts: migrated.interrupts
      });
      if (migrated.customModules) setCustomModules(migrated.customModules);
      if (migrated.libraries) setLibraries(migrated.libraries);

      if (migrated.variables) {
        const varMap: Record<string, number | boolean | string> = {};
        migrated.variables.forEach((v) => {
          varMap[v.name] = v.initialValue;
        });
        setSimulationState((prev) => ({ ...prev, variableValues: { ...prev.variableValues, ...varMap } }));
      }
      if (migrated.arrays) {
        const arrMap: Record<string, (number | boolean | string)[]> = {};
        migrated.arrays.forEach((a) => {
          arrMap[a.name] = [...a.values];
        });
        setSimulationState((prev) => ({ ...prev, arrayValues: { ...prev.arrayValues, ...arrMap } }));
      }

      setSelectedRungIndex(0);
      setActiveSubroutineId(null);
    } catch (err) {
      console.error('Projekt betöltési hiba:', err);
      alert(err instanceof Error ? err.message : 'Hibás vagy sérült projekt adatok!');
    }
  };

  const handleResetProject = () => {
    if (window.confirm('Biztosan törölni szeretnéd a projektet és új üres létrát kezdeni?')) {
      clearLadderHistory({
        rungs: [
          {
            id: `rung_${Date.now()}`,
            number: 0,
            comment: '1. Fok: Indítás és Motor Vezérlés',
            branches: [
              {
                id: `branch_${Date.now()}`,
                elements: [
                  {
                    id: 'el_start',
                    type: 'NO_CONTACT',
                    category: 'contact',
                    name: 'START_GOMB',
                    pin: 'D2'
                  }
                ]
              }
            ],
            coils: [
              {
                id: 'el_coil',
                type: 'COIL_NORMAL',
                category: 'coil',
                name: 'MOTOR_RELE',
                pin: 'D8'
              }
            ]
          }
        ],
        setupRungs: [
          {
            id: `rung_setup_${Date.now()}`,
            number: 0,
            comment: 'Setup fok: Bekapcsolási inicializálás (egyszer fut le a setup()-ban)',
            branches: [
              {
                id: `b_setup_${Date.now()}`,
                elements: [
                  {
                    id: 'el_boot_init',
                    type: 'NO_CONTACT',
                    category: 'contact',
                    name: 'SYS_BOOT',
                    variable: 'V_AUTO_MODE'
                  }
                ]
              }
            ],
            coils: [
              {
                id: 'el_boot_lcd',
                type: 'LCD_PRINT',
                category: 'library_module',
                name: 'LCD BOOT',
                lcdText: 'PLC BOOT READY'
              }
            ]
          }
        ],
        subroutines: []
      });
      setConstants(DEFAULT_CONSTANTS);
      setVariables(DEFAULT_VARIABLES);
      setArrays(DEFAULT_ARRAYS);
      setProtocols(DEFAULT_PROTOCOLS);
      setInterrupts(DEFAULT_INTERRUPTS);
      setSelectedRungIndex(0);
      setActiveSubroutineId(null);
      setActivePage('editor');
    }
  };

  // Generate Arduino Code (.ino)
  const generatedCode = generateArduinoCode(
    rungs,
    libraries,
    'Arduino_PLC_Program',
    subroutines,
    constants,
    variables,
    arrays,
    protocols,
    setupRungs,
    interrupts
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Global Navigation Bar */}
      <Navbar
        activePage={activePage}
        onChangePage={setActivePage}
        isSimulating={simulationState.isRunning}
        onToggleSimulation={handleToggleSimulation}
        onOpenCodeViewer={() => setActivePage('code')}
        onLoadExample={handleLoadExample}
        onExportProject={handleExportProject}
        onExportPlcOpenXml={handleExportPlcOpenXml}
        onImportProject={handleImportProject}
        onResetProject={handleResetProject}
        onOpenSaveLoadModal={() => setIsSaveLoadModalOpen(true)}
        onOpenHardwareMap={() => setIsHardwareMapOpen(true)}
        pinConflictCount={pinConflictsCount}
        onUndo={undoLadder}
        onRedo={redoLadder}
        canUndo={canUndoLadder}
        canRedo={canRedoLadder}
      />

      {/* 4 Main Pages */}
      {activePage === 'editor' && (
        <EditorView
          mainRungs={rungs}
          onUpdateMainRungs={setRungs}
          setupRungs={setupRungs}
          onUpdateSetupRungs={setSetupRungs}
          subroutines={subroutines}
          onUpdateSubroutine={handleUpdateSubroutine}
          onCreateSubroutine={handleAddSubroutine}
          customModules={customModules}
          simulationState={simulationState}
          selectedRungIndex={selectedRungIndex}
          onSelectRung={setSelectedRungIndex}
          onSelectElement={handleSelectElement}
          onOpenManagement={() => setActivePage('management')}
          onOpenSimulator={() => setActivePage('simulator')}
          onOpenMacros={() => setActivePage('macros')}
          activeSubroutineId={activeSubroutineId}
          onSelectActiveSubroutine={setActiveSubroutineId}
        />
      )}

      {activePage === 'simulator' && (
        <SimulatorView
          simulationState={simulationState}
          onToggleSimulation={handleToggleSimulation}
          onResetSimulation={handleResetSimulation}
          onStepSimulation={handleStepSimulation}
          onToggleInput={handleToggleDigitalInput}
          onSetInput={handleSetDigitalInput}
          onSetAnalogInput={handleSetAnalogInput}
          mainRungs={rungs}
          subroutines={subroutines}
          constants={constants}
          variables={variables}
          arrays={arrays}
          protocols={protocols}
          onSetVariableValue={handleSetVariableValue}
          onSetDallasTemp={handleSetDallasTemp}
          onSimulateUartReceive={handleSimulateUartReceive}
          onSimulateNrfReceive={handleSimulateNrfReceive}
          onSetEeprom24cMemory={handleSetEeprom24cMemory}
          onSimulateSDLog={handleSimulateSDLog}
          onSyncRTC={handleSyncRTC}
          onClearLogs={handleClearLogs}
          onNavigateToDiagnostics={() => setActivePage('diagnostics')}
        />
      )}

      {activePage === 'management' && (
        <ManagementView
          subroutines={subroutines}
          onAddSubroutine={handleAddSubroutine}
          onUpdateSubroutine={handleUpdateSubroutine}
          onDeleteSubroutine={handleDeleteSubroutine}
          onDuplicateSubroutine={handleDuplicateSubroutine}
          onEditSubroutineInLadder={handleEditSubroutineInLadder}
          onInsertSubroutineToMain={handleInsertSubroutineToMain}
          customModules={customModules}
          onAddCustomModule={handleAddCustomModule}
          onUpdateCustomModule={handleUpdateCustomModule}
          onDeleteCustomModule={handleDeleteCustomModule}
          libraries={libraries}
          onToggleLibrary={handleToggleLibrary}
          onAddLibrary={handleAddLibrary}
          onDeleteLibrary={handleDeleteLibrary}
          constants={constants}
          onAddConstant={handleAddConstant}
          onUpdateConstant={handleUpdateConstant}
          onDeleteConstant={handleDeleteConstant}
          variables={variables}
          onAddVariable={handleAddVariable}
          onUpdateVariable={handleUpdateVariable}
          onDeleteVariable={handleDeleteVariable}
          arrays={arrays}
          onAddArray={handleAddArray}
          onUpdateArray={handleUpdateArray}
          onDeleteArray={handleDeleteArray}
          protocols={protocols}
          onUpdateProtocols={handleUpdateProtocols}
          interrupts={interrupts}
          onUpdateInterrupts={setInterrupts}
        />
      )}

      {activePage === 'macros' && (
        <MacrosView
          macros={DEFAULT_MACROS}
          onInsertMacroToLadder={handleInsertMacroToLadder}
          onOpenEditor={() => setActivePage('editor')}
          onOpenSimulator={() => setActivePage('simulator')}
          variables={variables}
          constants={constants}
          arrays={arrays}
        />
      )}

      {activePage === 'code' && (
        <CodeView
          code={generatedCode}
          projectName="Arduino_PLC_Ladder_Sketch"
          rungs={rungs}
          setupRungs={setupRungs}
          libraries={libraries}
          protocols={protocols}
          subroutines={subroutines}
          variables={variables}
          constants={constants}
          arrays={arrays}
          interrupts={interrupts}
          onOpenSimulator={() => setActivePage('simulator')}
          onOpenEditor={() => setActivePage('editor')}
        />
      )}

      {activePage === 'diagnostics' && (
        <DiagnosticsView
          simulationState={simulationState}
          mainRungs={rungs}
          setupRungs={setupRungs}
          variables={variables}
          arrays={arrays}
          protocols={protocols}
          subroutines={subroutines}
          onToggleSimulation={handleToggleSimulation}
          onNavigateToEditor={() => setActivePage('editor')}
          onOpenHardwareMap={() => setIsHardwareMapOpen(true)}
        />
      )}

      {/* Element Inspector Modal (Parameter binding & options) */}
      <ElementInspectorModal
        element={selectedElement}
        isOpen={isInspectorOpen}
        onClose={() => {
          setIsInspectorOpen(false);
          setSelectedElement(null);
        }}
        onSave={handleSaveElement}
        subroutines={subroutines}
        constants={constants}
        variables={variables}
        arrays={arrays}
      />

      {/* Arduino C++ Code Viewer Modal */}
      <CodeViewerModal
        isOpen={isCodeViewerOpen}
        onClose={() => setIsCodeViewerOpen(false)}
        code={generatedCode}
        projectName="Arduino_PLC_Ladder_Sketch"
      />

      {/* Project Save & Load Management Modal */}
      <ProjectSaveLoadModal
        isOpen={isSaveLoadModalOpen}
        onClose={() => setIsSaveLoadModalOpen(false)}
        currentProject={currentProjectData}
        onLoadProject={handleLoadProject}
      />

      {/* Hardware Map (Fizikai Lábkiosztási Térkép & Ütközésvizsgálat) Modal */}
      <HardwareMapModal
        isOpen={isHardwareMapOpen}
        onClose={() => setIsHardwareMapOpen(false)}
        rungs={rungs}
        setupRungs={setupRungs}
        subroutines={subroutines}
        variables={variables}
        protocols={protocols}
        interrupts={interrupts}
        defaultBoard="uno"
        onUpdateElementPin={handleUpdateElementPin}
        onUpdateVariablePin={handleUpdateVariablePin}
      />
    </div>
  );
}
