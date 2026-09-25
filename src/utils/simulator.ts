import {
  Rung,
  SimulationState,
  LadderElement,
  Subroutine,
  UartLogEntry,
  I2CLogEntry,
  SPILogEntry,
  NRF24LogEntry,
  EEPROM24CLogEntry,
  BufferLogEntry,
  ScanDiagnostics,
  InterruptsConfig,
  InterruptLogEntry,
  ModbusLogEntry,
  ProtocolConfigs,
  ExpanderLogEntry,
  StateMachine,
  FBDDiagram,
  FBDBlock,
  FBDConnection
} from '../types';
import { estimateRungExecutionUs } from './diagnosticsCalculator';
import { buildModbusQuery, calculateModbusCRC, bytesToHexString, getModbusFunctionName } from './modbusUtils';
import { advanceTime, EvaluationContext, StateMachineModel } from './stateMachineCore';

function resolveOperandVal(
  operand: string | number | undefined,
  variableValues: Record<string, number | boolean | string>
): number {
  if (operand === undefined || operand === '') return 0;
  if (typeof operand === 'number') return operand;
  if (variableValues[operand] !== undefined) {
    const val = variableValues[operand];
    if (typeof val === 'boolean') return val ? 1 : 0;
    return Number(val) || 0;
  }
  if (!isNaN(Number(operand))) return Number(operand);
  return 0;
}

function resolveBoolInput(
  operand: string | undefined,
  prevState: SimulationState,
  variableValues: Record<string, number | boolean | string>,
  internalFlags: Record<string, boolean>,
  expanderInputs: Record<string, boolean>,
  expanderOutputs: Record<string, boolean>
): boolean {
  if (!operand || operand === '') return false;
  const key = operand.trim();
  if (key.toLowerCase() === 'true' || key === '1') return true;
  if (key.toLowerCase() === 'false' || key === '0') return false;

  if (key.startsWith('D') && prevState.digitalInputs[key] !== undefined) {
    return !!prevState.digitalInputs[key];
  }
  if (key.startsWith('EXP_') || key.startsWith('PCF_')) {
    return !!(expanderInputs[key] ?? expanderOutputs[key] ?? false);
  }
  if (internalFlags[key] !== undefined) {
    return !!internalFlags[key];
  }
  if (variableValues[key] !== undefined) {
    const v = variableValues[key];
    if (typeof v === 'boolean') return v;
    return Boolean(Number(v) || v);
  }
  if (prevState.digitalOutputs[key] !== undefined) {
    return !!prevState.digitalOutputs[key];
  }

  return false;
}

function formatTimestamp(): string {
  const d = new Date();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${m}:${s}.${ms}`;
}

export function runSimulationStep(
  rungs: Rung[],
  prevState: SimulationState,
  deltaTimeMs: number,
  subroutines: Subroutine[] = [],
  setupRungs: Rung[] = [],
  interrupts?: InterruptsConfig,
  protocols?: ProtocolConfigs,
  stateMachines: StateMachine[] = [],
  fbdDiagrams: FBDDiagram[] = []
): SimulationState {
  const nextDigitalOutputs: Record<string, boolean> = { ...prevState.digitalOutputs };
  const nextInternalFlags: Record<string, boolean> = { ...prevState.internalFlags };
  const nextTimerStates = { ...prevState.timerStates };
  const nextCounterStates = { ...prevState.counterStates };
  const nextServoAngles = { ...prevState.servoAngles };
  const nextLcdLines: [string, string] = [...prevState.lcdLines];
  const nextNeoPixelColors = { ...prevState.neoPixelColors };
  const nextPwmOutputs = { ...prevState.pwmOutputs };

  // Variables and Arrays states
  const nextVariableValues: Record<string, number | boolean | string> = { ...prevState.variableValues };
  const nextArrayValues: Record<string, (number | boolean | string)[]> = { ...prevState.arrayValues };

  // Communication logs (keep last 30 entries)
  const nextUartLogs: UartLogEntry[] = [...prevState.uartLogs];
  const nextI2cLogs: I2CLogEntry[] = [...prevState.i2cLogs];
  const nextSpiLogs: SPILogEntry[] = [...prevState.spiLogs];
  const nextNrf24Logs: NRF24LogEntry[] = [...(prevState.nrf24Logs || [])];
  const nextEeprom24cLogs: EEPROM24CLogEntry[] = [...(prevState.eeprom24cLogs || [])];
  const nextEeprom24cMemory: Record<string, number> = { ...(prevState.eeprom24cMemory || {}) };
  const nextBufferLogs: BufferLogEntry[] = [...(prevState.bufferLogs || [])];
  const nextBufferTriggerStates: Record<string, boolean> = { ...(prevState.bufferTriggerStates || {}) };
  let nextNrf24RxBuffer: string | null = prevState.nrf24RxBuffer ?? null;

  // Modbus & RS485 live telemetry
  const nextModbusLogs: ModbusLogEntry[] = [...(prevState.modbusLogs || [])];
  let rs485DePinActive = prevState.rs485DePinActive ?? false;

  // I/O Port Expander (MCP23xxx / PCF8574) live state
  const nextExpanderInputs: Record<string, boolean> = { ...(prevState.expanderInputs || {}) };
  const nextExpanderOutputs: Record<string, boolean> = { ...(prevState.expanderOutputs || {}) };
  const nextExpanderLogs: ExpanderLogEntry[] = [...(prevState.expanderLogs || [])];

  // Watchdog & Brown-out Hardware Supervisor state
  let nextWatchdogTimerMs = (prevState.watchdogTimerMs || 0) + deltaTimeMs;
  const watchdogTimeoutMs = prevState.watchdogTimeoutMs || 2000;
  let nextWatchdogTripCount = prevState.watchdogTripCount || 0;
  const powerRailVoltage = prevState.powerRailVoltage ?? 5.0;
  const brownoutTripVoltage = prevState.brownoutTripVoltage ?? 4.3;
  let nextBrownoutTripCount = prevState.brownoutTripCount || 0;
  const nextMcusrFlags = { ...(prevState.mcusrFlags || { porf: true, extrf: false, borf: false, wdrf: false }) };

  // Interrupt telemetry states
  const nextInterruptLogs: InterruptLogEntry[] = [...(prevState.interruptLogs || [])];
  const nextInterruptStats = {
    int0: { ...(prevState.interruptStats?.int0 || { triggerCount: 0, lastTriggerTime: undefined }) },
    int1: { ...(prevState.interruptStats?.int1 || { triggerCount: 0, lastTriggerTime: undefined }) },
    timer1: { ...(prevState.interruptStats?.timer1 || { triggerCount: 0, lastTriggerTime: undefined }) }
  };
  const globalInterruptsActive = interrupts ? (interrupts.globalInterruptsEnabled ?? true) : true;

  const prevInputs = (prevState as unknown as { _lastInputs?: Record<string, boolean> })._lastInputs || {};
  const currentInputs = prevState.digitalInputs;
  let timer1AccumMs = ((prevState as unknown as { _timer1AccumMs?: number })._timer1AccumMs || 0) + deltaTimeMs;

  // System Bits & Time Accumulators
  // We need a persistent un-modulo'd timer for state machine delays.
  let absoluteTimeMs = ((prevState as unknown as { _absoluteTimeMs?: number })._absoluteTimeMs || 0) + deltaTimeMs;
  let sysAccumMs = ((prevState as unknown as { _sysAccumMs?: number })._sysAccumMs || 0) + deltaTimeMs;
  const isFirstScan = !(prevState as unknown as { _sysStarted?: boolean })._sysStarted;

  // Evaluate System Bits
  if (sysAccumMs >= 1000) sysAccumMs = sysAccumMs % 1000;
  nextVariableValues["SM_ALWAYS_ON"] = true;
  nextVariableValues["SM_ALWAYS_OFF"] = false;
  nextVariableValues["SM_FIRST_SCAN"] = isFirstScan;
  nextVariableValues["SM_1HZ"] = sysAccumMs >= 500;
  nextVariableValues["SM_100MS"] = (sysAccumMs % 100) >= 50;

  // RTC Hardware simulation time advancement
  let rtcAccumMs = ((prevState as unknown as { _rtcAccumMs?: number })._rtcAccumMs || 0) + deltaTimeMs;
  let nextRtcTime = prevState.rtcTime ? { ...prevState.rtcTime } : {
    year: 2026,
    month: 9,
    day: 12,
    hour: 10,
    minute: 30,
    second: 0,
    dayOfWeek: 6
  };

  let rtcSecChanged = false;
  let rtcMinChanged = false;
  let rtcHourChanged = false;
  let rtcMidnightChanged = false;

  if (rtcAccumMs >= 1000) {
    const advanceSeconds = Math.floor(rtcAccumMs / 1000);
    rtcAccumMs = rtcAccumMs % 1000;
    rtcSecChanged = true;

    for (let s = 0; s < advanceSeconds; s++) {
      nextRtcTime.second++;
      if (nextRtcTime.second >= 60) {
        nextRtcTime.second = 0;
        nextRtcTime.minute++;
        rtcMinChanged = true;
        if (nextRtcTime.minute >= 60) {
          nextRtcTime.minute = 0;
          nextRtcTime.hour++;
          rtcHourChanged = true;
          if (nextRtcTime.hour >= 24) {
            nextRtcTime.hour = 0;
            nextRtcTime.day++;
            nextRtcTime.dayOfWeek = nextRtcTime.dayOfWeek >= 7 ? 1 : nextRtcTime.dayOfWeek + 1;
            rtcMidnightChanged = true;
            if (nextRtcTime.day > 31) {
              nextRtcTime.day = 1;
              nextRtcTime.month++;
              if (nextRtcTime.month > 12) {
                nextRtcTime.month = 1;
                nextRtcTime.year++;
              }
            }
          }
        }
      }
    }

    // Auto update default RTC registers in variableValues
    nextVariableValues['RTC_YEAR'] = nextRtcTime.year;
    nextVariableValues['RTC_MONTH'] = nextRtcTime.month;
    nextVariableValues['RTC_DAY'] = nextRtcTime.day;
    nextVariableValues['RTC_HOUR'] = nextRtcTime.hour;
    nextVariableValues['RTC_MIN'] = nextRtcTime.minute;
    nextVariableValues['RTC_SEC'] = nextRtcTime.second;
    nextVariableValues['RTC_DOW'] = nextRtcTime.dayOfWeek;
  }

  if (interrupts && globalInterruptsActive) {
    // 1. Hardware Interrupt INT0 (Pin 2)
    if (interrupts.int0.enabled) {
      const prevD2 = !!prevInputs['D2'];
      const currD2 = !!currentInputs['D2'];
      let triggered = false;

      if (interrupts.int0.mode === 'RISING' && !prevD2 && currD2) triggered = true;
      else if (interrupts.int0.mode === 'FALLING' && prevD2 && !currD2) triggered = true;
      else if (interrupts.int0.mode === 'CHANGE' && prevD2 !== currD2) triggered = true;
      else if (interrupts.int0.mode === 'LOW' && !currD2 && prevD2) triggered = true;

      if (triggered) {
        nextInterruptStats.int0.triggerCount++;
        nextInterruptStats.int0.lastTriggerTime = formatTimestamp();

        let detail = '';
        if (interrupts.int0.actionType === 'INCREMENT_VAR') {
          const varName = interrupts.int0.targetVariable || 'V_ENCODER_TICKS';
          const step = interrupts.int0.incrementStep || 1;
          const currentVal = Number(nextVariableValues[varName] ?? 0);
          nextVariableValues[varName] = currentVal + step;
          detail = `${varName} += ${step} (Új: ${nextVariableValues[varName]})`;
        } else if (interrupts.int0.actionType === 'SET_FLAG') {
          const varName = interrupts.int0.targetVariable || 'V_ESTOP_ACTIVE';
          nextVariableValues[varName] = true;
          detail = `${varName} = TRUE [ESTOP Aktív!]`;
        } else if (interrupts.int0.actionType === 'CALL_SUBROUTINE') {
          const sub = subroutines.find(s => s.id === interrupts.int0.targetSubroutineId);
          detail = sub ? `FC hívás: ${sub.name}` : 'FC hívás';
        } else {
          detail = 'Egyéni ISR kód lefutott';
        }

        nextInterruptLogs.unshift({
          id: `isr_${Date.now()}_${Math.random()}`,
          timestamp: formatTimestamp(),
          source: 'INT0',
          mode: interrupts.int0.mode,
          action: interrupts.int0.actionType,
          detail
        });
        if (nextInterruptLogs.length > 40) nextInterruptLogs.pop();
      }
    }

    // 2. Hardware Interrupt INT1 (Pin 3)
    if (interrupts.int1.enabled) {
      const prevD3 = !!prevInputs['D3'];
      const currD3 = !!currentInputs['D3'];
      let triggered = false;

      if (interrupts.int1.mode === 'RISING' && !prevD3 && currD3) triggered = true;
      else if (interrupts.int1.mode === 'FALLING' && prevD3 && !currD3) triggered = true;
      else if (interrupts.int1.mode === 'CHANGE' && prevD3 !== currD3) triggered = true;
      else if (interrupts.int1.mode === 'LOW' && !currD3 && prevD3) triggered = true;

      if (triggered) {
        nextInterruptStats.int1.triggerCount++;
        nextInterruptStats.int1.lastTriggerTime = formatTimestamp();

        let detail = '';
        if (interrupts.int1.actionType === 'INCREMENT_VAR') {
          const varName = interrupts.int1.targetVariable || 'V_ENCODER_TICKS';
          const step = interrupts.int1.incrementStep || 1;
          const currentVal = Number(nextVariableValues[varName] ?? 0);
          nextVariableValues[varName] = currentVal + step;
          detail = `${varName} += ${step} (Új: ${nextVariableValues[varName]})`;
        } else if (interrupts.int1.actionType === 'SET_FLAG') {
          const varName = interrupts.int1.targetVariable || 'V_ESTOP_ACTIVE';
          nextVariableValues[varName] = true;
          detail = `${varName} = TRUE [ESTOP Aktív!]`;
        } else if (interrupts.int1.actionType === 'CALL_SUBROUTINE') {
          const sub = subroutines.find(s => s.id === interrupts.int1.targetSubroutineId);
          detail = sub ? `FC hívás: ${sub.name}` : 'FC hívás';
        } else {
          detail = 'Egyéni ISR kód lefutott';
        }

        nextInterruptLogs.unshift({
          id: `isr_${Date.now()}_${Math.random()}`,
          timestamp: formatTimestamp(),
          source: 'INT1',
          mode: interrupts.int1.mode,
          action: interrupts.int1.actionType,
          detail
        });
        if (nextInterruptLogs.length > 40) nextInterruptLogs.pop();
      }
    }

    // 3. Timer1 Hardware Interrupt (Periodic CTC)
    if (interrupts.timer1.enabled && interrupts.timer1.intervalMs > 0) {
      if (timer1AccumMs >= interrupts.timer1.intervalMs) {
        timer1AccumMs = timer1AccumMs % interrupts.timer1.intervalMs;
        nextInterruptStats.timer1.triggerCount++;
        nextInterruptStats.timer1.lastTriggerTime = formatTimestamp();

        let detail = '';
        if (interrupts.timer1.actionType === 'INCREMENT_VAR') {
          const varName = interrupts.timer1.targetVariable || 'V_BATCH_COUNT';
          const currentVal = Number(nextVariableValues[varName] ?? 0);
          nextVariableValues[varName] = currentVal + 1;
          detail = `${varName}++ (${nextVariableValues[varName]})`;
        } else if (interrupts.timer1.actionType === 'CALL_SUBROUTINE') {
          const sub = subroutines.find(s => s.id === interrupts.timer1.targetSubroutineId);
          detail = sub ? `Periodikus FC: ${sub.name}` : 'Periodikus FC';
        } else {
          detail = `Periodikus időzítő (${interrupts.timer1.intervalMs}ms) lefutott`;
        }

        nextInterruptLogs.unshift({
          id: `isr_${Date.now()}_${Math.random()}`,
          timestamp: formatTimestamp(),
          source: 'TIMER1',
          mode: 'CTC',
          action: interrupts.timer1.actionType,
          detail
        });
        if (nextInterruptLogs.length > 40) nextInterruptLogs.pop();
      }
    }
  }

  const activeRungs: Record<string, boolean> = {};
  const activeBranches: Record<string, boolean> = {};
  const activeElements: Record<string, boolean> = {};
  const nextFbdSignalState: Record<string, boolean> = {};
  const nextFbdLatchState: Record<string, boolean> = { ...(prevState.fbdLatchState || {}) };
  const activeSetupRungs: Record<string, boolean> = { ...(prevState.activeSetupRungs || {}) };

  let hasExecutedSetup = prevState.hasExecutedSetup ?? false;
  let setupExecutionTime = prevState.setupExecutionTime;
  let nextFaultLatched = prevState.faultLatched || false;
  let nextFaultReasons = prevState.faultReasons ? [...prevState.faultReasons] : [];

  // Evaluate state machines
  stateMachines.forEach(sm => {
    // 1. Initialize logic: ensure state machine has a starting state
    const initState = sm.states.find(s => s.isInitial) || sm.states[0];
    if (!initState) return;

    // Use current recorded state from variables, or fallback to init state
    const stateVarKey = `SM_${sm.id}_STATE`;
    const enteredAtVarKey = `SM_${sm.id}_ENTERED_AT`;

    let currentStateId = (nextVariableValues[stateVarKey] as string) || initState.id;
    let stateEnteredAtMs = (nextVariableValues[enteredAtVarKey] as number) || absoluteTimeMs;

    // Create execution context using absoluteTimeMs
    // (advanceTime will NOT add deltaTimeMs again, because we pass deltaMs=0 here
    // to strictly evaluate at the newly updated absoluteTimeMs, OR we can pass
    // the un-incremented time and let advanceTime add deltaMs. Let's pass the
    // already updated absoluteTimeMs and delta=0 to keep it clean).
    const ctx: EvaluationContext = {
      inputs: {
        ...prevState.digitalInputs,
        ...prevState.analogInputs,
        ...prevState.internalFlags,
        ...prevState.digitalOutputs,
        ...prevState.variableValues
      },
      nowMs: absoluteTimeMs,
      stateEnteredAtMs
    };

    const simTick = advanceTime(sm as StateMachineModel, currentStateId, ctx, 0);

    // Update variable records based on result
    if (simTick.result.transitionTaken) {
      nextVariableValues[stateVarKey] = simTick.result.newState;
      nextVariableValues[enteredAtVarKey] = simTick.ctx.nowMs;
      // In a real simulator we would apply actionsRun to nextVariableValues/nextDigitalOutputs here
    } else {
      nextVariableValues[stateVarKey] = currentStateId;
      nextVariableValues[enteredAtVarKey] = stateEnteredAtMs;
    }
  });

  // Helper to evaluate a contact element
  function isContactPassing(el: LadderElement): boolean {
    if (el.type === 'NO_CONTACT') {
      if (el.pin) {
        if (el.pin.startsWith('EXP_') || el.pin.startsWith('PCF_')) {
          return !!(nextExpanderInputs[el.pin] ?? nextExpanderOutputs[el.pin] ?? false);
        }
        return !!prevState.digitalInputs[el.pin];
      }
      if (el.variable) {
        if (nextTimerStates[el.variable]) {
          return !!nextTimerStates[el.variable].isDone;
        }
        if (nextCounterStates[el.variable]) {
          return !!nextCounterStates[el.variable].isDone;
        }
        if (nextVariableValues[el.variable] !== undefined) {
          return Boolean(nextVariableValues[el.variable]);
        }
        return !!nextInternalFlags[el.variable];
      }
      return false;
    }

    if (el.type === 'NC_CONTACT') {
      if (el.pin) {
        if (el.pin.startsWith('EXP_') || el.pin.startsWith('PCF_')) {
          return !(nextExpanderInputs[el.pin] ?? nextExpanderOutputs[el.pin] ?? false);
        }
        return !prevState.digitalInputs[el.pin];
      }
      if (el.variable) {
        if (nextTimerStates[el.variable]) {
          return !nextTimerStates[el.variable].isDone;
        }
        if (nextCounterStates[el.variable]) {
          return !nextCounterStates[el.variable].isDone;
        }
        if (nextVariableValues[el.variable] !== undefined) {
          return !Boolean(nextVariableValues[el.variable]);
        }
        return !nextInternalFlags[el.variable];
      }
      return true;
    }

    if (el.type === 'RISING_EDGE' && el.pin) {
      if (el.pin.startsWith('EXP_') || el.pin.startsWith('PCF_')) {
        return !!(nextExpanderInputs[el.pin] ?? nextExpanderOutputs[el.pin] ?? false);
      }
      return !!prevState.digitalInputs[el.pin];
    }

    if (el.type === 'FALLING_EDGE' && el.pin) {
      if (el.pin.startsWith('EXP_') || el.pin.startsWith('PCF_')) {
        return !(nextExpanderInputs[el.pin] ?? nextExpanderOutputs[el.pin] ?? false);
      }
      return !prevState.digitalInputs[el.pin];
    }

    if (el.type === 'ANALOG_CMP') {
      const val = el.variable === 'DHT_TEMP' ? (prevState.analogInputs['DHT_TEMP'] ?? 24) :
                  el.variable === 'DHT_HUM' ? (prevState.analogInputs['DHT_HUM'] ?? 50) :
                  el.variable === 'ULTRASONIC' ? (prevState.analogInputs['ULTRASONIC'] ?? 25) :
                  el.pin ? (prevState.analogInputs[el.pin] ?? 0) : 0;
      const target = el.compareValue ?? 0;
      switch (el.compareOp || '>') {
        case '>': return val > target;
        case '>=': return val >= target;
        case '<': return val < target;
        case '<=': return val <= target;
        case '==': return val === target;
        case '!=': return val !== target;
        default: return val > target;
      }
    }

    if (el.type === 'VAR_CMP') {
      // Compare PLC variable or array element with constant/value
      let actualVal: any = 0;
      if (el.arrayName && el.arrayIndex !== undefined && nextArrayValues[el.arrayName]) {
        const idx = typeof el.arrayIndex === 'number' ? el.arrayIndex : parseInt(String(el.arrayIndex), 10) || 0;
        actualVal = nextArrayValues[el.arrayName][idx] ?? 0;
      } else if (el.variable && nextVariableValues[el.variable] !== undefined) {
        actualVal = nextVariableValues[el.variable];
      } else if (el.targetVariable && nextVariableValues[el.targetVariable] !== undefined) {
        actualVal = nextVariableValues[el.targetVariable];
      }

      const target = el.compareValue ?? 0;
      const numVal = Number(actualVal);
      switch (el.compareOp || '>') {
        case '>': return numVal > target;
        case '>=': return numVal >= target;
        case '<': return numVal < target;
        case '<=': return numVal <= target;
        case '==': return actualVal == target;
        case '!=': return actualVal != target;
        default: return numVal > target;
      }
    }

    if (el.type === 'INTERNAL_FLAG_CONTACT' && el.variable) {
      if (nextVariableValues[el.variable] !== undefined) {
        return Boolean(nextVariableValues[el.variable]);
      }
      return !!nextInternalFlags[el.variable];
    }

    if (el.type === 'NRF24_AVAILABLE') {
      return Boolean(nextNrf24RxBuffer || nextNrf24Logs.some(l => l.direction === 'RX'));
    }

    if (el.type === 'EEPROM_24C_CHECK') {
      return true; // 24Cxxx EEPROM responding ACK
    }

    if (el.type === 'BUFFER_EMPTY') {
      const arrName = el.arrayName || 'QUEUE_BUFFER';
      const ptrVar = el.pointerVar || 'V_QUEUE_LEN';
      let count = 0;
      if (ptrVar && nextVariableValues[ptrVar] !== undefined) {
        count = Number(nextVariableValues[ptrVar]);
      } else if (nextArrayValues[arrName]) {
        count = nextArrayValues[arrName].filter(v => v !== 0 && v !== '' && v !== false).length;
      }
      return count === 0;
    }

    if (el.type === 'BUFFER_FULL') {
      const arrName = el.arrayName || 'QUEUE_BUFFER';
      const ptrVar = el.pointerVar || 'V_QUEUE_LEN';
      const maxCap = el.maxSize ?? (nextArrayValues[arrName]?.length || 8);
      let count = 0;
      if (ptrVar && nextVariableValues[ptrVar] !== undefined) {
        count = Number(nextVariableValues[ptrVar]);
      } else if (nextArrayValues[arrName]) {
        count = nextArrayValues[arrName].filter(v => v !== 0 && v !== '' && v !== false).length;
      }
      return count >= maxCap;
    }

    // --- RTC & CALENDAR CONTACT LOGIC ---
    if (el.type === 'RTC_TIME_RANGE') {
      // Check day of week filter
      const currentDow = nextRtcTime.dayOfWeek;
      const allowedDays = el.rtcDaysOfWeek || [1, 2, 3, 4, 5, 6, 7];
      if (!allowedDays.includes(currentDow)) {
        return false;
      }

      const currentMins = nextRtcTime.hour * 60 + nextRtcTime.minute;
      const startMins = (el.rtcStartHour ?? 8) * 60 + (el.rtcStartMin ?? 0);
      const endMins = (el.rtcEndHour ?? 16) * 60 + (el.rtcEndMin ?? 30);

      if (startMins <= endMins) {
        // Normal range within same day (e.g. 08:00 - 16:30)
        return currentMins >= startMins && currentMins <= endMins;
      } else {
        // Overnight range wrapping midnight (e.g. 22:00 - 06:00)
        return currentMins >= startMins || currentMins <= endMins;
      }
    }

    if (el.type === 'RTC_TIME_CMP') {
      const currentSecs = nextRtcTime.hour * 3600 + nextRtcTime.minute * 60 + nextRtcTime.second;
      const cmpSecs = (el.rtcCompareHour ?? 18) * 3600 + (el.rtcCompareMin ?? 0) * 60 + (el.rtcCompareSec ?? 0);
      const op = el.compareOp || '>=';

      switch (op) {
        case '==': return currentSecs === cmpSecs;
        case '>=': return currentSecs >= cmpSecs;
        case '<=': return currentSecs <= cmpSecs;
        case '>': return currentSecs > cmpSecs;
        case '<': return currentSecs < cmpSecs;
        case '!=': return currentSecs !== cmpSecs;
        default: return currentSecs >= cmpSecs;
      }
    }

    if (el.type === 'RTC_CALENDAR_RANGE') {
      if (el.rtcYearSpecific && el.rtcYearSpecific !== nextRtcTime.year) {
        return false;
      }
      const curMonthDay = nextRtcTime.month * 100 + nextRtcTime.day;
      const startMonthDay = (el.rtcStartMonth ?? 5) * 100 + (el.rtcStartDay ?? 1);
      const endMonthDay = (el.rtcEndMonth ?? 9) * 100 + (el.rtcEndDay ?? 30);

      if (startMonthDay <= endMonthDay) {
        return curMonthDay >= startMonthDay && curMonthDay <= endMonthDay;
      } else {
        // Year wrap-around (e.g. Nov 1 to Feb 28)
        return curMonthDay >= startMonthDay || curMonthDay <= endMonthDay;
      }
    }

    if (el.type === 'RTC_PULSE_TICK') {
      const interval = el.rtcPulseInterval || 'second';
      if (interval === 'second') return rtcSecChanged;
      if (interval === 'minute') return rtcMinChanged;
      if (interval === 'hour') return rtcHourChanged;
      if (interval === 'midnight') return rtcMidnightChanged;
      return rtcSecChanged;
    }

    // --- MODBUS RTU & HARDWARE SUPERVISOR CONTACTS ---
    if (el.type === 'MODBUS_STATUS') {
      // Passes if Modbus is enabled and no recent fatal error
      const isEnabled = protocols?.modbus?.enabled ?? true;
      const hasRecentFatal = nextModbusLogs.slice(0, 3).some(l => l.status === 'CRC_ERROR');
      return isEnabled && !hasRecentFatal;
    }

    if (el.type === 'BOD_STATUS') {
      // Closes if power rail is nominal (above brown-out trip threshold)
      return powerRailVoltage >= brownoutTripVoltage;
    }

    return true;
  }

  // Helper to evaluate an active FBD diagram
  function evaluateFbdDiagram(diagram: FBDDiagram) {
    const blocks = diagram.blocks;
    const connections = diagram.connections;

    // We will build a map of block output pin signals. Key: `${blockId}_${pinName}`
    // and connection signals. Key: `${connId}`
    // Initialize outputs to false (or true for NOT blocks if 0 inputs)
    const blockOutputs: Record<string, boolean> = {};

    // Multi-pass evaluation to handle topological sort and cycles safely
    const MAX_PASSES = 10;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;

      for (const block of blocks) {
        // Collect inputs for this block
        // Find connections targeting this block
        const inConnections = connections.filter(c => c.targetBlockId === block.id);

        const getInValue = (pinName: string): boolean => {
          const conn = inConnections.find(c => c.targetPin === pinName);
          if (!conn) return false;
          return blockOutputs[`${conn.sourceBlockId}_${conn.sourcePin}`] || false;
        };

        if (block.type === 'INPUT') {
          // INPUT block reads from physical/variables
          const varName = block.properties?.variable;
          let val = false;
          if (varName) {
            if (varName.startsWith('D') && prevState.digitalInputs[varName] !== undefined) {
              val = !!prevState.digitalInputs[varName];
            } else if (varName.startsWith('M') && prevState.internalFlags[varName] !== undefined) {
              val = !!prevState.internalFlags[varName];
            } else {
              val = !!nextVariableValues[varName];
            }
          }
          const current = blockOutputs[`${block.id}_out`] || false;
          if (current !== val) {
            blockOutputs[`${block.id}_out`] = val;
            changed = true;
          }
        }
        else if (block.type === 'AND') {
          const in1 = getInValue('in1');
          const in2 = getInValue('in2');
          const val = in1 && in2;
          const current = blockOutputs[`${block.id}_out`] || false;
          if (current !== val) {
            blockOutputs[`${block.id}_out`] = val;
            changed = true;
          }
        }
        else if (block.type === 'OR') {
          const in1 = getInValue('in1');
          const in2 = getInValue('in2');
          const val = in1 || in2;
          const current = blockOutputs[`${block.id}_out`] || false;
          if (current !== val) {
            blockOutputs[`${block.id}_out`] = val;
            changed = true;
          }
        }
        else if (block.type === 'XOR') {
          const in1 = getInValue('in1');
          const in2 = getInValue('in2');
          const val = in1 !== in2;
          const current = blockOutputs[`${block.id}_out`] || false;
          if (current !== val) {
            blockOutputs[`${block.id}_out`] = val;
            changed = true;
          }
        }
        else if (block.type === 'NOT') {
          const inVal = getInValue('in');
          const val = !inVal;
          const current = blockOutputs[`${block.id}_out`]; // undefined initially
          if (current !== val) {
            blockOutputs[`${block.id}_out`] = val;
            changed = true;
          }
        }
        else if (block.type === 'RS' || block.type === 'SR') {
          const s = getInValue('S');
          const r = getInValue('R');
          const lastState = nextFbdLatchState[block.id] || false;
          let val = lastState;

          if (block.type === 'RS') {
             // Reset-dominant
             if (r) val = false;
             else if (s) val = true;
          } else {
             // Set-dominant
             if (s) val = true;
             else if (r) val = false;
          }

          const current = blockOutputs[`${block.id}_Q`]; // undefined initially
          if (current !== val) {
            blockOutputs[`${block.id}_Q`] = val;
            changed = true;
          }
        }
        else if (block.type === 'OUTPUT') {
          const val = getInValue('in');
          const current = blockOutputs[`${block.id}_in`] || false;
          if (current !== val) {
            blockOutputs[`${block.id}_in`] = val;
            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    // Apply Output variables and populate nextFbdSignalState for UI
    for (const block of blocks) {
      if (block.type === 'OUTPUT') {
        const val = blockOutputs[`${block.id}_in`] || false;
        const varName = block.properties?.variable;
        if (varName) {
           if (varName.startsWith('D') && prevState.digitalOutputs[varName] !== undefined) {
             nextDigitalOutputs[varName] = val;
           } else if (varName.startsWith('M') && prevState.internalFlags[varName] !== undefined) {
             nextInternalFlags[varName] = val;
           } else {
             nextVariableValues[varName] = val;
           }
        }
      }
      else if (block.type === 'RS' || block.type === 'SR') {
        // Save latch state permanently
        const qVal = blockOutputs[`${block.id}_Q`] || false;
        nextFbdLatchState[block.id] = qVal;
      }
      // UI state for pins
      for (const key of Object.keys(blockOutputs)) {
         if (key.startsWith(`${block.id}_`)) {
           nextFbdSignalState[key] = blockOutputs[key];
         }
      }
    }

    // UI state for connections
    for (const conn of connections) {
      const sourceVal = blockOutputs[`${conn.sourceBlockId}_${conn.sourcePin}`] || false;
      nextFbdSignalState[conn.id] = sourceVal;
      // also mark target pin for glow
      nextFbdSignalState[`${conn.targetBlockId}_${conn.targetPin}`] = sourceVal;
    }
  }

  // Helper to evaluate an individual rung (either in setup or cyclic loop)
  function evaluateRung(rung: Rung, isSetup: boolean = false) {
    let rungHasPower = false;

    // Check each parallel branch (OR logic)
    for (const branch of rung.branches) {
      let branchPasses = true;

      // In series along the branch (AND logic)
      for (const el of branch.elements) {
        const passes = isContactPassing(el);
        activeElements[el.id] = passes;
        if (!passes) {
          branchPasses = false;
        }
      }

      activeBranches[branch.id] = branchPasses;
      if (branchPasses) {
        rungHasPower = true;
      }
    }

    if (isSetup) {
      activeSetupRungs[rung.id] = rungHasPower;
    } else {
      activeRungs[rung.id] = rungHasPower;
    }

    // Execute coils / outputs for this rung
    for (const coil of rung.coils) {
      const wasCoilActive = !!prevState.activeElements[coil.id];
      activeElements[coil.id] = rungHasPower;

      if (coil.type === 'COIL_NORMAL' && coil.pin) {
        if (coil.pin.startsWith('EXP_') || coil.pin.startsWith('PCF_')) {
          nextExpanderOutputs[coil.pin] = rungHasPower;
        } else {
          nextDigitalOutputs[coil.pin] = rungHasPower;
        }
        if (coil.variable) {
          nextInternalFlags[coil.variable] = rungHasPower;
        }
      } else if (coil.type === 'COIL_INV' && coil.pin) {
        if (coil.pin.startsWith('EXP_') || coil.pin.startsWith('PCF_')) {
          nextExpanderOutputs[coil.pin] = !rungHasPower;
        } else {
          nextDigitalOutputs[coil.pin] = !rungHasPower;
        }
      } else if (coil.type === 'COIL_SET') {
        if (rungHasPower) {
          if (coil.pin) {
            if (coil.pin.startsWith('EXP_') || coil.pin.startsWith('PCF_')) {
              nextExpanderOutputs[coil.pin] = true;
            } else {
              nextDigitalOutputs[coil.pin] = true;
            }
          }
          if (coil.variable) nextInternalFlags[coil.variable] = true;
        }
      } else if (coil.type === 'COIL_RESET') {
        if (rungHasPower) {
          if (coil.pin) {
            if (coil.pin.startsWith('EXP_') || coil.pin.startsWith('PCF_')) {
              nextExpanderOutputs[coil.pin] = false;
            } else {
              nextDigitalOutputs[coil.pin] = false;
            }
          }
          if (coil.variable) nextInternalFlags[coil.variable] = false;
          if (coil.variable && nextCounterStates[coil.variable]) {
            nextCounterStates[coil.variable] = { currentCount: 0, isDone: false };
          }
        }
      } else if (coil.type === 'INTERNAL_FLAG_COIL' && coil.variable) {
        nextInternalFlags[coil.variable] = rungHasPower;
        if (nextVariableValues[coil.variable] !== undefined) {
          nextVariableValues[coil.variable] = rungHasPower;
        }
      } else if (coil.type === 'TON' && coil.variable) {
        const preset = coil.presetMs || 1000;
        const currentTimer = nextTimerStates[coil.variable] || { currentMs: 0, isDone: false, isTiming: false };

        if (rungHasPower) {
          const newCurrentMs = Math.min(preset, currentTimer.currentMs + deltaTimeMs);
          const isDone = newCurrentMs >= preset;
          nextTimerStates[coil.variable] = {
            currentMs: newCurrentMs,
            isDone,
            isTiming: !isDone
          };
        } else {
          nextTimerStates[coil.variable] = {
            currentMs: 0,
            isDone: false,
            isTiming: false
          };
        }
      } else if (coil.type === 'CTU' && coil.variable) {
        const preset = coil.presetCount || 5;
        const currentCounter = nextCounterStates[coil.variable] || { currentCount: 0, isDone: false };

        // Rising edge detection on the rung power
        if (rungHasPower && !wasCoilActive) {
          const newCount = Math.min(preset, currentCounter.currentCount + 1);
          nextCounterStates[coil.variable] = {
            currentCount: newCount,
            isDone: newCount >= preset
          };
        }
      } else if (coil.type === 'SERVO_WRITE') {
        if (rungHasPower) {
          const pin = coil.pin || 'D9';
          nextServoAngles[pin] = coil.servoAngle ?? 90;
        }
      } else if (coil.type === 'LCD_PRINT') {
        if (rungHasPower) {
          const row = (coil.lcdRow ?? 0) as 0 | 1;
          let text = coil.lcdText || 'PLC RUN';
          if (text.includes('Temp')) {
            const temp = prevState.analogInputs['DHT_TEMP'] ?? 24.5;
            text = `Temp: ${temp.toFixed(1)}C  OK`;
          }
          nextLcdLines[row] = text.padEnd(16, ' ').slice(0, 16);
        }
      } else if (coil.type === 'NEOPIXEL_SET') {
        if (rungHasPower) {
          const idx = coil.neoPixelLedIndex || 0;
          nextNeoPixelColors[idx] = coil.neoPixelColor || '#00FF00';
        }
      } else if (coil.type === 'PWM_OUT' && coil.pin) {
        nextPwmOutputs[coil.pin] = rungHasPower ? (coil.pwmValue || 128) : 0;
      }
      // -----------------------------------------------------------------
      // Communication Protocols Simulation (Dallas, I2C, SPI, UART)
      // -----------------------------------------------------------------
      else if (coil.type === 'DALLAS_READ') {
        if (rungHasPower) {
          const targetVar = coil.dallasTargetVar || coil.variable || 'V_TEMP_C';
          nextVariableValues[targetVar] = prevState.dallasTemp;
        }
      } else if (coil.type === 'I2C_WRITE') {
        if (rungHasPower && !wasCoilActive) {
          const addr = coil.i2cAddress || '0x27';
          const payload = coil.i2cData || '0xFF';
          nextI2cLogs.unshift({
            id: `i2c_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            address: addr,
            op: 'WRITE',
            data: payload
          });
          if (nextI2cLogs.length > 30) nextI2cLogs.pop();
        }
      } else if (coil.type === 'I2C_READ') {
        if (rungHasPower && !wasCoilActive) {
          const addr = coil.i2cAddress || '0x68';
          const targetVar = coil.targetVariable || coil.variable || 'V_BATCH_COUNT';
          nextI2cLogs.unshift({
            id: `i2c_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            address: addr,
            op: 'READ',
            data: '0x14 (ACK)'
          });
          if (nextI2cLogs.length > 30) nextI2cLogs.pop();
        }
      } else if (coil.type === 'SPI_TRANSFER') {
        if (rungHasPower && !wasCoilActive) {
          const cs = coil.spiCsPin || 'D10';
          const dataOut = coil.spiDataToSend || '0x55';
          nextSpiLogs.unshift({
            id: `spi_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            cs,
            dataOut,
            dataIn: '0xAA'
          });
          if (nextSpiLogs.length > 30) nextSpiLogs.pop();
        }
      } else if (coil.type === 'UART_PRINT') {
        if (rungHasPower && !wasCoilActive) {
          let msg = coil.uartMessage || '';
          if (!msg && coil.variable) {
            msg = `${coil.variable} = ${nextVariableValues[coil.variable] ?? ''}`;
          } else if (!msg) {
            msg = `PLC SCAN CYCLE ACTIVE - RUNG #${rung.number}`;
          }
          nextUartLogs.unshift({
            id: `uart_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            message: msg
          });
          if (nextUartLogs.length > 30) nextUartLogs.pop();
        }
      }
      // -----------------------------------------------------------------
      // Variables & Arrays Assignment Simulation
      // -----------------------------------------------------------------
      else if (coil.type === 'VAR_ASSIGN') {
        if (rungHasPower && !wasCoilActive) {
          const targetVar = coil.targetVariable || coil.variable;
          const expr = coil.assignExpression || '';

          if (targetVar) {
            const currentVal = nextVariableValues[targetVar];
            if (expr.includes('+ 1') || expr.includes('++')) {
              nextVariableValues[targetVar] = (Number(currentVal) || 0) + 1;
            } else if (expr.includes('- 1') || expr.includes('--')) {
              nextVariableValues[targetVar] = Math.max(0, (Number(currentVal) || 0) - 1);
            } else if (!isNaN(Number(expr))) {
              nextVariableValues[targetVar] = Number(expr);
            } else if (expr.toLowerCase() === 'true') {
              nextVariableValues[targetVar] = true;
            } else if (expr.toLowerCase() === 'false') {
              nextVariableValues[targetVar] = false;
            } else if (nextVariableValues[expr] !== undefined) {
              nextVariableValues[targetVar] = nextVariableValues[expr];
            }
          }

          if (coil.arrayName && coil.arrayIndex !== undefined && nextArrayValues[coil.arrayName]) {
            const idx = typeof coil.arrayIndex === 'number' ? coil.arrayIndex : parseInt(String(coil.arrayIndex), 10) || 0;
            if (idx >= 0 && idx < nextArrayValues[coil.arrayName].length) {
              const updatedArr = [...nextArrayValues[coil.arrayName]];
              if (!isNaN(Number(expr))) {
                updatedArr[idx] = Number(expr);
              }
              nextArrayValues[coil.arrayName] = updatedArr;
            }
          }
        }
      }
      else if (coil.type === 'MOV') {
        if (rungHasPower && !wasCoilActive) {
          const targetVar = coil.targetVariable || coil.variable;
          const srcKey = coil.sourceVariable || coil.assignExpression || coil.variable;
          if (targetVar) {
            let val: number | boolean | string = 0;
            if (srcKey && nextVariableValues[srcKey] !== undefined) {
              val = nextVariableValues[srcKey];
            } else if (srcKey && !isNaN(Number(srcKey))) {
              val = Number(srcKey);
            } else if (srcKey) {
              val = srcKey;
            }
            nextVariableValues[targetVar] = val;
          }
        }
      }
      else if (['WAND', 'WOR', 'WXOR', 'WNOT', 'SHL', 'SHR'].includes(coil.type)) {
        if (rungHasPower && !wasCoilActive) {
          const targetVar = coil.targetVariable || coil.variable;
          const valA = resolveOperandVal(coil.sourceVariable || coil.variable, nextVariableValues);
          const valB = resolveOperandVal(coil.operandB, nextVariableValues);
          const shift = typeof coil.shiftCount === 'number'
            ? coil.shiftCount
            : resolveOperandVal(coil.shiftCount || coil.operandB, nextVariableValues);

          if (targetVar) {
            let res = 0;
            switch (coil.type) {
              case 'WAND': res = (valA & valB) >>> 0; break;
              case 'WOR':  res = (valA | valB) >>> 0; break;
              case 'WXOR': res = (valA ^ valB) >>> 0; break;
              case 'WNOT': res = (~valA) & 0xFFFF; break;
              case 'SHL':  res = (valA << shift) >>> 0; break;
              case 'SHR':  res = (valA >>> shift); break;
            }
            nextVariableValues[targetVar] = res;
          }
        }
      }
      else if (['COMB_AND', 'COMB_AND3', 'COMB_OR', 'COMB_OR3', 'COMB_XOR', 'COMB_NOT'].includes(coil.type)) {
        const in1Val = resolveBoolInput(
          coil.sourceVariable,
          prevState,
          nextVariableValues,
          nextInternalFlags,
          nextExpanderInputs,
          nextExpanderOutputs
        );
        const in2Val = resolveBoolInput(
          coil.operandB,
          prevState,
          nextVariableValues,
          nextInternalFlags,
          nextExpanderInputs,
          nextExpanderOutputs
        );
        const in3Val = resolveBoolInput(
          coil.operandC,
          prevState,
          nextVariableValues,
          nextInternalFlags,
          nextExpanderInputs,
          nextExpanderOutputs
        );

        let gateOutput = false;
        switch (coil.type) {
          case 'COMB_AND':  gateOutput = in1Val && in2Val; break;
          case 'COMB_AND3': gateOutput = in1Val && in2Val && in3Val; break;
          case 'COMB_OR':   gateOutput = in1Val || in2Val; break;
          case 'COMB_OR3':  gateOutput = in1Val || in2Val || in3Val; break;
          case 'COMB_XOR':  gateOutput = in1Val !== in2Val; break;
          case 'COMB_NOT':  gateOutput = !in1Val; break;
        }

        activeElements[coil.id] = rungHasPower && gateOutput;

        if (rungHasPower) {
          const target = coil.targetVariable || coil.variable;
          if (target) {
            if (target.startsWith('D')) {
              nextDigitalOutputs[target] = gateOutput;
            } else if (target.startsWith('EXP_') || target.startsWith('PCF_')) {
              nextExpanderOutputs[target] = gateOutput;
            } else {
              nextInternalFlags[target] = gateOutput;
              nextVariableValues[target] = gateOutput;
            }
          }
          if (coil.pin) {
            if (coil.pin.startsWith('EXP_') || coil.pin.startsWith('PCF_')) {
              nextExpanderOutputs[coil.pin] = gateOutput;
            } else {
              nextDigitalOutputs[coil.pin] = gateOutput;
            }
          }
        }
      }
      // -----------------------------------------------------------------
      // Subroutine execution
      // -----------------------------------------------------------------
      else if (coil.type === 'SUBROUTINE_CALL' && coil.subroutineId) {
        const targetSub = subroutines.find((s) => s.id === coil.subroutineId);
        if (targetSub && rungHasPower) {
          const localInputs: Record<string, boolean> = {};
          const localOutputs: Record<string, boolean> = {};

          targetSub.inputs.forEach((param) => {
            const boundTo = coil.subroutineBindings?.[param.name] || param.defaultPinOrVar || 'D2';
            if (boundTo.startsWith('D')) {
              localInputs[param.name] = !!prevState.digitalInputs[boundTo];
            } else if (boundTo.startsWith('M')) {
              localInputs[param.name] = !!nextInternalFlags[boundTo];
            } else {
              localInputs[param.name] = !!prevState.digitalInputs[boundTo];
            }
          });

          targetSub.rungs.forEach((subRung) => {
            let subRungActive = false;
            subRung.branches.forEach((branch) => {
              let branchActive = true;
              branch.elements.forEach((el) => {
                if (el.type === 'NO_CONTACT') {
                  const val = localInputs[el.variable || el.name] ?? localOutputs[el.variable || el.name] ?? false;
                  if (!val) branchActive = false;
                } else if (el.type === 'NC_CONTACT') {
                  const val = localInputs[el.variable || el.name] ?? localOutputs[el.variable || el.name] ?? false;
                  if (val) branchActive = false;
                }
              });
              if (branchActive) subRungActive = true;
            });

            subRung.coils.forEach((sc) => {
              const varName = sc.variable || sc.name;
              if (sc.type === 'COIL_NORMAL') {
                localOutputs[varName] = subRungActive;
              } else if (sc.type === 'COIL_SET' && subRungActive) {
                localOutputs[varName] = true;
              } else if (sc.type === 'COIL_RESET' && subRungActive) {
                localOutputs[varName] = false;
              }
            });
          });

          targetSub.outputs.forEach((param) => {
            const boundTo = coil.subroutineBindings?.[param.name] || param.defaultPinOrVar || 'D8';
            const outputVal = localOutputs[param.name] ?? false;
            if (boundTo.startsWith('D')) {
              nextDigitalOutputs[boundTo] = outputVal;
            } else if (boundTo.startsWith('M')) {
              nextInternalFlags[boundTo] = outputVal;
            } else {
              nextDigitalOutputs[boundTo] = outputVal;
            }
          });
        }
      }
      // -----------------------------------------------------------------
      // NRF24 2.4GHz Wireless Transceiver Execution
      // -----------------------------------------------------------------
      else if (coil.type === 'NRF24_TRANSMIT') {
        if (rungHasPower) {
          const payload = coil.variable && nextVariableValues[coil.variable] !== undefined
            ? String(nextVariableValues[coil.variable])
            : (coil.nrfPayload || 'PLC_DATA');
          nextNrf24Logs.unshift({
            id: `nrf_tx_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            pipe: 0,
            channel: coil.nrfChannel ?? 76,
            payload,
            status: 'ACK'
          });
          if (nextNrf24Logs.length > 30) nextNrf24Logs.pop();
        }
      }
      else if (coil.type === 'NRF24_RECEIVE') {
        if (rungHasPower) {
          const rxData = nextNrf24RxBuffer || 'RECV_OK';
          const target = coil.targetVariable || coil.variable;
          if (target) {
            nextVariableValues[target] = rxData;
          }
          nextNrf24Logs.unshift({
            id: `nrf_rx_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            direction: 'RX',
            pipe: coil.nrfPipe ?? 1,
            channel: coil.nrfChannel ?? 76,
            payload: rxData,
            status: 'ACK'
          });
          if (nextNrf24Logs.length > 30) nextNrf24Logs.pop();
        }
      }
      else if (coil.type === 'NRF24_CONFIG') {
        if (rungHasPower) {
          nextNrf24Logs.unshift({
            id: `nrf_cfg_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            pipe: 0,
            channel: coil.nrfChannel ?? 76,
            payload: `CONFIG CH=${coil.nrfChannel ?? 76}`,
            status: 'ACK'
          });
          if (nextNrf24Logs.length > 30) nextNrf24Logs.pop();
        }
      }
      // -----------------------------------------------------------------
      // 24Cxxx External I2C EEPROM Operations
      // -----------------------------------------------------------------
      else if (coil.type === 'EEPROM_24C_WRITE') {
        if (rungHasPower) {
          const addr = String(coil.eepromAddress || '0x0010');
          const val = coil.variable && nextVariableValues[coil.variable] !== undefined
            ? Number(nextVariableValues[coil.variable])
            : Number(coil.eepromDataValue || 0);
          nextEeprom24cMemory[addr] = val;
          const dtUpper: 'BYTE' | 'INT' | 'FLOAT' | 'STRING' | 'ARRAY' =
            coil.eepromDataType === 'int' ? 'INT' :
            coil.eepromDataType === 'byte' ? 'BYTE' :
            coil.eepromDataType === 'string' ? 'STRING' : 'FLOAT';
          nextEeprom24cLogs.unshift({
            id: `eeprom_wr_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            op: 'WRITE',
            addressHex: addr,
            operation: 'WRITE',
            deviceAddress: coil.i2cAddress || '0x50',
            memoryAddress: addr,
            dataType: dtUpper,
            value: val,
            status: 'SUCCESS'
          });
          if (nextEeprom24cLogs.length > 30) nextEeprom24cLogs.pop();
        }
      }
      else if (coil.type === 'EEPROM_24C_READ') {
        if (rungHasPower) {
          const addr = String(coil.eepromAddress || '0x0010');
          const val = nextEeprom24cMemory[addr] ?? 0;
          const target = coil.targetVariable || coil.variable;
          if (target) {
            nextVariableValues[target] = val;
          }
          const dtUpper: 'BYTE' | 'INT' | 'FLOAT' | 'STRING' | 'ARRAY' =
            coil.eepromDataType === 'int' ? 'INT' :
            coil.eepromDataType === 'byte' ? 'BYTE' :
            coil.eepromDataType === 'string' ? 'STRING' : 'FLOAT';
          nextEeprom24cLogs.unshift({
            id: `eeprom_rd_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            op: 'READ',
            addressHex: addr,
            operation: 'READ',
            deviceAddress: coil.i2cAddress || '0x50',
            memoryAddress: addr,
            dataType: dtUpper,
            value: val,
            status: 'SUCCESS'
          });
          if (nextEeprom24cLogs.length > 30) nextEeprom24cLogs.pop();
        }
      }
      else if (coil.type === 'EEPROM_24C_SAVE_RECIPE') {
        if (rungHasPower && coil.arrayName && nextArrayValues[coil.arrayName]) {
          const addrStr = String(coil.eepromAddress || '0x0080');
          const baseAddrNum = parseInt(addrStr, 16) || 128;
          const arr = nextArrayValues[coil.arrayName];
          arr.forEach((item, idx) => {
            const memAddrHex = '0x' + (baseAddrNum + idx * 4).toString(16).toUpperCase().padStart(4, '0');
            nextEeprom24cMemory[memAddrHex] = Number(item) || 0;
          });
          nextEeprom24cLogs.unshift({
            id: `eeprom_save_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            op: 'WRITE',
            addressHex: addrStr,
            operation: 'WRITE',
            deviceAddress: coil.i2cAddress || '0x50',
            memoryAddress: addrStr,
            dataType: 'ARRAY',
            value: `Recept mentve (${arr.length} elem: ${coil.arrayName})`,
            status: 'SUCCESS'
          });
          if (nextEeprom24cLogs.length > 30) nextEeprom24cLogs.pop();
        }
      }
      else if (coil.type === 'EEPROM_24C_LOAD_RECIPE') {
        if (rungHasPower && coil.arrayName && nextArrayValues[coil.arrayName]) {
          const addrStr = String(coil.eepromAddress || '0x0080');
          const baseAddrNum = parseInt(addrStr, 16) || 128;
          const updatedArr = [...nextArrayValues[coil.arrayName]];
          for (let i = 0; i < updatedArr.length; i++) {
            const memAddrHex = '0x' + (baseAddrNum + i * 4).toString(16).toUpperCase().padStart(4, '0');
            if (nextEeprom24cMemory[memAddrHex] !== undefined) {
              updatedArr[i] = nextEeprom24cMemory[memAddrHex];
            }
          }
          nextArrayValues[coil.arrayName] = updatedArr;
          nextEeprom24cLogs.unshift({
            id: `eeprom_load_${Date.now()}_${Math.random()}`,
            timestamp: formatTimestamp(),
            op: 'READ',
            addressHex: addrStr,
            operation: 'READ',
            deviceAddress: coil.i2cAddress || '0x50',
            memoryAddress: addrStr,
            dataType: 'ARRAY',
            value: `Recept betöltve (${updatedArr.length} elem -> ${coil.arrayName})`,
            status: 'SUCCESS'
          });
          if (nextEeprom24cLogs.length > 30) nextEeprom24cLogs.pop();
        }
      }
      // -----------------------------------------------------------------
      // FIFO / LIFO & BLKMOV Memory Buffer Execution
      // -----------------------------------------------------------------
      else if (coil.type === 'FIFO_PUSH') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const arrName = coil.arrayName || 'QUEUE_BUFFER';
          const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
          const arr = nextArrayValues[arrName] ? [...nextArrayValues[arrName]] : [0, 0, 0, 0, 0, 0, 0, 0];
          const maxCap = coil.maxSize ?? arr.length;
          let count = ptrVar && nextVariableValues[ptrVar] !== undefined ? Number(nextVariableValues[ptrVar]) : 0;

          const valToPush = coil.variable && nextVariableValues[coil.variable] !== undefined
            ? nextVariableValues[coil.variable]
            : (coil.pushValue !== undefined && coil.pushValue !== '' ? Number(coil.pushValue) : 42.5);

          if (count < maxCap && count < arr.length) {
            arr[count] = valToPush;
            count++;
            nextArrayValues[arrName] = arr;
            if (ptrVar) nextVariableValues[ptrVar] = count;
            nextBufferLogs.unshift({
              id: `buf_fifo_push_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'FIFO_PUSH',
              bufferName: arrName,
              itemValue: valToPush,
              pointerCount: count,
              maxCapacity: maxCap,
              details: `Sorba írva: [${count - 1}] = ${valToPush} (Elemszám: ${count}/${maxCap})`,
              status: 'SUCCESS'
            });
          } else {
            nextBufferLogs.unshift({
              id: `buf_fifo_push_ovf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'FIFO_PUSH',
              bufferName: arrName,
              itemValue: valToPush,
              pointerCount: count,
              maxCapacity: maxCap,
              details: `Túlcsordulás! A FIFO sor megtelt (Kapacitás: ${maxCap})`,
              status: 'OVERFLOW'
            });
          }
          if (nextBufferLogs.length > 40) nextBufferLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'FIFO_POP') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const arrName = coil.arrayName || 'QUEUE_BUFFER';
          const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
          const target = coil.targetVariable || coil.variable;
          const arr = nextArrayValues[arrName] ? [...nextArrayValues[arrName]] : [0, 0, 0, 0, 0, 0, 0, 0];
          let count = ptrVar && nextVariableValues[ptrVar] !== undefined ? Number(nextVariableValues[ptrVar]) : 0;

          if (count > 0 && arr.length > 0) {
            const poppedItem = arr[0];
            if (target) {
              nextVariableValues[target] = poppedItem;
            }
            // Shift elements forward by 1 (First-In, First-Out)
            for (let i = 0; i < arr.length - 1; i++) {
              arr[i] = arr[i + 1];
            }
            arr[arr.length - 1] = 0;
            count--;
            nextArrayValues[arrName] = arr;
            if (ptrVar) nextVariableValues[ptrVar] = count;
            nextBufferLogs.unshift({
              id: `buf_fifo_pop_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'FIFO_POP',
              bufferName: arrName,
              itemValue: poppedItem,
              pointerCount: count,
              details: `Sorból kiolvasva: ${poppedItem} -> ${target || 'KILÉPŐ'} (Megmaradt: ${count})`,
              status: 'SUCCESS'
            });
          } else {
            nextBufferLogs.unshift({
              id: `buf_fifo_pop_unf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'FIFO_POP',
              bufferName: arrName,
              pointerCount: count,
              details: `Alulcsordulás! A FIFO sor üres (Count = 0)`,
              status: 'UNDERFLOW'
            });
          }
          if (nextBufferLogs.length > 40) nextBufferLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'LIFO_PUSH') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const arrName = coil.arrayName || 'QUEUE_BUFFER';
          const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
          const arr = nextArrayValues[arrName] ? [...nextArrayValues[arrName]] : [0, 0, 0, 0, 0, 0, 0, 0];
          const maxCap = coil.maxSize ?? arr.length;
          let count = ptrVar && nextVariableValues[ptrVar] !== undefined ? Number(nextVariableValues[ptrVar]) : 0;

          const valToPush = coil.variable && nextVariableValues[coil.variable] !== undefined
            ? nextVariableValues[coil.variable]
            : (coil.pushValue !== undefined && coil.pushValue !== '' ? Number(coil.pushValue) : 42.5);

          if (count < maxCap && count < arr.length) {
            arr[count] = valToPush;
            count++;
            nextArrayValues[arrName] = arr;
            if (ptrVar) nextVariableValues[ptrVar] = count;
            nextBufferLogs.unshift({
              id: `buf_lifo_push_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'LIFO_PUSH',
              bufferName: arrName,
              itemValue: valToPush,
              pointerCount: count,
              maxCapacity: maxCap,
              details: `Veremtetőre írva: TOP[${count - 1}] = ${valToPush} (Magasság: ${count}/${maxCap})`,
              status: 'SUCCESS'
            });
          } else {
            nextBufferLogs.unshift({
              id: `buf_lifo_push_ovf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'LIFO_PUSH',
              bufferName: arrName,
              itemValue: valToPush,
              pointerCount: count,
              maxCapacity: maxCap,
              details: `Verem túlcsordulás! A verem megtelt (Kapacitás: ${maxCap})`,
              status: 'OVERFLOW'
            });
          }
          if (nextBufferLogs.length > 40) nextBufferLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'LIFO_POP') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const arrName = coil.arrayName || 'QUEUE_BUFFER';
          const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
          const target = coil.targetVariable || coil.variable;
          const arr = nextArrayValues[arrName] ? [...nextArrayValues[arrName]] : [0, 0, 0, 0, 0, 0, 0, 0];
          let count = ptrVar && nextVariableValues[ptrVar] !== undefined ? Number(nextVariableValues[ptrVar]) : 0;

          if (count > 0 && count <= arr.length) {
            const poppedItem = arr[count - 1];
            arr[count - 1] = 0;
            count--;
            if (target) {
              nextVariableValues[target] = poppedItem;
            }
            nextArrayValues[arrName] = arr;
            if (ptrVar) nextVariableValues[ptrVar] = count;
            nextBufferLogs.unshift({
              id: `buf_lifo_pop_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'LIFO_POP',
              bufferName: arrName,
              itemValue: poppedItem,
              pointerCount: count,
              details: `Veremből levéve: ${poppedItem} -> ${target || 'KILÉPŐ'} (Megmaradt: ${count})`,
              status: 'SUCCESS'
            });
          } else {
            nextBufferLogs.unshift({
              id: `buf_lifo_pop_unf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'LIFO_POP',
              bufferName: arrName,
              pointerCount: count,
              details: `Alulcsordulás! A LIFO verem üres (Count = 0)`,
              status: 'UNDERFLOW'
            });
          }
          if (nextBufferLogs.length > 40) nextBufferLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'BLKMOV') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const srcName = coil.sourceArray || 'RECIPE_SETPOINTS';
          const dstName = coil.destArray || 'WORK_BUFFER';
          const srcOff = typeof coil.sourceOffset === 'number' ? coil.sourceOffset : (nextVariableValues[String(coil.sourceOffset)] !== undefined ? Number(nextVariableValues[String(coil.sourceOffset)]) : 0);
          const dstOff = typeof coil.destOffset === 'number' ? coil.destOffset : (nextVariableValues[String(coil.destOffset)] !== undefined ? Number(nextVariableValues[String(coil.destOffset)]) : 0);
          const len = typeof coil.blockLength === 'number' ? coil.blockLength : (nextVariableValues[String(coil.blockLength)] !== undefined ? Number(nextVariableValues[String(coil.blockLength)]) : 4);

          const srcArr = nextArrayValues[srcName];
          const dstArr = nextArrayValues[dstName] ? [...nextArrayValues[dstName]] : [];

          if (srcArr && dstArr) {
            let copiedCount = 0;
            for (let i = 0; i < len; i++) {
              const sIdx = srcOff + i;
              const dIdx = dstOff + i;
              if (sIdx < srcArr.length && dIdx < dstArr.length) {
                dstArr[dIdx] = srcArr[sIdx];
                copiedCount++;
              }
            }
            nextArrayValues[dstName] = dstArr;
            nextBufferLogs.unshift({
              id: `buf_blkmov_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'BLKMOV',
              bufferName: `${srcName} -> ${dstName}`,
              details: `BLKMOV: Átmásolva ${copiedCount} elem: ${srcName}[${srcOff}..${srcOff + copiedCount - 1}] -> ${dstName}[${dstOff}..${dstOff + copiedCount - 1}]`,
              status: 'SUCCESS'
            });
          } else {
            nextBufferLogs.unshift({
              id: `buf_blkmov_err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              timestamp: formatTimestamp(),
              operation: 'BLKMOV',
              bufferName: `${srcName} -> ${dstName}`,
              details: `BLKMOV hiba: A tömb nem található (${srcName} vagy ${dstName})`,
              status: 'OVERFLOW'
            });
          }
          if (nextBufferLogs.length > 40) nextBufferLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'RTC_READ_TIME') {
        if (rungHasPower) {
          const varHour = coil.rtcVarHour || 'RTC_HOUR';
          const varMin = coil.rtcVarMin || 'RTC_MIN';
          const varSec = coil.rtcVarSec || 'RTC_SEC';
          const varYear = coil.rtcVarYear || 'RTC_YEAR';
          const varMonth = coil.rtcVarMonth || 'RTC_MONTH';
          const varDay = coil.rtcVarDay || 'RTC_DAY';
          const varDOW = coil.rtcVarDOW || 'RTC_DOW';

          nextVariableValues[varHour] = nextRtcTime.hour;
          nextVariableValues[varMin] = nextRtcTime.minute;
          nextVariableValues[varSec] = nextRtcTime.second;
          nextVariableValues[varYear] = nextRtcTime.year;
          nextVariableValues[varMonth] = nextRtcTime.month;
          nextVariableValues[varDay] = nextRtcTime.day;
          nextVariableValues[varDOW] = nextRtcTime.dayOfWeek;
        }
      }
      else if (coil.type === 'RTC_SET_TIME') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          nextRtcTime.hour = coil.rtcStartHour ?? 12;
          nextRtcTime.minute = coil.rtcStartMin ?? 0;
          nextRtcTime.second = 0;
          nextVariableValues['RTC_HOUR'] = nextRtcTime.hour;
          nextVariableValues['RTC_MIN'] = nextRtcTime.minute;
          nextVariableValues['RTC_SEC'] = nextRtcTime.second;

          nextI2cLogs.unshift({
            id: `i2c_rtc_set_${Date.now()}`,
            timestamp: formatTimestamp(),
            address: '0x68',
            op: 'WRITE',
            data: `DS3231 SET TIME: ${String(nextRtcTime.hour).padStart(2, '0')}:${String(nextRtcTime.minute).padStart(2, '0')}:00`
          });
          if (nextI2cLogs.length > 30) nextI2cLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      // -------------------------------------------------------------
      // I/O PORT EXPANDER (MCP23017 / PCF8574) COIL LOGIC
      // -------------------------------------------------------------
      else if (coil.type === 'EXPANDER_READ_PIN') {
        if (rungHasPower) {
          const pin = coil.expanderPin || coil.pin || 'EXP_A0';
          const pinVal = !!(nextExpanderInputs[pin] ?? nextExpanderOutputs[pin] ?? false);
          const targetVar = coil.expanderTargetVar || coil.targetVariable;
          if (targetVar) {
            nextVariableValues[targetVar] = pinVal;
          }
          const isPcf = pin.startsWith('PCF_');
          const devName = isPcf ? 'PCF8574 (0x21)' : 'MCP23017 (0x20)';
          nextExpanderLogs.unshift({
            id: `exp_rd_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            device: devName,
            operation: 'PIN_READ',
            pinOrPort: pin,
            value: pinVal,
            status: 'OK',
            details: `Olvasás ${pin} -> ${pinVal ? 'HIGH' : 'LOW'} (Változó: ${targetVar || 'N/A'})`
          });
          if (nextExpanderLogs.length > 30) nextExpanderLogs.pop();
        }
      }
      else if (coil.type === 'EXPANDER_WRITE_PIN') {
        const pin = coil.expanderPin || coil.pin || 'EXP_B0';
        nextExpanderOutputs[pin] = rungHasPower;
        const isPcf = pin.startsWith('PCF_');
        const devName = isPcf ? 'PCF8574 (0x21)' : 'MCP23017 (0x20)';
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          nextExpanderLogs.unshift({
            id: `exp_wr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            device: devName,
            operation: 'PIN_WRITE',
            pinOrPort: pin,
            value: true,
            status: 'OK',
            details: `Kimenet beállítva: ${pin} = HIGH`
          });
          if (nextExpanderLogs.length > 30) nextExpanderLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'EXPANDER_READ_PORT') {
        if (rungHasPower) {
          const port = coil.expanderPort || 'A';
          let byteVal = 0;
          if (port === 'A') {
            for (let i = 0; i < 8; i++) {
              if (nextExpanderInputs[`EXP_A${i}`] || nextExpanderOutputs[`EXP_A${i}`]) {
                byteVal |= (1 << i);
              }
            }
          } else if (port === 'B') {
            for (let i = 0; i < 8; i++) {
              if (nextExpanderInputs[`EXP_B${i}`] || nextExpanderOutputs[`EXP_B${i}`]) {
                byteVal |= (1 << i);
              }
            }
          } else {
            for (let i = 0; i < 8; i++) {
              if (nextExpanderInputs[`PCF_P${i}`] || nextExpanderOutputs[`PCF_P${i}`]) {
                byteVal |= (1 << i);
              }
            }
          }
          const targetVar = coil.expanderTargetVar || coil.targetVariable;
          if (targetVar) {
            nextVariableValues[targetVar] = byteVal;
          }
          const devName = port === 'PORT' ? 'PCF8574 (0x21)' : 'MCP23017 (0x20)';
          nextExpanderLogs.unshift({
            id: `exp_p_rd_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            device: devName,
            operation: 'PORT_READ',
            pinOrPort: `PORT_${port}`,
            value: byteVal,
            rawHex: `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`,
            status: 'OK',
            details: `Port beolvasva: 0x${byteVal.toString(16).toUpperCase().padStart(2, '0')} (${byteVal}) -> ${targetVar || 'N/A'}`
          });
          if (nextExpanderLogs.length > 30) nextExpanderLogs.pop();
        }
      }
      else if (coil.type === 'EXPANDER_WRITE_PORT') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const port = coil.expanderPort || 'B';
          let val = 255;
          if (coil.expanderValueVar) {
            if (nextVariableValues[coil.expanderValueVar] !== undefined) {
              val = Number(nextVariableValues[coil.expanderValueVar]);
            } else if (!isNaN(Number(coil.expanderValueVar))) {
              val = Number(coil.expanderValueVar);
            }
          }
          val = Math.max(0, Math.min(255, val));
          if (port === 'A') {
            for (let i = 0; i < 8; i++) {
              nextExpanderOutputs[`EXP_A${i}`] = !!(val & (1 << i));
            }
          } else if (port === 'B') {
            for (let i = 0; i < 8; i++) {
              nextExpanderOutputs[`EXP_B${i}`] = !!(val & (1 << i));
            }
          } else {
            for (let i = 0; i < 8; i++) {
              nextExpanderOutputs[`PCF_P${i}`] = !!(val & (1 << i));
            }
          }
          const devName = port === 'PORT' ? 'PCF8574 (0x21)' : 'MCP23017 (0x20)';
          nextExpanderLogs.unshift({
            id: `exp_p_wr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            timestamp: formatTimestamp(),
            device: devName,
            operation: 'PORT_WRITE',
            pinOrPort: `PORT_${port}`,
            value: val,
            rawHex: `0x${val.toString(16).toUpperCase().padStart(2, '0')}`,
            status: 'OK',
            details: `Portra kiírva: 0x${val.toString(16).toUpperCase().padStart(2, '0')} (${val})`
          });
          if (nextExpanderLogs.length > 30) nextExpanderLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      // --- PID CONTROLLER EXECUTION ---
      else if (coil.type === 'PID_CONTROLLER') {
        if (rungHasPower) {
          let sp = coil.pidSetpoint ?? 60.0;
          if (coil.pidSetpointVar && nextVariableValues[coil.pidSetpointVar] !== undefined) {
            sp = Number(nextVariableValues[coil.pidSetpointVar]);
          }
          const inVar = coil.pidInputVar || coil.pin || 'A0';
          let pv = 0;
          if (prevState.analogInputs[inVar] !== undefined) {
            pv = prevState.analogInputs[inVar];
          } else if (nextVariableValues[inVar] !== undefined) {
            pv = Number(nextVariableValues[inVar]);
          }
          const kp = coil.pidKp ?? 3.2;
          const err = sp - pv;
          const pTerm = kp * err;
          const minOut = coil.pidMinOutput ?? 0;
          const maxOut = coil.pidMaxOutput ?? 255;
          const outVal = Math.max(minOut, Math.min(maxOut, Math.round(pTerm + (sp * (maxOut / 100)))));
          const outVar = coil.pidOutputVar || 'V_PID_OUT';
          if (outVar.startsWith('D')) {
            nextPwmOutputs[outVar] = outVal;
          } else {
            nextVariableValues[outVar] = outVal;
          }
        }
      }
      // --- MODBUS RTU & HARDWARE SUPERVISOR COIL LOGIC ---
      else if (coil.type === 'WDT_RESET') {
        if (rungHasPower) {
          nextWatchdogTimerMs = 0;
        }
      }
      else if (coil.type === 'MODBUS_WRITE_HOLDING') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const slaveId = coil.modbusSlaveId ?? 1;
          const regAddr = coil.modbusRegister ?? 0;
          const valVar = coil.modbusValueVar || coil.variable;
          let val = 0;
          if (valVar && nextVariableValues[valVar] !== undefined) {
            val = Number(nextVariableValues[valVar]);
          } else if (coil.compareValue !== undefined) {
            val = Number(coil.compareValue);
          }
          const query = buildModbusQuery(slaveId, 6, regAddr, Math.round(val));
          rs485DePinActive = true;
          nextModbusLogs.unshift({
            id: `mb_tx_${Date.now()}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            slaveId,
            functionCode: 6,
            functionName: 'Write Single Register (06)',
            address: regAddr,
            countOrValue: Math.round(val),
            rawFrame: query.rawHex,
            crcHex: query.crcHex,
            crcOk: true,
            status: 'OK',
            detail: `RS485 Master Írás: Slave #${slaveId}, Reg ${regAddr} = ${Math.round(val)} (${valVar || 'Konstans'})`
          });
          if (nextModbusLogs.length > 40) nextModbusLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'MODBUS_WRITE_COIL') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const slaveId = coil.modbusSlaveId ?? 1;
          const coilAddr = coil.modbusRegister ?? coil.modbusCoilIndex ?? 0;
          const valVar = coil.modbusValueVar || coil.variable;
          const isTurnOn = valVar && nextVariableValues[valVar] !== undefined
            ? Boolean(nextVariableValues[valVar])
            : (valVar && nextInternalFlags[valVar] !== undefined ? nextInternalFlags[valVar] : true);
          const coilVal = isTurnOn ? 0xFF00 : 0x0000;
          const query = buildModbusQuery(slaveId, 5, coilAddr, coilVal);
          rs485DePinActive = true;
          nextModbusLogs.unshift({
            id: `mb_tx_${Date.now()}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            slaveId,
            functionCode: 5,
            functionName: 'Write Single Coil (05)',
            address: coilAddr,
            countOrValue: coilVal,
            rawFrame: query.rawHex,
            crcHex: query.crcHex,
            crcOk: true,
            status: 'OK',
            detail: `RS485 Master Írás: Slave #${slaveId}, Coil ${coilAddr} = ${isTurnOn ? 'BE (1)' : 'KI (0)'}`
          });
          if (nextModbusLogs.length > 40) nextModbusLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
      else if (coil.type === 'MODBUS_READ_HOLDING') {
        const wasTriggered = !!nextBufferTriggerStates[coil.id];
        if (rungHasPower && !wasTriggered) {
          const slaveId = coil.modbusSlaveId ?? 1;
          const regAddr = coil.modbusRegister ?? 0;
          const tgtVar = coil.modbusTargetVar || coil.targetVariable || 'V_MB_IN';
          const query = buildModbusQuery(slaveId, 3, regAddr, 1);
          nextModbusLogs.unshift({
            id: `mb_tx_q_${Date.now()}`,
            timestamp: formatTimestamp(),
            direction: 'TX',
            slaveId,
            functionCode: 3,
            functionName: 'Read Holding Register (03)',
            address: regAddr,
            countOrValue: 1,
            rawFrame: query.rawHex,
            crcHex: query.crcHex,
            crcOk: true,
            status: 'OK',
            detail: `RS485 Master Lekérdezés: Slave #${slaveId}, Reg ${regAddr} -> Cél: ${tgtVar}`
          });
          if (nextModbusLogs.length > 40) nextModbusLogs.pop();
        }
        nextBufferTriggerStates[coil.id] = rungHasPower;
      }
    }
  }

  // 1. One-time Setup Execution on Boot / First Scan
  if (!hasExecutedSetup) {
    if (setupRungs && setupRungs.length > 0) {
      for (const sRung of setupRungs) {
        evaluateRung(sRung, true);
      }
      nextUartLogs.unshift({
        id: `uart_boot_${Date.now()}`,
        timestamp: formatTimestamp(),
        direction: 'TX',
        message: `[BOOT] Setup létrák lefutottak (${setupRungs.length} fok). Loop indul...`
      });
    }
    hasExecutedSetup = true;
    setupExecutionTime = formatTimestamp();
  }

  // 2. Cyclic Loop Program Scan
  const rungTimesUs: Record<string, number> = {};
  let totalScanUs = 4.0; // Base loop() timer and scheduler overhead

  let rungIdx = 0;
  while (rungIdx < rungs.length) {
    const rung = rungs[rungIdx];
    evaluateRung(rung, false);
    const rungTime = estimateRungExecutionUs(rung);
    rungTimesUs[rung.id] = rungTime;
    totalScanUs += rungTime;

    // Check if rung evaluated to true and has an active JMP instruction
    const isRungEnergized = !!activeRungs[rung.id];
    let jumped = false;

    if (isRungEnergized) {
      for (const coil of rung.coils) {
        if (coil.type === 'JMP' && coil.labelName) {
          const targetName = coil.labelName;
          // Find matching later LBL rung
          for (let targetIdx = rungIdx + 1; targetIdx < rungs.length; targetIdx++) {
            const candidateRung = rungs[targetIdx];
            const hasMatchingLabel = candidateRung.coils.some(
              (el) => el.type === 'LBL' && el.labelName === targetName
            ) || candidateRung.branches.some((b) =>
              b.elements.some((el) => el.type === 'LBL' && el.labelName === targetName)
            );

            if (hasMatchingLabel) {
              rungIdx = targetIdx;
              jumped = true;
              break;
            }
          }
          if (jumped) break;
        }
      }
    }

    if (!jumped) {
      rungIdx++;
    }
  }

  // 2.5 Evaluate FBD Diagrams
  for (const diagram of fbdDiagrams) {
    evaluateFbdDiagram(diagram);
    totalScanUs += 10.0; // roughly estimate 10us per diagram
  }

  // Microcontroller hardware execution jitter (±4%)
  const jitter = 0.96 + Math.random() * 0.08;
  const currentScanUs = Math.round(totalScanUs * jitter * 10) / 10;

  const prevStats = prevState.scanDiagnostics;
  const totalScans = (prevStats?.totalScans || 0) + 1;
  const minScanUs = prevStats ? Math.min(prevStats.minScanUs, currentScanUs) : currentScanUs;
  const maxScanUs = prevStats ? Math.max(prevStats.maxScanUs, currentScanUs) : currentScanUs;
  const avgScanUs = prevStats
    ? Math.round(((prevStats.avgScanUs * Math.min(totalScans - 1, 40) + currentScanUs) / Math.min(totalScans, 41)) * 10) / 10
    : currentScanUs;

  const history = prevStats?.scanHistory ? [...prevStats.scanHistory] : [];
  history.push(currentScanUs);
  if (history.length > 40) history.shift();

  const cycleTimeUs = (prevState.cycleTimeMs || 20) * 1000;
  const cpuLoadPercent = Math.min(100, Math.round(((currentScanUs / cycleTimeUs) * 100) * 10) / 10);

  // 3. Hardware Watchdog Supervisor Scan
  const wdtEnabled = protocols?.supervisor?.watchdog?.enabled ?? true;
  const wdtAutoReset = protocols?.supervisor?.watchdog?.autoResetEachScan ?? true;
  if (wdtEnabled) {
    if (wdtAutoReset) {
      nextWatchdogTimerMs = 0; // Standard PLC auto wdt_reset() at end of loop scan
    } else if (nextWatchdogTimerMs >= watchdogTimeoutMs) {
      nextWatchdogTripCount++;
      nextWatchdogTimerMs = 0;
      nextMcusrFlags.wdrf = true;
      nextFaultLatched = true;
      if (!nextFaultReasons.includes("Watchdog Timeout")) {
        nextFaultReasons.push("Watchdog Timeout");
      }
      nextVariableValues['SM_WATCHDOG'] = true;
      nextVariableValues['SM_FAULT'] = true;
      nextUartLogs.unshift({
        id: `wdt_trip_${Date.now()}`,
        timestamp: formatTimestamp(),
        direction: 'TX',
        message: `[WATCHDOG TIMEOUT] ATmega328P Watchdog Reset Tripped (${protocols?.supervisor?.watchdog?.timeout || '2S'})! MCUSR: WDRF=1. PLC Rendszer újraindult.`
      });
      if (nextUartLogs.length > 40) nextUartLogs.pop();
    }
  }

  // Handle SM_FAULT_RESET
  if (nextVariableValues['SM_FAULT_RESET']) {
    nextFaultLatched = false;
    nextFaultReasons = [];
    nextVariableValues['SM_FAULT'] = false;
    nextVariableValues['SM_WATCHDOG'] = false;
  } else {
    // Keep SM_FAULT mapped to latched state
    nextVariableValues['SM_FAULT'] = nextFaultLatched;
  }

  // 4. Brown-Out Detection (BOD) Supervisor Scan
  const bodEnabled = protocols?.supervisor?.brownout?.enabled ?? true;
  if (bodEnabled && powerRailVoltage < brownoutTripVoltage) {
    nextBrownoutTripCount++;
    nextMcusrFlags.borf = true;
    nextUartLogs.unshift({
      id: `bod_trip_${Date.now()}`,
      timestamp: formatTimestamp(),
      direction: 'TX',
      message: `[BROWN-OUT RESET] VCC Tápfeszültség (${powerRailVoltage.toFixed(2)}V) < ${brownoutTripVoltage}V BOD küszöb! MCUSR: BORF=1. ${protocols?.supervisor?.brownout?.saveRetentiveOnPowerFail ? 'Retentive adatok mentve EEPROM-ba.' : ''}`
    });
    if (nextUartLogs.length > 40) nextUartLogs.pop();
  }

  const nextScanDiagnostics: ScanDiagnostics = {
    lastScanUs: currentScanUs,
    lastCycleMs: prevState.cycleTimeMs || 20,
    minScanUs,
    maxScanUs,
    avgScanUs,
    totalScans,
    cpuLoadPercent,
    scanHistory: history,
    rungTimesUs
  };

  return {
    ...prevState,
    ...( { _sysAccumMs: sysAccumMs, _absoluteTimeMs: absoluteTimeMs, _sysStarted: true } as any ),
    digitalOutputs: nextDigitalOutputs,
    internalFlags: nextInternalFlags,
    timerStates: nextTimerStates,
    counterStates: nextCounterStates,
    servoAngles: nextServoAngles,
    lcdLines: nextLcdLines,
    neoPixelColors: nextNeoPixelColors,
    pwmOutputs: nextPwmOutputs,
    variableValues: nextVariableValues,
    arrayValues: nextArrayValues,
    uartLogs: nextUartLogs,
    i2cLogs: nextI2cLogs,
    spiLogs: nextSpiLogs,
    nrf24Logs: nextNrf24Logs,
    eeprom24cLogs: nextEeprom24cLogs,
    eeprom24cMemory: nextEeprom24cMemory,
    bufferLogs: nextBufferLogs,
    bufferTriggerStates: nextBufferTriggerStates,
    nrf24RxBuffer: nextNrf24RxBuffer,
    modbusLogs: nextModbusLogs,
    rs485DePinActive,
    expanderInputs: nextExpanderInputs,
    expanderOutputs: nextExpanderOutputs,
    expanderLogs: nextExpanderLogs,
    watchdogTimerMs: nextWatchdogTimerMs,
    watchdogTimeoutMs,
    watchdogTripCount: nextWatchdogTripCount,
    faultLatched: nextFaultLatched,
    faultReasons: nextFaultReasons,
    powerRailVoltage,
    brownoutTripVoltage,
    brownoutTripCount: nextBrownoutTripCount,
    mcusrFlags: nextMcusrFlags,
    activeRungs,
    activeBranches,
    activeElements,
    hasExecutedSetup,
    activeSetupRungs,
    setupExecutionTime,
    fbdSignalState: nextFbdSignalState,
    fbdLatchState: nextFbdLatchState,
    scanDiagnostics: nextScanDiagnostics,
    interruptStats: nextInterruptStats,
    interruptLogs: nextInterruptLogs,
    globalInterruptsActive,
    rtcTime: nextRtcTime,
    _rtcAccumMs: rtcAccumMs,
    _lastInputs: { ...currentInputs },
    _timer1AccumMs: timer1AccumMs
  } as SimulationState;
}
