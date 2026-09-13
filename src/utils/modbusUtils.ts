/**
 * Industrial Modbus RTU / RS485 Utilities
 * Standard CRC-16 calculation (Polynomial 0xA001), frame generation,
 * request parsing, and slave execution simulation.
 */

export interface ModbusCRCResult {
  crc: number;
  lo: number;
  hi: number;
  hex: string;
}

/**
 * Calculates standard Modbus RTU CRC-16 (Polynomial 0xA001, Init 0xFFFF)
 */
export function calculateModbusCRC(bytes: number[]): ModbusCRCResult {
  let crc = 0xFFFF;
  for (let pos = 0; pos < bytes.length; pos++) {
    crc ^= (bytes[pos] & 0xFF);
    for (let i = 8; i !== 0; i--) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  const lo = crc & 0xFF;
  const hi = (crc >> 8) & 0xFF;
  const hex = (lo.toString(16).padStart(2, '0') + hi.toString(16).padStart(2, '0')).toUpperCase();
  return { crc, lo, hi, hex };
}

/**
 * Verifies if the last 2 bytes of a frame match the expected Modbus CRC
 */
export function verifyModbusCRC(frame: number[]): boolean {
  if (frame.length < 4) return false;
  const dataBytes = frame.slice(0, frame.length - 2);
  const expectedCrc = calculateModbusCRC(dataBytes);
  return frame[frame.length - 2] === expectedCrc.lo && frame[frame.length - 1] === expectedCrc.hi;
}

/**
 * Formats a byte array into a hex string: "01 03 00 00 00 04 44 09"
 */
export function bytesToHexString(bytes: number[]): string {
  return bytes.map((b) => (b & 0xFF).toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/**
 * Converts a hex string (e.g. "01 03 00 00 00 04") to number array
 */
export function hexStringToBytes(hexStr: string): number[] {
  const clean = hexStr.replace(/[^0-9A-Fa-f]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Builds a standard Modbus RTU query frame with CRC-16 appended
 */
export function buildModbusQuery(
  slaveId: number,
  functionCode: number,
  address: number,
  countOrValue: number
): { frame: number[]; rawHex: string; crcHex: string } {
  const body = [
    slaveId & 0xFF,
    functionCode & 0xFF,
    (address >> 8) & 0xFF,
    address & 0xFF,
    (countOrValue >> 8) & 0xFF,
    countOrValue & 0xFF
  ];
  const { lo, hi, hex } = calculateModbusCRC(body);
  const frame = [...body, lo, hi];
  return {
    frame,
    rawHex: bytesToHexString(frame),
    crcHex: hex
  };
}

export function getModbusFunctionName(fn: number): string {
  switch (fn) {
    case 1: return 'Read Coils (01)';
    case 2: return 'Read Discrete Inputs (02)';
    case 3: return 'Read Holding Registers (03)';
    case 4: return 'Read Input Registers (04)';
    case 5: return 'Write Single Coil (05)';
    case 6: return 'Write Single Holding Register (06)';
    case 15: return 'Write Multiple Coils (15)';
    case 16: return 'Write Multiple Holding Registers (16)';
    default: return `Custom Function (0x${fn.toString(16).toUpperCase().padStart(2, '0')})`;
  }
}

export interface ModbusExecutionResult {
  rxLog: {
    id: string;
    timestamp: string;
    direction: 'RX';
    slaveId: number;
    functionCode: number;
    functionName: string;
    address: number;
    countOrValue: number;
    rawFrame: string;
    crcHex: string;
    crcOk: boolean;
    status: 'OK' | 'CRC_ERROR' | 'TIMEOUT' | 'EXCEPTION';
    detail: string;
  };
  txLog: {
    id: string;
    timestamp: string;
    direction: 'TX';
    slaveId: number;
    functionCode: number;
    functionName: string;
    address: number;
    countOrValue: number;
    rawFrame: string;
    crcHex: string;
    crcOk: boolean;
    status: 'OK' | 'CRC_ERROR' | 'TIMEOUT' | 'EXCEPTION';
    detail: string;
  };
  updatedDigitalOutputs?: Record<string, boolean>;
  updatedInternalFlags?: Record<string, boolean>;
  updatedVariableValues?: Record<string, number | boolean | string>;
}

/**
 * Simulates the execution of a Modbus query on the virtual PLC Slave
 */
export function executeModbusServerTransaction(params: {
  slaveId: number;
  functionCode: number;
  address: number;
  countOrValue: number;
  targetSlaveId: number; // The PLC's configured slave ID
  digitalOutputs: Record<string, boolean>;
  digitalInputs: Record<string, boolean>;
  analogInputs: Record<string, number>;
  internalFlags: Record<string, boolean>;
  variables: Record<string, number | boolean | string>;
  holdingMappings?: { address: number; target: string; description?: string }[];
  coilMappings?: { address: number; target: string; description?: string }[];
}): ModbusExecutionResult {
  const {
    slaveId,
    functionCode,
    address,
    countOrValue,
    targetSlaveId,
    digitalOutputs,
    digitalInputs,
    analogInputs,
    internalFlags,
    variables,
    holdingMappings = [],
    coilMappings = []
  } = params;

  const d = new Date();
  const timestamp = `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  const nowId = Date.now();

  // 1. Build Query Frame (RX)
  const query = buildModbusQuery(slaveId, functionCode, address, countOrValue);

  // If slave ID doesn't match and not broadcast (0), slave stays silent
  if (slaveId !== targetSlaveId && slaveId !== 0) {
    const rxLog: ModbusExecutionResult['rxLog'] = {
      id: `mb_rx_${nowId}`,
      timestamp,
      direction: 'RX',
      slaveId,
      functionCode,
      functionName: getModbusFunctionName(functionCode),
      address,
      countOrValue,
      rawFrame: query.rawHex,
      crcHex: query.crcHex,
      crcOk: true,
      status: 'TIMEOUT',
      detail: `Címzett Slave #${slaveId} nem egyezik a PLC saját címével (#${targetSlaveId}). Nincs válasz.`
    };
    const txLog: ModbusExecutionResult['txLog'] = {
      id: `mb_tx_${nowId + 1}`,
      timestamp,
      direction: 'TX',
      slaveId,
      functionCode,
      functionName: 'Nincs válasz (Cím eltérés)',
      address,
      countOrValue: 0,
      rawFrame: '--',
      crcHex: '--',
      crcOk: true,
      status: 'TIMEOUT',
      detail: 'RS485 DE=LOW (Vételi állapotban marad)'
    };
    return { rxLog, txLog };
  }

  let respBody: number[] = [slaveId, functionCode];
  let responseDetail = '';
  const updatedOutputs = { ...digitalOutputs };
  const updatedFlags = { ...internalFlags };
  const updatedVars = { ...variables };

  // Function 01: Read Coils
  if (functionCode === 1) {
    const count = Math.max(1, Math.min(countOrValue, 16));
    const byteCount = Math.ceil(count / 8);
    respBody.push(byteCount);
    let currentByte = 0;
    const bitValues: string[] = [];

    for (let i = 0; i < count; i++) {
      const regAddr = address + i;
      const map = coilMappings.find(m => m.address === regAddr);
      let bit = false;
      if (map) {
        if (updatedOutputs[map.target] !== undefined) bit = updatedOutputs[map.target];
        else if (updatedFlags[map.target] !== undefined) bit = updatedFlags[map.target];
      } else {
        const pinName = `D${8 + (regAddr % 6)}`;
        bit = !!updatedOutputs[pinName];
      }
      if (bit) currentByte |= (1 << (i % 8));
      bitValues.push(`${regAddr}:${bit ? '1' : '0'}`);
      if ((i + 1) % 8 === 0 || i === count - 1) {
        respBody.push(currentByte);
        currentByte = 0;
      }
    }
    responseDetail = `Tekercsek olvasva: [${bitValues.join(', ')}]`;
  }
  // Function 02: Read Discrete Inputs
  else if (functionCode === 2) {
    const count = Math.max(1, Math.min(countOrValue, 16));
    const byteCount = Math.ceil(count / 8);
    respBody.push(byteCount);
    let currentByte = 0;
    const bitValues: string[] = [];

    for (let i = 0; i < count; i++) {
      const pinName = `D${2 + ((address + i) % 6)}`;
      const bit = !!digitalInputs[pinName];
      if (bit) currentByte |= (1 << (i % 8));
      bitValues.push(`${pinName}:${bit ? '1' : '0'}`);
      if ((i + 1) % 8 === 0 || i === count - 1) {
        respBody.push(currentByte);
        currentByte = 0;
      }
    }
    responseDetail = `Digitális bemenetek: [${bitValues.join(', ')}]`;
  }
  // Function 03: Read Holding Registers
  else if (functionCode === 3) {
    const count = Math.max(1, Math.min(countOrValue, 16));
    respBody.push(count * 2);
    const regValues: string[] = [];

    for (let i = 0; i < count; i++) {
      const regAddr = address + i;
      const map = holdingMappings.find(m => m.address === regAddr);
      let numVal = 0;
      let varName = `HR_${regAddr}`;

      if (map) {
        varName = map.target;
        if (updatedVars[map.target] !== undefined) {
          const raw = updatedVars[map.target];
          numVal = typeof raw === 'number' ? (raw % 1 !== 0 ? Math.round(raw * 10) : Math.round(raw)) : (raw ? 1 : 0);
        }
      } else {
        // Fallback default registers
        if (regAddr === 0 && updatedVars['V_TEMP_C'] !== undefined) {
          numVal = Math.round(Number(updatedVars['V_TEMP_C']) * 10);
          varName = 'V_TEMP_C (x10)';
        } else if (regAddr === 1 && updatedVars['V_BATCH_COUNT'] !== undefined) {
          numVal = Number(updatedVars['V_BATCH_COUNT']);
          varName = 'V_BATCH_COUNT';
        } else if (regAddr === 2 && updatedVars['V_FLOW_RATE'] !== undefined) {
          numVal = Math.round(Number(updatedVars['V_FLOW_RATE']) * 10);
          varName = 'V_FLOW_RATE (x10)';
        } else if (regAddr === 3 && updatedVars['V_STATUS_CODE'] !== undefined) {
          numVal = Number(updatedVars['V_STATUS_CODE']);
          varName = 'V_STATUS_CODE';
        }
      }

      numVal = Math.max(0, Math.min(65535, numVal));
      respBody.push((numVal >> 8) & 0xFF);
      respBody.push(numVal & 0xFF);
      regValues.push(`[${regAddr}] ${varName}=${numVal}`);
    }
    responseDetail = `Tartó regiszterek: ${regValues.join(', ')}`;
  }
  // Function 04: Read Input Registers (Analog Inputs)
  else if (functionCode === 4) {
    const count = Math.max(1, Math.min(countOrValue, 8));
    respBody.push(count * 2);
    const regValues: string[] = [];

    for (let i = 0; i < count; i++) {
      const aPin = `A${(address + i) % 6}`;
      const rawVal = Math.round(analogInputs[aPin] ?? 512);
      respBody.push((rawVal >> 8) & 0xFF);
      respBody.push(rawVal & 0xFF);
      regValues.push(`${aPin}=${rawVal}`);
    }
    responseDetail = `Analóg bemenetek: ${regValues.join(', ')}`;
  }
  // Function 05: Write Single Coil
  else if (functionCode === 5) {
    const isTurnOn = countOrValue === 0xFF00 || countOrValue === 1;
    const map = coilMappings.find(m => m.address === address);
    let targetDesc = `Coil #${address}`;

    if (map) {
      targetDesc = `${map.target} (${map.description || 'Kimenet'})`;
      if (map.target.startsWith('D')) {
        updatedOutputs[map.target] = isTurnOn;
      } else if (map.target.startsWith('M')) {
        updatedFlags[map.target] = isTurnOn;
      }
    } else {
      const pinName = `D${8 + (address % 6)}`;
      updatedOutputs[pinName] = isTurnOn;
      targetDesc = pinName;
    }

    // Echo request as standard Modbus write confirmation
    respBody = [
      slaveId,
      functionCode,
      (address >> 8) & 0xFF,
      address & 0xFF,
      isTurnOn ? 0xFF : 0x00,
      0x00
    ];
    responseDetail = `Kimenet beállítva: ${targetDesc} -> ${isTurnOn ? 'BE (ON / 1)' : 'KI (OFF / 0)'}`;
  }
  // Function 06: Write Single Holding Register
  else if (functionCode === 6) {
    const regVal = countOrValue & 0xFFFF;
    const map = holdingMappings.find(m => m.address === address);
    let targetDesc = `HR #${address}`;

    if (map) {
      targetDesc = map.target;
      // If variable is a temperature or float representation
      if (map.target.includes('TEMP') || map.target.includes('FLOW')) {
        updatedVars[map.target] = regVal / 10;
      } else {
        updatedVars[map.target] = regVal;
      }
    } else {
      if (address === 0) {
        updatedVars['V_TEMP_C'] = regVal / 10;
        targetDesc = 'V_TEMP_C';
      } else if (address === 1) {
        updatedVars['V_BATCH_COUNT'] = regVal;
        targetDesc = 'V_BATCH_COUNT';
      } else if (address === 2) {
        updatedVars['V_FLOW_RATE'] = regVal / 10;
        targetDesc = 'V_FLOW_RATE';
      } else if (address === 3) {
        updatedVars['V_STATUS_CODE'] = regVal;
        targetDesc = 'V_STATUS_CODE';
      }
    }

    // Echo request
    respBody = [
      slaveId,
      functionCode,
      (address >> 8) & 0xFF,
      address & 0xFF,
      (regVal >> 8) & 0xFF,
      regVal & 0xFF
    ];
    responseDetail = `Regiszter felülírva: ${targetDesc} = ${regVal}`;
  }
  // Fallback for unsupported functions
  else {
    // Return Modbus Exception 0x01 (Illegal Function)
    respBody = [slaveId, functionCode | 0x80, 0x01];
    responseDetail = `Kivétel: Ismeretlen vagy nem támogatott funkciókód (0x${functionCode.toString(16)})`;
  }

  const { lo, hi, hex } = calculateModbusCRC(respBody);
  const fullResp = [...respBody, lo, hi];
  const respHex = bytesToHexString(fullResp);

  const rxLog: ModbusExecutionResult['rxLog'] = {
    id: `mb_rx_${nowId}`,
    timestamp,
    direction: 'RX',
    slaveId,
    functionCode,
    functionName: getModbusFunctionName(functionCode),
    address,
    countOrValue,
    rawFrame: query.rawHex,
    crcHex: query.crcHex,
    crcOk: true,
    status: 'OK',
    detail: `HMI/SCADA Kérés: ${getModbusFunctionName(functionCode)}, Cím: ${address}, Érték/Hossz: ${countOrValue}`
  };

  const txLog: ModbusExecutionResult['txLog'] = {
    id: `mb_tx_${nowId + 1}`,
    timestamp,
    direction: 'TX',
    slaveId,
    functionCode,
    functionName: `${getModbusFunctionName(functionCode)} Válasz`,
    address,
    countOrValue: fullResp.length,
    rawFrame: respHex,
    crcHex: hex,
    crcOk: true,
    status: 'OK',
    detail: `RS485 DE=HIGH -> TX -> DE=LOW | ${responseDetail}`
  };

  return {
    rxLog,
    txLog,
    updatedDigitalOutputs: updatedOutputs,
    updatedInternalFlags: updatedFlags,
    updatedVariableValues: updatedVars
  };
}

