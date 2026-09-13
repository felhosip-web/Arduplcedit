import {
  Rung,
  Subroutine,
  PLCVariable,
  ProtocolConfigs,
  InterruptsConfig,
  LadderElement
} from '../types';

export type BoardType = 'uno' | 'mega';

export type PinDirection = 'input' | 'output' | 'pwm_out' | 'analog_in' | 'bidirectional' | 'protocol' | 'power' | 'unassigned';

export interface BoardPinDefinition {
  id: string; // e.g. "D2", "A0", "5V", "GND"
  label: string; // e.g. "D2 (INT0)"
  header: 'digital_top' | 'analog_bottom' | 'power_bottom' | 'comm_mega' | 'double_digital_mega';
  headerIndex: number; // position inside the header
  group: 'digital' | 'analog' | 'power' | 'comm';
  isDigital: boolean;
  isAnalog: boolean;
  isPwm: boolean;
  isInterrupt: boolean;
  isCommunication: boolean;
  isPower: boolean;
  voltage: '5V' | '3.3V' | 'VIN' | 'GND' | 'IOREF' | 'AREF';
  defaultBusRole?: 'I2C_SDA' | 'I2C_SCL' | 'SPI_MOSI' | 'SPI_MISO' | 'SPI_SCK' | 'SPI_SS' | 'UART_RX' | 'UART_TX' | 'BUILTIN_LED';
  description: string;
}

export interface PinUsageEntry {
  id: string;
  sourceType: 'rung' | 'setup' | 'subroutine' | 'protocol' | 'interrupt' | 'variable';
  elementId?: string;
  elementName: string;
  elementType?: string;
  category?: string;
  direction: PinDirection;
  variableName?: string;
  locationLabel: string; // e.g. "Rung 1: Főmotor vezérlés" or "UART Protokoll"
  subroutineName?: string;
  details: string;
}

export interface PinConflict {
  pinId: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  conflictingUsages: PinUsageEntry[];
  suggestedPins: string[];
}

export interface PinStatusSummary {
  pin: BoardPinDefinition;
  usages: PinUsageEntry[];
  conflict?: PinConflict;
  status: 'free' | 'input' | 'output' | 'pwm' | 'analog' | 'protocol' | 'power' | 'conflict';
}

// -------------------------------------------------------------
// ARDUINO UNO R3 PIN SPECIFICATION
// -------------------------------------------------------------
export const ARDUINO_UNO_PINS: BoardPinDefinition[] = [
  // Top Digital Header (Right-to-Left or standard left-to-right)
  { id: 'SCL', label: 'SCL', header: 'digital_top', headerIndex: 0, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SCL', description: 'I2C Órajel (SCL, A5 belső párhuzam)' },
  { id: 'SDA', label: 'SDA', header: 'digital_top', headerIndex: 1, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SDA', description: 'I2C Adat (SDA, A4 belső párhuzam)' },
  { id: 'AREF', label: 'AREF', header: 'digital_top', headerIndex: 2, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'AREF', description: 'Analóg referencia feszültség' },
  { id: 'GND_TOP', label: 'GND', header: 'digital_top', headerIndex: 3, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés (Digitális GND)' },
  { id: 'D13', label: 'D13 (SCK/LED)', header: 'digital_top', headerIndex: 4, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'BUILTIN_LED', description: 'Digitális I/O 13, Beépített LED, SPI SCK' },
  { id: 'D12', label: 'D12 (MISO)', header: 'digital_top', headerIndex: 5, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'SPI_MISO', description: 'Digitális I/O 12, SPI MISO adatbemenet' },
  { id: 'D11', label: 'D11 (MOSI/~)', header: 'digital_top', headerIndex: 6, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'SPI_MOSI', description: 'Digitális I/O 11, PWM analóg kimenet, SPI MOSI' },
  { id: 'D10', label: 'D10 (SS/~)', header: 'digital_top', headerIndex: 7, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'SPI_SS', description: 'Digitális I/O 10, PWM analóg kimenet, SPI SS/CS' },
  { id: 'D9', label: 'D9 (~)', header: 'digital_top', headerIndex: 8, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 9, Hardveres PWM analóg kimenet' },
  { id: 'D8', label: 'D8', header: 'digital_top', headerIndex: 9, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 8' },
  { id: 'D7', label: 'D7', header: 'digital_top', headerIndex: 10, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 7' },
  { id: 'D6', label: 'D6 (~)', header: 'digital_top', headerIndex: 11, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 6, Hardveres PWM analóg kimenet' },
  { id: 'D5', label: 'D5 (~)', header: 'digital_top', headerIndex: 12, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 5, Hardveres PWM analóg kimenet' },
  { id: 'D4', label: 'D4', header: 'digital_top', headerIndex: 13, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 4' },
  { id: 'D3', label: 'D3 (INT1/~)', header: 'digital_top', headerIndex: 14, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: true, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 3, Külső megszakítás INT1, PWM' },
  { id: 'D2', label: 'D2 (INT0)', header: 'digital_top', headerIndex: 15, group: 'digital', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 2, Külső megszakítás INT0' },
  { id: 'D1', label: 'D1 (TX)', header: 'digital_top', headerIndex: 16, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'UART_TX', description: 'Digitális I/O 1, Soros UART Adatküldés (TX)' },
  { id: 'D0', label: 'D0 (RX)', header: 'digital_top', headerIndex: 17, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'UART_RX', description: 'Digitális I/O 0, Soros UART Adatfogadás (RX)' },

  // Bottom Power Header
  { id: 'IOREF', label: 'IOREF', header: 'power_bottom', headerIndex: 0, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'IOREF', description: 'I/O referencia feszültség (5V)' },
  { id: 'RESET', label: 'RESET', header: 'power_bottom', headerIndex: 1, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '5V', description: 'Mikrovezérlő újraindító láb (Aktív LOW)' },
  { id: '3V3', label: '3.3V', header: 'power_bottom', headerIndex: 2, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '3.3V', description: '3.3V Tápfeszültség kimenet (max. 150mA)' },
  { id: '5V', label: '5V', header: 'power_bottom', headerIndex: 3, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '5V', description: 'Fő 5V Szabályzott tápfeszültség sín' },
  { id: 'GND_1', label: 'GND', header: 'power_bottom', headerIndex: 4, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés (Táp GND)' },
  { id: 'GND_2', label: 'GND', header: 'power_bottom', headerIndex: 5, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés (Táp GND)' },
  { id: 'VIN', label: 'VIN', header: 'power_bottom', headerIndex: 6, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'VIN', description: 'Nyers külső egyenfeszültség bemenet (7-12V)' },

  // Bottom Analog Header
  { id: 'A0', label: 'A0', header: 'analog_bottom', headerIndex: 0, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A0 (10-bit ADC, vagy D14 I/O)' },
  { id: 'A1', label: 'A1', header: 'analog_bottom', headerIndex: 1, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A1 (10-bit ADC, vagy D15 I/O)' },
  { id: 'A2', label: 'A2', header: 'analog_bottom', headerIndex: 2, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A2 (10-bit ADC, vagy D16 I/O)' },
  { id: 'A3', label: 'A3', header: 'analog_bottom', headerIndex: 3, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A3 (10-bit ADC, vagy D17 I/O)' },
  { id: 'A4', label: 'A4 (SDA)', header: 'analog_bottom', headerIndex: 4, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SDA', description: 'Analóg bemenet A4 / I2C Busz Adatvonal (SDA)' },
  { id: 'A5', label: 'A5 (SCL)', header: 'analog_bottom', headerIndex: 5, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SCL', description: 'Analóg bemenet A5 / I2C Busz Órajel (SCL)' },
];

// -------------------------------------------------------------
// ARDUINO MEGA 2560 PIN SPECIFICATION
// -------------------------------------------------------------
export const ARDUINO_MEGA_PINS: BoardPinDefinition[] = [
  // Top Digital Header
  { id: 'SCL', label: 'SCL (D21)', header: 'digital_top', headerIndex: 0, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SCL', description: 'I2C SCL Órajel / INT0' },
  { id: 'SDA', label: 'SDA (D20)', header: 'digital_top', headerIndex: 1, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SDA', description: 'I2C SDA Adat / INT1' },
  { id: 'AREF', label: 'AREF', header: 'digital_top', headerIndex: 2, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'AREF', description: 'Analóg referencia feszültség' },
  { id: 'GND_TOP', label: 'GND', header: 'digital_top', headerIndex: 3, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés (Digitális GND)' },
  { id: 'D13', label: 'D13 (PWM/LED)', header: 'digital_top', headerIndex: 4, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', defaultBusRole: 'BUILTIN_LED', description: 'Digitális I/O 13, PWM, Beépített LED' },
  { id: 'D12', label: 'D12 (PWM)', header: 'digital_top', headerIndex: 5, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 12, PWM' },
  { id: 'D11', label: 'D11 (PWM)', header: 'digital_top', headerIndex: 6, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 11, PWM' },
  { id: 'D10', label: 'D10 (PWM)', header: 'digital_top', headerIndex: 7, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 10, PWM' },
  { id: 'D9', label: 'D9 (PWM)', header: 'digital_top', headerIndex: 8, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 9, PWM' },
  { id: 'D8', label: 'D8 (PWM)', header: 'digital_top', headerIndex: 9, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 8, PWM' },
  { id: 'D7', label: 'D7 (PWM)', header: 'digital_top', headerIndex: 10, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 7, PWM' },
  { id: 'D6', label: 'D6 (PWM)', header: 'digital_top', headerIndex: 11, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 6, PWM' },
  { id: 'D5', label: 'D5 (PWM)', header: 'digital_top', headerIndex: 12, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 5, PWM' },
  { id: 'D4', label: 'D4 (PWM)', header: 'digital_top', headerIndex: 13, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 4, PWM' },
  { id: 'D3', label: 'D3 (PWM/INT5)', header: 'digital_top', headerIndex: 14, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: true, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 3, PWM, Külső megszakítás INT5' },
  { id: 'D2', label: 'D2 (PWM/INT4)', header: 'digital_top', headerIndex: 15, group: 'digital', isDigital: true, isAnalog: false, isPwm: true, isInterrupt: true, isCommunication: false, isPower: false, voltage: '5V', description: 'Digitális I/O 2, PWM, Külső megszakítás INT4' },
  { id: 'D1', label: 'D1 (TX0)', header: 'digital_top', headerIndex: 16, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'UART_TX', description: 'Serial 0 Adás (TX0)' },
  { id: 'D0', label: 'D0 (RX0)', header: 'digital_top', headerIndex: 17, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'UART_RX', description: 'Serial 0 Vétel (RX0)' },

  // Communication Header (Serial 1-3 & I2C)
  { id: 'D14', label: 'D14 (TX3)', header: 'comm_mega', headerIndex: 0, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 3 Adás (TX3)' },
  { id: 'D15', label: 'D15 (RX3)', header: 'comm_mega', headerIndex: 1, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 3 Vétel (RX3)' },
  { id: 'D16', label: 'D16 (TX2)', header: 'comm_mega', headerIndex: 2, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 2 Adás (TX2)' },
  { id: 'D17', label: 'D17 (RX2)', header: 'comm_mega', headerIndex: 3, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 2 Vétel (RX2)' },
  { id: 'D18', label: 'D18 (TX1/INT3)', header: 'comm_mega', headerIndex: 4, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 1 Adás (TX1) / Megszakítás INT3' },
  { id: 'D19', label: 'D19 (RX1/INT2)', header: 'comm_mega', headerIndex: 5, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', description: 'Serial 1 Vétel (RX1) / Megszakítás INT2' },
  { id: 'D20', label: 'D20 (SDA/INT1)', header: 'comm_mega', headerIndex: 6, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SDA', description: 'I2C Adat (SDA) / Megszakítás INT1' },
  { id: 'D21', label: 'D21 (SCL/INT0)', header: 'comm_mega', headerIndex: 7, group: 'comm', isDigital: true, isAnalog: false, isPwm: false, isInterrupt: true, isCommunication: true, isPower: false, voltage: '5V', defaultBusRole: 'I2C_SCL', description: 'I2C Órajel (SCL) / Megszakítás INT0' },

  // Bottom Power Header
  { id: 'IOREF', label: 'IOREF', header: 'power_bottom', headerIndex: 0, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'IOREF', description: 'I/O referencia feszültség' },
  { id: 'RESET', label: 'RESET', header: 'power_bottom', headerIndex: 1, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '5V', description: 'Rendszer Reset (Aktív LOW)' },
  { id: '3V3', label: '3.3V', header: 'power_bottom', headerIndex: 2, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '3.3V', description: '3.3V Tápfeszültség sín' },
  { id: '5V', label: '5V', header: 'power_bottom', headerIndex: 3, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: '5V', description: '5V Szabályzott tápfeszültség sín' },
  { id: 'GND_1', label: 'GND', header: 'power_bottom', headerIndex: 4, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés' },
  { id: 'GND_2', label: 'GND', header: 'power_bottom', headerIndex: 5, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'GND', description: 'Földelés' },
  { id: 'VIN', label: 'VIN', header: 'power_bottom', headerIndex: 6, group: 'power', isDigital: false, isAnalog: false, isPwm: false, isInterrupt: false, isCommunication: false, isPower: true, voltage: 'VIN', description: 'Nyers külső tápfeszültség (7-12V)' },

  // Bottom Analog Header (A0 - A15)
  { id: 'A0', label: 'A0', header: 'analog_bottom', headerIndex: 0, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A0' },
  { id: 'A1', label: 'A1', header: 'analog_bottom', headerIndex: 1, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A1' },
  { id: 'A2', label: 'A2', header: 'analog_bottom', headerIndex: 2, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A2' },
  { id: 'A3', label: 'A3', header: 'analog_bottom', headerIndex: 3, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A3' },
  { id: 'A4', label: 'A4', header: 'analog_bottom', headerIndex: 4, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A4' },
  { id: 'A5', label: 'A5', header: 'analog_bottom', headerIndex: 5, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A5' },
  { id: 'A6', label: 'A6', header: 'analog_bottom', headerIndex: 6, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A6' },
  { id: 'A7', label: 'A7', header: 'analog_bottom', headerIndex: 7, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A7' },
  { id: 'A8', label: 'A8', header: 'analog_bottom', headerIndex: 8, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A8' },
  { id: 'A9', label: 'A9', header: 'analog_bottom', headerIndex: 9, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A9' },
  { id: 'A10', label: 'A10', header: 'analog_bottom', headerIndex: 10, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A10' },
  { id: 'A11', label: 'A11', header: 'analog_bottom', headerIndex: 11, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A11' },
  { id: 'A12', label: 'A12', header: 'analog_bottom', headerIndex: 12, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A12' },
  { id: 'A13', label: 'A13', header: 'analog_bottom', headerIndex: 13, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A13' },
  { id: 'A14', label: 'A14', header: 'analog_bottom', headerIndex: 14, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A14' },
  { id: 'A15', label: 'A15', header: 'analog_bottom', headerIndex: 15, group: 'analog', isDigital: true, isAnalog: true, isPwm: false, isInterrupt: false, isCommunication: false, isPower: false, voltage: '5V', description: 'Analóg bemenet A15' },

  // Digital Dual-Row Header (D22 - D53)
  // Even Row (outer edge): D22..D52
  ...[
    { pin: 'D22', pwm: false }, { pin: 'D24', pwm: false }, { pin: 'D26', pwm: false }, { pin: 'D28', pwm: false },
    { pin: 'D30', pwm: false }, { pin: 'D32', pwm: false }, { pin: 'D34', pwm: false }, { pin: 'D36', pwm: false },
    { pin: 'D38', pwm: false }, { pin: 'D40', pwm: false }, { pin: 'D42', pwm: false }, { pin: 'D44', pwm: true },
    { pin: 'D46', pwm: true }, { pin: 'D48', pwm: false }, { pin: 'D50', pwm: false, role: 'SPI_MISO' as const, label: 'D50 (MISO)' },
    { pin: 'D52', pwm: false, role: 'SPI_SCK' as const, label: 'D52 (SCK)' }
  ].map((item, idx) => ({
    id: item.pin,
    label: item.label || (item.pwm ? `${item.pin} (~)` : item.pin),
    header: 'double_digital_mega' as const,
    headerIndex: idx * 2,
    group: 'digital' as const,
    isDigital: true,
    isAnalog: false,
    isPwm: item.pwm,
    isInterrupt: false,
    isCommunication: !!item.role,
    isPower: false,
    voltage: '5V' as const,
    defaultBusRole: item.role,
    description: `Digitális I/O ${item.pin.replace('D', '')}${item.pwm ? ' (PWM)' : ''}${item.role ? ` / ${item.role}` : ''}`
  })),

  // Odd Row (inner edge): D23..D53
  ...[
    { pin: 'D23', pwm: false }, { pin: 'D25', pwm: false }, { pin: 'D27', pwm: false }, { pin: 'D29', pwm: false },
    { pin: 'D31', pwm: false }, { pin: 'D33', pwm: false }, { pin: 'D35', pwm: false }, { pin: 'D37', pwm: false },
    { pin: 'D39', pwm: false }, { pin: 'D41', pwm: false }, { pin: 'D43', pwm: false }, { pin: 'D45', pwm: true },
    { pin: 'D47', pwm: false }, { pin: 'D49', pwm: false }, { pin: 'D51', pwm: false, role: 'SPI_MOSI' as const, label: 'D51 (MOSI)' },
    { pin: 'D53', pwm: false, role: 'SPI_SS' as const, label: 'D53 (SS)' }
  ].map((item, idx) => ({
    id: item.pin,
    label: item.label || (item.pwm ? `${item.pin} (~)` : item.pin),
    header: 'double_digital_mega' as const,
    headerIndex: idx * 2 + 1,
    group: 'digital' as const,
    isDigital: true,
    isAnalog: false,
    isPwm: item.pwm,
    isInterrupt: false,
    isCommunication: !!item.role,
    isPower: false,
    voltage: '5V' as const,
    defaultBusRole: item.role,
    description: `Digitális I/O ${item.pin.replace('D', '')}${item.pwm ? ' (PWM)' : ''}${item.role ? ` / ${item.role}` : ''}`
  }))
];

// Helper to normalize pin naming (e.g. "2" -> "D2", "d2" -> "D2", "a0" -> "A0", "PIN_2" -> "D2")
export function normalizePin(pinStr?: string): string {
  if (!pinStr) return '';
  const clean = pinStr.trim().toUpperCase();
  if (clean.startsWith('PIN_')) {
    return normalizePin(clean.replace('PIN_', ''));
  }
  if (/^\d+$/.test(clean)) {
    return `D${clean}`;
  }
  return clean;
}

// -------------------------------------------------------------
// EXTRACT ALL PIN USAGES ACROSS LADDER RUNGS, PROTOCOLS & CONFIGS
// -------------------------------------------------------------
export function extractPinUsages(
  rungs: Rung[],
  setupRungs: Rung[] = [],
  subroutines: Subroutine[] = [],
  protocols?: ProtocolConfigs,
  interrupts?: InterruptsConfig,
  variables: PLCVariable[] = [],
  targetBoard: BoardType = 'uno'
): Map<string, PinUsageEntry[]> {
  const pinMap = new Map<string, PinUsageEntry[]>();

  const registerUsage = (pinRaw: string | undefined, usage: Omit<PinUsageEntry, 'id'>) => {
    if (!pinRaw) return;
    const pin = normalizePin(pinRaw);
    if (!pin) return;
    // Skip external port expander pins from Arduino board header (they have their own I2C address)
    if (pin.startsWith('EXP_') || pin.startsWith('PCF_')) return;

    const list = pinMap.get(pin) || [];
    list.push({
      ...usage,
      id: `${usage.sourceType}_${usage.elementId || Math.random().toString(36).substring(2, 7)}`
    });
    pinMap.set(pin, list);
  };

  const processElement = (
    el: LadderElement,
    sourceType: 'rung' | 'setup' | 'subroutine',
    locationLabel: string,
    subName?: string
  ) => {
    // Determine pin direction
    let dir: PinDirection = 'input';
    if (el.category === 'coil' || el.type.startsWith('COIL_')) {
      dir = 'output';
    } else if (el.type === 'PWM_OUT' || el.type === 'SERVO_WRITE') {
      dir = 'pwm_out';
    } else if (el.type === 'ANALOG_CMP') {
      dir = 'analog_in';
    } else if (el.type === 'DALLAS_READ' || el.type === 'DHT_READ') {
      dir = 'bidirectional';
    }

    // Main primary pin
    if (el.pin) {
      registerUsage(el.pin, {
        sourceType,
        elementId: el.id,
        elementName: el.name || el.type,
        elementType: el.type,
        category: el.category,
        direction: dir,
        variableName: el.variable || el.targetVariable,
        locationLabel,
        subroutineName: subName,
        details: `${el.name} (${el.type}) elem ${dir === 'input' ? 'bemenetként' : 'kimenetként'} vezérelve`
      });
    }

    // Secondary dedicated pins (Dallas, SPI CS, etc.)
    if (el.dallasPin && el.dallasPin !== el.pin) {
      registerUsage(el.dallasPin, {
        sourceType,
        elementId: el.id,
        elementName: el.name || 'DS18B20 1-Wire',
        elementType: 'DALLAS_READ',
        direction: 'bidirectional',
        variableName: el.dallasTargetVar || el.variable,
        locationLabel,
        subroutineName: subName,
        details: 'Dallas DS18B20 1-Wire digitális hőmérséklet buszvonal'
      });
    }

    if (el.spiCsPin && el.spiCsPin !== el.pin) {
      registerUsage(el.spiCsPin, {
        sourceType,
        elementId: el.id,
        elementName: el.name || 'SPI CS Láb',
        elementType: el.type,
        direction: 'output',
        locationLabel,
        subroutineName: subName,
        details: 'SPI Chip Select (CS) aktív eszköz kiválasztó láb'
      });
    }
  };

  // 1. Scan Main Rungs
  rungs.forEach((rung, rIdx) => {
    const loc = `Rung #${rIdx + 1}${rung.comment ? `: ${rung.comment}` : ''}`;
    (rung.branches || []).forEach(branch => {
      (branch.elements || []).forEach(el => processElement(el, 'rung', loc));
    });
    (rung.coils || []).forEach(el => processElement(el, 'rung', loc));
  });

  // 2. Scan Setup Rungs
  setupRungs.forEach((rung, rIdx) => {
    const loc = `Setup Rung #${rIdx + 1}${rung.comment ? `: ${rung.comment}` : ''}`;
    (rung.branches || []).forEach(branch => {
      (branch.elements || []).forEach(el => processElement(el, 'setup', loc));
    });
    (rung.coils || []).forEach(el => processElement(el, 'setup', loc));
  });

  // 3. Scan Subroutines
  subroutines.forEach(sub => {
    (sub.rungs || []).forEach((rung, rIdx) => {
      const loc = `Alprogram [${sub.name}] Rung #${rIdx + 1}`;
      (branch => {
        (branch.elements || []).forEach(el => processElement(el, 'subroutine', loc, sub.name));
      });
      (rung.branches || []).forEach(branch => {
        (branch.elements || []).forEach(el => processElement(el, 'subroutine', loc, sub.name));
      });
      (rung.coils || []).forEach(el => processElement(el, 'subroutine', loc, sub.name));
    });
  });

  // 4. Scan Protocols
  if (protocols) {
    // UART Protocol
    if (protocols.uart?.enabled) {
      registerUsage('D0', {
        sourceType: 'protocol',
        elementName: 'UART RX0',
        direction: 'protocol',
        locationLabel: 'Soros UART Monitor Busz',
        details: `Hardveres Soros Kommunikáció RX0 adatfogadás (${protocols.uart.baudRate || 9600} baud)`
      });
      registerUsage('D1', {
        sourceType: 'protocol',
        elementName: 'UART TX0',
        direction: 'protocol',
        locationLabel: 'Soros UART Monitor Busz',
        details: `Hardveres Soros Kommunikáció TX0 adatküldés (${protocols.uart.baudRate || 9600} baud)`
      });
    }

    // I2C Protocol (Wire)
    const isI2cActive = protocols.i2c?.enabled || protocols.rtc?.enabled || protocols.expander?.enabled;
    if (isI2cActive) {
      if (targetBoard === 'uno') {
        registerUsage('A4', {
          sourceType: 'protocol',
          elementName: 'I2C SDA (Wire)',
          direction: 'protocol',
          locationLabel: 'I2C Kommunikációs Busz',
          details: 'I2C SDA Kétirányú adatvonal (RTC, I/O bővítők, LCD kijelző)'
        });
        registerUsage('A5', {
          sourceType: 'protocol',
          elementName: 'I2C SCL (Wire)',
          direction: 'protocol',
          locationLabel: 'I2C Kommunikációs Busz',
          details: 'I2C SCL Órajelvonal (RTC, I/O bővítők, LCD kijelző)'
        });
      } else {
        registerUsage('D20', {
          sourceType: 'protocol',
          elementName: 'I2C SDA (Wire)',
          direction: 'protocol',
          locationLabel: 'I2C Kommunikációs Busz',
          details: 'Arduino Mega I2C SDA Adatvonal'
        });
        registerUsage('D21', {
          sourceType: 'protocol',
          elementName: 'I2C SCL (Wire)',
          direction: 'protocol',
          locationLabel: 'I2C Kommunikációs Busz',
          details: 'Arduino Mega I2C SCL Órajelvonal'
        });
      }
    }

    // SPI Protocol
    const isSpiActive = protocols.spi?.enabled || protocols.sdCard?.enabled || protocols.nrf24?.enabled;
    if (isSpiActive) {
      if (targetBoard === 'uno') {
        registerUsage('D11', {
          sourceType: 'protocol',
          elementName: 'SPI MOSI',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz',
          details: 'SPI Master-Out Slave-In főkimenet (SD kártya, NRF24)'
        });
        registerUsage('D12', {
          sourceType: 'protocol',
          elementName: 'SPI MISO',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz',
          details: 'SPI Master-In Slave-Out főbemenet'
        });
        registerUsage('D13', {
          sourceType: 'protocol',
          elementName: 'SPI SCK',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz',
          details: 'SPI Szinkron Órajel (SCK)'
        });
      } else {
        registerUsage('D51', {
          sourceType: 'protocol',
          elementName: 'SPI MOSI',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz (Mega)',
          details: 'Mega SPI MOSI Adatvonal'
        });
        registerUsage('D50', {
          sourceType: 'protocol',
          elementName: 'SPI MISO',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz (Mega)',
          details: 'Mega SPI MISO Adatvonal'
        });
        registerUsage('D52', {
          sourceType: 'protocol',
          elementName: 'SPI SCK',
          direction: 'protocol',
          locationLabel: 'SPI Nagysebességű Busz (Mega)',
          details: 'Mega SPI SCK Órajel'
        });
      }
    }

    // Modbus DE/RE pin
    if (protocols.modbus?.enabled && protocols.modbus.deRePin) {
      registerUsage(protocols.modbus.deRePin, {
        sourceType: 'protocol',
        elementName: 'Modbus RS485 DE/RE',
        direction: 'output',
        locationLabel: 'Modbus RTU Kommunikáció',
        details: 'RS485 Adás/Vétel irányváltó (Driver Enable) láb'
      });
    }

    // SD Card Datalogger CS Pin
    if (protocols.sdCard?.enabled && protocols.sdCard.csPin) {
      registerUsage(protocols.sdCard.csPin, {
        sourceType: 'protocol',
        elementName: 'SD Kártya CS',
        direction: 'output',
        locationLabel: 'SD Datalogger Tároló',
        details: 'SD Kártya SPI Chip Select eszközaktiváló láb'
      });
    }

    // NRF24L01 CE & CSN Pins
    if (protocols.nrf24?.enabled) {
      if (protocols.nrf24.cePin) {
        registerUsage(protocols.nrf24.cePin, {
          sourceType: 'protocol',
          elementName: 'NRF24 CE',
          direction: 'output',
          locationLabel: 'NRF24 2.4GHz Rádió',
          details: 'NRF24 Chip Enable rádió adás-vétel vezérlő'
        });
      }
      if (protocols.nrf24.csnPin) {
        registerUsage(protocols.nrf24.csnPin, {
          sourceType: 'protocol',
          elementName: 'NRF24 CSN',
          direction: 'output',
          locationLabel: 'NRF24 2.4GHz Rádió',
          details: 'NRF24 SPI Chip Select Not láb'
        });
      }
    }
  }

  // 5. Scan Hardware Interrupts
  if (interrupts) {
    if (interrupts.int0?.enabled) {
      const pin = targetBoard === 'uno' ? 'D2' : 'D21';
      registerUsage(pin, {
        sourceType: 'interrupt',
        elementName: 'Hardver INT0',
        direction: 'input',
        locationLabel: 'Külső Hardver Megszakítás (INT0)',
        details: `Prioritásos külső eseményvezérlés (${interrupts.int0.mode} mód)`
      });
    }
    if (interrupts.int1?.enabled) {
      const pin = targetBoard === 'uno' ? 'D3' : 'D20';
      registerUsage(pin, {
        sourceType: 'interrupt',
        elementName: 'Hardver INT1',
        direction: 'input',
        locationLabel: 'Külső Hardver Megszakítás (INT1)',
        details: `Prioritásos külső eseményvezérlés (${interrupts.int1.mode} mód)`
      });
    }
  }

  // 6. Explicit mapped variables (if any variable has mappedPin)
  variables.forEach(v => {
    if (v.mappedPin) {
      registerUsage(v.mappedPin, {
        sourceType: 'variable',
        elementName: v.name,
        direction: v.type === 'bool' ? 'input' : 'analog_in',
        variableName: v.name,
        locationLabel: 'Globális PLC Változó Binding',
        details: `Közvetlenül hozzárendelt fizikai I/O címke (${v.name}: ${v.type})`
      });
    }
  });

  return pinMap;
}

// -------------------------------------------------------------
// CONFLICT DETECTION & RESOLUTION ALGORITHM
// -------------------------------------------------------------
export function analyzePinConflicts(
  boardPins: BoardPinDefinition[],
  pinUsages: Map<string, PinUsageEntry[]>,
  targetBoard: BoardType
): Map<string, PinConflict> {
  const conflicts = new Map<string, PinConflict>();

  // Helper to find all available pins on this board with required capability
  const getFreePins = (requiresPwm = false, requiresAnalog = false, requiresInterrupt = false): string[] => {
    return boardPins
      .filter(p => {
        if (!p.isDigital && !p.isAnalog) return false; // skip pure power/gnd/aref
        if (p.defaultBusRole === 'UART_RX' || p.defaultBusRole === 'UART_TX') return false; // avoid serial
        if (requiresPwm && !p.isPwm) return false;
        if (requiresAnalog && !p.isAnalog) return false;
        if (requiresInterrupt && !p.isInterrupt) return false;
        const usages = pinUsages.get(p.id);
        return !usages || usages.length === 0;
      })
      .map(p => p.id);
  };

  // Check board pins
  boardPins.forEach(pinDef => {
    const usages = pinUsages.get(pinDef.id) || [];
    if (usages.length === 0) return;

    const outputUsages = usages.filter(u => u.direction === 'output' || u.direction === 'pwm_out');
    const inputUsages = usages.filter(u => u.direction === 'input' || u.direction === 'analog_in');
    const protocolUsages = usages.filter(u => u.direction === 'protocol');

    // 1. Multiple Output Collision (Critical: short circuit or driver contention)
    if (outputUsages.length > 1) {
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'critical',
        title: 'Többszörös Kimenet Ütközés!',
        message: `A(z) ${pinDef.id} fizikai kimenetet egyszerre ${outputUsages.length} különböző logika próbálja meghajtani (${outputUsages.map(o => o.elementName).join(', ')}). Ez kimeneti zárlathoz vagy bizonytalan működéshez vezet!`,
        conflictingUsages: outputUsages,
        suggestedPins: getFreePins(outputUsages.some(o => o.direction === 'pwm_out')).slice(0, 4)
      });
      return;
    }

    // 2. Simultaneous Input and Output on the same physical pin (Critical direction collision)
    if (outputUsages.length > 0 && inputUsages.length > 0) {
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'critical',
        title: 'Bemenet / Kimenet Irány Ütközés!',
        message: `A(z) ${pinDef.id} láb egyidejűleg van beállítva bemenetként (${inputUsages.map(i => i.elementName).join(', ')}) és kimenetként (${outputUsages.map(o => o.elementName).join(', ')}). Visszacsatoláshoz használj belső PLC jelzőt (pl. M0 vagy V_STATUS) a fizikai láb helyett!`,
        conflictingUsages: [...outputUsages, ...inputUsages],
        suggestedPins: getFreePins().slice(0, 4)
      });
      return;
    }

    // 3. Protocol Bus Collision (e.g. Serial RX/TX or I2C or SPI overwritten by regular I/O)
    if (protocolUsages.length > 0 && (outputUsages.length > 0 || inputUsages.length > 0)) {
      const regular = [...outputUsages, ...inputUsages];
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'critical',
        title: 'Hardver Buszütközés!',
        message: `A(z) ${pinDef.id} láb a(z) ${protocolUsages[0].locationLabel} számára van lefoglalva. Az erre a lábra kötött általános I/O elem (${regular.map(r => r.elementName).join(', ')}) megbénítja a kommunikációs buszt és a programfeltöltést!`,
        conflictingUsages: usages,
        suggestedPins: getFreePins(outputUsages.some(o => o.direction === 'pwm_out')).slice(0, 4)
      });
      return;
    }

    // 4. PWM Incompatibility (Assigning PWM_OUT or SERVO to non-PWM pin)
    const pwmElements = usages.filter(u => u.direction === 'pwm_out' || u.elementType === 'PWM_OUT' || u.elementType === 'SERVO');
    if (pwmElements.length > 0 && !pinDef.isPwm) {
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'warning',
        title: 'Nem PWM-képes Fizikai Láb!',
        message: `A(z) ${pinDef.id} láb nem támogatja a hardveres PWM analóg kimenetet! A hozzárendelt (${pwmElements.map(p => p.elementName).join(', ')}) elem nem fog tudni analóg kitöltési tényezőt vezérelni.`,
        conflictingUsages: pwmElements,
        suggestedPins: getFreePins(true).slice(0, 4)
      });
      return;
    }

    // 5. Analog ADC Incompatibility (Reading analog value from digital-only pin)
    const analogElements = usages.filter(u => u.direction === 'analog_in' && u.elementType === 'ANALOG_CMP');
    if (analogElements.length > 0 && !pinDef.isAnalog) {
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'warning',
        title: 'Nem Analóg Bemenet!',
        message: `A(z) ${pinDef.id} nem rendelkezik analóg-digitális átalakítóval (ADC). Válassz valódi analóg bemenetet (A0-${targetBoard === 'uno' ? 'A5' : 'A15'})!`,
        conflictingUsages: analogElements,
        suggestedPins: getFreePins(false, true).slice(0, 4)
      });
      return;
    }

    // 6. D13 Built-in LED Warning (If used as sensitive input)
    if (pinDef.id === 'D13' && inputUsages.length > 0) {
      conflicts.set(pinDef.id, {
        pinId: pinDef.id,
        severity: 'info',
        title: 'Figyelem: D13 Beépített LED & Előtét Láb',
        message: 'A D13 lábhoz az Arduino áramkörön beépített LED és ellenállás csatlakozik. Érzékeny digitális vagy analóg bemenetként zavarokat okozhat.',
        conflictingUsages: inputUsages,
        suggestedPins: getFreePins().slice(0, 3)
      });
    }
  });

  // Check for pins assigned in project that DO NOT EXIST on the selected target board!
  pinUsages.forEach((usages, pinKey) => {
    const exists = boardPins.some(p => p.id === pinKey);
    if (!exists) {
      conflicts.set(pinKey, {
        pinId: pinKey,
        severity: 'critical',
        title: `Nem létező Láb ezen a kártyán: ${pinKey}!`,
        message: `A projektben használt '${pinKey}' láb nem létezik a kiválasztott ${targetBoard === 'uno' ? 'Arduino Uno R3' : 'Arduino Mega 2560'} vezérlőn (${usages.map(u => u.elementName).join(', ')}). Válts Arduino Mega kártyára, vagy rendeld hozzá egy elérhető lábhoz!`,
        conflictingUsages: usages,
        suggestedPins: getFreePins().slice(0, 4)
      });
    }
  });

  return conflicts;
}

// -------------------------------------------------------------
// EXPORT WIRING DOCUMENTATION GENERATOR (MARKDOWN / CSV / TEXT)
// -------------------------------------------------------------
export function generateWiringDocumentation(
  boardPins: BoardPinDefinition[],
  pinUsages: Map<string, PinUsageEntry[]>,
  conflicts: Map<string, PinConflict>,
  targetBoard: BoardType
): string {
  const lines: string[] = [];
  lines.push(`# Arduino PLC Hardware Map & Bekötési Lista`);
  lines.push(`Célkártya: ${targetBoard === 'uno' ? 'Arduino Uno R3 (ATmega328P)' : 'Arduino Mega 2560 (ATmega2560)'}`);
  lines.push(`Készült: ${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU')}`);
  lines.push(`Ütközések száma: ${conflicts.size}`);
  lines.push('');
  lines.push('| Fizikai Láb | Típus / Feszültség | PLC Elem / Funkció | Irány | Változó / Címke | Hely / Rung | Állapot |');
  lines.push('|---|---|---|---|---|---|---|');

  boardPins.forEach(p => {
    const usages = pinUsages.get(p.id) || [];
    const conflict = conflicts.get(p.id);

    if (usages.length === 0) {
      lines.push(`| **${p.id}** | ${p.description.split(',')[0]} (${p.voltage}) | *(Szabad)* | - | - | - | Szabad |`);
    } else {
      usages.forEach((u, idx) => {
        const pinLabel = idx === 0 ? `**${p.id}**` : `"${p.id}" (megosztva)`;
        const statusStr = conflict ? `⚠️ ÜTKÖZÉS: ${conflict.title}` : '✅ Bekötve';
        lines.push(
          `| ${pinLabel} | ${p.voltage} | ${u.elementName} (${u.elementType || u.sourceType}) | ${u.direction.toUpperCase()} | ${u.variableName || '-'} | ${u.locationLabel} | ${statusStr} |`
        );
      });
    }
  });

  if (conflicts.size > 0) {
    lines.push('');
    lines.push('## ⚠️ Észlelt Ütközések és Javítási Javaslatok');
    conflicts.forEach(c => {
      lines.push(`### Láb: ${c.pinId} - ${c.title} (${c.severity.toUpperCase()})`);
      lines.push(`- **Hiba leírás**: ${c.message}`);
      lines.push(`- **Érintett elemek**: ${c.conflictingUsages.map(u => `${u.elementName} [${u.locationLabel}]`).join(', ')}`);
      if (c.suggestedPins.length > 0) {
        lines.push(`- **Javasolt szabad lábak**: ${c.suggestedPins.join(', ')}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}
