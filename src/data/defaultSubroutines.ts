import { Subroutine } from '../types';

export const DEFAULT_SUBROUTINES: Subroutine[] = [
  {
    id: 'sub_motor_latch',
    name: 'Motor Öntartó Vezérlő (FC1)',
    codeIdentifier: 'FC1_MotorLatch',
    description: 'Biztonsági öntartó motor/szivattyú indító és leállító alprogram reteszeléssel.',
    inputs: [
      {
        id: 'p_in_start',
        name: 'IN_START',
        type: 'BOOL_IN',
        defaultPinOrVar: 'D2',
        description: 'Start nyomógomb (záró NO érintkező)'
      },
      {
        id: 'p_in_stop',
        name: 'IN_STOP',
        type: 'BOOL_IN',
        defaultPinOrVar: 'D3',
        description: 'Stop nyomógomb (bontó NC érintkező)'
      }
    ],
    outputs: [
      {
        id: 'p_out_run',
        name: 'OUT_RUN',
        type: 'BOOL_OUT',
        defaultPinOrVar: 'D8',
        description: 'Mágneskapcsoló / Motor relé kimenet'
      }
    ],
    rungs: [
      {
        id: 'sub_rung_0',
        number: 0,
        comment: 'Öntartó kapcsolás: Start gomb vagy Motor segédérintkező, sorba kötve a Stop gombbal',
        branches: [
          {
            id: 'sub_b_0',
            elements: [
              {
                id: 'sub_el_start',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'IN_START',
                variable: 'IN_START'
              },
              {
                id: 'sub_el_stop',
                type: 'NC_CONTACT',
                category: 'contact',
                name: 'IN_STOP',
                variable: 'IN_STOP'
              }
            ]
          },
          {
            id: 'sub_b_1',
            elements: [
              {
                id: 'sub_el_latch',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'OUT_RUN',
                variable: 'OUT_RUN'
              },
              {
                id: 'sub_el_stop2',
                type: 'NC_CONTACT',
                category: 'contact',
                name: 'IN_STOP',
                variable: 'IN_STOP'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'sub_el_coil',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'OUT_RUN',
            variable: 'OUT_RUN'
          }
        ]
      }
    ],
    createdAt: Date.now() - 100000
  },
  {
    id: 'sub_blink_alarm',
    name: 'Villogó Vészjelző (FC2)',
    codeIdentifier: 'FC2_BlinkAlarm',
    description: 'Vészjelző generátor időzítővel, figyelmeztető fénykürt vagy sziréna szaggatásához.',
    inputs: [
      {
        id: 'p_in_alarm',
        name: 'IN_ALARM_TRIG',
        type: 'BOOL_IN',
        defaultPinOrVar: 'D4',
        description: 'Vészjelzés indító feltétel'
      }
    ],
    outputs: [
      {
        id: 'p_out_lamp',
        name: 'OUT_BLINK_LAMP',
        type: 'BOOL_OUT',
        defaultPinOrVar: 'D13',
        description: 'Villogó lámpa / zümmer kimenet'
      }
    ],
    rungs: [
      {
        id: 'sub_rung_b1',
        number: 0,
        comment: '1. lépés: Vészjelzés aktiválásakor villogó kimenet vezérlése',
        branches: [
          {
            id: 'sub_b_alarm1',
            elements: [
              {
                id: 'sub_el_al1',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'IN_ALARM_TRIG',
                variable: 'IN_ALARM_TRIG'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'sub_el_lamp',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'OUT_BLINK_LAMP',
            variable: 'OUT_BLINK_LAMP'
          }
        ]
      }
    ],
    createdAt: Date.now() - 50000
  }
];
