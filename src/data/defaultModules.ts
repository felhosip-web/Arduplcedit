import { CustomModuleTemplate } from '../types';

export const DEFAULT_MODULE_TEMPLATES: CustomModuleTemplate[] = [
  // Contacts
  {
    id: 'mod_no_contact',
    name: 'Záró Érintkező (NO)',
    symbol: '—[ ]—',
    category: 'contact',
    type: 'NO_CONTACT',
    description: 'Nyomógomb, optokapu vagy digitális bemenet. Aktív, ha a jel MAGAS.',
    defaultPin: 'D2',
    isBuiltIn: true
  },
  {
    id: 'mod_nc_contact',
    name: 'Bontó Érintkező (NC)',
    symbol: '—[/]—',
    category: 'contact',
    type: 'NC_CONTACT',
    description: 'Vészleállító vagy alaphelyzetben zárt érintkező. Invertált logika.',
    defaultPin: 'D3',
    isBuiltIn: true
  },
  {
    id: 'mod_rising_edge',
    name: 'Felfutó Él (P-Edge)',
    symbol: '—[P]—',
    category: 'contact',
    type: 'RISING_EDGE',
    description: 'Egyetlen PLC ciklusig aktív az alacsonyról magasra váltás pillanatában.',
    defaultPin: 'D2',
    isBuiltIn: true
  },
  {
    id: 'mod_falling_edge',
    name: 'Lefutó Él (N-Edge)',
    symbol: '—[N]—',
    category: 'contact',
    type: 'FALLING_EDGE',
    description: 'Egyetlen ciklusig aktív a magastól alacsonyra váltáskor (pl. gomb elengedése).',
    defaultPin: 'D2',
    isBuiltIn: true
  },
  {
    id: 'mod_analog_cmp',
    name: 'Analóg Komparátor',
    symbol: '—[CMP]—',
    category: 'contact',
    type: 'ANALOG_CMP',
    description: 'Összehasonlítja az analóg pin értékét (A0) vagy DHT szenzort a határértékkel.',
    defaultPin: 'A0',
    defaultVariable: 'A0',
    isBuiltIn: true
  },
  {
    id: 'mod_flag_contact',
    name: 'Belső Flag Érintkező',
    symbol: '—[M]—',
    category: 'contact',
    type: 'INTERNAL_FLAG_CONTACT',
    description: 'Belső memóriajelző (M0..M7) állapotának beolvasása segédreléként.',
    defaultVariable: 'M0',
    isBuiltIn: true
  },

  // Coils
  {
    id: 'mod_coil_normal',
    name: 'Normál Tekercs / Relé',
    symbol: '—( )—',
    category: 'coil',
    type: 'COIL_NORMAL',
    description: 'Digitális kimenet (Relé, LED, Szelep). Aktív amíg a fok áramot vezet.',
    defaultPin: 'D8',
    isBuiltIn: true
  },
  {
    id: 'mod_coil_inv',
    name: 'Invertált Tekercs',
    symbol: '—(/)—',
    category: 'coil',
    type: 'COIL_INV',
    description: 'Invertált digitális kimenet. Alacsony, ha a fok aktív.',
    defaultPin: 'D8',
    isBuiltIn: true
  },
  {
    id: 'mod_coil_set',
    name: 'Set / Latch Tekercs',
    symbol: '—(S)—',
    category: 'coil',
    type: 'COIL_SET',
    description: 'Öntartó bekapcsolás. Bekapcsolva marad még akkor is, ha a bemenet megszűnik.',
    defaultPin: 'D8',
    isBuiltIn: true
  },
  {
    id: 'mod_coil_reset',
    name: 'Reset / Unlatch Tekercs',
    symbol: '—(R)—',
    category: 'coil',
    type: 'COIL_RESET',
    description: 'Törli a Set tekercset vagy alaphelyzetbe állítja a számlálót.',
    defaultPin: 'D8',
    isBuiltIn: true
  },
  {
    id: 'mod_flag_coil',
    name: 'Belső Flag Tekercs',
    symbol: '—(M)—',
    category: 'coil',
    type: 'INTERNAL_FLAG_COIL',
    description: 'Belső virtuális segédrelé (Marker) beállítása fizikailag nem létező pinhez.',
    defaultVariable: 'M0',
    isBuiltIn: true
  },

  // Timers & Counters
  {
    id: 'mod_ton',
    name: 'TON Időzítő (On-Delay)',
    symbol: '[TON]',
    category: 'timer',
    type: 'TON',
    description: 'Bekapcsolás késleltetés. A kimenet a beállított idő (PT) letelte után kapcsol be.',
    defaultVariable: 'T1',
    presetMs: 2000,
    isBuiltIn: true
  },
  {
    id: 'mod_tof',
    name: 'TOF Időzítő (Off-Delay)',
    symbol: '[TOF]',
    category: 'timer',
    type: 'TOF',
    description: 'Kikapcsolás késleltetés. A bemenet megszűnése után még PT ideig aktív marad.',
    defaultVariable: 'T2',
    presetMs: 1500,
    isBuiltIn: true
  },
  {
    id: 'mod_ctu',
    name: 'CTU Számláló (Count Up)',
    symbol: '[CTU]',
    category: 'counter',
    type: 'CTU',
    description: 'Felfelé számláló impulzusok összegzésére (pl. gyártott darabok száma).',
    defaultVariable: 'CNT1',
    presetCount: 5,
    isBuiltIn: true
  },

  // Library Modules
  {
    id: 'mod_servo',
    name: 'Szervó Motor Szög',
    symbol: '[SERVO]',
    category: 'library_module',
    type: 'SERVO_WRITE',
    description: 'Szervó motor tengelyének beforgatása (0 - 180 fok). Igényli: Servo.h',
    defaultPin: 'D9',
    libraryId: 'servo',
    libraryName: 'Servo.h',
    servoAngle: 90,
    isBuiltIn: true
  },
  {
    id: 'mod_lcd',
    name: 'I2C LCD Kiíró',
    symbol: '[LCD 16x2]',
    category: 'library_module',
    type: 'LCD_PRINT',
    description: 'Szöveg vagy mért érték megjelenítése 16x2 kijelzőn. Igényli: LiquidCrystal_I2C.h',
    libraryId: 'liquidcrystal_i2c',
    libraryName: 'LiquidCrystal_I2C.h',
    lcdText: 'STATUS: OK',
    isBuiltIn: true
  },
  {
    id: 'mod_dht',
    name: 'DHT Hő & Páramérő',
    symbol: '[DHT11]',
    category: 'library_module',
    type: 'DHT_READ',
    description: 'Környezeti hőmérséklet és páratartalom kiolvasása változóba. Igényli: DHT.h',
    defaultPin: 'D7',
    defaultVariable: 'DHT_TEMP',
    libraryId: 'dht',
    libraryName: 'DHT.h',
    isBuiltIn: true
  },
  {
    id: 'mod_neopixel',
    name: 'NeoPixel RGB LED',
    symbol: '[RGB LED]',
    category: 'library_module',
    type: 'NEOPIXEL_SET',
    description: 'Címezhető WS2812 RGB LED színvezérlés. Igényli: Adafruit_NeoPixel.h',
    defaultPin: 'D6',
    libraryId: 'neopixel',
    libraryName: 'Adafruit_NeoPixel.h',
    isBuiltIn: true
  },
  {
    id: 'mod_pwm',
    name: 'PWM Analóg Kimenet',
    symbol: '[PWM]',
    category: 'library_module',
    type: 'PWM_OUT',
    description: 'Frekvencia/kitöltési tényező analóg vezérléshez (0-255, D3, D5, D6, D9, D10, D11).',
    defaultPin: 'D5',
    isBuiltIn: true
  },
  // Communication Protocols (Dallas, I2C, SPI, UART)
  {
    id: 'mod_dallas_read',
    name: 'Dallas 1-Wire Hőmérő (DS18B20)',
    symbol: '[1-WIRE DS18]',
    category: 'protocol',
    type: 'DALLAS_READ',
    description: 'Digitális Dallas 1-Wire DS18B20 hőmérséklet beolvasása változóba. Igényli: OneWire.h, DallasTemperature.h',
    defaultPin: 'D4',
    defaultVariable: 'V_TEMP_C',
    libraryId: 'dallas_temp',
    libraryName: 'DallasTemperature.h',
    isBuiltIn: true
  },
  {
    id: 'mod_i2c_write',
    name: 'I2C Adatküldő (Wire Write)',
    symbol: '[I2C WRITE]',
    category: 'protocol',
    type: 'I2C_WRITE',
    description: 'Bájt vagy parancs küldése megadott HEX I2C eszközcímre (pl. 0x27 LCD, 0x20 PCF8574). Igényli: Wire.h',
    libraryId: 'wire',
    libraryName: 'Wire.h',
    isBuiltIn: true
  },
  {
    id: 'mod_i2c_read',
    name: 'I2C Adatbeolvasó (Wire Read)',
    symbol: '[I2C READ]',
    category: 'protocol',
    type: 'I2C_READ',
    description: 'Adat beolvasása I2C eszközről célváltozóba. Igényli: Wire.h',
    defaultVariable: 'V_BATCH_COUNT',
    libraryId: 'wire',
    libraryName: 'Wire.h',
    isBuiltIn: true
  },
  {
    id: 'mod_spi_transfer',
    name: 'SPI Kommunikációs Blok',
    symbol: '[SPI XFER]',
    category: 'protocol',
    type: 'SPI_TRANSFER',
    description: 'Bájt küldése és egyidejű fogadása SPI buszon tetszőleges Chip Select (CS) lábbal (D10, D9). Igényli: SPI.h',
    defaultPin: 'D10',
    libraryId: 'spi',
    libraryName: 'SPI.h',
    isBuiltIn: true
  },
  {
    id: 'mod_uart_print',
    name: 'UART Soros Küldés (Serial.print)',
    symbol: '[UART TX]',
    category: 'protocol',
    type: 'UART_PRINT',
    description: 'Diagnosztikai szöveg, telemetria vagy változó érték kiküldése az Arduino soros portjára (TX/USB).',
    defaultVariable: 'V_TEMP_C',
    isBuiltIn: true
  },
  // Variables & Array operations
  {
    id: 'mod_var_assign',
    name: 'Változó / Tömb Értékadás',
    symbol: '[VAR = EXP]',
    category: 'variable',
    type: 'VAR_ASSIGN',
    description: 'Közvetlen értékadás, számtani művelet vagy tömb indexelés (pl. V_BATCH_COUNT = V_BATCH_COUNT + 1).',
    defaultVariable: 'V_BATCH_COUNT',
    isBuiltIn: true
  },
  {
    id: 'mod_var_cmp',
    name: 'Változó / Konstans Összehasonlító',
    symbol: '—[ VAR > C ]—',
    category: 'contact',
    type: 'VAR_CMP',
    description: 'Érintkező logikai feltétel: változó összehasonlítása konstanssal vagy határértékkel (pl. V_TEMP_C > MAX_TEMP).',
    defaultVariable: 'V_TEMP_C',
    isBuiltIn: true
  },
  // NRF24L01+ 2.4GHz Wireless RF Modules
  {
    id: 'mod_nrf24_tx',
    name: 'NRF24 Rádiós Adatküldés (TX)',
    symbol: '[NRF TX]',
    category: 'protocol',
    type: 'NRF24_TRANSMIT',
    description: 'Vezeték nélküli adatcsomag küldése NRF24L01+ 2.4GHz rádión (szöveg vagy változó értéke). Igényli: RF24.h',
    defaultPin: 'D9',
    defaultVariable: 'V_BATCH_COUNT',
    nrfPayload: 'BATCH_DONE',
    nrfChannel: 76,
    nrfPipe: 0,
    libraryId: 'rf24',
    libraryName: 'RF24.h',
    isBuiltIn: true
  },
  {
    id: 'mod_nrf24_rx',
    name: 'NRF24 Rádiós Adatfogadás (RX)',
    symbol: '[NRF RX]',
    category: 'protocol',
    type: 'NRF24_RECEIVE',
    description: 'Beérkezett rádiócsomag kiolvasása a vétel (RX) pufferből egy megadott PLC célváltozóba. Igényli: RF24.h',
    defaultPin: 'D9',
    defaultVariable: 'V_REMOTE_CMD',
    targetVariable: 'V_REMOTE_CMD',
    nrfPipe: 1,
    libraryId: 'rf24',
    libraryName: 'RF24.h',
    isBuiltIn: true
  },
  {
    id: 'mod_nrf24_available',
    name: 'NRF24 Rádió Vétel Kész (Contact)',
    symbol: '—[NRF RX?]—',
    category: 'contact',
    type: 'NRF24_AVAILABLE',
    description: 'Záró érintkező: aktív, ha az NRF24L01 modul RX pufferében új, beolvasatlan adatcsomag várakozik.',
    defaultPin: 'D9',
    libraryId: 'rf24',
    libraryName: 'RF24.h',
    isBuiltIn: true
  },
  {
    id: 'mod_nrf24_config',
    name: 'NRF24 Rádió Paraméterezés',
    symbol: '[NRF CFG]',
    category: 'protocol',
    type: 'NRF24_CONFIG',
    description: 'Rádiócsatorna (0-125) és adási teljesítmény dinamikus átváltása PLC futás közben.',
    nrfChannel: 76,
    libraryId: 'rf24',
    libraryName: 'RF24.h',
    isBuiltIn: true
  },
  // 24Cxxx I2C EEPROM Memory Modules
  {
    id: 'mod_24c_write',
    name: '24Cxxx EEPROM Írás',
    symbol: '[24C WRITE]',
    category: 'protocol',
    type: 'EEPROM_24C_WRITE',
    description: 'Bájt, egész (int) vagy lebegőpontos (float) érték kiírása 24Cxxx I2C EEPROM memóriacímre (pl. 0x0010).',
    defaultVariable: 'V_TEMP_C',
    eepromAddress: '0x0010',
    eepromDataType: 'float',
    i2cAddress: '0x50',
    libraryId: 'eeprom_24cxxx',
    libraryName: 'Wire.h (24Cxxx)',
    isBuiltIn: true
  },
  {
    id: 'mod_24c_read',
    name: '24Cxxx EEPROM Olvasás',
    symbol: '[24C READ]',
    category: 'protocol',
    type: 'EEPROM_24C_READ',
    description: 'Adat beolvasása 24Cxxx külső I2C EEPROM memóriacímről PLC célváltozóba.',
    defaultVariable: 'V_SAVED_PARAM',
    targetVariable: 'V_SAVED_PARAM',
    eepromAddress: '0x0010',
    eepromDataType: 'float',
    i2cAddress: '0x50',
    libraryId: 'eeprom_24cxxx',
    libraryName: 'Wire.h (24Cxxx)',
    isBuiltIn: true
  },
  {
    id: 'mod_24c_check',
    name: '24Cxxx EEPROM Elérhető (ACK Contact)',
    symbol: '—[24C ACK?]—',
    category: 'contact',
    type: 'EEPROM_24C_CHECK',
    description: 'Záró érintkező: aktív, ha az I2C buszon lévő 24Cxxx EEPROM chip válaszol és készen áll (Ready poll).',
    i2cAddress: '0x50',
    libraryId: 'eeprom_24cxxx',
    libraryName: 'Wire.h (24Cxxx)',
    isBuiltIn: true
  },
  {
    id: 'mod_24c_save_recipe',
    name: '24Cxxx Recept / Tömb Mentés',
    symbol: '[24C SAVE ARR]',
    category: 'protocol',
    type: 'EEPROM_24C_SAVE_RECIPE',
    description: 'Egy teljes PLC tömb (recept, kalibrációs pontok) egyidejű elmentése 24Cxxx EEPROM blokkba.',
    arrayName: 'ARR_RECIPE_STEPS',
    eepromAddress: '0x0080',
    i2cAddress: '0x50',
    libraryId: 'eeprom_24cxxx',
    libraryName: 'Wire.h (24Cxxx)',
    isBuiltIn: true
  },
  {
    id: 'mod_24c_load_recipe',
    name: '24Cxxx Recept / Tömb Betöltés',
    symbol: '[24C LOAD ARR]',
    category: 'protocol',
    type: 'EEPROM_24C_LOAD_RECIPE',
    description: 'Recept adatok vagy kalibrációs tömb visszatöltése 24Cxxx EEPROM memóriából PLC tömbbe.',
    arrayName: 'ARR_RECIPE_STEPS',
    eepromAddress: '0x0080',
    i2cAddress: '0x50',
    libraryId: 'eeprom_24cxxx',
    libraryName: 'Wire.h (24Cxxx)',
    isBuiltIn: true
  },
  // -----------------------------------------------------------------
  // FIFO / LIFO Queue & Stack Buffer Modules
  // -----------------------------------------------------------------
  {
    id: 'mod_fifo_push',
    name: 'FIFO Push (Sorba Írás)',
    symbol: '[FIFO PUSH]',
    category: 'variable_op',
    type: 'FIFO_PUSH',
    description: 'Adat vagy változó beillesztése a FIFO sor végére (First-In, First-Out). Növeli a mutatót.',
    arrayName: 'QUEUE_BUFFER',
    variable: 'V_PUSH_VAL',
    pointerVar: 'V_QUEUE_LEN',
    maxSize: 8,
    isBuiltIn: true
  },
  {
    id: 'mod_fifo_pop',
    name: 'FIFO Pop (Sorból Olvasás)',
    symbol: '[FIFO POP]',
    category: 'variable_op',
    type: 'FIFO_POP',
    description: 'A legkorábbi adat (index 0) kiolvasása a sorból a célváltozóba, a többi elem előre léptetésével.',
    arrayName: 'QUEUE_BUFFER',
    targetVariable: 'V_POPPED_VAL',
    pointerVar: 'V_QUEUE_LEN',
    maxSize: 8,
    isBuiltIn: true
  },
  {
    id: 'mod_lifo_push',
    name: 'LIFO Push (Verembe Írás)',
    symbol: '[LIFO PUSH]',
    category: 'variable_op',
    type: 'LIFO_PUSH',
    description: 'Adat vagy változó ráhelyezése a verem tetejére (Last-In, First-Out veremtár).',
    arrayName: 'QUEUE_BUFFER',
    variable: 'V_PUSH_VAL',
    pointerVar: 'V_QUEUE_LEN',
    maxSize: 8,
    isBuiltIn: true
  },
  {
    id: 'mod_lifo_pop',
    name: 'LIFO Pop (Veremből Levétel)',
    symbol: '[LIFO POP]',
    category: 'variable_op',
    type: 'LIFO_POP',
    description: 'A legfrissebb adat (veremtető) kiolvasása a célváltozóba és levétele a veremből.',
    arrayName: 'QUEUE_BUFFER',
    targetVariable: 'V_POPPED_VAL',
    pointerVar: 'V_QUEUE_LEN',
    maxSize: 8,
    isBuiltIn: true
  },
  // -----------------------------------------------------------------
  // Word & Bit Operations (MOV, WAND, WOR, WXOR, WNOT, SHL, SHR)
  // -----------------------------------------------------------------
  {
    id: 'mod_mov',
    name: 'MOV (Adat / Regiszter Másolás)',
    symbol: '[MOV]',
    category: 'variable_op',
    type: 'MOV',
    description: 'Adat vagy érték átmásolása forrásból a célváltozóba (dest := source).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_SRC',
    isBuiltIn: true
  },
  {
    id: 'mod_wand',
    name: 'WAND (Bitenkénti És / AND)',
    symbol: '[WAND]',
    category: 'variable_op',
    type: 'WAND',
    description: 'Bitenkénti És (AND) művelet két regiszter / változó között (dest := a & b).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_A',
    operandB: 'V_B',
    isBuiltIn: true
  },
  {
    id: 'mod_wor',
    name: 'WOR (Bitenkénti Vagy / OR)',
    symbol: '[WOR]',
    category: 'variable_op',
    type: 'WOR',
    description: 'Bitenkénti Vagy (OR) művelet két regiszter / változó között (dest := a | b).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_A',
    operandB: 'V_B',
    isBuiltIn: true
  },
  {
    id: 'mod_wxor',
    name: 'WXOR (Kizáró Vagy / XOR)',
    symbol: '[WXOR]',
    category: 'variable_op',
    type: 'WXOR',
    description: 'Bitenkénti Kizáró Vagy (XOR) művelet két regiszter / változó között (dest := a ^ b).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_A',
    operandB: 'V_B',
    isBuiltIn: true
  },
  {
    id: 'mod_wnot',
    name: 'WNOT (Bitenkénti Invertálás / NOT)',
    symbol: '[WNOT]',
    category: 'variable_op',
    type: 'WNOT',
    description: 'Bitenkénti NOT / Invertálás művelet (dest := ~a).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_A',
    isBuiltIn: true
  },
  {
    id: 'mod_shl',
    name: 'SHL (Bit Léptetés Balra)',
    symbol: '[SHL]',
    category: 'variable_op',
    type: 'SHL',
    description: 'Bitek léptetése balra a megadott pozíciószámmal (dest := value << n).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_VAL',
    shiftCount: 1,
    isBuiltIn: true
  },
  {
    id: 'mod_shr',
    name: 'SHR (Bit Léptetés Jobbra)',
    symbol: '[SHR]',
    category: 'variable_op',
    type: 'SHR',
    description: 'Bitek logikai léptetése jobbra a megadott pozíciószámmal (dest := value >> n).',
    targetVariable: 'V_DEST',
    sourceVariable: 'V_VAL',
    shiftCount: 1,
    isBuiltIn: true
  },
  // -----------------------------------------------------------------
  // BLKMOV Block Move / Memory Copy
  // -----------------------------------------------------------------
  {
    id: 'mod_blkmov',
    name: 'BLKMOV (Memóriablokk Másolás)',
    symbol: '[BLKMOV]',
    category: 'variable_op',
    type: 'BLKMOV',
    description: 'Több összefüggő tömbelem egyidejű átmásolása forrástömbből a céltömbbe (Siemens BLKMOV / Rockwell COP).',
    sourceArray: 'RECIPE_SETPOINTS',
    sourceOffset: 0,
    destArray: 'WORK_BUFFER',
    destOffset: 0,
    blockLength: 4,
    isBuiltIn: true
  },
  // -----------------------------------------------------------------
  // Buffer Status Contacts
  // -----------------------------------------------------------------
  {
    id: 'mod_buffer_empty',
    name: 'Puffer Üres? (BUF EMPTY)',
    symbol: '—[BUF EMPTY]—',
    category: 'contact',
    type: 'BUFFER_EMPTY',
    description: 'Záró érintkező: aktív, ha a megadott pufferben / sorban jelenleg 0 elem található (üres).',
    arrayName: 'QUEUE_BUFFER',
    pointerVar: 'V_QUEUE_LEN',
    isBuiltIn: true
  },
  {
    id: 'mod_buffer_full',
    name: 'Puffer Tele? (BUF FULL)',
    symbol: '—[BUF FULL]—',
    category: 'contact',
    type: 'BUFFER_FULL',
    description: 'Záró érintkező: aktív, ha a megadott puffer elérte a maximális megengedett kapacitást (tele).',
    arrayName: 'QUEUE_BUFFER',
    pointerVar: 'V_QUEUE_LEN',
    maxSize: 8,
    isBuiltIn: true
  },
  // -----------------------------------------------------------------
  // RTC Real-Time Clock & Calendar Ladder Elements
  // -----------------------------------------------------------------
  {
    id: 'mod_rtc_time_range',
    name: 'RTC Heti/Napi Időzítő (Schedule)',
    symbol: '—[🕐 08:00..16:30 H-P]—',
    category: 'rtc',
    type: 'RTC_TIME_RANGE',
    description: 'Záró érintkező: aktív a megadott napi idősávban (pl. 08:00-16:30) a kijelölt napokon (H-P vagy hétvége). Támogatja az éjszakai átnyúlást is (pl. 22:00-06:00).',
    rtcStartHour: 8,
    rtcStartMin: 0,
    rtcEndHour: 16,
    rtcEndMin: 30,
    rtcDaysOfWeek: [1, 2, 3, 4, 5],
    rtcScheduleMode: 'weekdays',
    isBuiltIn: true
  },
  {
    id: 'mod_rtc_time_cmp',
    name: 'RTC Időpont Komparátor (Time CMP)',
    symbol: '—[🕐 >= 18:00]—',
    category: 'rtc',
    type: 'RTC_TIME_CMP',
    description: 'Összehasonlítja az aktuális valós idejű óra állását a megadott óra/perc/másodperc referenciával (==, >=, <=, >, <).',
    rtcCompareHour: 18,
    rtcCompareMin: 0,
    rtcCompareSec: 0,
    compareOp: '>=',
    isBuiltIn: true
  },
  {
    id: 'mod_rtc_calendar_range',
    name: 'RTC Naptári Szezon (Dátum Tartomány)',
    symbol: '—[📅 05.01..09.30]—',
    category: 'rtc',
    type: 'RTC_CALENDAR_RANGE',
    description: 'Éves szezonális naptári érintkező (pl. Nyári öntözés: 05.01 - 09.30, vagy Fűtési szezon: 10.15 - 04.15).',
    rtcStartMonth: 5,
    rtcStartDay: 1,
    rtcEndMonth: 9,
    rtcEndDay: 30,
    isBuiltIn: true
  },
  {
    id: 'mod_rtc_pulse_tick',
    name: 'RTC Időzítő Impulzus (Pulse Tick)',
    symbol: '—[⏱ 1MIN ⎍]—',
    category: 'rtc',
    type: 'RTC_PULSE_TICK',
    description: 'Egyetlen PLC ciklus hosszúságú él-impulzus percenként (:00), óránként (:00:00), éjfélkor (00:00:00 napi reset) vagy másodpercenként.',
    rtcPulseInterval: 'minute',
    isBuiltIn: true
  },
  {
    id: 'mod_rtc_read_time',
    name: 'RTC Idő Kiolvasása Változókba',
    symbol: '[RTC READ ➔ VARS]',
    category: 'rtc',
    type: 'RTC_READ_TIME',
    description: 'Kiolvassa az I2C RTC (DS3231/DS1307) adatait (év, hónap, nap, óra, perc, másodperc, hét napja) a PLC változókba.',
    rtcVarYear: 'RTC_YEAR',
    rtcVarMonth: 'RTC_MONTH',
    rtcVarDay: 'RTC_DAY',
    rtcVarHour: 'RTC_HOUR',
    rtcVarMin: 'RTC_MIN',
    rtcVarSec: 'RTC_SEC',
    rtcVarDOW: 'RTC_DOW',
    isBuiltIn: true
  },
  {
    id: 'mod_rtc_set_time',
    name: 'RTC Óra Beállítása (Set Time)',
    symbol: '[RTC SET TIME]',
    category: 'rtc',
    type: 'RTC_SET_TIME',
    description: 'Beállítja a külső I2C RTC óramodul pontos idejét a megadott értékek vagy változók alapján.',
    rtcStartHour: 12,
    rtcStartMin: 0,
    isBuiltIn: true
  },
  // -------------------------------------------------------------
  // I/O PORT EXPANDERS (MCP23017 / MCP23008 & PCF8574)
  // -------------------------------------------------------------
  {
    id: 'mod_expander_read_pin',
    name: 'I/O Bővítő Láb Olvasás (EXP PIN READ)',
    symbol: '[EXP PIN READ]',
    category: 'protocol',
    type: 'EXPANDER_READ_PIN',
    description: 'Lekérdezi az I2C portbővítő (MCP23017 / PCF8574) egy adott bemeneti lábának állapotát és elmenti egy PLC változóba.',
    expanderDeviceId: 'mcp23017_1',
    expanderPin: 'EXP_A0',
    expanderTargetVar: 'V_EXP_IN0',
    isBuiltIn: true
  },
  {
    id: 'mod_expander_write_pin',
    name: 'I/O Bővítő Láb Írás (EXP PIN WRITE)',
    symbol: '[EXP PIN WRITE]',
    category: 'protocol',
    type: 'EXPANDER_WRITE_PIN',
    description: 'Beállítja az I2C portbővítő (MCP23017 / PCF8574) kimeneti lábát (HIGH / LOW) a rung áramútja vagy értéke alapján.',
    expanderDeviceId: 'mcp23017_1',
    expanderPin: 'EXP_B0',
    isBuiltIn: true
  },
  {
    id: 'mod_expander_read_port',
    name: 'I/O Bővítő Egész Port Olvasás (EXP PORT READ)',
    symbol: '[EXP PORT ➔ VAR]',
    category: 'protocol',
    type: 'EXPANDER_READ_PORT',
    description: 'Beolvassa az expander teljes 8-bites portját (0..255) egy egész változóba (nagyon gyors busz-olvasás).',
    expanderDeviceId: 'mcp23017_1',
    expanderPort: 'A',
    expanderTargetVar: 'V_PORTA_BYTE',
    isBuiltIn: true
  },
  {
    id: 'mod_expander_write_port',
    name: 'I/O Bővítő Egész Port Írás (EXP PORT WRITE)',
    symbol: '[EXP VAR ➔ PORT]',
    category: 'protocol',
    type: 'EXPANDER_WRITE_PORT',
    description: 'Kiküld egy 8-bites bájtot (0..255) vagy változót az expander portjára egyetlen I2C tranzakcióval.',
    expanderDeviceId: 'mcp23017_1',
    expanderPort: 'B',
    expanderValueVar: 'V_PORTB_OUT',
    isBuiltIn: true
  },
  {
    id: 'mod_pid_controller',
    name: 'PID Zárt Hurkú Szabályzó (PID Controller)',
    symbol: '[PID LOOP]',
    category: 'library_module',
    type: 'PID_CONTROLLER',
    description: 'Ipari zárt hurkú PID szabályzó (Kp, Ki, Kd, Anti-Windup, D-szűrő). Folyamatérték (PV) alapjelhez (SP) igazítása PWM kimenettel (CV).',
    pidKp: 3.2,
    pidKi: 0.8,
    pidKd: 0.6,
    pidSetpoint: 60.0,
    pidInputVar: 'A0',
    pidOutputVar: 'D9',
    pidMinOutput: 0,
    pidMaxOutput: 255,
    pidSampleTimeMs: 50,
    pidReverseAction: false,
    isBuiltIn: true
  }
];

export const DEFAULT_CUSTOM_MODULES = DEFAULT_MODULE_TEMPLATES;
