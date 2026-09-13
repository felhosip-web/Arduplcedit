import { Rung, LadderElement, PLCVariable, PLCArray, ProtocolConfigs, ScanDiagnostics, SimulationState } from '../types';

export interface BoardProfile {
  id: string;
  name: string;
  mcu: string;
  clockMhz: number;
  sramTotalBytes: number;
  flashTotalBytes: number;
  eepromTotalBytes: number;
  adcResolutionBits: number;
  description: string;
}

export const TARGET_BOARDS: BoardProfile[] = [
  {
    id: 'uno',
    name: 'Arduino Uno R3',
    mcu: 'ATmega328P',
    clockMhz: 16,
    sramTotalBytes: 2048,
    flashTotalBytes: 32256,
    eepromTotalBytes: 1024,
    adcResolutionBits: 10,
    description: 'Klasszikus 8-bites AVR mikrovezérlő, 2 KB belső SRAM memóriával.'
  },
  {
    id: 'nano',
    name: 'Arduino Nano V3',
    mcu: 'ATmega328P',
    clockMhz: 16,
    sramTotalBytes: 2048,
    flashTotalBytes: 30720,
    eepromTotalBytes: 1024,
    adcResolutionBits: 10,
    description: 'Kompakt formátumú 8-bites kontroller, az Uno-val azonos architektúra.'
  },
  {
    id: 'mega',
    name: 'Arduino Mega 2560',
    mcu: 'ATmega2560',
    clockMhz: 16,
    sramTotalBytes: 8192,
    flashTotalBytes: 258048,
    eepromTotalBytes: 4096,
    adcResolutionBits: 10,
    description: 'Nagy kapacitású ipari vezérlő 8 KB SRAM-mal és 54 I/O csatornával.'
  },
  {
    id: 'esp32',
    name: 'ESP32 NodeMCU / DevKit',
    mcu: 'Xtensa Dual-Core LX6',
    clockMhz: 240,
    sramTotalBytes: 524288,
    flashTotalBytes: 4194304,
    eepromTotalBytes: 4096,
    adcResolutionBits: 12,
    description: 'Nagy sebességű 32-bites processzor Wi-Fi/BLE funkciókkal és hatalmas RAM-mal.'
  },
  {
    id: 'promini',
    name: 'Arduino Pro Mini (3.3V)',
    mcu: 'ATmega328P',
    clockMhz: 8,
    sramTotalBytes: 2048,
    flashTotalBytes: 30720,
    eepromTotalBytes: 1024,
    adcResolutionBits: 10,
    description: 'Alacsony fogyasztású 8 MHz-es kártya, felezett végrehajtási sebességgel.'
  }
];

export interface MemoryBreakdown {
  sramUsedBytes: number;
  sramTotalBytes: number;
  sramPercentage: number;
  flashUsedBytes: number;
  flashTotalBytes: number;
  flashPercentage: number;
  stackSafetyMarginBytes: number;
  items: {
    label: string;
    sramBytes: number;
    flashBytes: number;
    category: 'core' | 'variables' | 'arrays' | 'timers' | 'protocols' | 'code';
  }[];
}

export interface OptimizationTip {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  description: string;
  impact: string;
  actionableHint: string;
}

/**
 * Estimate execution time of a single ladder element in microseconds (µs)
 * on a standard 16 MHz ATmega328P.
 */
export function estimateElementExecutionUs(element: LadderElement, clockFactor = 1.0): number {
  let baseUs = 4.0; // default digital operation

  switch (element.type) {
    case 'NO_CONTACT':
    case 'NC_CONTACT':
      baseUs = element.pin ? 3.8 : 0.6; // digitalRead vs internal bit
      break;
    case 'RISING_EDGE':
    case 'FALLING_EDGE':
      baseUs = 4.5;
      break;
    case 'ANALOG_CMP':
      // analogRead takes 112µs (13 ADC clocks at 125kHz)
      baseUs = element.pin?.startsWith('A') ? 114.0 : 8.0;
      break;
    case 'VAR_CMP':
      baseUs = 6.5;
      break;
    case 'COIL_NORMAL':
    case 'COIL_INV':
    case 'COIL_SET':
    case 'COIL_RESET':
      baseUs = element.pin ? 4.2 : 0.8;
      break;
    case 'INTERNAL_FLAG_CONTACT':
    case 'INTERNAL_FLAG_COIL':
      baseUs = 0.6;
      break;
    case 'TON':
    case 'TOF':
    case 'TP':
      baseUs = 6.2; // millis() check + state struct update
      break;
    case 'CTU':
    case 'CTD':
      baseUs = 3.5;
      break;
    case 'PWM_OUT':
      baseUs = 8.5; // analogWrite timer compare reg write
      break;
    case 'SERVO_WRITE':
      baseUs = 12.0;
      break;
    case 'MATH_EXPR':
    case 'VAR_ASSIGN':
      baseUs = 18.0; // IEEE 754 software float math on 8-bit AVR
      break;
    case 'FIFO_PUSH':
    case 'FIFO_POP':
    case 'LIFO_PUSH':
    case 'LIFO_POP':
      baseUs = 24.0; // array shift or indexing
      break;
    case 'BLKMOV':
      baseUs = 45.0; // memcpy or loop copy
      break;
    case 'I2C_WRITE':
    case 'I2C_READ':
      baseUs = 240.0; // I2C bus transactions (100kHz standard mode)
      break;
    case 'SPI_TRANSFER':
      baseUs = 28.0;
      break;
    case 'UART_PRINT':
    case 'UART_READ':
      baseUs = 85.0; // Serial ring buffer insert
      break;
    case 'DALLAS_READ':
      baseUs = 450.0; // 1-Wire bit-banged communication
      break;
    case 'NRF24_TRANSMIT':
    case 'NRF24_RECEIVE':
      baseUs = 320.0; // SPI commands to radio FIFO
      break;
    case 'EEPROM_24C_WRITE':
    case 'EEPROM_24C_READ':
      baseUs = 380.0; // I2C Wire payload
      break;
    case 'RTC_READ_TIME':
      baseUs = 190.0; // I2C read 7 RTC registers
      break;
    case 'SD_LOG_WRITE':
      baseUs = 1800.0; // SPI sector write + file FAT update
      break;
    case 'LCD_PRINT':
      baseUs = 850.0; // I2C 4-bit nibble transfers to HD44780
      break;
    case 'SUBROUTINE_CALL':
      baseUs = 15.0;
      break;
    default:
      baseUs = 5.0;
  }

  // Adjust for clock speed (16MHz is 1.0 factor, 8MHz is 2.0x, 240MHz is 0.1x)
  return Math.round(baseUs * clockFactor * 10) / 10;
}

/**
 * Helper to get all ladder elements in a rung (from branches and coils).
 */
export function getRungAllElements(rung: Rung): LadderElement[] {
  const branchElems = rung.branches ? rung.branches.flatMap((b) => b.elements || []) : [];
  const coilElems = rung.coils || [];
  return [...branchElems, ...coilElems];
}

/**
 * Estimate execution time of a complete ladder rung in microseconds.
 */
export function estimateRungExecutionUs(rung: Rung, clockFactor = 1.0): number {
  let totalUs = 1.2; // rung overhead / scan logic

  if (rung.branches) {
    for (const b of rung.branches) {
      if (b.elements) {
        for (const el of b.elements) {
          totalUs += estimateElementExecutionUs(el, clockFactor);
        }
      }
    }
  }

  if (rung.coils) {
    for (const c of rung.coils) {
      totalUs += estimateElementExecutionUs(c, clockFactor);
    }
  }

  return Math.round(totalUs * 10) / 10;
}

/**
 * Calculate detailed memory usage for a selected hardware board profile.
 */
export function calculateMemoryUsage(
  rungs: Rung[],
  setupRungs: Rung[],
  variables: PLCVariable[],
  arrays: PLCArray[],
  protocols: ProtocolConfigs | undefined,
  board: BoardProfile
): MemoryBreakdown {
  const items: MemoryBreakdown['items'] = [];

  // 1. Arduino Core & Bootloader Runtime
  const coreSram = board.id === 'esp32' ? 32768 : 162;
  const coreFlash = board.id === 'esp32' ? 180000 : 1840;
  items.push({
    label: 'Arduino Core & C/C++ Runtime',
    sramBytes: coreSram,
    flashBytes: coreFlash,
    category: 'core'
  });

  // 2. Variables (Scalars)
  let varSram = 0;
  let varFlash = 0;
  variables.forEach((v) => {
    switch (v.type) {
      case 'float':
        varSram += 4;
        varFlash += 6;
        break;
      case 'int':
        varSram += 2;
        varFlash += 4;
        break;
      case 'bool':
        varSram += 1;
        varFlash += 2;
        break;
      case 'string':
        varSram += 32; // char array buffer
        varFlash += 36;
        break;
    }
  });
  // Internal flags M0..M15
  varSram += 2; // 16-bit word
  varFlash += 8;

  items.push({
    label: `PLC Változók és M0..M15 Jelzőbitek (${variables.length} db)`,
    sramBytes: varSram,
    flashBytes: varFlash,
    category: 'variables'
  });

  // 3. Array Buffers
  let arraySram = 0;
  let arrayFlash = 0;
  arrays.forEach((a) => {
    const bytesPerItem = a.elementType === 'float' ? 4 : a.elementType === 'int' ? 2 : 1;
    const arrayBytes = a.size * bytesPerItem;
    arraySram += arrayBytes;
    arrayFlash += arrayBytes + 16; // initializer data in flash
  });

  if (arrays.length > 0) {
    items.push({
      label: `Tömbök & FIFO/LIFO Pufferek (${arrays.length} db)`,
      sramBytes: arraySram,
      flashBytes: arrayFlash,
      category: 'arrays'
    });
  }

  // 4. Timer & Counter State Instances
  const allElements = [
    ...rungs.flatMap(getRungAllElements),
    ...setupRungs.flatMap(getRungAllElements)
  ];

  const timersCount = allElements.filter((e) => ['TON', 'TOF', 'TP'].includes(e.type)).length;
  const countersCount = allElements.filter((e) => ['CTU', 'CTD'].includes(e.type)).length;
  const timerSram = timersCount * 6 + countersCount * 4;
  const timerFlash = (timersCount + countersCount) * 48;

  if (timersCount + countersCount > 0) {
    items.push({
      label: `Időzítők és Számlálók (${timersCount} TON/TOF, ${countersCount} CTU)`,
      sramBytes: timerSram,
      flashBytes: timerFlash,
      category: 'timers'
    });
  }

  // 5. Industrial Protocol Drivers
  let protoSram = 0;
  let protoFlash = 0;

  if (protocols?.uart?.enabled) {
    protoSram += 128; // HardwareSerial RX/TX 64+64 ring buffers
    protoFlash += 780;
  }
  if (protocols?.i2c?.enabled || protocols?.rtc?.enabled || protocols?.eeprom24c?.enabled) {
    protoSram += 64; // TwoWire rx/tx 32+32 byte buffer
    protoFlash += 1350;
  }
  if (protocols?.spi?.enabled || protocols?.sdCard?.enabled || protocols?.nrf24?.enabled) {
    protoSram += 32;
    protoFlash += 420;
  }
  if (protocols?.rtc?.enabled) {
    protoSram += 48;
    protoFlash += 1250; // RTClib
  }
  if (protocols?.sdCard?.enabled) {
    protoSram += 540; // SD FAT32 sector buffer
    protoFlash += 8200; // SD library footprint
  }
  if (protocols?.nrf24?.enabled) {
    protoSram += 160;
    protoFlash += 3400; // RF24 library
  }
  if (protocols?.dallas?.enabled) {
    protoSram += 60;
    protoFlash += 1800; // OneWire + Dallas
  }

  items.push({
    label: 'Protokoll Driverek & Busz Pufferek',
    sramBytes: protoSram,
    flashBytes: protoFlash,
    category: 'protocols'
  });

  // 6. Compiled Ladder Logic C++ Code Footprint
  const totalRungCount = rungs.length + setupRungs.length;
  const totalElementCount = allElements.length;
  const codeFlash = totalRungCount * 42 + totalElementCount * 36;
  const codeSram = 18; // temporary local variables

  items.push({
    label: `Létra Logika Gépi Kód (${totalRungCount} létrafok, ${totalElementCount} elem)`,
    sramBytes: codeSram,
    flashBytes: codeFlash,
    category: 'code'
  });

  const totalSramUsed = items.reduce((acc, it) => acc + it.sramBytes, 0);
  const totalFlashUsed = items.reduce((acc, it) => acc + it.flashBytes, 0);

  const sramPercentage = Math.min(100, Math.round((totalSramUsed / board.sramTotalBytes) * 1000) / 10);
  const flashPercentage = Math.min(100, Math.round((totalFlashUsed / board.flashTotalBytes) * 1000) / 10);
  const stackSafetyMarginBytes = Math.max(0, board.sramTotalBytes - totalSramUsed);

  return {
    sramUsedBytes: totalSramUsed,
    sramTotalBytes: board.sramTotalBytes,
    sramPercentage,
    flashUsedBytes: totalFlashUsed,
    flashTotalBytes: board.flashTotalBytes,
    flashPercentage,
    stackSafetyMarginBytes,
    items
  };
}

/**
 * Generate actionable diagnostic rules and optimization tips
 */
export function analyzePerformanceAndOptimization(
  rungs: Rung[],
  diagnostics: ScanDiagnostics | undefined,
  memory: MemoryBreakdown,
  targetCycleMs: number
): OptimizationTip[] {
  const tips: OptimizationTip[] = [];

  // 1. Scan Time vs Target Cycle
  const avgScanMs = (diagnostics?.avgScanUs || 100) / 1000;
  const cpuLoad = diagnostics?.cpuLoadPercent || ((avgScanMs / targetCycleMs) * 100);

  if (cpuLoad > 85) {
    tips.push({
      id: 'cpu_critical',
      type: 'danger',
      title: 'Kritikus CPU Terhelés (> 85%)!',
      description: `A ciklusidő (${targetCycleMs} ms) nagy részét a logika végrehajtása köti le (${avgScanMs.toFixed(2)} ms). Ciklustúllépés vagy instabilitás kockázata áll fenn.`,
      impact: 'Késleltetett digitális I/O frissítés és jitter',
      actionableHint: 'Növelje a PLC ciklusidőt a szimulátorban, vagy a nehéz kommunikációs blokkokat (SD, I2C) csak fel-futó éllel (P) vagy időzített pulzussal indítsa el.'
    });
  } else if (cpuLoad > 50) {
    tips.push({
      id: 'cpu_moderate',
      type: 'warning',
      title: 'Közepes CPU Terhelés (50-85%)',
      description: `A rendszer stabil, de a számítási tartalék korlátozott (${cpuLoad.toFixed(1)}%).`,
      impact: 'Stabil működés, minimális tartalék',
      actionableHint: 'A nem kritikus analóg mérések és LCD frissítések ütemezését érdemes 100-200 ms-os intervallumokra korlátozni.'
    });
  } else {
    tips.push({
      id: 'cpu_optimal',
      type: 'success',
      title: 'Optimális CPU Időalap (< 50%)',
      description: `A PLC ciklusidő kevesebb mint ${cpuLoad.toFixed(1)}%-át foglalja le a létraprogram. Bőséges időtartalék áll rendelkezésre.`,
      impact: 'Garantált determinisztikus ciklusidő',
      actionableHint: 'A rendszer architektúrája optimális és megbízhatóan fut.'
    });
  }

  // 2. Memory Headroom
  if (memory.sramPercentage > 80) {
    tips.push({
      id: 'ram_critical',
      type: 'danger',
      title: 'Kritikus SRAM Memóriafoglaltság (> 80%)!',
      description: `Csak ${memory.stackSafetyMarginBytes} bájt szabad RAM maradt a hívási verem (call stack) és lokális változók számára.`,
      impact: 'Mikrokontroller fagyás vagy váratlan újraindulás stack-heap ütközés miatt',
      actionableHint: 'Csökkentse a globális tömbök (PLC Arrays) méretét, vagy váltson nagyobb memóriájú mikrokontrollerre (pl. Arduino Mega 2560 vagy ESP32).'
    });
  } else if (memory.sramPercentage > 60) {
    tips.push({
      id: 'ram_moderate',
      type: 'warning',
      title: 'Figyelem: Korlátozott Szabad RAM',
      description: `A rendelkezésre álló SRAM ${memory.sramPercentage}%-a foglalt. Szabad verem-biztonsági margó: ${memory.stackSafetyMarginBytes} bájt.`,
      impact: 'Korlátozott bővíthetőség további tömbök számára',
      actionableHint: 'Használjon egész számokat (int vagy byte) a lebegőpontos float tömbök helyett, ahol nincs szükség tört értékekre.'
    });
  }

  // 3. Scan Time Jitter
  if (diagnostics && diagnostics.maxScanUs > diagnostics.minScanUs * 3 && diagnostics.maxScanUs > 500) {
    tips.push({
      id: 'jitter_warning',
      type: 'warning',
      title: 'Magas Ciklusidő Szórás (Scan Jitter)',
      description: `A maximális végrehajtási idő (${(diagnostics.maxScanUs / 1000).toFixed(2)} ms) lényegesen meghaladja a minimálisat (${(diagnostics.minScanUs / 1000).toFixed(2)} ms).`,
      impact: 'Egyenetlen ciklusidő a ciklikus programban',
      actionableHint: 'Időigényes I/O műveletek (pl. SD írás vagy Dallas hőmérő kiolvasás) futnak bizonyos ciklusokban. Érdemes ezeket külön állapotgéppel szétosztani több ciklusra.'
    });
  }

  // 4. Heavy communication blocks inspection
  const allElements = rungs.flatMap(getRungAllElements);
  const sdWrites = allElements.filter((e) => e.type === 'SD_LOG_WRITE').length;
  const dallasReads = allElements.filter((e) => e.type === 'DALLAS_READ').length;

  if (sdWrites > 0) {
    tips.push({
      id: 'sd_advice',
      type: 'info',
      title: 'SD Datalogger Blokkok Észlelve',
      description: 'Az SD kártya írása (SPI blokkművelet) a legidőigényesebb utasítás a mikrokontrolleren (1.5 - 3.5 ms).',
      impact: 'Cikluskésleltetés minden íráskor',
      actionableHint: 'Győződjön meg róla, hogy az SD író tekercs előtt RISING_EDGE [P] vagy időzített trigger kontaktus van, így nem ír a kártyára minden egyes ciklusban.'
    });
  }

  if (dallasReads > 1) {
    tips.push({
      id: 'dallas_advice',
      type: 'info',
      title: 'Többszörös 1-Wire Dallas Mérés',
      description: 'Több Dallas DS18B20 mérés fut a létrában. A DS18B20 1-Wire lekérdezése blokkoló mikromásodperces késleltetéseket igényel.',
      impact: 'Növeli az átlagos ciklusidőt',
      actionableHint: 'Használjon aszinkron hőmérséklet-kiolvasást (RequestTemperatures és késleltetett olvasás).'
    });
  }

  return tips;
}
