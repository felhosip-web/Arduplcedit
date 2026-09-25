import { ProtocolConfigs } from '../types';

export const EMPTY_PROTOCOLS: ProtocolConfigs = {
  dallas: {
    enabled: false,
    pin: 'D4',
    resolution: 12,
    waitForConversion: true,
    requestOnBoot: true,
    sensors: []
  },
  i2c: {
    enabled: false,
    sdaPin: 'A4',
    sclPin: 'A5',
    clockSpeedKhz: 100,
    timeoutMs: 3000,
    scanBusOnBoot: false,
    devices: []
  },
  spi: {
    enabled: false,
    sckPin: 'D13',
    misoPin: 'D12',
    mosiPin: 'D11',
    csPin: 'D10',
    clockDivider: 'SPI_CLOCK_DIV4',
    dataMode: 'SPI_MODE0',
    bitOrder: 'MSBFIRST',
    deselectCsPinsOnBoot: false,
    devices: []
  },
  uart: {
    enabled: false,
    port: 'Serial',
    baudRate: 115200,
    serialConfig: 'SERIAL_8N1',
    timeoutMs: 100,
    printBootBanner: false,
    rxPin: 'D0',
    txPin: 'D1',
    mode: 'DEBUG_MONITOR',
    packetFormat: 'ASCII Telemetry'
  },
  nrf24: {
    enabled: false,
    cePin: 'D9',
    csnPin: 'D10',
    channel: 76,
    dataRate: '1MBPS',
    paLevel: 'RF24_PA_HIGH',
    writingAddress: 'PLC01',
    readingAddress: 'PLC02',
    autoAck: true,
    crcLength: '16-bit',
    dynamicPayloads: true
  },
  eeprom24c: {
    enabled: false,
    chipType: '24C32',
    addressHex: '0x50',
    capacityBytes: 4096,
    pageSizeBytes: 32,
    addressBytes: 2,
    writeCycleDelayMs: 5
  },
  rtc: {
    enabled: false,
    chipType: 'DS3231',
    addressHex: '0x68',
    syncIntervalSec: 1,
    autoSyncCompileTime: false,
    enableSquareWave1Hz: false
  },
  sdCard: {
    enabled: false,
    csPin: 'D10',
    spiSpeed: 'SPI_HALF_SPEED',
    logFileName: 'datalog.csv',
    autoLogIntervalSec: 5,
    autoCreateCsvHeader: false,
    csvHeaderColumns: '',
    logVariables: [],
    detectCardOnBoot: false
  },
  modbus: {
    enabled: false,
    role: 'SLAVE',
    slaveId: 1,
    serialPort: 'Serial',
    baudRate: 19200,
    serialConfig: 'SERIAL_8E1',
    deRePin: 'D2',
    rxPin: 'D0',
    txPin: 'D1',
    timeoutMs: 500,
    pollIntervalMs: 100,
    holdingRegisterMappings: [],
    coilMappings: []
  },
  supervisor: {
    watchdog: {
      enabled: false,
      timeout: '2S',
      autoResetEachScan: false
    },
    brownout: {
      enabled: false,
      level: '4.3V',
      earlyPowerFailPin: 'D2',
      saveRetentiveOnPowerFail: false
    },
    diagnostics: {
      logResetReasonOnBoot: false
    }
  },
  expander: {
    enabled: false,
    devices: []
  }
};

export const DEFAULT_PROTOCOLS: ProtocolConfigs = {
  dallas: {
    enabled: true,
    pin: 'D4',
    resolution: 12,
    waitForConversion: true,
    requestOnBoot: true,
    sensors: [
      {
        id: 'ds18b20_tank',
        name: 'Tartály DS18B20 Hőmérő',
        romAddress: '28-AA-3B-84-07-00-00-51',
        targetVariable: 'V_TEMP_C'
      },
      {
        id: 'ds18b20_motor',
        name: 'Motor Melegedés DS18B20',
        romAddress: '28-FF-64-1E-82-16-03-9A',
        targetVariable: 'V_FLOW_RATE'
      }
    ]
  },
  i2c: {
    enabled: true,
    sdaPin: 'A4',
    sclPin: 'A5',
    clockSpeedKhz: 100,
    timeoutMs: 3000,
    scanBusOnBoot: true,
    devices: [
      {
        id: 'i2c_lcd',
        name: 'HD44780 16x2 I2C LCD',
        addressHex: '0x27',
        type: 'LCD_1602',
        description: 'Fő kezelőfelület és állapotkijelző'
      },
      {
        id: 'i2c_rtc',
        name: 'DS3231 Valós Idejű Óra (RTC)',
        addressHex: '0x68',
        type: 'RTC_DS3231',
        description: 'Műszaknaplózás és pontos dátum/idő'
      },
      {
        id: 'i2c_pcf',
        name: 'PCF8574 8-bites I/O Expander',
        addressHex: '0x20',
        type: 'IO_PCF8574',
        description: 'Külső nyomógombok és visszajelző LED-ek'
      }
    ]
  },
  spi: {
    enabled: true,
    sckPin: 'D13',
    misoPin: 'D12',
    mosiPin: 'D11',
    csPin: 'D10',
    clockDivider: 'SPI_CLOCK_DIV4',
    dataMode: 'SPI_MODE0',
    bitOrder: 'MSBFIRST',
    deselectCsPinsOnBoot: true,
    devices: [
      {
        id: 'spi_sdcard',
        name: 'SD Kártya SPI Modul',
        csPin: 'D10',
        type: 'SD_CARD',
        description: 'Ipari folyamatadatok és hibák CSV naplózása'
      },
      {
        id: 'spi_max7219',
        name: 'MAX7219 7-Szegmens / Mátrix',
        csPin: 'D9',
        type: 'MAX7219',
        description: 'Nagyfényerejű numerikus ciklus-kijelző'
      },
      {
        id: 'spi_mcp23s17',
        name: 'MCP23S17 16-bites SPI Bővítő',
        csPin: 'D8',
        type: 'MCP23S17',
        description: 'Szelepek és mágneskapcsolók bővített meghajtása'
      }
    ]
  },
  uart: {
    enabled: true,
    port: 'Serial',
    baudRate: 115200,
    serialConfig: 'SERIAL_8N1',
    timeoutMs: 100,
    printBootBanner: true,
    rxPin: 'D0',
    txPin: 'D1',
    mode: 'DEBUG_MONITOR',
    packetFormat: 'ASCII Telemetry'
  },
  nrf24: {
    enabled: true,
    cePin: 'D9',
    csnPin: 'D10',
    channel: 76,
    dataRate: '1MBPS',
    paLevel: 'RF24_PA_HIGH',
    writingAddress: 'PLC01',
    readingAddress: 'PLC02',
    autoAck: true,
    crcLength: '16-bit',
    dynamicPayloads: true
  },
  eeprom24c: {
    enabled: true,
    chipType: '24C32',
    addressHex: '0x50',
    capacityBytes: 4096,
    pageSizeBytes: 32,
    addressBytes: 2,
    writeCycleDelayMs: 5
  },
  rtc: {
    enabled: true,
    chipType: 'DS3231',
    addressHex: '0x68',
    syncIntervalSec: 1,
    autoSyncCompileTime: true,
    enableSquareWave1Hz: false,
    targetVariables: {
      year: 'RTC_YEAR',
      month: 'RTC_MONTH',
      day: 'RTC_DAY',
      hour: 'RTC_HOUR',
      minute: 'RTC_MIN',
      second: 'RTC_SEC',
      dayOfWeek: 'RTC_DOW'
    }
  },
  sdCard: {
    enabled: true,
    csPin: 'D10',
    spiSpeed: 'SPI_HALF_SPEED',
    logFileName: 'datalog.csv',
    autoLogIntervalSec: 5,
    autoCreateCsvHeader: true,
    csvHeaderColumns: 'TIMESTAMP_MS,YEAR,MONTH,DAY,HOUR,MIN,SEC,V_TEMP_C,V_FLOW_RATE,STATUS',
    logVariables: ['RTC_HOUR', 'RTC_MIN', 'RTC_SEC', 'V_TEMP_C', 'V_FLOW_RATE'],
    detectCardOnBoot: true
  },
  modbus: {
    enabled: true,
    role: 'SLAVE',
    slaveId: 1,
    serialPort: 'Serial',
    baudRate: 19200,
    serialConfig: 'SERIAL_8E1',
    deRePin: 'D2',
    rxPin: 'D0',
    txPin: 'D1',
    timeoutMs: 500,
    pollIntervalMs: 100,
    holdingRegisterMappings: [
      { address: 0, type: 'HOLDING_REGISTER', target: 'V_TEMP_C', description: 'Mért folyamathőmérséklet (°C x 10)' },
      { address: 1, type: 'HOLDING_REGISTER', target: 'V_BATCH_COUNT', description: 'Elkészült gyártási adag számláló' },
      { address: 2, type: 'HOLDING_REGISTER', target: 'V_FLOW_RATE', description: 'Mért áramlási sebesség (L/min)' },
      { address: 3, type: 'HOLDING_REGISTER', target: 'V_STATUS_CODE', description: 'Gép állapota (1=Kész, 2=Üzem, 3=Hiba)' }
    ],
    coilMappings: [
      { address: 0, type: 'COIL', target: 'D8', description: 'Főmotor Mágneskapcsoló Kimenet (D8)' },
      { address: 1, type: 'COIL', target: 'D9', description: 'Hűtőventilátor Relé Kimenet (D9)' },
      { address: 2, type: 'COIL', target: 'D10', description: 'Fűtőbetét Szilárdtest Relé (D10)' },
      { address: 3, type: 'COIL', target: 'M0', description: 'Belső Automata Üzem Mód Jelzőbit (M0)' }
    ]
  },
  supervisor: {
    watchdog: {
      enabled: true,
      timeout: '2S',
      autoResetEachScan: true
    },
    brownout: {
      enabled: true,
      level: '4.3V',
      earlyPowerFailPin: 'D2',
      saveRetentiveOnPowerFail: true
    },
    diagnostics: {
      logResetReasonOnBoot: true
    }
  },
  expander: {
    enabled: true,
    devices: [
      {
        id: 'mcp23017_1',
        name: 'MCP23017 16-Bit I/O Bővítő (0x20)',
        chipType: 'MCP23017',
        addressHex: '0x20',
        enabled: true,
        pins: [
          // Port A: 8 Bemenet belső felhúzással (Gombok, optokapuk, végállások)
          { pinId: 'EXP_A0', port: 'A', bitIndex: 0, mode: 'INPUT_PULLUP', label: 'EXP START Gomb' },
          { pinId: 'EXP_A1', port: 'A', bitIndex: 1, mode: 'INPUT_PULLUP', label: 'EXP STOP Gomb' },
          { pinId: 'EXP_A2', port: 'A', bitIndex: 2, mode: 'INPUT_PULLUP', label: 'EXP Végállás 1' },
          { pinId: 'EXP_A3', port: 'A', bitIndex: 3, mode: 'INPUT_PULLUP', label: 'EXP Végállás 2' },
          { pinId: 'EXP_A4', port: 'A', bitIndex: 4, mode: 'INPUT_PULLUP', label: 'EXP Optoszenzor' },
          { pinId: 'EXP_A5', port: 'A', bitIndex: 5, mode: 'INPUT_PULLUP', label: 'EXP Nyomáskapcsoló' },
          { pinId: 'EXP_A6', port: 'A', bitIndex: 6, mode: 'INPUT_PULLUP', label: 'EXP Vészstop Kör' },
          { pinId: 'EXP_A7', port: 'A', bitIndex: 7, mode: 'INPUT_PULLUP', label: 'EXP Kulcsos Kapcsoló' },
          // Port B: 8 Kimenet (Mágnesszelepek, relék, jelzőlámpák)
          { pinId: 'EXP_B0', port: 'B', bitIndex: 0, mode: 'OUTPUT', label: 'EXP Mágnesszelep 1' },
          { pinId: 'EXP_B1', port: 'B', bitIndex: 1, mode: 'OUTPUT', label: 'EXP Mágnesszelep 2' },
          { pinId: 'EXP_B2', port: 'B', bitIndex: 2, mode: 'OUTPUT', label: 'EXP Főmotor Relé' },
          { pinId: 'EXP_B3', port: 'B', bitIndex: 3, mode: 'OUTPUT', label: 'EXP Hűtőventilátor' },
          { pinId: 'EXP_B4', port: 'B', bitIndex: 4, mode: 'OUTPUT', label: 'EXP Zöld Üzem Lámpa' },
          { pinId: 'EXP_B5', port: 'B', bitIndex: 5, mode: 'OUTPUT', label: 'EXP Sárga Figyelem' },
          { pinId: 'EXP_B6', port: 'B', bitIndex: 6, mode: 'OUTPUT', label: 'EXP Piros Hiba Lámpa' },
          { pinId: 'EXP_B7', port: 'B', bitIndex: 7, mode: 'OUTPUT', label: 'EXP Hangjelző Duda' }
        ]
      },
      {
        id: 'pcf8574_1',
        name: 'PCF8574 8-Bit I/O Bővítő (0x21)',
        chipType: 'PCF8574',
        addressHex: '0x21',
        enabled: false,
        pins: [
          { pinId: 'PCF_P0', port: 'PORT', bitIndex: 0, mode: 'INPUT_PULLUP', label: 'PCF Bemenet 0' },
          { pinId: 'PCF_P1', port: 'PORT', bitIndex: 1, mode: 'INPUT_PULLUP', label: 'PCF Bemenet 1' },
          { pinId: 'PCF_P2', port: 'PORT', bitIndex: 2, mode: 'INPUT_PULLUP', label: 'PCF Bemenet 2' },
          { pinId: 'PCF_P3', port: 'PORT', bitIndex: 3, mode: 'INPUT_PULLUP', label: 'PCF Bemenet 3' },
          { pinId: 'PCF_P4', port: 'PORT', bitIndex: 4, mode: 'OUTPUT', label: 'PCF Relé Kimenet 4' },
          { pinId: 'PCF_P5', port: 'PORT', bitIndex: 5, mode: 'OUTPUT', label: 'PCF Relé Kimenet 5' },
          { pinId: 'PCF_P6', port: 'PORT', bitIndex: 6, mode: 'OUTPUT', label: 'PCF Relé Kimenet 6' },
          { pinId: 'PCF_P7', port: 'PORT', bitIndex: 7, mode: 'OUTPUT', label: 'PCF Relé Kimenet 7' }
        ]
      }
    ]
  }
};
