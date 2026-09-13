import { Rung } from '../types';

export interface ExampleProject {
  id: string;
  name: string;
  description: string;
  requiredLibraries: string[];
  rungs: Rung[];
  setupRungs?: Rung[];
}

export const EXAMPLE_PROJECTS: ExampleProject[] = [
  {
    id: 'motor_latch',
    name: 'Motor Indítás Öntartó Kapcsolással (Self-Holding)',
    description: 'Klasszikus ipari indító-leállító kapcsolás Start (NO), Stop (NC) és Vészleállító (NC) gombokkal, relé kimenettel és visszajelző lámpákkal.',
    requiredLibraries: [],
    setupRungs: [
      {
        id: 'rung_setup_motor_init',
        number: 0,
        comment: 'Setup fok: Bekapcsoláskor a motor és vészleállító állapot ellenőrzése / relé alaphelyzet',
        branches: [
          {
            id: 'b_setup_m0',
            elements: [
              {
                id: 'el_setup_sys_init',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'SYS_BOOT',
                variable: 'V_AUTO_MODE',
                comment: 'Rendszer boot kész'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_setup_coil_reset',
            type: 'COIL_RESET',
            category: 'coil',
            name: 'MOTOR_RELÉ',
            pin: 'D8',
            comment: 'Biztonsági alaphelyzetbe állítás indításkor'
          }
        ]
      }
    ],
    rungs: [
      {
        id: 'rung_0',
        number: 0,
        comment: '1. Fok: Motor öntartó vezérlés (Start VAGY Relé visszacsatolás, ÉS Stop ÉS Vészleállító)',
        branches: [
          {
            id: 'b_0_0',
            elements: [
              {
                id: 'el_start',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'START_GOMB',
                pin: 'D2',
                comment: 'Zöld nyomógomb (NO)'
              }
            ]
          },
          {
            id: 'b_0_1',
            elements: [
              {
                id: 'el_latch',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'MOTOR_RELÉ_TARTÁS',
                pin: 'D8',
                comment: 'Öntartó segédérintkező'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_stop',
            type: 'NC_CONTACT',
            category: 'contact',
            name: 'STOP_GOMB',
            pin: 'D3',
            comment: 'Piros bontógomb (NC)'
          },
          {
            id: 'el_es',
            type: 'NC_CONTACT',
            category: 'contact',
            name: 'VÉSZLEÁLLÍTÓ',
            pin: 'D4',
            comment: 'Vészgomba (NC)'
          },
          {
            id: 'el_motor_coil',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'MOTOR_RELÉ',
            pin: 'D8',
            comment: 'Mágneskapcsoló kimenet'
          }
        ]
      },
      {
        id: 'rung_1',
        number: 1,
        comment: '2. Fok: Zöld üzemjelző lámpa (ha a motor relé aktív)',
        branches: [
          {
            id: 'b_1_0',
            elements: [
              {
                id: 'el_run_contact',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'MOTOR_RELÉ',
                pin: 'D8'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_green_lamp',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'ZÖLD_ÜZEMJELZŐ',
            pin: 'D10',
            comment: 'Zöld LED / jelzőoszlop'
          }
        ]
      },
      {
        id: 'rung_2',
        number: 2,
        comment: '3. Fok: Piros készenléti lámpa (ha a motor áll)',
        branches: [
          {
            id: 'b_2_0',
            elements: [
              {
                id: 'el_standby_contact',
                type: 'NC_CONTACT',
                category: 'contact',
                name: 'MOTOR_RELÉ',
                pin: 'D8'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_red_lamp',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'PIROS_KÉSZENLÉT',
            pin: 'D11',
            comment: 'Piros LED lámpa'
          }
        ]
      }
    ]
  },
  {
    id: 'greenhouse_lcd',
    name: 'Okos Növényház DHT & I2C LCD (Könyvtárakkal)',
    description: 'DHT11 hőmérséklet/páratartalom érzékelés, automatikus ventilátor relé vezérlés határérték alapján és élő I2C LCD kijelző.',
    requiredLibraries: ['dht', 'liquidcrystal_i2c', 'wire'],
    rungs: [
      {
        id: 'rung_gh_0',
        number: 0,
        comment: '1. Fok: DHT érzékelő periodikus lekérdezése (D7 pin)',
        branches: [
          {
            id: 'b_gh_0',
            elements: [
              {
                id: 'el_gh_enable',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'RENDSZER_AKTÍV',
                pin: 'D2'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_dht_mod',
            type: 'DHT_READ',
            category: 'library_module',
            name: 'DHT_MÉRÉS',
            pin: 'D7',
            libraryId: 'dht',
            variable: 'DHT_TEMP'
          }
        ]
      },
      {
        id: 'rung_gh_1',
        number: 1,
        comment: '2. Fok: Ha a mért hőmérséklet > 28°C, ventilátor hűtés bekapcsolása',
        branches: [
          {
            id: 'b_gh_1',
            elements: [
              {
                id: 'el_temp_cmp',
                type: 'ANALOG_CMP',
                category: 'contact',
                name: 'HŐMÉRSÉKLET > 28°C',
                variable: 'DHT_TEMP',
                compareOp: '>',
                compareValue: 28
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_fan_coil',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'VENTILÁTOR_RELÉ',
            pin: 'D12'
          }
        ]
      },
      {
        id: 'rung_gh_2',
        number: 2,
        comment: '3. Fok: Állapot és hőmérséklet kiírása a 16x2 I2C LCD kijelzőre',
        branches: [
          {
            id: 'b_gh_2',
            elements: [
              {
                id: 'el_lcd_trigger',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'RENDSZER_AKTÍV',
                pin: 'D2'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_lcd_line1',
            type: 'LCD_PRINT',
            category: 'library_module',
            name: 'LCD_SOR_1',
            libraryId: 'liquidcrystal_i2c',
            lcdRow: 0,
            lcdCol: 0,
            lcdText: 'Temp: '
          },
          {
            id: 'el_lcd_line2',
            type: 'LCD_PRINT',
            category: 'library_module',
            name: 'LCD_SOR_2',
            libraryId: 'liquidcrystal_i2c',
            lcdRow: 1,
            lcdCol: 0,
            lcdText: 'Klima: Auto OK'
          }
        ]
      }
    ]
  },
  {
    id: 'parts_counter_servo',
    name: 'Alkatrész Számláló és Szervó Terelő (Servo.h)',
    description: 'Optikai érzékelővel 5 termék leszámolása CTU számlálóval, majd Szervó motor elmozdítása selejtező/adagoló állásba.',
    requiredLibraries: ['servo'],
    rungs: [
      {
        id: 'rung_pc_0',
        number: 0,
        comment: '1. Fok: Termék érzékelése optikai kapun és számlálás (5 darabig)',
        branches: [
          {
            id: 'b_pc_0',
            elements: [
              {
                id: 'el_photo_eye',
                type: 'RISING_EDGE',
                category: 'contact',
                name: 'OPTO_ÉRZÉKELŐ',
                pin: 'D2',
                comment: 'Optikai kapu impulzus'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_counter_mod',
            type: 'CTU',
            category: 'counter',
            name: 'DARABSZÁMLÁLÓ',
            variable: 'CNT1',
            presetCount: 5,
            comment: '5 db-ig számol'
          }
        ]
      },
      {
        id: 'rung_pc_1',
        number: 1,
        comment: '2. Fok: Ha elérte az 5 darabot -> Szervó motor forgatása 90 fokba',
        branches: [
          {
            id: 'b_pc_1',
            elements: [
              {
                id: 'el_count_done_contact',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'SZÁMLÁLÓ_KÉSZ',
                variable: 'CNT1'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_servo_divert',
            type: 'SERVO_WRITE',
            category: 'library_module',
            name: 'TERELŐ_SZERVÓ',
            pin: 'D9',
            libraryId: 'servo',
            servoAngle: 90,
            comment: 'Terelőkar 90 fok'
          },
          {
            id: 'el_buzzer',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'CSIPOGÓ_JELZŐ',
            pin: 'D11'
          }
        ]
      },
      {
        id: 'rung_pc_2',
        number: 2,
        comment: '3. Fok: Reset gomb megnyomásakor a számláló törlése és szervó visszaállítása 0 fokra',
        branches: [
          {
            id: 'b_pc_2',
            elements: [
              {
                id: 'el_reset_btn',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'TÖRLŐ_GOMB',
                pin: 'D3'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_servo_home',
            type: 'SERVO_WRITE',
            category: 'library_module',
            name: 'SZERVÓ_ALAPHELYZET',
            pin: 'D9',
            libraryId: 'servo',
            servoAngle: 0
          }
        ]
      }
    ]
  },
  {
    id: 'traffic_lights',
    name: 'Közlekedési Lámpa Ciklus (TON Időzítőkkel)',
    description: 'Ipari bekapcsolási késleltetés (TON) időzítők láncolata: Zöld (3s) -> Sárga (1.5s) -> Piros (3s).',
    requiredLibraries: [],
    rungs: [
      {
        id: 'rung_tl_0',
        number: 0,
        comment: '1. Fok: Indítókapcsoló és Fázis 1 időzítő (3000 ms)',
        branches: [
          {
            id: 'b_tl_0',
            elements: [
              {
                id: 'el_tl_master',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'FŐKAPCSOLÓ',
                pin: 'D2'
              },
              {
                id: 'el_tl_t3_nc',
                type: 'NC_CONTACT',
                category: 'contact',
                name: 'T3_CIKLUS_VÉGE',
                variable: 'T3'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_t1',
            type: 'TON',
            category: 'timer',
            name: 'T1_ZÖLD_IDŐ',
            variable: 'T1',
            presetMs: 3000
          },
          {
            id: 'el_green_led',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'ZÖLD_LÁMPA',
            pin: 'D10'
          }
        ]
      },
      {
        id: 'rung_tl_1',
        number: 1,
        comment: '2. Fok: Sárga lámpa fázis (T1 után aktív 1500 ms-ig)',
        branches: [
          {
            id: 'b_tl_1',
            elements: [
              {
                id: 'el_t1_done_contact',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'T1_LEJÁRT',
                variable: 'T1'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_t2',
            type: 'TON',
            category: 'timer',
            name: 'T2_SÁRGA_IDŐ',
            variable: 'T2',
            presetMs: 1500
          },
          {
            id: 'el_yellow_led',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'SÁRGA_LÁMPA',
            pin: 'D9'
          }
        ]
      },
      {
        id: 'rung_tl_2',
        number: 2,
        comment: '3. Fok: Piros lámpa fázis (T2 után aktív)',
        branches: [
          {
            id: 'b_tl_2',
            elements: [
              {
                id: 'el_t2_done_contact',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'T2_LEJÁRT',
                variable: 'T2'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_t3',
            type: 'TON',
            category: 'timer',
            name: 'T3_PIROS_IDŐ',
            variable: 'T3',
            presetMs: 3000
          },
          {
            id: 'el_red_led',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'PIROS_LÁMPA',
            pin: 'D8'
          }
        ]
      }
    ]
  },
  {
    id: 'buffer_fifo_lifo_blkmov',
    name: 'Ipari FIFO Sor, LIFO Veremtár & BLKMOV Blokk-másolás',
    description: 'Adatgyűjtő és receptkezelő vezérlés: D2 gombbal FIFO sorba írás (PUSH), D3 gombbal kiolvasás (POP), D4 gombbal BLKMOV recept átmásolás a munka pufferbe, BUFFER_FULL jelző LED-del.',
    requiredLibraries: [],
    setupRungs: [
      {
        id: 'rung_setup_blkmov_init',
        number: 0,
        comment: 'Setup: Kezdeti recept paraméterek betöltése a WORK_BUFFER-be BLKMOV segítségével',
        branches: [
          {
            id: 'b_setup_bm_0',
            elements: [
              {
                id: 'el_setup_always',
                type: 'NO_CONTACT',
                category: 'contact',
                name: 'AUTO_BOOT',
                variable: 'V_AUTO_MODE'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_setup_blkmov',
            type: 'BLKMOV',
            category: 'variable_op',
            name: 'BLKMOV_INIT',
            sourceArray: 'RECIPE_SETPOINTS',
            sourceOffset: 0,
            destArray: 'WORK_BUFFER',
            destOffset: 0,
            blockLength: 4
          }
        ]
      }
    ],
    rungs: [
      {
        id: 'rung_buf_1',
        number: 0,
        comment: '1. Fok: D2 gomb fel-futó élére adat (V_TEMP_C) sorba írása FIFO_PUSH blokkal',
        branches: [
          {
            id: 'b_buf_1',
            elements: [
              {
                id: 'el_d2_edge',
                type: 'RISING_EDGE',
                category: 'contact',
                name: 'D2_PUSH_TRIG',
                pin: 'D2'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_fifo_push_coil',
            type: 'FIFO_PUSH',
            category: 'variable_op',
            name: 'FIFO_PUSH',
            arrayName: 'QUEUE_BUFFER',
            pointerVar: 'V_QUEUE_LEN',
            variable: 'V_TEMP_C',
            maxSize: 8
          }
        ]
      },
      {
        id: 'rung_buf_2',
        number: 1,
        comment: '2. Fok: D3 gomb fel-futó élére legkorábbi adat kiolvasása a sorból (FIFO_POP -> V_POPPED_VAL)',
        branches: [
          {
            id: 'b_buf_2',
            elements: [
              {
                id: 'el_d3_edge',
                type: 'RISING_EDGE',
                category: 'contact',
                name: 'D3_POP_TRIG',
                pin: 'D3'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_fifo_pop_coil',
            type: 'FIFO_POP',
            category: 'variable_op',
            name: 'FIFO_POP',
            arrayName: 'QUEUE_BUFFER',
            pointerVar: 'V_QUEUE_LEN',
            targetVariable: 'V_POPPED_VAL'
          }
        ]
      },
      {
        id: 'rung_buf_3',
        number: 2,
        comment: '3. Fok: Ha a QUEUE_BUFFER betelt (BUFFER_FULL), D8 kimeneti riasztó lámpa kigyulladása',
        branches: [
          {
            id: 'b_buf_3',
            elements: [
              {
                id: 'el_buf_full_contact',
                type: 'BUFFER_FULL',
                category: 'contact',
                name: 'PUFFER_TELE',
                pointerVar: 'V_QUEUE_LEN',
                maxSize: 8
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_full_alarm_led',
            type: 'COIL_NORMAL',
            category: 'coil',
            name: 'ALARM_FULL_LED',
            pin: 'D8'
          }
        ]
      },
      {
        id: 'rung_buf_4',
        number: 3,
        comment: '4. Fok: D4 gomb élére BLKMOV blokk: WORK_BUFFER adatok átmásolása az ERROR_CODES naplótömbbe',
        branches: [
          {
            id: 'b_buf_4',
            elements: [
              {
                id: 'el_d4_edge',
                type: 'RISING_EDGE',
                category: 'contact',
                name: 'D4_COPY_TRIG',
                pin: 'D4'
              }
            ]
          }
        ],
        coils: [
          {
            id: 'el_blkmov_exec',
            type: 'BLKMOV',
            category: 'variable_op',
            name: 'BLKMOV_COPY',
            sourceArray: 'WORK_BUFFER',
            sourceOffset: 0,
            destArray: 'ERROR_CODES',
            destOffset: 0,
            blockLength: 4
          }
        ]
      }
    ]
  }
];
