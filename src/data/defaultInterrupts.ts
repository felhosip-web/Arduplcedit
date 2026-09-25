import { InterruptsConfig } from '../types';

export const EMPTY_INTERRUPTS: InterruptsConfig = {
  globalInterruptsEnabled: false,
  int0: {
    id: 'int0_hsc',
    source: 'INT0_D2',
    pin: 'D2',
    name: 'INT0 (D2)',
    enabled: false,
    mode: 'RISING',
    actionType: 'INCREMENT_VAR',
    targetVariable: 'V_ENCODER_TICKS',
    incrementStep: 1,
    description: ''
  },
  int1: {
    id: 'int1_estop',
    source: 'INT1_D3',
    pin: 'D3',
    name: 'INT1 (D3)',
    enabled: false,
    mode: 'FALLING',
    actionType: 'SET_FLAG',
    targetVariable: 'V_ESTOP_ACTIVE',
    description: ''
  },
  timer1: {
    enabled: false,
    intervalMs: 10,
    timerSource: 'TIMER1',
    name: 'Timer1',
    actionType: 'CALL_SUBROUTINE',
    description: ''
  }
};

export const DEFAULT_INTERRUPTS: InterruptsConfig = {
  globalInterruptsEnabled: true,
  int0: {
    id: 'int0_hsc',
    source: 'INT0_D2',
    pin: 'D2',
    name: 'INT0 (D2) - HSC Enkóder Gyorsszámláló',
    enabled: true,
    mode: 'RISING',
    actionType: 'INCREMENT_VAR',
    targetVariable: 'V_ENCODER_TICKS',
    incrementStep: 1,
    description: 'Optikai inkrementális forgó jeladó (Encoder) vagy fogaskerék jeladó impulzusszámláló az ISR-ben'
  },
  int1: {
    id: 'int1_estop',
    source: 'INT1_D3',
    pin: 'D3',
    name: 'INT1 (D3) - Hardveres Vészleállító (E-STOP)',
    enabled: true,
    mode: 'FALLING',
    actionType: 'SET_FLAG',
    targetVariable: 'V_ESTOP_ACTIVE',
    description: 'Azonnali megszakítás lefutás vészgomb lenyomásakor (aktív alacsony jelszint)'
  },
  timer1: {
    enabled: false,
    intervalMs: 10,
    timerSource: 'TIMER1',
    name: 'Timer1 - 10ms Izokron Szabályozási Ciklus',
    actionType: 'CALL_SUBROUTINE',
    targetSubroutineId: 'sub_temp_ctrl',
    description: 'Periodikus 10ms-os hardveres időzítő megszakítás determinisztikus PID szabályozáshoz vagy gyors mintavételezéshez'
  }
};
