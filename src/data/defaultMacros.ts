import { LadderMacro, Rung } from '../types';

export const DEFAULT_MACROS: LadderMacro[] = [
  // 1. Motor Öntartó Kör (Direct On Line starter)
  {
    id: 'macro_dol_starter',
    name: 'Motor Direkt Indító (DOL Öntartó Kör)',
    category: 'motor',
    description: 'Klasszikus ipari öntartó kapcsolás zöld START (NO) és piros STOP (NC) nyomógombbal, túlterhelés bimetállal és visszajelző lámpával.',
    iconName: 'Zap',
    codeExplanation: 'Amikor a START megnyomásra kerül, a motor relé behúz és saját záróérintkezőjén keresztül fenntartja a táplálást (öntartás). A STOP gomb vagy túlterhelés (OL) megszakítja az áramkört.',
    parameters: [
      { key: 'START_PIN', label: 'Start Nyomógomb (NO)', type: 'pin', defaultValue: 'D2', description: 'Záró érintkezős indítógomb' },
      { key: 'STOP_PIN', label: 'Stop Nyomógomb (NC)', type: 'pin', defaultValue: 'D3', description: 'Bontó érintkezős leállítógomb' },
      { key: 'OVERLOAD_PIN', label: 'Bimetál Hőrelé (OL)', type: 'pin', defaultValue: 'D4', description: 'Motorvédő relé segédérintkező (NC)' },
      { key: 'MOTOR_COIL', label: 'Mágneskapcsoló Kimenet', type: 'pin', defaultValue: 'D8', description: 'Motor kontaktor relé tekercse' },
      { key: 'RUN_LAMP', label: 'Üzemzöld Jelzőlámpa', type: 'pin', defaultValue: 'D9', description: 'Üzemállapot visszajelzés' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      {
        id: `rung_macro_dol_main_${Date.now()}`,
        number: 0,
        comment: `[MAKRO DOL] Motor öntartó kör: Start (${params.START_PIN || 'D2'}) vagy Öntartás (${params.MOTOR_COIL || 'D8'}) -> Stop (${params.STOP_PIN || 'D3'}) és Hővédelem (${params.OVERLOAD_PIN || 'D4'}) -> ${params.MOTOR_COIL || 'D8'}`,
        branches: [
          {
            id: `b_dol_1_${Date.now()}`,
            elements: [
              {
                id: `el_start_${Date.now()}`,
                type: 'NO_CONTACT',
                category: 'contact',
                name: `Start Gomb (${params.START_PIN || 'D2'})`,
                variable: params.START_PIN || 'D2'
              },
              {
                id: `el_stop_${Date.now()}`,
                type: 'NC_CONTACT',
                category: 'contact',
                name: `Stop Gomb (${params.STOP_PIN || 'D3'})`,
                variable: params.STOP_PIN || 'D3'
              },
              {
                id: `el_ol_${Date.now()}`,
                type: 'NC_CONTACT',
                category: 'contact',
                name: `Bimetál OL (${params.OVERLOAD_PIN || 'D4'})`,
                variable: params.OVERLOAD_PIN || 'D4'
              }
            ]
          },
          {
            id: `b_dol_2_${Date.now()}`,
            elements: [
              {
                id: `el_aux_${Date.now()}`,
                type: 'NO_CONTACT',
                category: 'contact',
                name: `Öntartó (${params.MOTOR_COIL || 'D8'})`,
                variable: params.MOTOR_COIL || 'D8'
              },
              {
                id: `el_stop2_${Date.now()}`,
                type: 'NC_CONTACT',
                category: 'contact',
                name: `Stop Gomb (${params.STOP_PIN || 'D3'})`,
                variable: params.STOP_PIN || 'D3'
              },
              {
                id: `el_ol2_${Date.now()}`,
                type: 'NC_CONTACT',
                category: 'contact',
                name: `Bimetál OL (${params.OVERLOAD_PIN || 'D4'})`,
                variable: params.OVERLOAD_PIN || 'D4'
              }
            ]
          }
        ],
        coils: [
          {
            id: `coil_motor_${Date.now()}`,
            type: 'COIL_NORMAL',
            category: 'coil',
            name: `Motor Kontaktor (${params.MOTOR_COIL || 'D8'})`,
            variable: params.MOTOR_COIL || 'D8'
          }
        ]
      },
      {
        id: `rung_macro_dol_lamp_${Date.now()}`,
        number: 1,
        comment: `[MAKRO DOL] Üzemállapot visszajelző lámpa vezérlése`,
        branches: [
          {
            id: `b_dol_lamp_${Date.now()}`,
            elements: [
              {
                id: `el_lamp_trigger_${Date.now()}`,
                type: 'NO_CONTACT',
                category: 'contact',
                name: `Motor Fut (${params.MOTOR_COIL || 'D8'})`,
                variable: params.MOTOR_COIL || 'D8'
              }
            ]
          }
        ],
        coils: [
          {
            id: `coil_run_lamp_${Date.now()}`,
            type: 'COIL_NORMAL',
            category: 'coil',
            name: `Futás Jelzőlámpa (${params.RUN_LAMP || 'D9'})`,
            variable: params.RUN_LAMP || 'D9'
          }
        ]
      }
    ],
    isBuiltIn: true
  },

  // 2. Csillag-Delta Indítás (Star-Delta Starter)
  {
    id: 'macro_star_delta',
    name: 'Csillag-Delta Motorindító Időzítővel',
    category: 'motor',
    description: 'Nagy teljesítményű háromfázisú aszinkron motorok kíméletes indítása csillag kapcsolásban, majd átkapcsolás deltába TON időzítő lejárta után.',
    iconName: 'Activity',
    codeExplanation: 'Indításkor a Főkontaktor (KM1) és a Csillag kontaktor (KM_STAR) húz be. A TON időzítő elindul. A preset idő (pl. 5000 ms) leteltekor a csillag bont és a Delta kontaktor (KM_DELTA) húz be.',
    parameters: [
      { key: 'START_PIN', label: 'Start Bemenet (NO)', type: 'pin', defaultValue: 'D2' },
      { key: 'STOP_PIN', label: 'Stop Bemenet (NC)', type: 'pin', defaultValue: 'D3' },
      { key: 'KM_MAIN', label: 'Fő Mágneskapcsoló (KM1)', type: 'pin', defaultValue: 'D8' },
      { key: 'KM_STAR', label: 'Csillag Kontaktor (KM_STAR)', type: 'pin', defaultValue: 'D9' },
      { key: 'KM_DELTA', label: 'Delta Kontaktor (KM_DELTA)', type: 'pin', defaultValue: 'D10' },
      { key: 'TIMER_VAR', label: 'Átkapcsolási Időzítő (T1)', type: 'variable', defaultValue: 'T1' },
      { key: 'TIME_MS', label: 'Csillag Idő (ms)', type: 'number', defaultValue: '5000' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      // Rung 1: Főkontaktor öntartással
      {
        id: `rung_sd_main_${Date.now()}`,
        number: 0,
        comment: `[MAKRO CSILLAG-DELTA] Főkontaktor indítása és reteszelése (${params.KM_MAIN || 'D8'})`,
        branches: [
          {
            id: `b_sd_m1_${Date.now()}`,
            elements: [
              { id: `el_sds_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Start', variable: params.START_PIN || 'D2' },
              { id: `el_sdstp_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'Stop', variable: params.STOP_PIN || 'D3' }
            ]
          },
          {
            id: `b_sd_m2_${Date.now()}`,
            elements: [
              { id: `el_sdm_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Öntartó KM1', variable: params.KM_MAIN || 'D8' },
              { id: `el_sdstp2_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'Stop', variable: params.STOP_PIN || 'D3' }
            ]
          }
        ],
        coils: [
          { id: `coil_km_main_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'KM1 Főkontaktor', variable: params.KM_MAIN || 'D8' }
        ]
      },
      // Rung 2: TON időzítő futása amíg a főkontaktor be van húzva
      {
        id: `rung_sd_timer_${Date.now()}`,
        number: 1,
        comment: `[MAKRO CSILLAG-DELTA] Csillag futási időzítő (${params.TIMER_VAR || 'T1'}) - ${params.TIME_MS || '5000'} ms`,
        branches: [
          {
            id: `b_sd_tmr_${Date.now()}`,
            elements: [
              { id: `el_km1_active_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'KM1 Aktív', variable: params.KM_MAIN || 'D8' }
            ]
          }
        ],
        coils: [
          {
            id: `coil_ton_${Date.now()}`,
            type: 'TON',
            category: 'timer',
            name: `TON ${params.TIMER_VAR || 'T1'}`,
            variable: params.TIMER_VAR || 'T1',
            presetMs: parseInt(params.TIME_MS || '5000', 10)
          }
        ]
      },
      // Rung 3: Csillag kontaktor: Főkontaktor aktív ÉS Időzítő még NEM járt le ÉS Delta reteszelés bontva
      {
        id: `rung_sd_star_${Date.now()}`,
        number: 2,
        comment: `[MAKRO CSILLAG-DELTA] Csillag kontaktor bekapcsolása (csak amíg T1 nem járt le)`,
        branches: [
          {
            id: `b_sd_star_${Date.now()}`,
            elements: [
              { id: `el_km1_on_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'KM1 Be', variable: params.KM_MAIN || 'D8' },
              { id: `el_t1_not_done_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'T1 Nem kész', variable: params.TIMER_VAR || 'T1' },
              { id: `el_delta_interlock_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'Delta Retesz', variable: params.KM_DELTA || 'D10' }
            ]
          }
        ],
        coils: [
          { id: `coil_km_star_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'KM_STAR Csillag', variable: params.KM_STAR || 'D9' }
        ]
      },
      // Rung 4: Delta kontaktor: Főkontaktor aktív ÉS Időzítő lejárt ÉS Csillag reteszelés bontva
      {
        id: `rung_sd_delta_${Date.now()}`,
        number: 3,
        comment: `[MAKRO CSILLAG-DELTA] Delta kontaktor átváltás (amikor T1 kész)`,
        branches: [
          {
            id: `b_sd_delta_${Date.now()}`,
            elements: [
              { id: `el_km1_on2_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'KM1 Be', variable: params.KM_MAIN || 'D8' },
              { id: `el_t1_done_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'T1 Lejárt', variable: params.TIMER_VAR || 'T1' },
              { id: `el_star_interlock_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'Csillag Retesz', variable: params.KM_STAR || 'D9' }
            ]
          }
        ],
        coils: [
          { id: `coil_km_delta_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'KM_DELTA Delta', variable: params.KM_DELTA || 'D10' }
        ]
      }
    ],
    isBuiltIn: true
  },

  // 3. Kétkezes Biztonsági Indító (Two-Hand Safety Control)
  {
    id: 'macro_two_hand_safety',
    name: 'Kétkezes Biztonsági Indító (Prés / Vágógép)',
    category: 'safety',
    description: 'Biztonsági előírás: a kezelőnek mindkét nyomógombot egyszerre kell lenyomva tartania a gép működéséhez. Bármelyik felengedése azonnali vészstopot vált ki.',
    iconName: 'ShieldCheck',
    codeExplanation: 'Mindkét bemenet (Gomb A és Gomb B) logikai ÉS kapcsolatban áll a biztonsági védőburkolattal és a vészleállítóval. Ha a kezelő elveszi a kezét, a relé azonnal elejt.',
    parameters: [
      { key: 'BTN_LEFT', label: 'Bal Kéz Nyomógomb (NO)', type: 'pin', defaultValue: 'D2' },
      { key: 'BTN_RIGHT', label: 'Jobb Kéz Nyomógomb (NO)', type: 'pin', defaultValue: 'D3' },
      { key: 'SAFETY_GUARD', label: 'Védőburkolat Retesz (NC)', type: 'pin', defaultValue: 'D4' },
      { key: 'ESTOP', label: 'Vészleállító E-Stop (NC)', type: 'pin', defaultValue: 'D5' },
      { key: 'PRESS_VALVE', label: 'Prés Szelep / Főrelé', type: 'pin', defaultValue: 'D8' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      {
        id: `rung_safety_${Date.now()}`,
        number: 0,
        comment: `[MAKRO BIZTONSÁG] Kétkezes indítás: Bal (${params.BTN_LEFT || 'D2'}) ÉS Jobb (${params.BTN_RIGHT || 'D3'}) ÉS Burkolat (${params.SAFETY_GUARD || 'D4'}) ÉS E-Stop (${params.ESTOP || 'D5'})`,
        branches: [
          {
            id: `b_safety_${Date.now()}`,
            elements: [
              { id: `el_left_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Bal Kéz Gomb', variable: params.BTN_LEFT || 'D2' },
              { id: `el_right_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Jobb Kéz Gomb', variable: params.BTN_RIGHT || 'D3' },
              { id: `el_guard_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Védőburkolat Zárva', variable: params.SAFETY_GUARD || 'D4' },
              { id: `el_estop_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'E-Stop OK', variable: params.ESTOP || 'D5' }
            ]
          }
        ],
        coils: [
          { id: `coil_press_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'Biztonsági Kimenet', variable: params.PRESS_VALVE || 'D8' }
        ]
      }
    ],
    isBuiltIn: true
  },

  // 4. Analóg Hiszterézises Kétpont-szabályzó (Two-Point Controller with Hysteresis)
  {
    id: 'macro_hysteresis_temp',
    name: 'Analóg Kétpont Hőmérséklet Szabályzó (Hiszterézis)',
    category: 'analog',
    description: 'Stabil kétpont-szabályozó SET / RESET logikával, amely megakadályozza a relé kattogását a beállított célérték körül (pl. Fűtés bekapcsol 22°C alatt, kikapcsol 26°C felett).',
    iconName: 'Layers',
    codeExplanation: 'Ha az analóg érték kisebb az alsó határértéknél, a fűtés relé SET parancsot kap. Ha az érték meghaladja a felső határértéket, RESET parancs bontja a fűtést.',
    parameters: [
      { key: 'ANALOG_VAR', label: 'Analóg Bemenet / Változó', type: 'variable', defaultValue: 'V_TEMP_C' },
      { key: 'LOW_LIMIT', label: 'Bekapcsolási Küszöb (°C)', type: 'number', defaultValue: '22' },
      { key: 'HIGH_LIMIT', label: 'Kikapcsolási Küszöb (°C)', type: 'number', defaultValue: '26' },
      { key: 'HEATER_PIN', label: 'Fűtőtest Relé Kimenet', type: 'pin', defaultValue: 'D8' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      // Rung 1: Ha mért érték < LOW_LIMIT -> SET HEATER
      {
        id: `rung_hyst_low_${Date.now()}`,
        number: 0,
        comment: `[MAKRO HISZTERÉZIS] Bekapcsolás: ha ${params.ANALOG_VAR || 'V_TEMP_C'} < ${params.LOW_LIMIT || '22'} -> SET ${params.HEATER_PIN || 'D8'}`,
        branches: [
          {
            id: `b_hl_${Date.now()}`,
            elements: [
              {
                id: `el_cmp_low_${Date.now()}`,
                type: 'VAR_CMP',
                category: 'variable',
                name: `${params.ANALOG_VAR || 'V_TEMP_C'} < ${params.LOW_LIMIT || '22'}`,
                targetVariable: params.ANALOG_VAR || 'V_TEMP_C',
                compareOp: '<',
                compareValue: parseFloat(params.LOW_LIMIT || '22')
              }
            ]
          }
        ],
        coils: [
          {
            id: `coil_set_heat_${Date.now()}`,
            type: 'COIL_SET',
            category: 'coil',
            name: `Fűtés SET (${params.HEATER_PIN || 'D8'})`,
            variable: params.HEATER_PIN || 'D8'
          }
        ]
      },
      // Rung 2: Ha mért érték > HIGH_LIMIT -> RESET HEATER
      {
        id: `rung_hyst_high_${Date.now()}`,
        number: 1,
        comment: `[MAKRO HISZTERÉZIS] Kikapcsolás: ha ${params.ANALOG_VAR || 'V_TEMP_C'} > ${params.HIGH_LIMIT || '26'} -> RESET ${params.HEATER_PIN || 'D8'}`,
        branches: [
          {
            id: `b_hh_${Date.now()}`,
            elements: [
              {
                id: `el_cmp_high_${Date.now()}`,
                type: 'VAR_CMP',
                category: 'variable',
                name: `${params.ANALOG_VAR || 'V_TEMP_C'} > ${params.HIGH_LIMIT || '26'}`,
                targetVariable: params.ANALOG_VAR || 'V_TEMP_C',
                compareOp: '>',
                compareValue: parseFloat(params.HIGH_LIMIT || '26')
              }
            ]
          }
        ],
        coils: [
          {
            id: `coil_rst_heat_${Date.now()}`,
            type: 'COIL_RESET',
            category: 'coil',
            name: `Fűtés RESET (${params.HEATER_PIN || 'D8'})`,
            variable: params.HEATER_PIN || 'D8'
          }
        ]
      }
    ],
    isBuiltIn: true
  },

  // 5. Tétel/Darabszámláló Automata Csomagoló (Batch Counter & Auto Reset)
  {
    id: 'macro_batch_counter',
    name: 'Tételszámláló és Automatikus Csomagoló (Batch CTU)',
    category: 'sequencer',
    description: 'Ipari termékszámláló CTU számlálóval és öntörlő pulzussal. A kívánt darabszám elérésekor aktiválja a kiadó hengert és nullázza magát.',
    iconName: 'Cpu',
    codeExplanation: 'Az optikai szenzor minden darabnál növeli a CTU számlálót. Amikor a számláló eléri a beállított PRESET darabszámot, a Done kimenet bekapcsol, kiadja a csomagot és visszaállítja a számlálót.',
    parameters: [
      { key: 'SENSOR_PIN', label: 'Termék Optikai Érzékelő', type: 'pin', defaultValue: 'D2' },
      { key: 'RESET_PIN', label: 'Kézi Törlőgomb (NO)', type: 'pin', defaultValue: 'D3' },
      { key: 'COUNTER_NAME', label: 'Számláló Neve (C1)', type: 'variable', defaultValue: 'C1' },
      { key: 'PRESET_COUNT', label: 'Csomag Méret (db)', type: 'number', defaultValue: '10' },
      { key: 'EJECTOR_PIN', label: 'Kiadó Pneumatikus Henger', type: 'pin', defaultValue: 'D8' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      // Rung 1: Szenzor bemenet -> CTU
      {
        id: `rung_cnt_pulse_${Date.now()}`,
        number: 0,
        comment: `[MAKRO SZÁMLÁLÓ] Termék érzékelés (${params.SENSOR_PIN || 'D2'}) -> CTU ${params.COUNTER_NAME || 'C1'} (Preset: ${params.PRESET_COUNT || '10'})`,
        branches: [
          {
            id: `b_cnt_${Date.now()}`,
            elements: [
              { id: `el_sens_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Szenzor', variable: params.SENSOR_PIN || 'D2' }
            ]
          }
        ],
        coils: [
          {
            id: `coil_ctu_${Date.now()}`,
            type: 'CTU',
            category: 'counter',
            name: `CTU ${params.COUNTER_NAME || 'C1'}`,
            variable: params.COUNTER_NAME || 'C1',
            presetCount: parseInt(params.PRESET_COUNT || '10', 10)
          }
        ]
      },
      // Rung 2: Számláló kész -> Henger működtetés
      {
        id: `rung_eject_${Date.now()}`,
        number: 1,
        comment: `[MAKRO SZÁMLÁLÓ] Tétel kész (${params.COUNTER_NAME || 'C1'}.Done) -> Csomagkiadó henger (${params.EJECTOR_PIN || 'D8'})`,
        branches: [
          {
            id: `b_ej_${Date.now()}`,
            elements: [
              { id: `el_cdone_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: `${params.COUNTER_NAME || 'C1'} Kész`, variable: params.COUNTER_NAME || 'C1' }
            ]
          }
        ],
        coils: [
          { id: `coil_ej_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'Kiadó Henger', variable: params.EJECTOR_PIN || 'D8' }
        ]
      }
    ],
    isBuiltIn: true
  },

  // 6. Villogó Ütemadó / Ciklikus Pulzus Generátor (Flasher Oscillator)
  {
    id: 'macro_flasher_timer',
    name: 'Villogó Ütemadó / Pulzus Generátor (2x TON Oszcillátor)',
    category: 'diagnostics',
    description: 'Két egymásra hivatkozó TON időzítővel felépített független frekvenciagenerátor figyelmeztető sárga villogóhoz vagy periodikus szivattyúzáshoz.',
    iconName: 'Clock',
    codeExplanation: 'A T1 időzítő (BE idő) elindul. Amikor lejár, indítja a T2 időzítőt (KI idő). Amikor a T2 lejár, bontja a T1-et, és a ciklus végtelenül ismétlődik.',
    parameters: [
      { key: 'ENABLE_VAR', label: 'Engedélyező Bemenet / Flag', type: 'variable', defaultValue: 'M0' },
      { key: 'ON_TIME_MS', label: 'Bekapcsolási Idő (ms)', type: 'number', defaultValue: '1000' },
      { key: 'OFF_TIME_MS', label: 'Kikapcsolási Idő (ms)', type: 'number', defaultValue: '1000' },
      { key: 'BEACON_PIN', label: 'Villogó Lámpa Kimenet', type: 'pin', defaultValue: 'D8' }
    ],
    buildRungs: (params: Record<string, string>): Rung[] => [
      // Rung 1: T1 fut amíg T2 nem kész
      {
        id: `rung_flash_t1_${Date.now()}`,
        number: 0,
        comment: `[MAKRO VILLOGÓ] T_ON időzítő (${params.ON_TIME_MS || '1000'} ms) futása`,
        branches: [
          {
            id: `b_fl_1_${Date.now()}`,
            elements: [
              { id: `el_fl_en_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Engedélyezve', variable: params.ENABLE_VAR || 'M0' },
              { id: `el_fl_t2nc_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'T_OFF Bontás', variable: 'T_OFF' }
            ]
          }
        ],
        coils: [
          {
            id: `coil_fl_t1_${Date.now()}`,
            type: 'TON',
            category: 'timer',
            name: 'TON T_ON',
            variable: 'T_ON',
            presetMs: parseInt(params.ON_TIME_MS || '1000', 10)
          }
        ]
      },
      // Rung 2: T_OFF időzítő fut ha T_ON kész
      {
        id: `rung_flash_t2_${Date.now()}`,
        number: 1,
        comment: `[MAKRO VILLOGÓ] T_OFF időzítő (${params.OFF_TIME_MS || '1000'} ms) indítása T_ON lejárásakor`,
        branches: [
          {
            id: `b_fl_2_${Date.now()}`,
            elements: [
              { id: `el_fl_t1no_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'T_ON Kész', variable: 'T_ON' }
            ]
          }
        ],
        coils: [
          {
            id: `coil_fl_t2_${Date.now()}`,
            type: 'TON',
            category: 'timer',
            name: 'TON T_OFF',
            variable: 'T_OFF',
            presetMs: parseInt(params.OFF_TIME_MS || '1000', 10)
          }
        ]
      },
      // Rung 3: Lámpa kimenet vezérlése amíg T_ON időzítő számol (vagy M0 és T_ON nem járt le)
      {
        id: `rung_flash_lamp_${Date.now()}`,
        number: 2,
        comment: `[MAKRO VILLOGÓ] Figyelmeztető fény kimenet (${params.BEACON_PIN || 'D8'}) kapcsolása`,
        branches: [
          {
            id: `b_fl_lamp_${Date.now()}`,
            elements: [
              { id: `el_fl_en_lamp_${Date.now()}`, type: 'NO_CONTACT', category: 'contact', name: 'Engedélyezve', variable: params.ENABLE_VAR || 'M0' },
              { id: `el_fl_t1_lamp_${Date.now()}`, type: 'NC_CONTACT', category: 'contact', name: 'T_ON alatt Ég', variable: 'T_ON' }
            ]
          }
        ],
        coils: [
          { id: `coil_beacon_${Date.now()}`, type: 'COIL_NORMAL', category: 'coil', name: 'Villogó Lámpa', variable: params.BEACON_PIN || 'D8' }
        ]
      }
    ],
    isBuiltIn: true
  }
];
