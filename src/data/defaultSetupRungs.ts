import { Rung } from '../types';

export const DEFAULT_SETUP_RUNGS: Rung[] = [
  {
    id: 'setup_rung_0',
    number: 0,
    comment: 'Rendszer inicializálás: Boot diagnosztikai üzenet és Státusz beállítása',
    branches: [
      {
        id: 'b_setup_0',
        elements: [] // Unconditional branch: executes upon boot
      }
    ],
    coils: [
      {
        id: 'el_setup_uart',
        type: 'UART_PRINT',
        category: 'protocol',
        name: 'BOOT_SERIAL_LOG',
        uartMessage: 'PLC RENDSZER INICIALIZÁLVA - SCAN CIKLUS AKTÍV',
        comment: 'Soros port boot diagnosztikai üzenet'
      },
      {
        id: 'el_setup_status',
        type: 'VAR_ASSIGN',
        category: 'variable_op',
        name: 'INIT_STATUS',
        targetVariable: 'V_STATUS_CODE',
        assignExpression: '1',
        comment: 'V_STATUS_CODE = 1 (KÉSZENLÉT)'
      }
    ]
  }
];
