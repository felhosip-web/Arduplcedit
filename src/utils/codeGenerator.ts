import {
  Rung,
  ArduinoLibrary,
  LadderElement,
  Subroutine,
  PLCConstant,
  PLCVariable,
  PLCArray,
  ProtocolConfigs,
  InterruptsConfig,
  Task,
  Program,
  StateMachine,
  FBDDiagram,
  FBDBlock
} from '../types';

export function generateArduinoCode(
  rungs: Rung[],
  libraries: ArduinoLibrary[],
  projectName: string = 'PLC_Ladder_Program',
  subroutines: Subroutine[] = [],
  constants: PLCConstant[] = [],
  variables: PLCVariable[] = [],
  arrays: PLCArray[] = [],
  protocols?: ProtocolConfigs,
  setupRungs: Rung[] = [],
  interrupts?: InterruptsConfig,
  tasks?: Task[],
  stateMachines: StateMachine[] = []
): string {
  // Resolve execution programs: all ladder programs from cyclic tasks, or fallback to global rungs
  let executionPrograms: { taskName: string; progName: string; rungs: Rung[] }[] = [];
  let fbdExecutionPrograms: { taskName: string; progName: string; fbd: FBDDiagram }[] = [];

  if (tasks && tasks.length > 0) {
    tasks.filter(t => t.type === 'cyclic').forEach(t => {
      t.programs.forEach(p => {
        if (p.type === 'ladder' && p.rungs && p.rungs.length > 0) {
          executionPrograms.push({ taskName: t.name, progName: p.name, rungs: p.rungs! });
        } else if (p.type === 'fbd' && p.fbd) {
          fbdExecutionPrograms.push({ taskName: t.name, progName: p.name, fbd: p.fbd });
        }
      });
    });
  }

  // If no cyclic tasks with ladder programs exist, fallback to global rungs
  if (executionPrograms.length === 0 && rungs.length > 0) {
    executionPrograms.push({ taskName: 'Global', progName: 'Main', rungs });
  }

  // 1. Determine all referenced pins, variables, and protocol usages
  const inputPins = new Set<string>();
  const outputPins = new Set<string>();
  const analogPins = new Set<string>();
  const internalFlags = new Set<string>();
  const timers = new Map<string, { preset: number; type: string }>();
  const fbdLatches = new Set<string>();

  // Determine FBD referenced variables
  fbdExecutionPrograms.forEach(ep => {
    ep.fbd.blocks.forEach(block => {
      if (block.type === 'INPUT' || block.type === 'OUTPUT') {
        const varName = block.properties?.variable;
        if (varName) {
          if (varName.startsWith('D')) {
            if (block.type === 'INPUT') inputPins.add(varName);
            if (block.type === 'OUTPUT') outputPins.add(varName);
          } else if (varName.startsWith('A')) {
            analogPins.add(varName);
          } else if (varName.startsWith('M')) {
            internalFlags.add(varName);
          }
        }
      } else if (block.type === 'RS' || block.type === 'SR') {
        fbdLatches.add(block.id);
      }
    });
  });

  const counters = new Map<string, { preset: number; type: string }>();

  // Modules & Protocols flags
  let usesServo = false;
  let usesLcd = false;
  let usesDht = false;
  let usesNeoPixel = false;
  let usesUltrasonic = false;
  let usesDallas = protocols?.dallas?.enabled ?? false;
  let usesI2C = protocols?.i2c?.enabled ?? false;
  let usesSPI = protocols?.spi?.enabled ?? false;
  let usesUART = protocols?.uart?.enabled ?? true;
  let usesNRF24 = protocols?.nrf24?.enabled ?? false;
  let uses24cEEPROM = protocols?.eeprom24c?.enabled ?? false;
  let usesRTC = protocols?.rtc?.enabled ?? false;
  let usesSD = protocols?.sdCard?.enabled ?? false;
  let usesModbus = protocols?.modbus?.enabled ?? false;
  let usesWatchdog = protocols?.supervisor?.watchdog?.enabled ?? true;
  let usesBrownout = protocols?.supervisor?.brownout?.enabled ?? true;
  let usesExpander = protocols?.expander?.enabled ?? false;
  let usesMCP23017 = false;
  let usesPCF8574 = false;

  if (protocols?.expander?.devices) {
    protocols.expander.devices.forEach(d => {
      if (d.enabled) {
        usesExpander = true;
        usesI2C = true;
        if (d.chipType === 'MCP23017' || d.chipType === 'MCP23008') usesMCP23017 = true;
        if (d.chipType === 'PCF8574' || d.chipType === 'PCF8575') usesPCF8574 = true;
      }
    });
  }

  let servoPin = '9';
  let dhtPin = '7';
  let neoPixelPin = '6';
  let dallasPin = protocols?.dallas?.pin?.replace('D', '') || '4';
  let nrfCePin = protocols?.nrf24?.cePin?.replace('D', '') || '9';
  let nrfCsnPin = protocols?.nrf24?.csnPin?.replace('D', '') || '10';
  let sdCsPin = protocols?.sdCard?.csPin?.replace('D', '') || '10';
  let rs485DePin = protocols?.modbus?.deRePin?.replace('D', '') || '2';

  function analyzeElement(el: LadderElement) {
    if (['COMB_AND', 'COMB_AND3', 'COMB_OR', 'COMB_OR3', 'COMB_XOR', 'COMB_NOT'].includes(el.type)) {
      if (el.sourceVariable && el.sourceVariable.startsWith('D')) inputPins.add(el.sourceVariable);
      if (el.operandB && el.operandB.startsWith('D')) inputPins.add(el.operandB);
      if (el.operandC && el.operandC.startsWith('D')) inputPins.add(el.operandC);
      if (el.targetVariable && el.targetVariable.startsWith('D')) outputPins.add(el.targetVariable);
      if (el.variable && el.variable.startsWith('D')) outputPins.add(el.variable);
      if (el.pin && el.pin.startsWith('D')) outputPins.add(el.pin);

      if (el.sourceVariable && el.sourceVariable.startsWith('M')) internalFlags.add(el.sourceVariable);
      if (el.operandB && el.operandB.startsWith('M')) internalFlags.add(el.operandB);
      if (el.operandC && el.operandC.startsWith('M')) internalFlags.add(el.operandC);
      if (el.targetVariable && el.targetVariable.startsWith('M')) internalFlags.add(el.targetVariable);
    }

    if (el.variable && el.variable.startsWith('M')) {
      internalFlags.add(el.variable);
    }
    if (el.variable && el.variable.startsWith('RTC_')) {
      usesRTC = true;
      usesI2C = true;
    }
    if (el.variable && el.variable.startsWith('SD_')) {
      usesSD = true;
      usesSPI = true;
    }

    if (el.type.startsWith('NRF24_')) {
      usesNRF24 = true;
      usesSPI = true;
      if (el.pin) nrfCePin = el.pin.replace('D', '');
      if (el.spiCsPin) nrfCsnPin = el.spiCsPin.replace('D', '');
    }
    if (el.type.startsWith('EEPROM_24C_')) {
      uses24cEEPROM = true;
      usesI2C = true;
    }
    if (el.type.startsWith('RTC_')) {
      usesRTC = true;
      usesI2C = true;
    }
    if (el.type.startsWith('SD_')) {
      usesSD = true;
      usesSPI = true;
    }
    if (el.type.startsWith('MODBUS_')) {
      usesModbus = true;
    }
    if (el.type === 'WDT_RESET') {
      usesWatchdog = true;
    }
    if (el.type === 'BOD_STATUS') {
      usesBrownout = true;
    }
    if (el.type.startsWith('EXPANDER_')) {
      usesExpander = true;
      usesI2C = true;
      if (el.pin?.startsWith('EXP_') || el.expanderPin?.startsWith('EXP_') || el.expanderPort === 'A' || el.expanderPort === 'B' || el.expanderDeviceId?.includes('mcp')) {
        usesMCP23017 = true;
      }
      if (el.pin?.startsWith('PCF_') || el.expanderPin?.startsWith('PCF_') || el.expanderPort === 'PORT' || el.expanderDeviceId?.includes('pcf')) {
        usesPCF8574 = true;
      }
    }
    if (el.pin?.startsWith('EXP_') || el.expanderPin?.startsWith('EXP_')) {
      usesExpander = true;
      usesI2C = true;
      usesMCP23017 = true;
    }
    if (el.pin?.startsWith('PCF_') || el.expanderPin?.startsWith('PCF_')) {
      usesExpander = true;
      usesI2C = true;
      usesPCF8574 = true;
    }

    if (el.category === 'contact') {
      if (el.pin) {
        if (el.pin.startsWith('EXP_') || el.pin.startsWith('PCF_')) {
          // Expander input pin
        } else if (el.pin.startsWith('A')) {
          analogPins.add(el.pin);
        } else {
          inputPins.add(el.pin);
        }
      }
    } else if (el.category === 'coil') {
      if (el.pin && el.pin.startsWith('D')) {
        outputPins.add(el.pin);
      }
    } else if (el.category === 'timer' && el.variable) {
      timers.set(el.variable, { preset: el.presetMs || 1000, type: el.type });
    } else if (el.category === 'counter' && el.variable) {
      counters.set(el.variable, { preset: el.presetCount || 5, type: el.type });
    } else if (el.category === 'library_module') {
      if (el.type === 'SERVO_WRITE') {
        usesServo = true;
        if (el.pin) servoPin = el.pin.replace('D', '');
      } else if (el.type === 'LCD_PRINT') {
        usesLcd = true;
        usesI2C = true;
      } else if (el.type === 'DHT_READ') {
        usesDht = true;
        if (el.pin) dhtPin = el.pin.replace('D', '');
      } else if (el.type === 'NEOPIXEL_SET') {
        usesNeoPixel = true;
        if (el.pin) neoPixelPin = el.pin.replace('D', '');
      } else if (el.type === 'ULTRASONIC_READ') {
        usesUltrasonic = true;
      } else if (el.type === 'PWM_OUT' && el.pin) {
        outputPins.add(el.pin);
      }
    } else if (el.category === 'protocol') {
      if (el.type === 'DALLAS_READ') {
        usesDallas = true;
        if (el.dallasPin || el.pin) dallasPin = (el.dallasPin || el.pin)!.replace('D', '');
      } else if (el.type === 'I2C_WRITE' || el.type === 'I2C_READ') {
        usesI2C = true;
      } else if (el.type === 'SPI_TRANSFER') {
        usesSPI = true;
        if (el.spiCsPin && el.spiCsPin.startsWith('D')) {
          outputPins.add(el.spiCsPin);
        }
      } else if (el.type === 'UART_PRINT' || el.type === 'UART_READ') {
        usesUART = true;
      }
    }
  }

  setupRungs.forEach(r => {
    r.branches.forEach(b => b.elements.forEach(analyzeElement));
    r.coils.forEach(analyzeElement);
  });

  executionPrograms.forEach(ep => {
    ep.rungs.forEach(r => {
      r.branches.forEach(b => b.elements.forEach(analyzeElement));
      r.coils.forEach(analyzeElement);
    });
  });

  const hasRetentive = variables.some(v => v.isRetentive);

  // Filter libraries that are explicitly enabled OR required by modules
  const activeLibs = libraries.filter(lib => {
    if (lib.id === 'servo' && (lib.enabled || usesServo)) return true;
    if (lib.id === 'liquidcrystal_i2c' && (lib.enabled || usesLcd)) return true;
    if (lib.id === 'dht' && (lib.enabled || usesDht)) return true;
    if (lib.id === 'neopixel' && (lib.enabled || usesNeoPixel)) return true;
    if (lib.id === 'wire' && (lib.enabled || usesLcd || usesI2C || uses24cEEPROM || usesRTC)) return true;
    if (lib.id === 'dallas_temp' && (lib.enabled || usesDallas)) return true;
    if (lib.id === 'spi' && (lib.enabled || usesSPI || usesNRF24 || usesSD)) return true;
    if (lib.id === 'rf24' && (lib.enabled || usesNRF24)) return true;
    if (lib.id === 'eeprom_24cxxx' && (lib.enabled || uses24cEEPROM)) return true;
    if (lib.id === 'rtclib' && (lib.enabled || usesRTC)) return true;
    if (lib.id === 'sd' && (lib.enabled || usesSD)) return true;
    if (lib.id === 'eeprom' && (lib.enabled || hasRetentive)) return true;
    return lib.enabled;
  });

  const lines: string[] = [];

  // Header banner
  lines.push('/*');
  lines.push(` * ========================================================`);
  lines.push(` * Project: ${projectName}`);
  lines.push(` * Generated with Arduino PLC Ladder Studio`);
  lines.push(` * Protocols: ${[
    usesDallas ? 'Dallas DS18B20 1-Wire' : null,
    usesI2C ? 'I2C (Wire)' : null,
    usesSPI ? 'SPI Interface' : null,
    usesUART ? 'UART (Serial)' : null,
    usesModbus ? 'Modbus RTU / RS485' : null,
    usesWatchdog ? 'AVR Watchdog Timer' : null,
    usesBrownout ? 'Brown-out Reset Protection' : null,
    usesNRF24 ? 'NRF24L01+ 2.4GHz RF' : null,
    uses24cEEPROM ? '24Cxxx External EEPROM' : null,
    usesRTC ? `RTC Valós Idejű Óra (${protocols?.rtc?.chipType || 'DS3231'})` : null,
    usesSD ? 'SD Kártya SPI Datalogger' : null,
    usesExpander ? 'I/O Port Bővítők (MCP23017 / PCF8574)' : null
  ].filter(Boolean).join(', ') || 'Standard I/O'}`);
  lines.push(` * Date: ${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU')}`);
  lines.push(` * ========================================================`);
  lines.push(' */\n');

  // Includes
  lines.push('// --- KÖNYVTÁRAK (LIBRARIES) ---');
  const includedHeaders = new Set<string>();

  if (usesWatchdog || usesBrownout) {
    includedHeaders.add('#include <avr/wdt.h>');
    includedHeaders.add('#include <avr/boot.h>');
  }
  if (usesDallas) {
    includedHeaders.add('#include <OneWire.h>');
    includedHeaders.add('#include <DallasTemperature.h>');
  }
  if (usesI2C || usesLcd || uses24cEEPROM || usesRTC || usesExpander) {
    includedHeaders.add('#include <Wire.h>');
  }
  if (usesRTC) {
    includedHeaders.add('#include <RTClib.h>');
  }
  if (usesSPI || usesNRF24 || usesSD) {
    includedHeaders.add('#include <SPI.h>');
  }
  if (usesSD) {
    includedHeaders.add('#include <SD.h>');
  }
  if (usesNRF24) {
    includedHeaders.add('#include <nRF24L01.h>');
    includedHeaders.add('#include <RF24.h>');
  }
  if (hasRetentive) {
    includedHeaders.add('#include <EEPROM.h>');
  }

  activeLibs.forEach(lib => {
    lib.header.split('\n').forEach(h => {
      const trimmed = h.trim();
      if (trimmed) {
        includedHeaders.add(trimmed);
      }
    });
  });

  includedHeaders.forEach(h => lines.push(h));
  if (includedHeaders.size === 0) {
    lines.push('// Nincs külső könyvtár megadva');
  }
  lines.push('');

  // -------------------------------------------------------------
  // CONSTANTS (KONSTANSOK)
  // -------------------------------------------------------------
  lines.push('// --- PLC KONSTANSOK (CONSTANTS) ---');
  if (constants.length === 0) {
    lines.push('// (Nincsenek felhasználói konstansok definiálva)');
  } else {
    constants.forEach(c => {
      const desc = c.description ? ` // ${c.description}` : '';
      if (c.type === 'string') {
        lines.push(`const char* const ${c.name} = "${c.value}";${desc}`);
      } else if (c.type === 'float') {
        const valStr = String(c.value).includes('.') ? `${c.value}f` : `${c.value}.0f`;
        lines.push(`const float ${c.name} = ${valStr};${desc}`);
      } else if (c.type === 'unsigned long') {
        lines.push(`const unsigned long ${c.name} = ${c.value}UL;${desc}`);
      } else {
        lines.push(`const ${c.type} ${c.name} = ${c.value};${desc}`);
      }
    });
  }
  lines.push('');

  // -------------------------------------------------------------
  // VARIABLES (VÁLTOZÓK)
  // -------------------------------------------------------------
  lines.push('// --- FBD RETESZEK (LATCHES) ---');
  if (fbdLatches.size > 0) {
    fbdLatches.forEach(id => {
       const safeId = id.replace(/[^A-Za-z0-9_]/g, '_');
       lines.push(`static bool fbd_latch_${safeId} = false;`);
    });
    lines.push('');
  }

  lines.push('// --- PLC VÁLTOZÓK (GLOBAL VARIABLES) ---');
  if (variables.length === 0) {
    lines.push('// (Nincsenek egyedi változók definiálva)');
  } else {
    variables.forEach(v => {
      const isVol = v.isVolatile ||
        (interrupts?.int0.enabled && interrupts.int0.targetVariable === v.name) ||
        (interrupts?.int1.enabled && interrupts.int1.targetVariable === v.name) ||
        (interrupts?.timer1.enabled && interrupts.timer1.targetVariable === v.name);
      const volPrefix = isVol ? 'volatile ' : '';
      const desc = v.description
        ? ` // ${v.description}${v.isRetentive ? ' [EEPROM RETAIN]' : ''}${isVol ? ' [ISR VOLATILE]' : ''}`
        : (isVol ? ' // [ISR VOLATILE]' : '');
      if (v.type === 'string') {
        lines.push(`String ${v.name} = "${v.initialValue}";${desc}`);
      } else if (v.type === 'float') {
        const valStr = String(v.initialValue).includes('.') ? `${v.initialValue}` : `${v.initialValue}.0`;
        lines.push(`${volPrefix}float ${v.name} = ${valStr};${desc}`);
      } else {
        lines.push(`${volPrefix}${v.type} ${v.name} = ${v.initialValue};${desc}`);
      }
    });
  }
  lines.push('');

  // -------------------------------------------------------------
  // ARRAYS (TÖMBÖK)
  // -------------------------------------------------------------
  lines.push('// --- PLC TÖMBÖK (ARRAYS) ---');
  if (arrays.length === 0) {
    lines.push('// (Nincsenek tömbök definiálva)');
  } else {
    arrays.forEach(arr => {
      const desc = arr.description ? ` // ${arr.description}` : '';
      const valsFormatted = arr.values.map(val => (arr.elementType === 'float' && !String(val).includes('.') ? `${val}.0f` : String(val))).join(', ');
      lines.push(`${arr.elementType} ${arr.name}[${arr.size}] = { ${valsFormatted} };${desc}`);
    });
  }
  lines.push('');

  // -------------------------------------------------------------
  // HARDWARE PIN DEFINITIONS
  // -------------------------------------------------------------
  lines.push('// --- HARDVER PIN DEFINÍCIÓK ---');
  inputPins.forEach(p => {
    const num = p.replace('D', '');
    lines.push(`#define PIN_${p} ${num}  // Digitális bemenet`);
  });
  outputPins.forEach(p => {
    const num = p.replace('D', '');
    lines.push(`#define PIN_${p} ${num}  // Digitális / Relé kimenet`);
  });
  analogPins.forEach(p => {
    lines.push(`#define PIN_${p} ${p}  // Analóg bemenet`);
  });

  if (usesDht) {
    lines.push(`#define PIN_DHT ${dhtPin}  // DHT szenzor adatláb`);
  }
  if (usesServo) {
    lines.push(`#define PIN_SERVO ${servoPin}  // Szervó PWM vezérlőláb`);
  }
  if (usesNeoPixel) {
    lines.push(`#define PIN_NEOPIXEL ${neoPixelPin}  // WS2812 NeoPixel DIN`);
    lines.push(`#define NUM_PIXELS 8`);
  }
  if (usesUltrasonic) {
    lines.push('#define PIN_TRIG 4  // Ultrahang HC-SR04 Trig');
    lines.push('#define PIN_ECHO 5  // Ultrahang HC-SR04 Echo');
  }
  if (usesDallas) {
    lines.push(`#define PIN_ONEWIRE ${dallasPin}  // Dallas DS18B20 1-Wire busz`);
  }
  if (usesSPI) {
    const csPin = protocols?.spi?.csPin?.replace('D', '') || '10';
    lines.push(`#define PIN_SPI_CS ${csPin}  // SPI Chip Select alapértelmezett`);
  }
  if (usesSD) {
    lines.push(`#define PIN_SD_CS ${sdCsPin}  // SD Kártya SPI Chip Select`);
  }
  lines.push('');

  // -------------------------------------------------------------
  // PERIPHERALS & PROTOCOL OBJECTS
  // -------------------------------------------------------------
  lines.push('// --- PERIFÉRIA & PROTOKOLL OBJEKTUMOK ---');
  if (usesServo || activeLibs.some(l => l.id === 'servo')) {
    lines.push('Servo plcServo;');
  }
  if (usesLcd || activeLibs.some(l => l.id === 'liquidcrystal_i2c')) {
    const lcdAddr = protocols?.i2c?.devices?.find(d => d.type === 'LCD_1602')?.addressHex || '0x27';
    lines.push(`LiquidCrystal_I2C lcd(${lcdAddr}, 16, 2); // 16x2 I2C LCD`);
  }
  if (usesDht || activeLibs.some(l => l.id === 'dht')) {
    lines.push('DHT dht(PIN_DHT, DHT11);');
    lines.push('float dht_temp = 0.0;');
    lines.push('float dht_hum = 0.0;');
  }
  if (usesNeoPixel || activeLibs.some(l => l.id === 'neopixel')) {
    lines.push('Adafruit_NeoPixel strip(NUM_PIXELS, PIN_NEOPIXEL, NEO_GRB + NEO_KHZ800);');
  }
  if (usesDallas) {
    lines.push('OneWire oneWireBus(PIN_ONEWIRE);');
    lines.push('DallasTemperature dallasSensors(&oneWireBus);');
  }
  if (usesRTC) {
    const chip = protocols?.rtc?.chipType || 'DS3231';
    if (chip === 'DS1307') {
      lines.push('RTC_DS1307 rtc; // Külső I2C Valós Idejű Óra');
    } else if (chip === 'PCF8563') {
      lines.push('RTC_PCF8563 rtc; // Külső I2C Valós Idejű Óra');
    } else {
      lines.push('RTC_DS3231 rtc; // Külső I2C Precíziós Valós Idejű Óra (TCXO)');
    }
    lines.push('unsigned long lastRtcSyncMillis = 0;');

    // Alapértelmezett RTC regiszter változók ha nincsenek a projekt változók között
    const existingVarNames = new Set(variables.map(v => v.name));
    if (!existingVarNames.has('RTC_YEAR')) lines.push('int RTC_YEAR = 2026;');
    if (!existingVarNames.has('RTC_MONTH')) lines.push('int RTC_MONTH = 1;');
    if (!existingVarNames.has('RTC_DAY')) lines.push('int RTC_DAY = 1;');
    if (!existingVarNames.has('RTC_HOUR')) lines.push('int RTC_HOUR = 0;');
    if (!existingVarNames.has('RTC_MIN')) lines.push('int RTC_MIN = 0;');
    if (!existingVarNames.has('RTC_SEC')) lines.push('int RTC_SEC = 0;');
    if (!existingVarNames.has('RTC_DOW')) lines.push('int RTC_DOW = 1; // 1=Hétfő .. 7=Vasárnap');
    lines.push('int prev_rtc_sec = -1;');
    lines.push('int prev_rtc_min = -1;');
    lines.push('int prev_rtc_hour = -1;');
    lines.push('int prev_rtc_day = -1;');
  }
  if (usesSD) {
    lines.push('File dataLogFile; // SD Kártya naplófájl kezelő');
    lines.push('bool sdCardReady = false; // SD csatolási állapot');
    lines.push('unsigned long lastSdLogMillis = 0;');
  }
  if (usesNRF24) {
    lines.push(`RF24 radio(${nrfCePin}, ${nrfCsnPin}); // CE, CSN`);
    const txAddr = protocols?.nrf24?.writingAddress || '0xF0F0F0F0E1LL';
    const rxAddr = protocols?.nrf24?.readingAddress || '0xF0F0F0F0D2LL';
    lines.push(`const uint64_t nrfWritingPipe = ${txAddr.startsWith('0x') ? txAddr : `0x${txAddr}LL`};`);
    lines.push(`const uint64_t nrfReadingPipe = ${rxAddr.startsWith('0x') ? rxAddr : `0x${rxAddr}LL`};`);
  }
  if (uses24cEEPROM) {
    const eepromAddr = protocols?.eeprom24c?.addressHex || '0x50';
    const is16BitAddr = (protocols?.eeprom24c?.addressBytes ?? 2) === 2;
    lines.push(`// --- 24Cxxx I2C EEPROM Segédfüggvények (Cím: ${eepromAddr}) ---`);
    lines.push('bool checkEEPROM_24C_ready(int devAddr) {');
    lines.push('  Wire.beginTransmission(devAddr);');
    lines.push('  return (Wire.endTransmission() == 0);');
    lines.push('}');
    lines.push('');
    lines.push('void writeEEPROM_24C_byte(int devAddr, unsigned int memAddr, byte data) {');
    lines.push('  Wire.beginTransmission(devAddr);');
    if (is16BitAddr) {
      lines.push('  Wire.write((int)(memAddr >> 8));');
      lines.push('  Wire.write((int)(memAddr & 0xFF));');
    } else {
      lines.push('  Wire.write((int)(memAddr & 0xFF));');
    }
    lines.push('  Wire.write(data);');
    lines.push('  Wire.endTransmission();');
    lines.push('  delay(5);');
    lines.push('}');
    lines.push('');
    lines.push('byte readEEPROM_24C_byte(int devAddr, unsigned int memAddr) {');
    lines.push('  byte r = 0xFF;');
    lines.push('  Wire.beginTransmission(devAddr);');
    if (is16BitAddr) {
      lines.push('  Wire.write((int)(memAddr >> 8));');
      lines.push('  Wire.write((int)(memAddr & 0xFF));');
    } else {
      lines.push('  Wire.write((int)(memAddr & 0xFF));');
    }
    lines.push('  Wire.endTransmission();');
    lines.push('  Wire.requestFrom(devAddr, 1);');
    lines.push('  if (Wire.available()) r = Wire.read();');
    lines.push('  return r;');
    lines.push('}');
    lines.push('');
    lines.push('void writeEEPROM_24C_int(int devAddr, unsigned int memAddr, int val) {');
    lines.push('  writeEEPROM_24C_byte(devAddr, memAddr, (byte)(val & 0xFF));');
    lines.push('  writeEEPROM_24C_byte(devAddr, memAddr + 1, (byte)((val >> 8) & 0xFF));');
    lines.push('}');
    lines.push('');
    lines.push('int readEEPROM_24C_int(int devAddr, unsigned int memAddr) {');
    lines.push('  byte low = readEEPROM_24C_byte(devAddr, memAddr);');
    lines.push('  byte high = readEEPROM_24C_byte(devAddr, memAddr + 1);');
    lines.push('  return (int)((high << 8) | low);');
    lines.push('}');
    lines.push('');
    lines.push('void writeEEPROM_24C_float(int devAddr, unsigned int memAddr, float val) {');
    lines.push('  byte* p = (byte*)(void*)&val;');
    lines.push('  for (int i = 0; i < 4; i++) writeEEPROM_24C_byte(devAddr, memAddr + i, p[i]);');
    lines.push('}');
    lines.push('');
    lines.push('float readEEPROM_24C_float(int devAddr, unsigned int memAddr) {');
    lines.push('  float val = 0.0f;');
    lines.push('  byte* p = (byte*)(void*)&val;');
    lines.push('  for (int i = 0; i < 4; i++) p[i] = readEEPROM_24C_byte(devAddr, memAddr + i);');
    lines.push('  return val;');
    lines.push('}');
  }
  lines.push('');

  // -------------------------------------------------------------
  // PLC TIMERS, COUNTERS, INTERNAL FLAGS
  // -------------------------------------------------------------
  lines.push('// --- PLC LÉTRA STRUKTÚRÁK ÉS ÁLLAPOTVÁLTOZÓK ---');
  lines.push('struct PLCTimer {');
  lines.push('  unsigned long startTime;');
  lines.push('  bool isTiming;');
  lines.push('  bool isDone;');
  lines.push('};');
  lines.push('');
  lines.push('struct PLCCounter {');
  lines.push('  int count;');
  lines.push('  bool isDone;');
  lines.push('  bool prevTrigger;');
  lines.push('};');
  lines.push('');

  timers.forEach((val, key) => {
    lines.push(`PLCTimer timer_${key} = {0, false, false};`);
    lines.push(`const unsigned long PRESET_${key} = ${val.preset}UL; // ms`);
  });

  counters.forEach((val, key) => {
    lines.push(`PLCCounter counter_${key} = {0, false, false};`);
    lines.push(`const int PRESET_CNT_${key} = ${val.preset};`);
  });

  internalFlags.forEach(flag => {
    lines.push(`bool ${flag} = false; // Belső segédrelé (Marker)`);
  });
  lines.push('unsigned long prevScanTime = 0;');
  lines.push('const unsigned long SCAN_CYCLE_MS = 20; // 50 Hz PLC ciklusidő\n');

  lines.push('// Élfigyelő előző állapotok');
  inputPins.forEach(p => {
    lines.push(`bool prev_${p} = false;`);
  });
  lines.push('');

  // -------------------------------------------------------------
  // I/O PORT EXPANDER (MCP23017 / PCF8574) DRIVERS
  // -------------------------------------------------------------
  if (usesExpander) {
    lines.push('// --- I/O PORT BŐVÍTŐ (MCP23017 / PCF8574) VEZÉRLŐK ---');
    if (usesMCP23017) {
      lines.push('#define MCP23017_ADDR 0x20');
      lines.push('#define MCP_IODIRA   0x00');
      lines.push('#define MCP_IODIRB   0x01');
      lines.push('#define MCP_GPPUA    0x0C');
      lines.push('#define MCP_GPPUB    0x0D');
      lines.push('#define MCP_GPIOA    0x12');
      lines.push('#define MCP_GPIOB    0x13');
      lines.push('#define MCP_OLATA    0x14');
      lines.push('#define MCP_OLATB    0x15');
      lines.push('uint8_t mcp23017_olat_a = 0x00;');
      lines.push('uint8_t mcp23017_olat_b = 0x00;');
      lines.push('void mcp23017_write_reg(uint8_t reg, uint8_t val) {');
      lines.push('  Wire.beginTransmission(MCP23017_ADDR);');
      lines.push('  Wire.write(reg);');
      lines.push('  Wire.write(val);');
      lines.push('  Wire.endTransmission();');
      lines.push('}');
      lines.push('uint8_t mcp23017_read_reg(uint8_t reg) {');
      lines.push('  Wire.beginTransmission(MCP23017_ADDR);');
      lines.push('  Wire.write(reg);');
      lines.push('  Wire.endTransmission();');
      lines.push('  Wire.requestFrom((uint8_t)MCP23017_ADDR, (uint8_t)1);');
      lines.push('  if (Wire.available()) return Wire.read();');
      lines.push('  return 0;');
      lines.push('}');
      lines.push('void mcp23017_digital_write(uint8_t pin_idx, bool val) {');
      lines.push('  if (pin_idx < 8) {');
      lines.push('    if (val) mcp23017_olat_a |= (1 << pin_idx);');
      lines.push('    else mcp23017_olat_a &= ~(1 << pin_idx);');
      lines.push('    mcp23017_write_reg(MCP_OLATA, mcp23017_olat_a);');
      lines.push('  } else {');
      lines.push('    uint8_t b_pin = pin_idx - 8;');
      lines.push('    if (val) mcp23017_olat_b |= (1 << b_pin);');
      lines.push('    else mcp23017_olat_b &= ~(1 << b_pin);');
      lines.push('    mcp23017_write_reg(MCP_OLATB, mcp23017_olat_b);');
      lines.push('  }');
      lines.push('}');
      lines.push('bool mcp23017_digital_read(uint8_t pin_idx) {');
      lines.push('  if (pin_idx < 8) {');
      lines.push('    uint8_t porta = mcp23017_read_reg(MCP_GPIOA);');
      lines.push('    return (porta & (1 << pin_idx)) != 0;');
      lines.push('  } else {');
      lines.push('    uint8_t portb = mcp23017_read_reg(MCP_GPIOB);');
      lines.push('    return (portb & (1 << (pin_idx - 8))) != 0;');
      lines.push('  }');
      lines.push('}\n');
    }
    if (usesPCF8574) {
      lines.push('#define PCF8574_ADDR  0x21');
      lines.push('uint8_t pcf8574_output_state = 0xFF;');
      lines.push('void pcf8574_write_port(uint8_t val) {');
      lines.push('  pcf8574_output_state = val;');
      lines.push('  Wire.beginTransmission(PCF8574_ADDR);');
      lines.push('  Wire.write(pcf8574_output_state);');
      lines.push('  Wire.endTransmission();');
      lines.push('}');
      lines.push('uint8_t pcf8574_read_port() {');
      lines.push('  Wire.requestFrom((uint8_t)PCF8574_ADDR, (uint8_t)1);');
      lines.push('  if (Wire.available()) return Wire.read();');
      lines.push('  return 0xFF;');
      lines.push('}');
      lines.push('void pcf8574_digital_write(uint8_t pin_idx, bool val) {');
      lines.push('  if (val) pcf8574_output_state |= (1 << pin_idx);');
      lines.push('  else pcf8574_output_state &= ~(1 << pin_idx);');
      lines.push('  pcf8574_write_port(pcf8574_output_state);');
      lines.push('}');
      lines.push('bool pcf8574_digital_read(uint8_t pin_idx) {');
      lines.push('  uint8_t val = pcf8574_read_port();');
      lines.push('  return (val & (1 << pin_idx)) != 0;');
      lines.push('}\n');
    }
  }

  // -------------------------------------------------------------
  // EEPROM RETENTIVE HANDLERS
  // -------------------------------------------------------------
  if (hasRetentive) {
    lines.push('// --- EEPROM NEM-FELEJTŐ MEMÓRIA KEZELÉS ---');
    lines.push('#define EEPROM_MAGIC 0x5A');
    lines.push('void saveRetentiveVariables() {');
    lines.push('  EEPROM.update(0, EEPROM_MAGIC);');
    lines.push('  int addr = 1;');
    variables.filter(v => v.isRetentive).forEach(v => {
      lines.push(`  EEPROM.put(addr, ${v.name}); addr += sizeof(${v.name});`);
    });
    lines.push('}');
    lines.push('void loadRetentiveVariables() {');
    lines.push('  if (EEPROM.read(0) == EEPROM_MAGIC) {');
    lines.push('    int addr = 1;');
    variables.filter(v => v.isRetentive).forEach(v => {
      lines.push(`    EEPROM.get(addr, ${v.name}); addr += sizeof(${v.name});`);
    });
    lines.push('  }');
    lines.push('}\n');
  }

  // -------------------------------------------------------------
  // HARDWARE SUPERVISOR (WATCHDOG & BROWN-OUT DETECTION)
  // -------------------------------------------------------------
  if (usesWatchdog || usesBrownout) {
    lines.push('// --- ATMEGA328P MCUSR RESET OK ÉS HARDVERES WATCHDOG VÉDELEM ---');
    lines.push('uint8_t mcusr_mirror __attribute__ ((section (".noinit")));');
    lines.push('void get_mcusr(void) __attribute__((naked)) __attribute__((section(".init3")));');
    lines.push('void get_mcusr(void) {');
    lines.push('  mcusr_mirror = MCUSR;');
    lines.push('  MCUSR = 0;');
    lines.push('  wdt_disable();');
    lines.push('}');
    lines.push('bool bod_power_fail_active = false;\n');
  }

  // -------------------------------------------------------------
  // INDUSTRIAL MODBUS RTU / RS485 COMMUNICATION ENGINE
  // -------------------------------------------------------------
  if (usesModbus) {
    const slaveId = protocols?.modbus?.slaveId || 1;
    const baud = protocols?.modbus?.baudRate || 19200;
    lines.push('// --- INDUSTRIAL MODBUS RTU / RS485 ENGINE ---');
    lines.push(`#define MODBUS_SLAVE_ID ${slaveId}`);
    lines.push(`#define PIN_RS485_DE ${rs485DePin}`);
    lines.push(`#define MODBUS_BAUD ${baud}`);
    lines.push('bool modbus_comm_healthy = true;');
    lines.push('unsigned long modbus_last_rx_millis = 0;');
    lines.push('');
    lines.push('// Standard Modbus RTU CRC-16 (Polinom: 0xA001)');
    lines.push('uint16_t modbus_calc_crc(const uint8_t *buf, uint8_t len) {');
    lines.push('  uint16_t crc = 0xFFFF;');
    lines.push('  for (uint8_t pos = 0; pos < len; pos++) {');
    lines.push('    crc ^= (uint16_t)buf[pos];');
    lines.push('    for (uint8_t i = 8; i != 0; i--) {');
    lines.push('      if ((crc & 0x0001) != 0) {');
    lines.push('        crc >>= 1;');
    lines.push('        crc ^= 0xA001;');
    lines.push('      } else {');
    lines.push('        crc >>= 1;');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }');
    lines.push('  return crc;');
    lines.push('}');
    lines.push('');
    lines.push('void modbus_set_tx_mode() {');
    lines.push('  digitalWrite(PIN_RS485_DE, HIGH);');
    lines.push('  delayMicroseconds(15);');
    lines.push('}');
    lines.push('');
    lines.push('void modbus_set_rx_mode() {');
    lines.push('  Serial.flush();');
    lines.push('  digitalWrite(PIN_RS485_DE, LOW);');
    lines.push('}');
    lines.push('');
    lines.push('// Modbus Master: FC03 Read Holding Register');
    lines.push('uint16_t modbus_master_read_holding(uint8_t slave, uint16_t reg) {');
    lines.push('  uint8_t frame[8];');
    lines.push('  frame[0] = slave;');
    lines.push('  frame[1] = 0x03;');
    lines.push('  frame[2] = (reg >> 8) & 0xFF;');
    lines.push('  frame[3] = reg & 0xFF;');
    lines.push('  frame[4] = 0x00;');
    lines.push('  frame[5] = 0x01;');
    lines.push('  uint16_t crc = modbus_calc_crc(frame, 6);');
    lines.push('  frame[6] = crc & 0xFF;');
    lines.push('  frame[7] = (crc >> 8) & 0xFF;');
    lines.push('  modbus_set_tx_mode();');
    lines.push('  Serial.write(frame, 8);');
    lines.push('  modbus_set_rx_mode();');
    lines.push('  return 0;');
    lines.push('}');
    lines.push('');
    lines.push('// Modbus Master: FC06 Write Single Register');
    lines.push('void modbus_master_write_holding(uint8_t slave, uint16_t reg, uint16_t val) {');
    lines.push('  uint8_t frame[8];');
    lines.push('  frame[0] = slave;');
    lines.push('  frame[1] = 0x06;');
    lines.push('  frame[2] = (reg >> 8) & 0xFF;');
    lines.push('  frame[3] = reg & 0xFF;');
    lines.push('  frame[4] = (val >> 8) & 0xFF;');
    lines.push('  frame[5] = val & 0xFF;');
    lines.push('  uint16_t crc = modbus_calc_crc(frame, 6);');
    lines.push('  frame[6] = crc & 0xFF;');
    lines.push('  frame[7] = (crc >> 8) & 0xFF;');
    lines.push('  modbus_set_tx_mode();');
    lines.push('  Serial.write(frame, 8);');
    lines.push('  modbus_set_rx_mode();');
    lines.push('}');
    lines.push('');
    lines.push('// Modbus Master: FC01 Read Coil');
    lines.push('bool modbus_master_read_coil(uint8_t slave, uint16_t coilAddr) {');
    lines.push('  uint8_t frame[8];');
    lines.push('  frame[0] = slave;');
    lines.push('  frame[1] = 0x01;');
    lines.push('  frame[2] = (coilAddr >> 8) & 0xFF;');
    lines.push('  frame[3] = coilAddr & 0xFF;');
    lines.push('  frame[4] = 0x00;');
    lines.push('  frame[5] = 0x01;');
    lines.push('  uint16_t crc = modbus_calc_crc(frame, 6);');
    lines.push('  frame[6] = crc & 0xFF;');
    lines.push('  frame[7] = (crc >> 8) & 0xFF;');
    lines.push('  modbus_set_tx_mode();');
    lines.push('  Serial.write(frame, 8);');
    lines.push('  modbus_set_rx_mode();');
    lines.push('  return false;');
    lines.push('}');
    lines.push('');
    lines.push('// Modbus Master: FC05 Write Single Coil');
    lines.push('void modbus_master_write_coil(uint8_t slave, uint16_t coilAddr, bool val) {');
    lines.push('  uint8_t frame[8];');
    lines.push('  frame[0] = slave;');
    lines.push('  frame[1] = 0x05;');
    lines.push('  frame[2] = (coilAddr >> 8) & 0xFF;');
    lines.push('  frame[3] = coilAddr & 0xFF;');
    lines.push('  frame[4] = val ? 0xFF : 0x00;');
    lines.push('  frame[5] = 0x00;');
    lines.push('  uint16_t crc = modbus_calc_crc(frame, 6);');
    lines.push('  frame[6] = crc & 0xFF;');
    lines.push('  frame[7] = (crc >> 8) & 0xFF;');
    lines.push('  modbus_set_tx_mode();');
    lines.push('  Serial.write(frame, 8);');
    lines.push('  modbus_set_rx_mode();');
    lines.push('}');
    lines.push('');
    lines.push('// Modbus Slave Poll: Kezeli a SCADA / HMI kéréseket');
    lines.push('void modbus_slave_poll() {');
    lines.push('  if (Serial.available() >= 8) {');
    lines.push('    uint8_t buf[32];');
    lines.push('    uint8_t len = 0;');
    lines.push('    while (Serial.available() && len < 32) {');
    lines.push('      buf[len++] = Serial.read();');
    lines.push('      delayMicroseconds(250);');
    lines.push('    }');
    lines.push('    if (len >= 8 && buf[0] == MODBUS_SLAVE_ID) {');
    lines.push('      uint16_t rxCrc = buf[len - 2] | (buf[len - 1] << 8);');
    lines.push('      uint16_t calcCrc = modbus_calc_crc(buf, len - 2);');
    lines.push('      if (rxCrc == calcCrc) {');
    lines.push('        modbus_comm_healthy = true;');
    lines.push('        modbus_last_rx_millis = millis();');
    lines.push('        uint8_t fc = buf[1];');
    lines.push('        if (fc == 3) {');
    lines.push('          // FC03: Read Holding Register response');
    lines.push('          uint8_t resp[7];');
    lines.push('          resp[0] = MODBUS_SLAVE_ID;');
    lines.push('          resp[1] = 0x03;');
    lines.push('          resp[2] = 2;');
    lines.push('          resp[3] = 0; resp[4] = 0;');
    lines.push('          uint16_t rCrc = modbus_calc_crc(resp, 5);');
    lines.push('          resp[5] = rCrc & 0xFF; resp[6] = (rCrc >> 8) & 0xFF;');
    lines.push('          modbus_set_tx_mode();');
    lines.push('          Serial.write(resp, 7);');
    lines.push('          modbus_set_rx_mode();');
    lines.push('        } else if (fc == 6) {');
    lines.push('          // FC06: Write Single Register echo response');
    lines.push('          modbus_set_tx_mode();');
    lines.push('          Serial.write(buf, 8);');
    lines.push('          modbus_set_rx_mode();');
    lines.push('        }');
    lines.push('      } else {');
    lines.push('        modbus_comm_healthy = false;');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }');
    lines.push('}\n');
  }

  // -------------------------------------------------------------
  // SUBROUTINES (LADDER FUNCTION BLOCKS)
  // -------------------------------------------------------------
  if (subroutines.length > 0) {
    lines.push('// ========================================================');
    lines.push('// EGYEDI ALPROGRAMOK (LADDER FUNCTION BLOCKS)');
    lines.push('// ========================================================');
    subroutines.forEach((sub) => {
      const funcName = sub.codeIdentifier || `FC_${sub.id}`;
      const paramsList: string[] = [];
      sub.inputs.forEach((p) => paramsList.push(`bool ${p.name}`));
      sub.outputs.forEach((p) => paramsList.push(`bool &${p.name}`));

      lines.push(`// Alprogram: ${sub.name}`);
      lines.push(`void ${funcName}(${paramsList.join(', ')}) {`);

      sub.rungs.forEach((r, rIdx) => {
        lines.push(`  // Alprogram fok #${rIdx}: ${r.comment || ''}`);
        const branchVars: string[] = [];
        r.branches.forEach((b, bIdx) => {
          const bVar = `sub_b_${rIdx}_${bIdx}`;
          branchVars.push(bVar);
          const conds: string[] = [];
          b.elements.forEach((el) => {
            const vName = el.variable || el.name;
            if (el.type === 'NO_CONTACT') {
              conds.push(vName);
            } else if (el.type === 'NC_CONTACT') {
              conds.push(`(!${vName})`);
            }
          });
          lines.push(`  bool ${bVar} = ${conds.length > 0 ? conds.join(' && ') : 'true'};`);
        });

        const rungCond = branchVars.length > 0 ? branchVars.join(' || ') : 'true';
        const rungPow = `sub_rung_${rIdx}_power`;
        lines.push(`  bool ${rungPow} = (${rungCond});`);

        r.coils.forEach((sc) => {
          const vName = sc.variable || sc.name;
          if (sc.type === 'COIL_NORMAL') {
            lines.push(`  ${vName} = ${rungPow};`);
          } else if (sc.type === 'COIL_SET') {
            lines.push(`  if (${rungPow}) ${vName} = true;`);
          } else if (sc.type === 'COIL_RESET') {
            lines.push(`  if (${rungPow}) ${vName} = false;`);
          }
        });
      });

      lines.push('}\n');
    });
  }


  // Helper to compile an FBD diagram into C++ statements for loop()
  function generateFBDLogicBlock(diagram: FBDDiagram, progName: string): string[] {
    const fbdLines: string[] = [];
    fbdLines.push(`  // --- FBD CIKLUS: ${progName} (Multi-pass bool hálózat kiértékelés) ---`);
    fbdLines.push('  {');

    const blocks = diagram.blocks;
    const connections = diagram.connections;

    // Helper to sanitize block IDs for variable names
    const sanitizeId = (id: string) => id.replace(/[^A-Za-z0-9_]/g, '_');

    // Declare all output variables
    blocks.forEach(block => {
      const sId = sanitizeId(block.id);
      if (block.type === 'INPUT' || block.type === 'AND' || block.type === 'OR' || block.type === 'XOR' || block.type === 'NOT') {
        fbdLines.push(`    bool fbd_out_${sId}_out = false;`);
      } else if (block.type === 'RS' || block.type === 'SR') {
        fbdLines.push(`    bool fbd_out_${sId}_Q = fbd_latch_${sId}; // Persisted latch state`);
      } else if (block.type === 'OUTPUT') {
        fbdLines.push(`    bool fbd_out_${sId}_in = false;`);
      }
    });

    fbdLines.push('    for (int _fbd_pass = 0; _fbd_pass < 10; _fbd_pass++) {');
    fbdLines.push('      bool _fbd_changed = false;');
    fbdLines.push('      bool _fbd_new_val = false;');

    blocks.forEach(block => {
      const sId = sanitizeId(block.id);
      const inConns = connections.filter(c => c.targetBlockId === block.id);

      const getInValCode = (pinName: string): string => {
        const conn = inConns.find(c => c.targetPin === pinName);
        if (!conn) return 'false';
        return `fbd_out_${sanitizeId(conn.sourceBlockId)}_${conn.sourcePin}`;
      };

      fbdLines.push(`      // Block: ${block.type} (${sId})`);
      if (block.type === 'INPUT') {
        const varName = block.properties?.variable;
        let readCode = 'false';
        if (varName) {
           if (varName.startsWith('D') && inputPins.has(varName)) {
             readCode = `in_${varName}`; // from initial loop scan
           } else {
             readCode = varName; // internal flag or global
           }
        }
        fbdLines.push(`      _fbd_new_val = ${readCode};`);
        fbdLines.push(`      if (fbd_out_${sId}_out != _fbd_new_val) { fbd_out_${sId}_out = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'AND') {
        fbdLines.push(`      _fbd_new_val = (${getInValCode('in1')} && ${getInValCode('in2')});`);
        fbdLines.push(`      if (fbd_out_${sId}_out != _fbd_new_val) { fbd_out_${sId}_out = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'OR') {
        fbdLines.push(`      _fbd_new_val = (${getInValCode('in1')} || ${getInValCode('in2')});`);
        fbdLines.push(`      if (fbd_out_${sId}_out != _fbd_new_val) { fbd_out_${sId}_out = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'XOR') {
        fbdLines.push(`      _fbd_new_val = (${getInValCode('in1')} != ${getInValCode('in2')});`);
        fbdLines.push(`      if (fbd_out_${sId}_out != _fbd_new_val) { fbd_out_${sId}_out = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'NOT') {
        fbdLines.push(`      _fbd_new_val = !(${getInValCode('in')});`);
        fbdLines.push(`      if (fbd_out_${sId}_out != _fbd_new_val) { fbd_out_${sId}_out = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'RS' || block.type === 'SR') {
        fbdLines.push(`      _fbd_new_val = fbd_out_${sId}_Q;`);
        if (block.type === 'RS') {
          fbdLines.push(`      if (${getInValCode('R')}) _fbd_new_val = false; else if (${getInValCode('S')}) _fbd_new_val = true;`);
        } else {
          fbdLines.push(`      if (${getInValCode('S')}) _fbd_new_val = true; else if (${getInValCode('R')}) _fbd_new_val = false;`);
        }
        fbdLines.push(`      if (fbd_out_${sId}_Q != _fbd_new_val) { fbd_out_${sId}_Q = _fbd_new_val; _fbd_changed = true; }`);
      }
      else if (block.type === 'OUTPUT') {
        fbdLines.push(`      _fbd_new_val = ${getInValCode('in')};`);
        fbdLines.push(`      if (fbd_out_${sId}_in != _fbd_new_val) { fbd_out_${sId}_in = _fbd_new_val; _fbd_changed = true; }`);
      }
      else {
        fbdLines.push(`      #error "Ismeretlen FBD blokk típus: ${block.type}"`);
      }
    });

    fbdLines.push('      if (!_fbd_changed) break;');
    fbdLines.push('    }');

    fbdLines.push('    // Apply outputs to global state');
    blocks.forEach(block => {
      const sId = sanitizeId(block.id);
      if (block.type === 'OUTPUT') {
        const varName = block.properties?.variable;
        if (varName) {
           fbdLines.push(`    ${varName} = fbd_out_${sId}_in;`);
           if (varName.startsWith('D') && outputPins.has(varName)) {
              fbdLines.push(`    digitalWrite(PIN_${varName}, ${varName} ? HIGH : LOW);`);
           }
        }
      } else if (block.type === 'RS' || block.type === 'SR') {
        fbdLines.push(`    fbd_latch_${sId} = fbd_out_${sId}_Q;`);
      }
    });

    fbdLines.push('  }');
    return fbdLines;
  }

  // Helper to compile a rung into C++ statements for setup() or loop()
  function generateRungLogicBlock(rung: Rung, rIdx: number, prefix: string, isSetup: boolean): string[] {
    const out: string[] = [];
    out.push(`  // --- ${prefix.toUpperCase()} RUNG #${rung.number}: ${rung.comment || 'Fok ' + rung.number} ---`);
    const branchVarNames: string[] = [];

    rung.branches.forEach((branch, bIdx) => {
      const bVar = `${prefix}rung_${rIdx}_b_${bIdx}`;
      branchVarNames.push(bVar);

      if (branch.elements.length === 0) {
        out.push(`  bool ${bVar} = true;`);
        return;
      }

      const conditions: string[] = [];

      branch.elements.forEach(el => {
        let cond = 'true';
        if (el.type === 'NO_CONTACT') {
          if (el.pin) {
            if (el.pin.startsWith('EXP_A')) {
              const pIdx = parseInt(el.pin.replace('EXP_A', ''), 10) || 0;
              cond = `(mcp23017_digital_read(${pIdx}))`;
            } else if (el.pin.startsWith('EXP_B')) {
              const pIdx = (parseInt(el.pin.replace('EXP_B', ''), 10) || 0) + 8;
              cond = `(mcp23017_digital_read(${pIdx}))`;
            } else if (el.pin.startsWith('PCF_P')) {
              const pIdx = parseInt(el.pin.replace('PCF_P', ''), 10) || 0;
              cond = `(pcf8574_digital_read(${pIdx}))`;
            } else {
              cond = isSetup ? `(!digitalRead(PIN_${el.pin}))` : `in_${el.pin}`;
            }
          } else if (el.variable) {
            if (timers.has(el.variable)) {
              cond = `timer_${el.variable}.isDone`;
            } else if (counters.has(el.variable)) {
              cond = `counter_${el.variable}.isDone`;
            } else {
              cond = `${el.variable}`;
            }
          }
        } else if (el.type === 'NC_CONTACT') {
          if (el.pin) {
            if (el.pin.startsWith('EXP_A')) {
              const pIdx = parseInt(el.pin.replace('EXP_A', ''), 10) || 0;
              cond = `(!mcp23017_digital_read(${pIdx}))`;
            } else if (el.pin.startsWith('EXP_B')) {
              const pIdx = (parseInt(el.pin.replace('EXP_B', ''), 10) || 0) + 8;
              cond = `(!mcp23017_digital_read(${pIdx}))`;
            } else if (el.pin.startsWith('PCF_P')) {
              const pIdx = parseInt(el.pin.replace('PCF_P', ''), 10) || 0;
              cond = `(!pcf8574_digital_read(${pIdx}))`;
            } else {
              cond = isSetup ? `(digitalRead(PIN_${el.pin}))` : `(!in_${el.pin})`;
            }
          } else if (el.variable) {
            if (timers.has(el.variable)) {
              cond = `(!timer_${el.variable}.isDone)`;
            } else if (counters.has(el.variable)) {
              cond = `(!counter_${el.variable}.isDone)`;
            } else {
              cond = `(!${el.variable})`;
            }
          }
        } else if (el.type === 'RISING_EDGE' && el.pin) {
          if (el.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(el.pin.replace('EXP_A', ''), 10) || 0;
            cond = `(mcp23017_digital_read(${pIdx}))`;
          } else if (el.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(el.pin.replace('EXP_B', ''), 10) || 0) + 8;
            cond = `(mcp23017_digital_read(${pIdx}))`;
          } else if (el.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(el.pin.replace('PCF_P', ''), 10) || 0;
            cond = `(pcf8574_digital_read(${pIdx}))`;
          } else {
            cond = isSetup ? `(!digitalRead(PIN_${el.pin}))` : `(in_${el.pin} && !prev_${el.pin})`;
          }
        } else if (el.type === 'FALLING_EDGE' && el.pin) {
          if (el.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(el.pin.replace('EXP_A', ''), 10) || 0;
            cond = `(!mcp23017_digital_read(${pIdx}))`;
          } else if (el.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(el.pin.replace('EXP_B', ''), 10) || 0) + 8;
            cond = `(!mcp23017_digital_read(${pIdx}))`;
          } else if (el.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(el.pin.replace('PCF_P', ''), 10) || 0;
            cond = `(!pcf8574_digital_read(${pIdx}))`;
          } else {
            cond = isSetup ? `(digitalRead(PIN_${el.pin}))` : `(!in_${el.pin} && prev_${el.pin})`;
          }
        } else if (el.type === 'ANALOG_CMP') {
          const varName = el.variable === 'DHT_TEMP' ? 'dht_temp' :
                         el.variable === 'DHT_HUM' ? 'dht_hum' :
                         el.variable ? el.variable : 'analogRead(A0)';
          cond = `(${varName} ${el.compareOp || '>'} ${el.compareValue || 0})`;
        } else if (el.type === 'VAR_CMP') {
          let operand = el.variable || el.targetVariable || 'V_TEMP_C';
          if (el.arrayName && el.arrayIndex !== undefined) {
            operand = `${el.arrayName}[${el.arrayIndex}]`;
          }
          cond = `(${operand} ${el.compareOp || '>'} ${el.compareValue || 0})`;
        } else if (el.type === 'INTERNAL_FLAG_CONTACT' && el.variable) {
          cond = `${el.variable}`;
        } else if (el.type === 'NRF24_AVAILABLE') {
          cond = '(radio.available())';
        } else if (el.type === 'EEPROM_24C_CHECK') {
          cond = `(checkEEPROM_24C_ready(${el.i2cAddress || '0x50'}))`;
        } else if (el.type === 'BUFFER_EMPTY') {
          const ptrVar = el.pointerVar || 'V_QUEUE_LEN';
          cond = `(${ptrVar} == 0)`;
        } else if (el.type === 'BUFFER_FULL') {
          const ptrVar = el.pointerVar || 'V_QUEUE_LEN';
          const maxCap = el.maxSize ?? 8;
          cond = `(${ptrVar} >= ${maxCap})`;
        } else if (el.type === 'RTC_TIME_RANGE') {
          const startM = (el.rtcStartHour ?? 8) * 60 + (el.rtcStartMin ?? 0);
          const endM = (el.rtcEndHour ?? 16) * 60 + (el.rtcEndMin ?? 30);
          const allowedDays = el.rtcDaysOfWeek || [1, 2, 3, 4, 5, 6, 7];
          const dowCheck = allowedDays.length === 7 ? 'true' : `(${allowedDays.map(d => `RTC_DOW == ${d}`).join(' || ')})`;
          if (startM <= endM) {
            cond = `(${dowCheck} && ((RTC_HOUR * 60 + RTC_MIN) >= ${startM} && (RTC_HOUR * 60 + RTC_MIN) <= ${endM}))`;
          } else {
            cond = `(${dowCheck} && ((RTC_HOUR * 60 + RTC_MIN) >= ${startM} || (RTC_HOUR * 60 + RTC_MIN) <= ${endM}))`;
          }
        } else if (el.type === 'RTC_TIME_CMP') {
          const cmpS = (el.rtcCompareHour ?? 18) * 3600 + (el.rtcCompareMin ?? 0) * 60 + (el.rtcCompareSec ?? 0);
          const op = el.compareOp || '>=';
          cond = `(((long)RTC_HOUR * 3600L + (long)RTC_MIN * 60L + (long)RTC_SEC) ${op} ${cmpS}L)`;
        } else if (el.type === 'RTC_CALENDAR_RANGE') {
          const startMD = (el.rtcStartMonth ?? 5) * 100 + (el.rtcStartDay ?? 1);
          const endMD = (el.rtcEndMonth ?? 9) * 100 + (el.rtcEndDay ?? 30);
          const yearCheck = el.rtcYearSpecific ? `(RTC_YEAR == ${el.rtcYearSpecific}) && ` : '';
          if (startMD <= endMD) {
            cond = `(${yearCheck}((RTC_MONTH * 100 + RTC_DAY) >= ${startMD} && (RTC_MONTH * 100 + RTC_DAY) <= ${endMD}))`;
          } else {
            cond = `(${yearCheck}((RTC_MONTH * 100 + RTC_DAY) >= ${startMD} || (RTC_MONTH * 100 + RTC_DAY) <= ${endMD}))`;
          }
        } else if (el.type === 'RTC_PULSE_TICK') {
          const interval = el.rtcPulseInterval || 'second';
          if (interval === 'second') cond = '(RTC_SEC != prev_rtc_sec)';
          else if (interval === 'minute') cond = '(RTC_MIN != prev_rtc_min)';
          else if (interval === 'hour') cond = '(RTC_HOUR != prev_rtc_hour)';
          else if (interval === 'midnight') cond = '(RTC_DAY != prev_rtc_day)';
          else cond = '(RTC_SEC != prev_rtc_sec)';
        } else if (el.type === 'MODBUS_STATUS') {
          cond = '(modbus_comm_healthy)';
        } else if (el.type === 'BOD_STATUS') {
          cond = '(!bod_power_fail_active)';
        }
        conditions.push(cond);
      });

      out.push(`  bool ${bVar} = ${conditions.join(' && ')};`);
    });

    const rungCondition = branchVarNames.length > 0 ? branchVarNames.join(' || ') : 'true';
    const rungPowerVar = `${prefix}rung_${rIdx}_power`;
    out.push(`  bool ${rungPowerVar} = (${rungCondition});`);

    // Execute Coils, Modules and Protocols
    rung.coils.forEach((coil, cIdx) => {
      if (coil.type === 'COIL_NORMAL') {
        if (coil.pin) {
          if (coil.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(coil.pin.replace('EXP_A', ''), 10) || 0;
            out.push(`  mcp23017_digital_write(${pIdx}, ${rungPowerVar});`);
          } else if (coil.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(coil.pin.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`  mcp23017_digital_write(${pIdx}, ${rungPowerVar});`);
          } else if (coil.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(coil.pin.replace('PCF_P', ''), 10) || 0;
            out.push(`  pcf8574_digital_write(${pIdx}, ${rungPowerVar});`);
          } else {
            out.push(`  digitalWrite(PIN_${coil.pin}, ${rungPowerVar} ? HIGH : LOW);`);
          }
        }
        if (coil.variable) {
          out.push(`  ${coil.variable} = ${rungPowerVar};`);
        }
      } else if (coil.type === 'COIL_INV') {
        if (coil.pin) {
          if (coil.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(coil.pin.replace('EXP_A', ''), 10) || 0;
            out.push(`  mcp23017_digital_write(${pIdx}, !${rungPowerVar});`);
          } else if (coil.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(coil.pin.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`  mcp23017_digital_write(${pIdx}, !${rungPowerVar});`);
          } else if (coil.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(coil.pin.replace('PCF_P', ''), 10) || 0;
            out.push(`  pcf8574_digital_write(${pIdx}, !${rungPowerVar});`);
          } else {
            out.push(`  digitalWrite(PIN_${coil.pin}, ${rungPowerVar} ? LOW : HIGH);`);
          }
        }
        if (coil.variable) {
          out.push(`  ${coil.variable} = !${rungPowerVar};`);
        }
      } else if (coil.type === 'COIL_SET') {
        if (coil.pin) {
          if (coil.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(coil.pin.replace('EXP_A', ''), 10) || 0;
            out.push(`  if (${rungPowerVar}) mcp23017_digital_write(${pIdx}, true);`);
          } else if (coil.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(coil.pin.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`  if (${rungPowerVar}) mcp23017_digital_write(${pIdx}, true);`);
          } else if (coil.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(coil.pin.replace('PCF_P', ''), 10) || 0;
            out.push(`  if (${rungPowerVar}) pcf8574_digital_write(${pIdx}, true);`);
          } else {
            out.push(`  if (${rungPowerVar}) digitalWrite(PIN_${coil.pin}, HIGH);`);
          }
        }
        if (coil.variable) {
          out.push(`  if (${rungPowerVar}) ${coil.variable} = true;`);
        }
      } else if (coil.type === 'COIL_RESET') {
        if (coil.pin) {
          if (coil.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(coil.pin.replace('EXP_A', ''), 10) || 0;
            out.push(`  if (${rungPowerVar}) mcp23017_digital_write(${pIdx}, false);`);
          } else if (coil.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(coil.pin.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`  if (${rungPowerVar}) mcp23017_digital_write(${pIdx}, false);`);
          } else if (coil.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(coil.pin.replace('PCF_P', ''), 10) || 0;
            out.push(`  if (${rungPowerVar}) pcf8574_digital_write(${pIdx}, false);`);
          } else {
            out.push(`  if (${rungPowerVar}) digitalWrite(PIN_${coil.pin}, LOW);`);
          }
        }
        if (coil.variable) {
          out.push(`  if (${rungPowerVar}) ${coil.variable} = false;`);
        }
      } else if (coil.type === 'INTERNAL_FLAG_COIL' && coil.variable) {
        out.push(`  ${coil.variable} = ${rungPowerVar};`);
      } else if (coil.type === 'TON' && coil.variable) {
        out.push(`  // TON Időzítő kiértékelés: ${coil.variable}`);
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    if (!timer_${coil.variable}.isTiming) {`);
        out.push(`      timer_${coil.variable}.startTime = currentMillis;`);
        out.push(`      timer_${coil.variable}.isTiming = true;`);
        out.push(`      timer_${coil.variable}.isDone = false;`);
        out.push(`    } else if ((unsigned long)(currentMillis - timer_${coil.variable}.startTime) >= PRESET_${coil.variable}) {`);
        out.push(`      timer_${coil.variable}.isDone = true;`);
        out.push(`    }`);
        out.push(`  } else {`);
        out.push(`    timer_${coil.variable}.isTiming = false;`);
        out.push(`    timer_${coil.variable}.isDone = false;`);
        out.push(`  }`);
      } else if (coil.type === 'CTU' && coil.variable) {
        out.push(`  // CTU Számláló kiértékelés: ${coil.variable}`);
        out.push(`  if (${rungPowerVar} && !counter_${coil.variable}.prevTrigger) {`);
        out.push(`    counter_${coil.variable}.count++;`);
        out.push(`    if (counter_${coil.variable}.count >= PRESET_CNT_${coil.variable}) {`);
        out.push(`      counter_${coil.variable}.isDone = true;`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  counter_${coil.variable}.prevTrigger = ${rungPowerVar};`);
      } else if (coil.type === 'CTD' && coil.variable) {
        out.push(`  // CTD Visszaszámláló kiértékelés: ${coil.variable}`);
        out.push(`  if (${rungPowerVar} && !counter_${coil.variable}.prevTrigger) {`);
        out.push(`    if (counter_${coil.variable}.count > 0) counter_${coil.variable}.count--;`);
        out.push(`    if (counter_${coil.variable}.count <= 0) {`);
        out.push(`      counter_${coil.variable}.isDone = true;`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  counter_${coil.variable}.prevTrigger = ${rungPowerVar};`);
      } else if (coil.type === 'SERVO_WRITE') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    plcServo.write(${coil.servoAngle || 90});`);
        out.push(`  }`);
      } else if (coil.type === 'LCD_PRINT') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    lcd.setCursor(0, ${coil.lcdRow || 0});`);
        let textVal = `"${coil.lcdText || 'HELLO ARDUINO'}"`;
        if (coil.variable) {
          textVal = `${coil.variable}`;
        }
        out.push(`    lcd.print(${textVal});`);
        out.push(`  }`);
      } else if (coil.type === 'NEOPIXEL_SET') {
        out.push(`  if (${rungPowerVar}) {`);
        const idx = coil.neoPixelLedIndex || 0;
        out.push(`    strip.setPixelColor(${idx}, strip.Color(0, 255, 0));`);
        out.push(`    strip.show();`);
        out.push(`  }`);
      } else if (coil.type === 'PWM_OUT' && coil.pin) {
        out.push(`  analogWrite(PIN_${coil.pin}, ${rungPowerVar} ? ${coil.pwmValue || 255} : 0);`);
      } else if (coil.type === 'MATH_EXPR' && coil.mathExpression) {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    ${coil.mathExpression};`);
        out.push(`  }`);
      } else if (coil.type === 'DALLAS_READ') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    dallasSensors.requestTemperatures();');
        const targetVar = coil.dallasTargetVar || coil.targetVariable || 'V_TEMP_C';
        out.push(`    ${targetVar} = dallasSensors.getTempCByIndex(0);`);
        out.push('  }');
      } else if (coil.type === 'I2C_WRITE') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    Wire.beginTransmission(${coil.i2cAddress || '0x27'});`);
        if (coil.i2cRegister) {
          out.push(`    Wire.write(${coil.i2cRegister});`);
        }
        out.push(`    Wire.write(${coil.i2cData || '0xFF'});`);
        out.push('    Wire.endTransmission();');
        out.push('  }');
      } else if (coil.type === 'I2C_READ') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    Wire.requestFrom(${coil.i2cAddress || '0x27'}, 1);`);
        out.push('    if (Wire.available()) {');
        const target = coil.targetVariable || 'V_STATUS_CODE';
        out.push(`      ${target} = Wire.read();`);
        out.push('    }');
        out.push('  }');
      } else if (coil.type === 'SPI_TRANSFER') {
        const csPin = coil.spiCsPin || 'PIN_SPI_CS';
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    digitalWrite(${csPin.startsWith('D') ? 'PIN_' + csPin : csPin}, LOW);`);
        const target = coil.targetVariable;
        if (target) {
          out.push(`    ${target} = SPI.transfer(${coil.spiDataToSend || '0x55'});`);
        } else {
          out.push(`    SPI.transfer(${coil.spiDataToSend || '0x55'});`);
        }
        out.push(`    digitalWrite(${csPin.startsWith('D') ? 'PIN_' + csPin : csPin}, HIGH);`);
        out.push('  }');
      } else if (coil.type === 'UART_PRINT') {
        out.push(`  if (${rungPowerVar}) {`);
        if (coil.variable) {
          out.push(`    Serial.print(F("${coil.variable}: "));`);
          out.push(`    Serial.println(${coil.variable});`);
        } else if (coil.uartMessage) {
          out.push(`    Serial.println(F("${coil.uartMessage}"));`);
        } else {
          out.push('    Serial.println(F("PLC RUNG TRIGGERED"));');
        }
        out.push('  }');
      } else if (coil.type === 'UART_READ') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    if (Serial.available()) {');
        const target = coil.targetVariable || 'V_STATUS_CODE';
        out.push(`      ${target} = Serial.read();`);
        out.push('    }');
        out.push('  }');
      } else if (coil.type === 'VAR_ASSIGN') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable;
        const expr = coil.assignExpression || '0';
        if (target) {
          out.push(`    ${target} = ${expr};`);
        }
        if (coil.arrayName && coil.arrayIndex !== undefined) {
          out.push(`    ${coil.arrayName}[${coil.arrayIndex}] = ${expr};`);
        }
        out.push('  }');
      } else if (coil.type === 'MOV') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const src = coil.sourceVariable || coil.assignExpression || coil.variable || '0';
        out.push(`    ${target} = ${src};`);
        out.push('  }');
      } else if (['COMB_AND', 'COMB_AND3', 'COMB_OR', 'COMB_OR3', 'COMB_XOR', 'COMB_NOT'].includes(coil.type)) {
        const resolveExpr = (vName?: string) => {
          if (!vName || vName.trim() === '') return 'false';
          const v = vName.trim();
          if (v.toLowerCase() === 'true' || v === '1') return 'true';
          if (v.toLowerCase() === 'false' || v === '0') return 'false';
          if (v.startsWith('D')) {
            return isSetup ? `(!digitalRead(PIN_${v}))` : `in_${v}`;
          }
          if (v.startsWith('EXP_A')) {
            const pIdx = parseInt(v.replace('EXP_A', ''), 10) || 0;
            return `(mcp23017_digital_read(${pIdx}))`;
          }
          if (v.startsWith('EXP_B')) {
            const pIdx = (parseInt(v.replace('EXP_B', ''), 10) || 0) + 8;
            return `(mcp23017_digital_read(${pIdx}))`;
          }
          if (v.startsWith('PCF_P')) {
            const pIdx = parseInt(v.replace('PCF_P', ''), 10) || 0;
            return `(pcf8574_digital_read(${pIdx}))`;
          }
          return v;
        };

        const in1 = resolveExpr(coil.sourceVariable);
        const in2 = resolveExpr(coil.operandB);
        const in3 = resolveExpr(coil.operandC);
        let expr = 'false';
        if (coil.type === 'COMB_AND') expr = `(${in1} && ${in2})`;
        else if (coil.type === 'COMB_AND3') expr = `(${in1} && ${in2} && ${in3})`;
        else if (coil.type === 'COMB_OR') expr = `(${in1} || ${in2})`;
        else if (coil.type === 'COMB_OR3') expr = `(${in1} || ${in2} || ${in3})`;
        else if (coil.type === 'COMB_XOR') expr = `(${in1} != ${in2})`;
        else if (coil.type === 'COMB_NOT') expr = `(!(${in1}))`;

        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable;
        if (target) {
          if (target.startsWith('D') && outputPins.has(target)) {
            out.push(`    digitalWrite(PIN_${target}, (${expr}) ? HIGH : LOW);`);
          } else if (target.startsWith('EXP_A')) {
            const pIdx = parseInt(target.replace('EXP_A', ''), 10) || 0;
            out.push(`    mcp23017_digital_write(${pIdx}, ${expr});`);
          } else if (target.startsWith('EXP_B')) {
            const pIdx = (parseInt(target.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`    mcp23017_digital_write(${pIdx}, ${expr});`);
          } else if (target.startsWith('PCF_P')) {
            const pIdx = parseInt(target.replace('PCF_P', ''), 10) || 0;
            out.push(`    pcf8574_digital_write(${pIdx}, ${expr});`);
          } else {
            out.push(`    ${target} = ${expr};`);
          }
        }
        if (coil.pin) {
          if (coil.pin.startsWith('EXP_A')) {
            const pIdx = parseInt(coil.pin.replace('EXP_A', ''), 10) || 0;
            out.push(`    mcp23017_digital_write(${pIdx}, ${expr});`);
          } else if (coil.pin.startsWith('EXP_B')) {
            const pIdx = (parseInt(coil.pin.replace('EXP_B', ''), 10) || 0) + 8;
            out.push(`    mcp23017_digital_write(${pIdx}, ${expr});`);
          } else if (coil.pin.startsWith('PCF_P')) {
            const pIdx = parseInt(coil.pin.replace('PCF_P', ''), 10) || 0;
            out.push(`    pcf8574_digital_write(${pIdx}, ${expr});`);
          } else {
            out.push(`    digitalWrite(PIN_${coil.pin}, (${expr}) ? HIGH : LOW);`);
          }
        }
        out.push('  }');
      } else if (coil.type === 'JMP') {
        const rawLabel = coil.labelName || 'LBL_SKIP';
        const safeLabel = rawLabel.replace(/[^A-Za-z0-9_]/g, '_');
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    goto ${safeLabel};`);
        out.push('  }');
      } else if (coil.type === 'LBL') {
        const rawLabel = coil.labelName || 'LBL_SKIP';
        const safeLabel = rawLabel.replace(/[^A-Za-z0-9_]/g, '_');
        out.push(`${safeLabel}:; // Ugrási célpont címke`);
      } else if (coil.type === 'WAND') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const a = coil.sourceVariable || coil.variable || '0';
        const b = coil.operandB || '0';
        out.push(`    ${target} = (uint16_t)(${a}) & (uint16_t)(${b});`);
        out.push('  }');
      } else if (coil.type === 'WOR') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const a = coil.sourceVariable || coil.variable || '0';
        const b = coil.operandB || '0';
        out.push(`    ${target} = (uint16_t)(${a}) | (uint16_t)(${b});`);
        out.push('  }');
      } else if (coil.type === 'WXOR') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const a = coil.sourceVariable || coil.variable || '0';
        const b = coil.operandB || '0';
        out.push(`    ${target} = (uint16_t)(${a}) ^ (uint16_t)(${b});`);
        out.push('  }');
      } else if (coil.type === 'WNOT') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const a = coil.sourceVariable || coil.variable || '0';
        out.push(`    ${target} = ~(uint16_t)(${a});`);
        out.push('  }');
      } else if (coil.type === 'SHL') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const val = coil.sourceVariable || coil.variable || '0';
        const n = coil.shiftCount ?? coil.operandB ?? 1;
        out.push(`    ${target} = (uint16_t)(${val}) << (${n});`);
        out.push('  }');
      } else if (coil.type === 'SHR') {
        out.push(`  if (${rungPowerVar}) {`);
        const target = coil.targetVariable || coil.variable || 'V_DEST';
        const val = coil.sourceVariable || coil.variable || '0';
        const n = coil.shiftCount ?? coil.operandB ?? 1;
        out.push(`    ${target} = (uint16_t)(${val}) >> (${n});`);
        out.push('  }');
      } else if (coil.type === 'SUBROUTINE_CALL' && coil.subroutineId) {
        const targetSub = subroutines.find((s) => s.id === coil.subroutineId);
        if (targetSub) {
          const funcName = targetSub.codeIdentifier || `FC_${targetSub.id}`;
          const argList: string[] = [];
          targetSub.inputs.forEach((inp) => {
            const b = coil.subroutineBindings?.[inp.name] || inp.defaultPinOrVar || 'D2';
            if (b.startsWith('D')) {
              argList.push(isSetup ? `(!digitalRead(PIN_${b}))` : `in_${b}`);
            } else {
              argList.push(b);
            }
          });

          const outVars: { name: string; target: string }[] = [];
          targetSub.outputs.forEach((outp) => {
            const b = coil.subroutineBindings?.[outp.name] || outp.defaultPinOrVar || 'D8';
            const tempVar = `${prefix}sub_out_${outp.name}`;
            outVars.push({ name: tempVar, target: b });
            argList.push(tempVar);
          });

          out.push(`  if (${rungPowerVar}) {`);
          outVars.forEach((ov) => out.push(`    bool ${ov.name} = false;`));
          out.push(`    ${funcName}(${argList.join(', ')});`);
          outVars.forEach((ov) => {
            if (ov.target.startsWith('D')) {
              out.push(`    digitalWrite(PIN_${ov.target}, ${ov.name} ? HIGH : LOW);`);
            } else {
              out.push(`    ${ov.target} = ${ov.name};`);
            }
          });
          out.push('  }');
        }
      } else if (coil.type === 'NRF24_TRANSMIT') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    radio.stopListening();');
        if (coil.variable) {
          out.push(`    radio.write(&${coil.variable}, sizeof(${coil.variable}));`);
        } else {
          const payload = coil.nrfPayload || 'PLC_DATA';
          out.push(`    char nrfMsg[] = "${payload}";`);
          out.push('    radio.write(&nrfMsg, sizeof(nrfMsg));');
        }
        out.push('    radio.startListening();');
        out.push('  }');
      } else if (coil.type === 'NRF24_RECEIVE') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    if (radio.available()) {');
        const target = coil.targetVariable || coil.variable;
        if (target) {
          out.push(`      radio.read(&${target}, sizeof(${target}));`);
        } else {
          out.push('      char rxTemp[32];');
          out.push('      radio.read(&rxTemp, sizeof(rxTemp));');
        }
        out.push('    }');
        out.push('  }');
      } else if (coil.type === 'NRF24_CONFIG') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    radio.setChannel(${coil.nrfChannel ?? 76});`);
        out.push('  }');
      } else if (coil.type === 'EEPROM_24C_WRITE') {
        out.push(`  if (${rungPowerVar}) {`);
        const addr = coil.eepromAddress || '0x0010';
        const i2cAddr = coil.i2cAddress || '0x50';
        const val = coil.variable ? coil.variable : (coil.eepromDataValue || '0');
        if (coil.eepromDataType === 'int') {
          out.push(`    writeEEPROM_24C_int(${i2cAddr}, ${addr}, (int)(${val}));`);
        } else if (coil.eepromDataType === 'float') {
          out.push(`    writeEEPROM_24C_float(${i2cAddr}, ${addr}, (float)(${val}));`);
        } else {
          out.push(`    writeEEPROM_24C_byte(${i2cAddr}, ${addr}, (byte)(${val}));`);
        }
        out.push('  }');
      } else if (coil.type === 'EEPROM_24C_READ') {
        out.push(`  if (${rungPowerVar}) {`);
        const addr = coil.eepromAddress || '0x0010';
        const i2cAddr = coil.i2cAddress || '0x50';
        const target = coil.targetVariable || coil.variable;
        if (target) {
          if (coil.eepromDataType === 'int') {
            out.push(`    ${target} = readEEPROM_24C_int(${i2cAddr}, ${addr});`);
          } else if (coil.eepromDataType === 'float') {
            out.push(`    ${target} = readEEPROM_24C_float(${i2cAddr}, ${addr});`);
          } else {
            out.push(`    ${target} = readEEPROM_24C_byte(${i2cAddr}, ${addr});`);
          }
        }
        out.push('  }');
      } else if (coil.type === 'EEPROM_24C_SAVE_RECIPE') {
        out.push(`  if (${rungPowerVar}) {`);
        const startAddr = coil.eepromAddress || '0x0080';
        const i2cAddr = coil.i2cAddress || '0x50';
        if (coil.arrayName) {
          out.push(`    for (unsigned int i = 0; i < sizeof(${coil.arrayName})/sizeof(${coil.arrayName}[0]); i++) {`);
          out.push(`      writeEEPROM_24C_float(${i2cAddr}, (${startAddr}) + (i * 4), (float)${coil.arrayName}[i]);`);
          out.push('    }');
        }
        out.push('  }');
      } else if (coil.type === 'EEPROM_24C_LOAD_RECIPE') {
        out.push(`  if (${rungPowerVar}) {`);
        const startAddr = coil.eepromAddress || '0x0080';
        const i2cAddr = coil.i2cAddress || '0x50';
        if (coil.arrayName) {
          out.push(`    for (unsigned int i = 0; i < sizeof(${coil.arrayName})/sizeof(${coil.arrayName}[0]); i++) {`);
          out.push(`      ${coil.arrayName}[i] = readEEPROM_24C_float(${i2cAddr}, (${startAddr}) + (i * 4));`);
          out.push('    }');
        }
        out.push('  }');
      } else if (coil.type === 'FIFO_PUSH') {
        const arrName = coil.arrayName || 'QUEUE_BUFFER';
        const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
        const maxCap = coil.maxSize ?? 8;
        const valToPush = coil.variable ? coil.variable : (coil.pushValue !== undefined && coil.pushValue !== '' ? coil.pushValue : '42.5');
        out.push(`  // FIFO PUSH művelet: ${arrName}`);
        out.push(`  static bool prev_fifo_push_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_fifo_push_${prefix}_${rIdx}_${cIdx}) {`);
        out.push(`    if (${ptrVar} < (int)(sizeof(${arrName}) / sizeof(${arrName}[0])) && ${ptrVar} < ${maxCap}) {`);
        out.push(`      ${arrName}[(int)${ptrVar}] = ${valToPush};`);
        out.push(`      ${ptrVar}++;`);
        out.push(`      Serial.print(F("[FIFO PUSH] Elem hozzáadva: ")); Serial.print(${valToPush}); Serial.print(F(" | Új méret: ")); Serial.println(${ptrVar});`);
        out.push(`    } else {`);
        out.push(`      Serial.println(F("[FIFO PUSH] HIBA: Sor megtelt (Overflow)!"));`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  prev_fifo_push_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'FIFO_POP') {
        const arrName = coil.arrayName || 'QUEUE_BUFFER';
        const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
        const target = coil.targetVariable || coil.variable;
        out.push(`  // FIFO POP művelet: ${arrName}`);
        out.push(`  static bool prev_fifo_pop_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_fifo_pop_${prefix}_${rIdx}_${cIdx}) {`);
        out.push(`    if (${ptrVar} > 0) {`);
        if (target) {
          out.push(`      ${target} = ${arrName}[0];`);
          out.push(`      Serial.print(F("[FIFO POP] Kiolvasva: ")); Serial.print(${target});`);
        } else {
          out.push(`      Serial.print(F("[FIFO POP] Kiolvasva: ")); Serial.print(${arrName}[0]);`);
        }
        out.push(`      for (unsigned int _i = 0; _i < sizeof(${arrName})/sizeof(${arrName}[0]) - 1; _i++) {`);
        out.push(`        ${arrName}[_i] = ${arrName}[_i + 1];`);
        out.push(`      }`);
        out.push(`      ${arrName}[sizeof(${arrName})/sizeof(${arrName}[0]) - 1] = 0;`);
        out.push(`      ${ptrVar}--;`);
        out.push(`      Serial.print(F(" | Megmaradt: ")); Serial.println(${ptrVar});`);
        out.push(`    } else {`);
        out.push(`      Serial.println(F("[FIFO POP] HIBA: Sor üres (Underflow)!"));`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  prev_fifo_pop_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'LIFO_PUSH') {
        const arrName = coil.arrayName || 'QUEUE_BUFFER';
        const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
        const maxCap = coil.maxSize ?? 8;
        const valToPush = coil.variable ? coil.variable : (coil.pushValue !== undefined && coil.pushValue !== '' ? coil.pushValue : '42.5');
        out.push(`  // LIFO PUSH művelet: ${arrName}`);
        out.push(`  static bool prev_lifo_push_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_lifo_push_${prefix}_${rIdx}_${cIdx}) {`);
        out.push(`    if (${ptrVar} < (int)(sizeof(${arrName}) / sizeof(${arrName}[0])) && ${ptrVar} < ${maxCap}) {`);
        out.push(`      ${arrName}[(int)${ptrVar}] = ${valToPush};`);
        out.push(`      ${ptrVar}++;`);
        out.push(`      Serial.print(F("[LIFO PUSH] Veremtetőre írva: ")); Serial.print(${valToPush}); Serial.print(F(" | Magasság: ")); Serial.println(${ptrVar});`);
        out.push(`    } else {`);
        out.push(`      Serial.println(F("[LIFO PUSH] HIBA: Verem megtelt (Overflow)!"));`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  prev_lifo_push_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'LIFO_POP') {
        const arrName = coil.arrayName || 'QUEUE_BUFFER';
        const ptrVar = coil.pointerVar || 'V_QUEUE_LEN';
        const target = coil.targetVariable || coil.variable;
        out.push(`  // LIFO POP művelet: ${arrName}`);
        out.push(`  static bool prev_lifo_pop_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_lifo_pop_${prefix}_${rIdx}_${cIdx}) {`);
        out.push(`    if (${ptrVar} > 0) {`);
        if (target) {
          out.push(`      ${target} = ${arrName}[(int)${ptrVar} - 1];`);
          out.push(`      Serial.print(F("[LIFO POP] Veremből kiolvasva: ")); Serial.print(${target});`);
        } else {
          out.push(`      Serial.print(F("[LIFO POP] Veremből kiolvasva: ")); Serial.print(${arrName}[(int)${ptrVar} - 1]);`);
        }
        out.push(`      ${arrName}[(int)${ptrVar} - 1] = 0;`);
        out.push(`      ${ptrVar}--;`);
        out.push(`      Serial.print(F(" | Megmaradt magasság: ")); Serial.println(${ptrVar});`);
        out.push(`    } else {`);
        out.push(`      Serial.println(F("[LIFO POP] HIBA: Verem üres (Underflow)!"));`);
        out.push(`    }`);
        out.push(`  }`);
        out.push(`  prev_lifo_pop_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'BLKMOV') {
        const srcName = coil.sourceArray || 'RECIPE_SETPOINTS';
        const dstName = coil.destArray || 'WORK_BUFFER';
        const srcOff = coil.sourceOffset ?? 0;
        const dstOff = coil.destOffset ?? 0;
        const len = coil.blockLength ?? 4;
        out.push(`  // BLKMOV Memóriablokk másolás: ${srcName} -> ${dstName}`);
        out.push(`  static bool prev_blkmov_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_blkmov_${prefix}_${rIdx}_${cIdx}) {`);
        out.push(`    const int _sOff = ${srcOff};`);
        out.push(`    const int _dOff = ${dstOff};`);
        out.push(`    const int _len = ${len};`);
        out.push(`    const int _sMax = sizeof(${srcName}) / sizeof(${srcName}[0]);`);
        out.push(`    const int _dMax = sizeof(${dstName}) / sizeof(${dstName}[0]);`);
        out.push(`    int _copied = 0;`);
        out.push(`    for (int _i = 0; _i < _len; _i++) {`);
        out.push(`      if ((_sOff + _i) < _sMax && (_dOff + _i) < _dMax) {`);
        out.push(`        ${dstName}[_dOff + _i] = ${srcName}[_sOff + _i];`);
        out.push(`        _copied++;`);
        out.push(`      }`);
        out.push(`    }`);
        out.push(`    Serial.print(F("[BLKMOV] Másolva ")); Serial.print(_copied); Serial.println(F(" elem."));`);
        out.push(`  }`);
        out.push(`  prev_blkmov_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'RTC_READ_TIME') {
        out.push(`  // RTC Kiolvasás változókba`);
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    DateTime _now = rtc.now();');
        const vH = coil.rtcVarHour || 'RTC_HOUR';
        const vM = coil.rtcVarMin || 'RTC_MIN';
        const vS = coil.rtcVarSec || 'RTC_SEC';
        const vY = coil.rtcVarYear || 'RTC_YEAR';
        const vMo = coil.rtcVarMonth || 'RTC_MONTH';
        const vD = coil.rtcVarDay || 'RTC_DAY';
        const vDow = coil.rtcVarDOW || 'RTC_DOW';
        out.push(`    ${vH} = _now.hour();`);
        out.push(`    ${vM} = _now.minute();`);
        out.push(`    ${vS} = _now.second();`);
        out.push(`    ${vY} = _now.year();`);
        out.push(`    ${vMo} = _now.month();`);
        out.push(`    ${vD} = _now.day();`);
        out.push(`    ${vDow} = _now.dayOfTheWeek();`);
        out.push('  }');
      } else if (coil.type === 'RTC_SET_TIME') {
        const sH = coil.rtcStartHour ?? 12;
        const sM = coil.rtcStartMin ?? 0;
        out.push(`  // RTC Óra/Perc közvetlen beállítása: ${sH}:${sM}`);
        out.push(`  static bool prev_rtc_set_${prefix}_${rIdx}_${cIdx} = false;`);
        out.push(`  if (${rungPowerVar} && !prev_rtc_set_${prefix}_${rIdx}_${cIdx}) {`);
        out.push('    DateTime _curr = rtc.now();');
        out.push(`    rtc.adjust(DateTime(_curr.year(), _curr.month(), _curr.day(), ${sH}, ${sM}, 0));`);
        out.push(`    RTC_HOUR = ${sH}; RTC_MIN = ${sM}; RTC_SEC = 0;`);
        out.push(`    Serial.println(F("[RTC SET] Új idő beállítva!"));`);
        out.push('  }');
        out.push(`  prev_rtc_set_${prefix}_${rIdx}_${cIdx} = ${rungPowerVar};`);
      } else if (coil.type === 'WDT_RESET') {
        out.push(`  if (${rungPowerVar}) {`);
        out.push('    wdt_reset(); // Hardware Watchdog periodikus törlése a létrafokból');
        out.push('  }');
      } else if (coil.type === 'MODBUS_WRITE_HOLDING') {
        const sId = coil.modbusSlaveId ?? 1;
        const reg = coil.modbusRegister ?? 0;
        const val = coil.modbusValueVar || coil.variable || (coil.compareValue !== undefined ? String(coil.compareValue) : '0');
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    modbus_master_write_holding(${sId}, ${reg}, (uint16_t)(${val}));`);
        out.push('  }');
      } else if (coil.type === 'MODBUS_WRITE_COIL') {
        const sId = coil.modbusSlaveId ?? 1;
        const reg = coil.modbusRegister ?? coil.modbusCoilIndex ?? 0;
        const val = coil.modbusValueVar || coil.variable || 'true';
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    modbus_master_write_coil(${sId}, ${reg}, bool(${val}));`);
        out.push('  }');
      } else if (coil.type === 'MODBUS_READ_HOLDING') {
        const sId = coil.modbusSlaveId ?? 1;
        const reg = coil.modbusRegister ?? 0;
        const tgt = coil.modbusTargetVar || coil.targetVariable || 'V_MB_IN';
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    ${tgt} = modbus_master_read_holding(${sId}, ${reg});`);
        out.push('  }');
      } else if (coil.type === 'MODBUS_READ_COIL') {
        const sId = coil.modbusSlaveId ?? 1;
        const reg = coil.modbusRegister ?? coil.modbusCoilIndex ?? 0;
        const tgt = coil.modbusTargetVar || coil.targetVariable || 'M0';
        out.push(`  if (${rungPowerVar}) {`);
        out.push(`    ${tgt} = modbus_master_read_coil(${sId}, ${reg});`);
        out.push('  }');
      } else if (coil.type === 'EXPANDER_READ_PIN') {
        const pin = coil.expanderPin || coil.pin || 'EXP_A0';
        const tgt = coil.expanderTargetVar || coil.targetVariable || 'V_EXP_IN';
        out.push(`  if (${rungPowerVar}) {`);
        if (pin.startsWith('EXP_A')) {
          const pIdx = parseInt(pin.replace('EXP_A', ''), 10) || 0;
          out.push(`    ${tgt} = mcp23017_digital_read(${pIdx});`);
        } else if (pin.startsWith('EXP_B')) {
          const pIdx = (parseInt(pin.replace('EXP_B', ''), 10) || 0) + 8;
          out.push(`    ${tgt} = mcp23017_digital_read(${pIdx});`);
        } else if (pin.startsWith('PCF_P')) {
          const pIdx = parseInt(pin.replace('PCF_P', ''), 10) || 0;
          out.push(`    ${tgt} = pcf8574_digital_read(${pIdx});`);
        }
        out.push('  }');
      } else if (coil.type === 'EXPANDER_WRITE_PIN') {
        const pin = coil.expanderPin || coil.pin || 'EXP_B0';
        if (pin.startsWith('EXP_A')) {
          const pIdx = parseInt(pin.replace('EXP_A', ''), 10) || 0;
          out.push(`  mcp23017_digital_write(${pIdx}, ${rungPowerVar});`);
        } else if (pin.startsWith('EXP_B')) {
          const pIdx = (parseInt(pin.replace('EXP_B', ''), 10) || 0) + 8;
          out.push(`  mcp23017_digital_write(${pIdx}, ${rungPowerVar});`);
        } else if (pin.startsWith('PCF_P')) {
          const pIdx = parseInt(pin.replace('PCF_P', ''), 10) || 0;
          out.push(`  pcf8574_digital_write(${pIdx}, ${rungPowerVar});`);
        }
      } else if (coil.type === 'EXPANDER_READ_PORT') {
        const port = coil.expanderPort || 'A';
        const tgt = coil.expanderTargetVar || coil.targetVariable || 'V_PORT_IN';
        out.push(`  if (${rungPowerVar}) {`);
        if (port === 'PORT') {
          out.push(`    ${tgt} = pcf8574_read_port();`);
        } else if (port === 'A') {
          out.push(`    ${tgt} = mcp23017_read_reg(MCP_GPIOA);`);
        } else {
          out.push(`    ${tgt} = mcp23017_read_reg(MCP_GPIOB);`);
        }
        out.push('  }');
      } else if (coil.type === 'EXPANDER_WRITE_PORT') {
        const port = coil.expanderPort || 'B';
        const val = coil.expanderValueVar || '0xFF';
        out.push(`  if (${rungPowerVar}) {`);
        if (port === 'PORT') {
          out.push(`    pcf8574_write_port((uint8_t)(${val}));`);
        } else if (port === 'A') {
          out.push(`    mcp23017_write_reg(MCP_OLATA, (uint8_t)(${val}));`);
        } else {
          out.push(`    mcp23017_write_reg(MCP_OLATB, (uint8_t)(${val}));`);
        }
        out.push('  }');
      }
    });

    out.push('');
    return out;
  }

  // -------------------------------------------------------------
  // HARDWARE & TIMER INTERRUPT SERVICE ROUTINES (ISR)
  // -------------------------------------------------------------
  if (interrupts) {
    lines.push('// ========================================================');
    lines.push('// HARDVER ÉS IDŐZÍTŐ MEGSZAKÍTÁS KEZELŐK (ISR)');
    lines.push('// ========================================================');

    if (interrupts.int0.enabled) {
      lines.push('// INT0 (Pin 2 / D2) Hardver Megszakítás Kiszolgáló Rutin');
      lines.push('void isr_INT0_handler() {');
      if (interrupts.int0.actionType === 'INCREMENT_VAR') {
        const target = interrupts.int0.targetVariable || 'V_ENCODER_TICKS';
        const step = interrupts.int0.incrementStep || 1;
        lines.push(`  ${target} += ${step};`);
      } else if (interrupts.int0.actionType === 'SET_FLAG') {
        const target = interrupts.int0.targetVariable || 'V_ESTOP_ACTIVE';
        lines.push(`  ${target} = true;`);
      } else if (interrupts.int0.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find(s => s.id === interrupts.int0.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}();` : '// Nincs alprogram kijelölve'}`);
      } else if (interrupts.int0.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.int0.customCppIsr || '// egyéni ISR kód'}`);
      }
      lines.push('}');
      lines.push('');
    }

    if (interrupts.int1.enabled) {
      lines.push('// INT1 (Pin 3 / D3) Hardver Megszakítás Kiszolgáló Rutin');
      lines.push('void isr_INT1_handler() {');
      if (interrupts.int1.actionType === 'INCREMENT_VAR') {
        const target = interrupts.int1.targetVariable || 'V_ENCODER_TICKS';
        const step = interrupts.int1.incrementStep || 1;
        lines.push(`  ${target} += ${step};`);
      } else if (interrupts.int1.actionType === 'SET_FLAG') {
        const target = interrupts.int1.targetVariable || 'V_ESTOP_ACTIVE';
        lines.push(`  ${target} = true;`);
      } else if (interrupts.int1.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find(s => s.id === interrupts.int1.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}();` : '// Nincs alprogram kijelölve'}`);
      } else if (interrupts.int1.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.int1.customCppIsr || '// egyéni ISR kód'}`);
      }
      lines.push('}');
      lines.push('');
    }

    if (interrupts.timer1.enabled) {
      lines.push('// Timer1 Időzítő Megszakítás Kiszolgáló Rutin (CTC OCR1A)');
      lines.push('ISR(TIMER1_COMPA_vect) {');
      if (interrupts.timer1.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find(s => s.id === interrupts.timer1.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}();` : '// Nincs alprogram kijelölve'}`);
      } else if (interrupts.timer1.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.timer1.customCppIsr || '// egyéni timer kód'}`);
      } else if (interrupts.timer1.actionType === 'INCREMENT_VAR') {
        const target = interrupts.timer1.targetVariable || 'V_BATCH_COUNT';
        lines.push(`  ${target}++;`);
      }
      lines.push('}');
      lines.push('');
    }
  }

  lines.push('// System Bits state variables');
  lines.push('static bool _sys_started = false;');
  lines.push('');

  // Define State Machine variables globally if missing
  if (stateMachines && stateMachines.length > 0) {
    lines.push('// --- State Machine Globals ---');
    stateMachines.forEach(sm => {
      const initState = sm.states.find(s => s.isInitial) || sm.states[0];
      const initStateName = initState ? `"${initState.id}"` : '""';
      if (!variables.some(v => v.name === `SM_${sm.id}_STATE`)) {
         lines.push(`String SM_${sm.id}_STATE = ${initStateName};`);
      }
      if (!variables.some(v => v.name === `SM_${sm.id}_ENTERED_AT`)) {
         lines.push(`unsigned long SM_${sm.id}_ENTERED_AT = 0;`);
      }
    });
    lines.push('');
  }

  // -------------------------------------------------------------
  // SETUP FUNCTION
  // -------------------------------------------------------------
  lines.push('void setup() {');
  
  // 1. UART Soros port konfigurálása és boot banner
  const baudRate = protocols?.uart?.baudRate || 115200;
  const serialConfig = protocols?.uart?.serialConfig || 'SERIAL_8N1';
  const uartTimeout = protocols?.uart?.timeoutMs ?? 100;
  lines.push(`  Serial.begin(${baudRate}, ${serialConfig});`);
  lines.push(`  Serial.setTimeout(${uartTimeout});`);
  if (protocols?.uart?.printBootBanner ?? true) {
    lines.push('  Serial.println(F("=================================================="));');
    lines.push('  Serial.println(F("[PLC SETUP] Arduino PLC Ladder Rendszer Indítása"));');
    lines.push(`  Serial.println(F("[PLC SETUP] Projekt: ${projectName}"));`);
    lines.push('  Serial.println(F("=================================================="));');
  } else {
    lines.push('  Serial.println(F("[PLC] Arduino PLC Ladder Studio indítása..."));');
  }
  lines.push('');

  // 2. Hardver I/O Lábak Alapállapotba Helyezése
  inputPins.forEach(p => {
    lines.push(`  pinMode(PIN_${p}, INPUT_PULLUP);`);
  });
  outputPins.forEach(p => {
    lines.push(`  pinMode(PIN_${p}, OUTPUT);`);
    lines.push(`  digitalWrite(PIN_${p}, LOW);`);
  });

  if (usesUltrasonic) {
    lines.push('  pinMode(PIN_TRIG, OUTPUT);');
    lines.push('  pinMode(PIN_ECHO, INPUT);');
  }

  if (hasRetentive) {
    lines.push('  loadRetentiveVariables(); // EEPROM visszaállítás');
  }

  // 3. Protokollok Alap Setup Beállításai
  if (usesDallas) {
    lines.push('  // --- DALLAS 1-WIRE SETUP ALAPBEÁLLÍTÁSOK ---');
    lines.push('  dallasSensors.begin();');
    const res = protocols?.dallas?.resolution || 12;
    lines.push(`  dallasSensors.setResolution(${res});`);
    const waitForConv = protocols?.dallas?.waitForConversion ?? true;
    lines.push(`  dallasSensors.setWaitForConversion(${waitForConv ? 'true' : 'false'});`);
    if (protocols?.dallas?.requestOnBoot ?? true) {
      lines.push('  dallasSensors.requestTemperatures(); // Indítási hőszenzor konverzió');
    }
    lines.push(`  Serial.println(F("[DALLAS] 1-Wire busz kész (${res}-bit felbontás)"));`);
  }

  if (usesI2C || usesLcd || usesRTC || uses24cEEPROM || usesExpander) {
    lines.push('  // --- I2C WIRE BUSZ SETUP ALAPBEÁLLÍTÁSOK ---');
    lines.push('  Wire.begin();');
    const clockKhz = protocols?.i2c?.clockSpeedKhz || 100;
    lines.push(`  Wire.setClock(${clockKhz * 1000}UL);`);
    const wireTimeout = protocols?.i2c?.timeoutMs ?? 3000;
    lines.push('  #if defined(WIRE_HAS_TIMEOUT)');
    lines.push(`  Wire.setWireTimeout(${wireTimeout * 1000}UL, true); // I2C busz deadlock recovery`);
    lines.push('  #endif');
    if (protocols?.i2c?.scanBusOnBoot ?? true) {
      lines.push('  Serial.println(F("[I2C] Busz eszközök pásztázása..."));');
      lines.push('  for (byte _a = 1; _a < 127; _a++) {');
      lines.push('    Wire.beginTransmission(_a);');
      lines.push('    if (Wire.endTransmission() == 0) {');
      lines.push('      Serial.print(F("[I2C] Eszköz észlelve: 0x"));');
      lines.push('      if (_a < 16) Serial.print(F("0"));');
      lines.push('      Serial.println(_a, HEX);');
      lines.push('    }');
      lines.push('  }');
    }
  }

  if (usesExpander) {
    lines.push('  // --- I/O PORT BŐVÍTŐK SETUP (MCP23017 / PCF8574) ---');
    if (usesMCP23017) {
      lines.push('  // MCP23017: Port A = Bemenetek belső 100k felhúzással, Port B = Kimenetek');
      lines.push('  mcp23017_write_reg(MCP_IODIRA, 0xFF); // Port A mind bemenet');
      lines.push('  mcp23017_write_reg(MCP_GPPUA,  0xFF); // Port A belső felhúzás bekapcsolva');
      lines.push('  mcp23017_write_reg(MCP_IODIRB, 0x00); // Port B mind kimenet');
      lines.push('  mcp23017_write_reg(MCP_OLATB,  0x00); // Port B törlés LOW');
      lines.push('  Serial.println(F("[EXPANDER] MCP23017 (0x20) 16-Bit I/O Bővítő inicializálva"));');
    }
    if (usesPCF8574) {
      lines.push('  // PCF8574 kvázi-kétirányú busz inicializálása');
      lines.push('  pcf8574_write_port(0xFF); // Minden láb HIGH (bemenetként olvasáshoz és nyitott kimenethez)');
      lines.push('  Serial.println(F("[EXPANDER] PCF8574 (0x21) 8-Bit I/O Bővítő inicializálva"));');
    }
  }

  if (usesSPI || usesSD || usesNRF24) {
    lines.push('  // --- SPI BUSZ SETUP ALAPBEÁLLÍTÁSOK ---');
    lines.push('  pinMode(PIN_SPI_CS, OUTPUT);');
    lines.push('  digitalWrite(PIN_SPI_CS, HIGH); // Fő SPI CS inaktiválás');
    if (usesSD) {
      lines.push('  pinMode(PIN_SD_CS, OUTPUT);');
      lines.push('  digitalWrite(PIN_SD_CS, HIGH); // SD CS inaktiválás');
    }
    if (protocols?.spi?.deselectCsPinsOnBoot ?? true) {
      protocols?.spi?.devices?.forEach(d => {
        if (d.csPin && d.csPin !== 'D10' && d.csPin.startsWith('D')) {
          const pNum = d.csPin.replace('D', '');
          lines.push(`  pinMode(${pNum}, OUTPUT); digitalWrite(${pNum}, HIGH); // CS inaktiválás: ${d.name}`);
        }
      });
    }
    lines.push('  SPI.begin();');
    const clkDiv = protocols?.spi?.clockDivider || 'SPI_CLOCK_DIV4';
    lines.push(`  SPI.setClockDivider(${clkDiv});`);
    const dataMode = protocols?.spi?.dataMode || 'SPI_MODE0';
    lines.push(`  SPI.setDataMode(${dataMode});`);
    const bitOrder = protocols?.spi?.bitOrder || 'MSBFIRST';
    lines.push(`  SPI.setBitOrder(${bitOrder});`);
  }

  if (usesNRF24) {
    lines.push('  // --- NRF24L01+ RÁDIÓ TRANSCEIVER SETUP ---');
    lines.push('  radio.begin();');
    const ch = protocols?.nrf24?.channel ?? 76;
    lines.push(`  radio.setChannel(${ch});`);
    const pa = protocols?.nrf24?.paLevel || 'RF24_PA_HIGH';
    lines.push(`  radio.setPALevel(${pa});`);
    const rate = protocols?.nrf24?.dataRate === '2MBPS' ? 'RF24_2MBPS' : protocols?.nrf24?.dataRate === '250KBPS' ? 'RF24_250KBPS' : 'RF24_1MBPS';
    lines.push(`  radio.setDataRate(${rate});`);
    if (protocols?.nrf24?.dynamicPayloads ?? true) {
      lines.push('  radio.enableDynamicPayloads();');
    }
    lines.push('  radio.openWritingPipe(nrfWritingPipe);');
    lines.push('  radio.openReadingPipe(1, nrfReadingPipe);');
    lines.push('  radio.startListening();');
    lines.push('  Serial.println(F("[NRF24] 2.4GHz RF Transceiver Ready"));');
  }

  if (uses24cEEPROM) {
    lines.push('  // --- 24Cxxx I2C EEPROM SETUP ---');
    lines.push('  Serial.println(F("[24Cxxx] External I2C EEPROM Ready"));');
  }

  if (usesRTC) {
    lines.push('  // --- KÜLSŐ RTC (REAL-TIME CLOCK) SETUP ---');
    lines.push('  if (!rtc.begin()) {');
    lines.push('    Serial.println(F("[RTC HIBA] Külső valós idejű óra nem található az I2C buszon (0x68)!"));');
    lines.push('  } else {');
    lines.push('    Serial.println(F("[RTC OK] Külső RTC észlelve!"));');
    if (protocols?.rtc?.autoSyncCompileTime ?? true) {
      lines.push('    if (rtc.lostPower()) {');
      lines.push('      Serial.println(F("[RTC] Tápellátás kimaradt, szinkronizálás a fordítási időre..."));');
      lines.push('      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));');
      lines.push('    }');
    }
    lines.push('    DateTime _now = rtc.now();');
    lines.push('    RTC_YEAR = _now.year();');
    lines.push('    RTC_MONTH = _now.month();');
    lines.push('    RTC_DAY = _now.day();');
    lines.push('    RTC_HOUR = _now.hour();');
    lines.push('    RTC_MIN = _now.minute();');
    lines.push('    RTC_SEC = _now.second();');
    lines.push('    RTC_DOW = _now.dayOfTheWeek();');
    lines.push('    Serial.print(F("[RTC IDŐ] Kezdő időbélyeg: "));');
    lines.push('    Serial.print(RTC_YEAR); Serial.print("-");');
    lines.push('    if (RTC_MONTH < 10) Serial.print("0"); Serial.print(RTC_MONTH); Serial.print("-");');
    lines.push('    if (RTC_DAY < 10) Serial.print("0"); Serial.print(RTC_DAY); Serial.print(" ");');
    lines.push('    if (RTC_HOUR < 10) Serial.print("0"); Serial.print(RTC_HOUR); Serial.print(":");');
    lines.push('    if (RTC_MIN < 10) Serial.print("0"); Serial.print(RTC_MIN); Serial.print(":");');
    lines.push('    if (RTC_SEC < 10) Serial.print("0"); Serial.println(RTC_SEC);');
    lines.push('  }');
  }

  if (usesSD) {
    lines.push('  // --- KÜLSŐ SD KÁRTYA DATALOGGER SETUP ---');
    lines.push('  pinMode(PIN_SD_CS, OUTPUT);');
    const logFileName = protocols?.sdCard?.logFileName || 'datalog.csv';
    const csvHeader = protocols?.sdCard?.csvHeaderColumns || 'TIMESTAMP_MS,YEAR,MONTH,DAY,HOUR,MIN,SEC,V_TEMP_C,V_FLOW_RATE,STATUS';
    lines.push(`  Serial.print(F("[SD SETUP] SD Kártya inicializálás CS lábon: ")); Serial.println(PIN_SD_CS);`);
    lines.push('  if (!SD.begin(PIN_SD_CS)) {');
    lines.push('    Serial.println(F("[SD HIBA] SD kártya csatolás meghiúsult! Ellenőrizd a CS lábat és a FAT32 kártyát."));');
    lines.push('    sdCardReady = false;');
    lines.push('  } else {');
    lines.push('    Serial.println(F("[SD OK] SD Kártya csatolva és készen áll!"));');
    lines.push('    sdCardReady = true;');
    if (protocols?.sdCard?.autoCreateCsvHeader ?? true) {
      lines.push(`    if (!SD.exists("${logFileName}")) {`);
      lines.push(`      dataLogFile = SD.open("${logFileName}", FILE_WRITE);`);
      lines.push('      if (dataLogFile) {');
      lines.push(`        dataLogFile.println(F("${csvHeader}"));`);
      lines.push('        dataLogFile.close();');
      lines.push(`        Serial.println(F("[SD SETUP] '${logFileName}' létrehozva, CSV fejléc kiírva."));`);
      lines.push('      }');
      lines.push('    } else {');
      lines.push(`      Serial.println(F("[SD SETUP] '${logFileName}' már létezik a kártyán, adatok hozzáfűzése."));`);
      lines.push('    }');
    }
    lines.push('  }');
  }

  if (usesWatchdog || usesBrownout) {
    lines.push('  // --- HARDVER FELÜGYELET & MCUSR REGISZTER KIÉRTÉKELÉS ---');
    lines.push('  if (mcusr_mirror & (1 << WDRF)) {');
    lines.push('    Serial.println(F("[RESET OK] WATCHDOG TIMEOUT újraindulás történt (WDRF=1)!"));');
    lines.push('  }');
    lines.push('  if (mcusr_mirror & (1 << BORF)) {');
    lines.push('    Serial.println(F("[RESET OK] BROWN-OUT tápfeszültség esés miatti újraindulás történt (BORF=1)!"));');
    lines.push('  }');
    lines.push('  if (mcusr_mirror & (1 << EXTRF)) {');
    lines.push('    Serial.println(F("[RESET OK] Külső fizikai Reset gomb lenyomás (EXTRF=1)."));');
    lines.push('  }');
    lines.push('  if (mcusr_mirror & (1 << PORF)) {');
    lines.push('    Serial.println(F("[RESET OK] Hideg bekapcsolási táp-reset (PORF=1)."));');
    lines.push('  }');
    const wdtTimeout = protocols?.supervisor?.watchdog?.timeout || '2S';
    const avrTimeoutConst = wdtTimeout === '15MS' ? 'WDTO_15MS' :
                            wdtTimeout === '30MS' ? 'WDTO_30MS' :
                            wdtTimeout === '60MS' ? 'WDTO_60MS' :
                            wdtTimeout === '120MS' ? 'WDTO_120MS' :
                            wdtTimeout === '250MS' ? 'WDTO_250MS' :
                            wdtTimeout === '500MS' ? 'WDTO_500MS' :
                            wdtTimeout === '1S' ? 'WDTO_1S' :
                            wdtTimeout === '4S' ? 'WDTO_4S' :
                            wdtTimeout === '8S' ? 'WDTO_8S' : 'WDTO_2S';
    if (usesWatchdog) {
      lines.push(`  wdt_enable(${avrTimeoutConst}); // Hardware Watchdog élesítve (${wdtTimeout})`);
      lines.push(`  Serial.println(F("[WATCHDOG] ATmega328P Watchdog engedélyezve (${wdtTimeout})"));`);
    }
  }

  if (usesModbus) {
    lines.push('  // --- RS485 MODBUS RTU SETUP ---');
    lines.push('  pinMode(PIN_RS485_DE, OUTPUT);');
    lines.push('  digitalWrite(PIN_RS485_DE, LOW); // Alapértelmezés: Vételi mód (RX)');
    lines.push(`  Serial.println(F("[MODBUS RTU] RS485 Slave #${protocols?.modbus?.slaveId || 1} készen áll @ ${protocols?.modbus?.baudRate || 19200} baud"));`);
  }

  // Peripherals inits
  if (usesServo) {
    lines.push(`  plcServo.attach(PIN_SERVO);`);
    lines.push(`  plcServo.write(0);`);
  }
  if (usesLcd) {
    lines.push('  lcd.init();');
    lines.push('  lcd.backlight();');
    lines.push('  lcd.clear();');
    lines.push('  lcd.setCursor(0, 0);');
    lines.push('  lcd.print("PLC RUNNING...");');
  }
  if (usesDht) {
    lines.push('  dht.begin();');
  }
  if (usesNeoPixel) {
    lines.push('  strip.begin();');
    lines.push('  strip.show();');
  }

  // Custom libraries setup
  activeLibs.forEach(lib => {
    if (lib.isCustom && lib.setupCode) {
      lines.push(`  // Egyéni könyvtár setup: ${lib.name}`);
      lines.push(`  ${lib.setupCode}`);
    }
  });

  // Setup rungs execution (run once at boot)
  if (setupRungs && setupRungs.length > 0) {
    lines.push('');
    lines.push('  // ========================================================');
    lines.push('  // LÉTRA SETUP SZAKASZ (EGYSZER LEFUTÓ INDÍTÁSI LÉTRÁK)');
    lines.push('  // ========================================================');
    lines.push('  unsigned long currentMillis = millis();');
    setupRungs.forEach((sRung, sIdx) => {
      lines.push(...generateRungLogicBlock(sRung, sIdx, 'setup_', true));
    });
  }

  // 6. Hardver és Időzítő Megszakítások Konfigurálása
  if (interrupts) {
    lines.push('');
    lines.push('  // ========================================================');
    lines.push('  // MEGSZAKÍTÁSOK CSATOLÁSA ÉS ENGEDÉLYEZÉSE (INTERRUPTS)');
    lines.push('  // ========================================================');
    if (interrupts.int0.enabled) {
      lines.push('  pinMode(2, INPUT_PULLUP);');
      lines.push(`  attachInterrupt(digitalPinToInterrupt(2), isr_INT0_handler, ${interrupts.int0.mode});`);
      lines.push('  Serial.println(F("[INTERRUPT] INT0 (D2) csatolva."));');
    }
    if (interrupts.int1.enabled) {
      lines.push('  pinMode(3, INPUT_PULLUP);');
      lines.push(`  attachInterrupt(digitalPinToInterrupt(3), isr_INT1_handler, ${interrupts.int1.mode});`);
      lines.push('  Serial.println(F("[INTERRUPT] INT1 (D3) csatolva."));');
    }
    if (interrupts.timer1.enabled) {
      lines.push(`  // Timer1 hardveres időzítő inicializálása (${interrupts.timer1.intervalMs} ms)`);
      lines.push('  noInterrupts();');
      lines.push('  TCCR1A = 0; TCCR1B = 0; TCNT1 = 0;');
      const ocr1a = Math.max(1, Math.round((interrupts.timer1.intervalMs * 250) - 1));
      lines.push(`  OCR1A = ${ocr1a}; // 16MHz / 64 prescaler -> 250kHz`);
      lines.push('  TCCR1B |= (1 << WGM12); // CTC mód');
      lines.push('  TCCR1B |= (1 << CS11) | (1 << CS10); // 64-es előosztó');
      lines.push('  TIMSK1 |= (1 << OCIE1A); // Timer1 Compare Match A engedélyezése');
      lines.push('  Serial.println(F("[INTERRUPT] Timer1 periodikus ISR aktív."));');
    }
    if (interrupts.globalInterruptsEnabled) {
      lines.push('  interrupts(); // Globális megszakítások engedélyezése');
    }
  }

  lines.push('  Serial.println(F("[PLC] Rendszer és protokollok készen állnak."));');
  lines.push('}\n');

  // -------------------------------------------------------------
  // LOOP FUNCTION
  // -------------------------------------------------------------
  lines.push('void loop() {');
  lines.push('  unsigned long currentMillis = millis();');
  lines.push('  if ((unsigned long)(currentMillis - prevScanTime) < SCAN_CYCLE_MS) return;');
  lines.push('  prevScanTime = currentMillis;\n');
  lines.push('  // Update System Bits (SM_)');
  lines.push('  SM_ALWAYS_ON = true;');
  lines.push('  SM_ALWAYS_OFF = false;');
  lines.push('  SM_FIRST_SCAN = !_sys_started;');
  lines.push('  _sys_started = true;');
  lines.push('  SM_1HZ = (currentMillis % 1000) >= 500;');
  lines.push('  SM_100MS = (currentMillis % 100) >= 50;');
  lines.push('  if (currentMillis - prevScanTime > 200) { SM_WATCHDOG = true; SM_FAULT = true; }');
  lines.push('  if (SM_FAULT_RESET) { SM_FAULT = false; SM_WATCHDOG = false; }');
  lines.push('');

  // RTC time periodic sync
  if (usesRTC) {
    const syncSec = protocols?.rtc?.syncIntervalSec || 1;
    lines.push(`  // RTC időszakos szinkronizáció (${syncSec * 1000} ms)`);
    lines.push(`  if ((unsigned long)(currentMillis - lastRtcSyncMillis) >= ${syncSec * 1000}UL) {`);
    lines.push('    DateTime _now = rtc.now();');
    lines.push('    RTC_YEAR = _now.year();');
    lines.push('    RTC_MONTH = _now.month();');
    lines.push('    RTC_DAY = _now.day();');
    lines.push('    RTC_HOUR = _now.hour();');
    lines.push('    RTC_MIN = _now.minute();');
    lines.push('    RTC_SEC = _now.second();');
    lines.push('    RTC_DOW = _now.dayOfTheWeek();');
    lines.push('    lastRtcSyncMillis = currentMillis;');
    lines.push('  }');
  }

  // SD card periodic logging
  if (usesSD) {
    const logInterval = protocols?.sdCard?.autoLogIntervalSec ?? 5;
    if (logInterval > 0) {
      const logFileName = protocols?.sdCard?.logFileName || 'datalog.csv';
      const logVars = protocols?.sdCard?.logVariables || ['RTC_HOUR', 'RTC_MIN', 'RTC_SEC', 'V_TEMP_C', 'V_FLOW_RATE'];
      lines.push(`  // SD kártya ciklikus folyamatadat mentés (${logInterval * 1000} ms)`);
      lines.push(`  if (sdCardReady && (unsigned long)(currentMillis - lastSdLogMillis) >= ${logInterval * 1000}UL) {`);
      lines.push(`    dataLogFile = SD.open("${logFileName}", FILE_WRITE);`);
      lines.push('    if (dataLogFile) {');
      lines.push('      dataLogFile.print(currentMillis); dataLogFile.print(\',\');');
      logVars.forEach((v, idx) => {
        const isLast = idx === logVars.length - 1;
        if (isLast) {
          lines.push(`      dataLogFile.println(${v});`);
        } else {
          lines.push(`      dataLogFile.print(${v}); dataLogFile.print(\',\');`);
        }
      });
      lines.push('      dataLogFile.close();');
      lines.push('      SD_LOG_COUNT++;');
      lines.push('    }');
      lines.push('    lastSdLogMillis = currentMillis;');
      lines.push('  }');
    }
  }

  // 1. Input Scan
  if (usesModbus) {
    lines.push('  // RS485 Modbus RTU Slave kérések ciklikus fogadása és megválaszolása');
    lines.push('  modbus_slave_poll();');
  }

  lines.push('  // --- 1. LÉPÉS: BEMENETEK BEOLVASÁSA (INPUT SCAN) ---');
  inputPins.forEach(p => {
    lines.push(`  bool in_${p} = !digitalRead(PIN_${p}); // Aktív magas logika`);
  });

  if (usesDht) {
    lines.push('  // DHT időszakos olvasás (2000 ms)');
    lines.push('  static unsigned long lastDhtRead = 0;');
    lines.push('  if ((unsigned long)(currentMillis - lastDhtRead) >= 2000UL) {');
    lines.push('    float t = dht.readTemperature();');
    lines.push('    float h = dht.readHumidity();');
    lines.push('    if (!isnan(t)) dht_temp = t;');
    lines.push('    if (!isnan(h)) dht_hum = h;');
    lines.push('    lastDhtRead = currentMillis;');
    lines.push('  }');
  }
  lines.push('');

  // State Machine Execution
  if (stateMachines && stateMachines.length > 0) {
    lines.push('  // --- SFC-LITE STATE MACHINES ---');
    stateMachines.forEach(sm => {
      lines.push(`  // Állapotgép: ${sm.name}`);
      const stateVar = `SM_${sm.id}_STATE`;
      const timeVar = `SM_${sm.id}_ENTERED_AT`;

      lines.push(`  if (${stateVar} == "") { ${stateVar} = "${sm.states.find(s => s.isInitial)?.id || sm.states[0]?.id}"; ${timeVar} = currentMillis; }`);

      sm.states.forEach((state, sIdx) => {
        const branchKw = sIdx === 0 ? 'if' : 'else if';
        lines.push(`  ${branchKw} (${stateVar} == "${state.id}") {`);

        // Find outgoing transitions
        const outTrans = sm.transitions.filter(t => t.fromStateId === state.id).sort((a,b) => a.priority - b.priority);

        if (outTrans.length > 0) {
          outTrans.forEach((trans, tIdx) => {
            const condBranchKw = tIdx === 0 ? 'if' : 'else if';
            let condStr = 'true';

            if (trans.condition && trans.condition.kind !== 'always') {
               // Translate condition AST
               if (trans.condition.kind === 'comparison') {
                  const rightVal = trans.condition.right === 1 ? 'true' : trans.condition.right === 0 ? 'false' : trans.condition.right;
                  condStr = `${trans.condition.left} ${trans.condition.operator} ${rightVal}`;
               } else if (trans.condition.kind === 'timeout') {
                  condStr = `(currentMillis - ${timeVar}) >= ${trans.condition.timeoutMs}`;
               } else {
                  throw new Error(`Nem támogatott állapotgép feltétel: ${trans.condition.kind}`);
               }
            }

            lines.push(`    ${condBranchKw} (${condStr}) {`);
            lines.push(`      ${stateVar} = "${trans.toStateId}";`);
            lines.push(`      ${timeVar} = currentMillis;`);
            lines.push(`    }`);
          });
        }

        lines.push(`  }`);
      });
      lines.push('');
    });
  }

  // 2. Logic Execution for Each Loop Rung
  lines.push('  // --- 2. LÉPÉS: LÉTRAFOKOK KIÉRTÉKELÉSE (LOOP CIKLIKUS SCAN) ---');
  executionPrograms.forEach((ep, pIdx) => {
    lines.push(`  // === TASK: ${ep.taskName} | LADDER PROGRAM: ${ep.progName} ===`);
    ep.rungs.forEach((rung, rIdx) => {
      lines.push(...generateRungLogicBlock(rung, rIdx, `loop_p${pIdx}_`, false));
    });
  });

  // 2.5 Logic Execution for FBD Diagrams
  if (fbdExecutionPrograms.length > 0) {
    lines.push('  // --- 2.5. LÉPÉS: FBD BLOKK HÁLÓZATOK KIÉRTÉKELÉSE ---');
    fbdExecutionPrograms.forEach(ep => {
      lines.push(...generateFBDLogicBlock(ep.fbd, ep.progName));
    });
  }

  // Failsafe Override
  if (outputPins.size > 0) {
    lines.push('  // --- FAILSAFE OVERRIDE ---');
    lines.push('  if (SM_FAULT) {');
    outputPins.forEach(p => {
      lines.push(`    digitalWrite(PIN_${p}, LOW); // Failsafe state override`);
    });
    lines.push('  }');
  }

  // Update previous states for edge detection
  lines.push('  // --- 3. LÉPÉS: ELŐZŐ ÁLLAPOTOK MENTÉSE ÉLFIGYELÉSHEZ ---');
  inputPins.forEach(p => {
    lines.push(`  prev_${p} = in_${p};`);
  });
  if (usesRTC) {
    lines.push('  prev_rtc_sec = RTC_SEC;');
    lines.push('  prev_rtc_min = RTC_MIN;');
    lines.push('  prev_rtc_hour = RTC_HOUR;');
    lines.push('  prev_rtc_day = RTC_DAY;');
  }

  if (usesWatchdog && (protocols?.supervisor?.watchdog?.autoResetEachScan ?? true)) {
    lines.push('  // --- HARDVER FELÜGYELET: WATCHDOG RESET SCAN VÉGÉN ---');
    lines.push('  wdt_reset(); // Scan sikeresen lefutott, Watchdog számláló nullázva');
  }

  lines.push('}');
  return lines.join('\n');
}
