import { PLCConstant, PLCVariable, PLCArray } from '../types';

export const DEFAULT_CONSTANTS: PLCConstant[] = [
  {
    id: 'c_max_temp',
    name: 'MAX_TEMP',
    type: 'float',
    value: 65.0,
    description: 'Biztonsági lekapcsolási hőmérséklethatár (°C)'
  },
  {
    id: 'c_min_pressure',
    name: 'MIN_PRESSURE',
    type: 'int',
    value: 20,
    description: 'Minimális hálózati hidraulikus nyomás (bar * 10)'
  },
  {
    id: 'c_baud_rate',
    name: 'BAUD_RATE',
    type: 'unsigned long',
    value: 115200,
    description: 'UART soros kommunikáció sebessége'
  },
  {
    id: 'c_tank_capacity',
    name: 'TANK_CAPACITY',
    type: 'int',
    value: 1000,
    description: 'Puffer tartály névleges űrtartalma (liter)'
  },
  {
    id: 'c_scan_timeout',
    name: 'SCAN_TIMEOUT_MS',
    type: 'int',
    value: 500,
    description: 'Watchdog időtúllépési limit (ms)'
  }
];

export const DEFAULT_VARIABLES: PLCVariable[] = [
  {
    id: 'v_encoder_ticks',
    name: 'V_ENCODER_TICKS',
    type: 'int',
    initialValue: 0,
    currentValue: 0,
    isRetentive: false,
    isVolatile: true,
    description: 'INT0 (D2) Hardver megszakításból inkrementált HSC enkóder impulzusszámláló'
  },
  {
    id: 'v_estop_active',
    name: 'V_ESTOP_ACTIVE',
    type: 'bool',
    initialValue: false,
    currentValue: false,
    isRetentive: false,
    isVolatile: true,
    description: 'INT1 (D3) Hardver megszakításból aktivált azonnali vészleállási retesz'
  },
  {
    id: 'v_temp_c',
    name: 'V_TEMP_C',
    type: 'float',
    initialValue: 24.5,
    currentValue: 24.5,
    isRetentive: false,
    description: 'Tartály aktuális hőmérséklete (DS18B20 1-Wire)'
  },
  {
    id: 'v_batch_count',
    name: 'V_BATCH_COUNT',
    type: 'int',
    initialValue: 0,
    currentValue: 0,
    isRetentive: true,
    description: 'Gyártási ciklusszámláló (EEPROM védett)'
  },
  {
    id: 'v_auto_mode',
    name: 'V_AUTO_MODE',
    type: 'bool',
    initialValue: true,
    currentValue: true,
    isRetentive: false,
    description: 'Automata / Manuális PLC üzemmód kapcsoló'
  },
  {
    id: 'v_alarm_active',
    name: 'V_ALARM_ACTIVE',
    type: 'bool',
    initialValue: false,
    currentValue: false,
    isRetentive: false,
    description: 'Vészleállító vagy hibaállapot jelző'
  },
  {
    id: 'v_target_pos',
    name: 'V_TARGET_POS',
    type: 'int',
    initialValue: 90,
    currentValue: 90,
    isRetentive: false,
    description: 'Szervómotor cél pozíciója (0-180 fok)'
  },
  {
    id: 'v_flow_rate',
    name: 'V_FLOW_RATE',
    type: 'float',
    initialValue: 12.8,
    currentValue: 12.8,
    isRetentive: false,
    description: 'Átfolyásmérő pillanatnyi értéke (l/min)'
  },
  {
    id: 'v_queue_len',
    name: 'V_QUEUE_LEN',
    type: 'int',
    initialValue: 0,
    currentValue: 0,
    isRetentive: false,
    description: 'FIFO/LIFO puffer elemszám mutató (Head/Tail Pointer)'
  },
  {
    id: 'v_push_val',
    name: 'V_PUSH_VAL',
    type: 'float',
    initialValue: 42.5,
    currentValue: 42.5,
    isRetentive: false,
    description: 'Pufferbe sorba állítandó adat / darab ID'
  },
  {
    id: 'v_popped_val',
    name: 'V_POPPED_VAL',
    type: 'float',
    initialValue: 0.0,
    currentValue: 0.0,
    isRetentive: false,
    description: 'FIFO/LIFO pufferből kiolvasott legutóbbi adat'
  },
  {
    id: 'v_rtc_year',
    name: 'RTC_YEAR',
    type: 'int',
    initialValue: 2026,
    currentValue: 2026,
    isRetentive: false,
    description: 'Valós idejű óra: Év (DS3231 / DS1307 RTC)'
  },
  {
    id: 'v_rtc_month',
    name: 'RTC_MONTH',
    type: 'int',
    initialValue: 9,
    currentValue: 9,
    isRetentive: false,
    description: 'Valós idejű óra: Hónap (1-12)'
  },
  {
    id: 'v_rtc_day',
    name: 'RTC_DAY',
    type: 'int',
    initialValue: 12,
    currentValue: 12,
    isRetentive: false,
    description: 'Valós idejű óra: Nap (1-31)'
  },
  {
    id: 'v_rtc_hour',
    name: 'RTC_HOUR',
    type: 'int',
    initialValue: 14,
    currentValue: 14,
    isRetentive: false,
    description: 'Valós idejű óra: Óra (0-23, műszak és időzítés)'
  },
  {
    id: 'v_rtc_min',
    name: 'RTC_MIN',
    type: 'int',
    initialValue: 30,
    currentValue: 30,
    isRetentive: false,
    description: 'Valós idejű óra: Perc (0-59)'
  },
  {
    id: 'v_rtc_sec',
    name: 'RTC_SEC',
    type: 'int',
    initialValue: 0,
    currentValue: 0,
    isRetentive: false,
    description: 'Valós idejű óra: Másodperc (0-59)'
  },
  {
    id: 'v_rtc_dow',
    name: 'RTC_DOW',
    type: 'int',
    initialValue: 6,
    currentValue: 6,
    isRetentive: false,
    description: 'Valós idejű óra: Hét napja (0=Vasárnap..6=Szombat)'
  },
  {
    id: 'v_sd_log_count',
    name: 'SD_LOG_COUNT',
    type: 'int',
    initialValue: 0,
    currentValue: 0,
    isRetentive: true,
    description: 'SD kártyára kiírt naplósorok számlálója'
  }
];

export const DEFAULT_ARRAYS: PLCArray[] = [
  {
    id: 'arr_queue_buffer',
    name: 'QUEUE_BUFFER',
    elementType: 'float',
    size: 8,
    values: [0, 0, 0, 0, 0, 0, 0, 0],
    description: 'FIFO (sor) és LIFO (verem) körpuffer tároló tömb'
  },
  {
    id: 'arr_work_buffer',
    name: 'WORK_BUFFER',
    elementType: 'float',
    size: 8,
    values: [0, 0, 0, 0, 0, 0, 0, 0],
    description: 'Aktív munkapuffer BLKMOV memóriablokk-másoláshoz'
  },
  {
    id: 'arr_recipe_setpoints',
    name: 'RECIPE_SETPOINTS',
    elementType: 'int',
    size: 4,
    values: [25, 50, 75, 100],
    description: 'Adagolási szintek recept értékei (%) fázisonként'
  },
  {
    id: 'arr_stage_delays',
    name: 'STAGE_DELAYS',
    elementType: 'int',
    size: 4,
    values: [1000, 2500, 1500, 3000],
    description: 'Gyártási fázisok késleltetési időzítései (ms)'
  },
  {
    id: 'arr_zone_status',
    name: 'ZONE_STATUS',
    elementType: 'bool',
    size: 6,
    values: [true, true, true, false, false, false],
    description: 'Biztonsági zónák engedélyezési státusza'
  }
];
