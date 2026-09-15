import { PLCVariable } from '../types';

export const SYSTEM_VARIABLES: PLCVariable[] = [
  {
    id: 'sys_always_on',
    name: 'SM_ALWAYS_ON',
    type: 'bool',
    initialValue: true,
    isSystem: true,
    description: 'Always true while running/simulating'
  },
  {
    id: 'sys_always_off',
    name: 'SM_ALWAYS_OFF',
    type: 'bool',
    initialValue: false,
    isSystem: true,
    description: 'Always false'
  },
  {
    id: 'sys_first_scan',
    name: 'SM_FIRST_SCAN',
    type: 'bool',
    initialValue: true,
    isSystem: true,
    description: 'True only on the first scan after start/reset, then false'
  },
  {
    id: 'sys_1hz',
    name: 'SM_1HZ',
    type: 'bool',
    initialValue: false,
    isSystem: true,
    description: 'Toggles every 500 ms (1 Hz square wave)'
  },
  {
    id: 'sys_100ms',
    name: 'SM_100MS',
    type: 'bool',
    initialValue: false,
    isSystem: true,
    description: 'Toggles every 50 ms (≈10 Hz clock)'
  }
];
