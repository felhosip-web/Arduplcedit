export type ElementCategory = 'contact' | 'coil' | 'timer' | 'counter' | 'library_module' | 'subroutine' | 'protocol' | 'variable' | 'variable_op' | 'rtc';

export type ElementType =
  // Contacts
  | 'NO_CONTACT'           // Normally Open —[ ]—
  | 'NC_CONTACT'           // Normally Closed —[/]—
  | 'RISING_EDGE'          // Rising Edge Pulse —[P]—
  | 'FALLING_EDGE'         // Falling Edge Pulse —[N]—
  | 'ANALOG_CMP'           // Compare analog value (e.g. A0 > 500)
  | 'INTERNAL_FLAG_CONTACT'// Memory Flag contact (M0..M15)
  | 'VAR_CMP'              // Compare PLC variable or array with constant / value
  // Coils
  | 'COIL_NORMAL'          // Normal Coil —( )—
  | 'COIL_INV'             // Inverted Coil —(/)—
  | 'COIL_SET'             // Set/Latch Coil —(S)—
  | 'COIL_RESET'           // Reset/Unlatch Coil —(R)—
  | 'INTERNAL_FLAG_COIL'   // Memory Flag coil (M0..M15)
  // Timers
  | 'TON'                  // On-Delay Timer
  | 'TOF'                  // Off-Delay Timer
  | 'TP'                   // Pulse Timer
  // Counters
  | 'CTU'                  // Count Up
  | 'CTD'                  // Count Down
  // Library & Hardware Modules
  | 'SERVO_WRITE'          // Servo.h write angle (0-180)
  | 'LCD_PRINT'            // LiquidCrystal_I2C.h print text/variable
  | 'DHT_READ'             // DHT.h read temperature/humidity
  | 'ULTRASONIC_READ'      // HC-SR04 distance measurement
  | 'NEOPIXEL_SET'         // Adafruit_NeoPixel.h set color
  | 'PWM_OUT'              // AnalogWrite (0-255)
  | 'MATH_EXPR'            // Variable assignment or math calculation
  // Variables & Array operations
  | 'VAR_ASSIGN'           // Set variable or array element: V_COUNT = V_COUNT + 1
  // FIFO / LIFO Queue & Stack Buffer Operations
  | 'FIFO_PUSH'            // Push item into array queue (First-In, First-Out)
  | 'FIFO_POP'             // Pop oldest item from array queue
  | 'LIFO_PUSH'            // Push item onto array stack (Last-In, First-Out)
  | 'LIFO_POP'             // Pop top item from array stack
  // Memory & Block Data Move (IEC / Siemens BLKMOV / Rockwell COP)
  | 'BLKMOV'               // Copy block of elements from source array to destination array
  // Buffer Status Contacts
  | 'BUFFER_EMPTY'         // Contact: Closes if buffer/queue item count is 0
  | 'BUFFER_FULL'          // Contact: Closes if buffer/queue is at max capacity
  // Communication Protocols (Dallas, I2C, SPI, UART, NRF24, 24Cxxx)
  | 'DALLAS_READ'          // Dallas DS18B20 1-Wire temperature read
  | 'I2C_WRITE'            // I2C Wire write byte / register to address
  | 'I2C_READ'             // I2C Wire read byte from address
  | 'SPI_TRANSFER'         // SPI transfer byte using CS pin
  | 'UART_PRINT'           // UART Serial.println text / variable
  | 'UART_READ'            // UART Serial.read to variable
  // NRF24L01+ 2.4GHz RF Transceiver
  | 'NRF24_TRANSMIT'       // Send RF packet via NRF24L01+
  | 'NRF24_RECEIVE'        // Receive RF packet via NRF24L01+ into target variable
  | 'NRF24_AVAILABLE'      // Contact: Closes if radio.available() is true
  | 'NRF24_CONFIG'         // Reconfigure RF channel / PA level
  // 24Cxxx I2C EEPROM (AT24C02..AT24C512)
  | 'EEPROM_24C_WRITE'     // Write byte/int/float to 24Cxxx memory address
  | 'EEPROM_24C_READ'      // Read byte/int/float from 24Cxxx memory address
  | 'EEPROM_24C_CHECK'     // Contact: Closes if 24Cxxx ACK / ping succeeds
  | 'EEPROM_24C_SAVE_RECIPE' // Write PLC Array / Recipe to 24Cxxx EEPROM
  | 'EEPROM_24C_LOAD_RECIPE' // Read PLC Array / Recipe from 24Cxxx EEPROM
  // RTC Real-Time Clock & Calendar Elements
  | 'RTC_TIME_RANGE'       // Contact: Closes when current time is within [start..end] schedule (supports DOW filter & midnight span)
  | 'RTC_TIME_CMP'         // Contact: Compares current time with preset (==, >=, <=, >, <)
  | 'RTC_CALENDAR_RANGE'   // Contact: Closes when current date is within [month.day .. month.day] season/date range
  | 'RTC_PULSE_TICK'       // Contact: 1-scan pulse on Minute (:00), Hour (:00:00), Midnight (00:00:00), or Second tick
  | 'RTC_READ_TIME'        // Instruction: Read current RTC time to target variables (Hour, Min, Sec, Date, DOW)
  | 'RTC_SET_TIME'         // Instruction: Write new time to RTC chip
  // Modbus RTU & RS485 Industrial Elements
  | 'MODBUS_READ_HOLDING'  // Instruction: Read remote holding register over RS485 into PLC variable
  | 'MODBUS_WRITE_HOLDING' // Instruction: Write PLC variable to remote holding register
  | 'MODBUS_READ_COIL'     // Instruction: Read remote coil over RS485 into PLC flag
  | 'MODBUS_WRITE_COIL'    // Instruction: Write PLC flag to remote coil
  | 'MODBUS_STATUS'        // Contact: Closes if Modbus communication is active and healthy (no CRC error / timeout)
  // Hardware Supervisor (Watchdog & Brown-Out) Elements
  | 'WDT_RESET'            // Instruction: Explicit wdt_reset() kick in ladder logic
  | 'BOD_STATUS'           // Contact: Closes if power rail is nominal (no brown-out condition)
  // I/O Port Expanders (MCP23017 / MCP23008 & PCF8574 Bidirectional Bus)
  | 'EXPANDER_READ_PIN'    // Instruction: Read expander pin into PLC variable/flag
  | 'EXPANDER_WRITE_PIN'   // Instruction: Write PLC variable/power to expander pin
  | 'EXPANDER_READ_PORT'   // Instruction: Read whole 8-bit/16-bit expander port to PLC variable
  | 'EXPANDER_WRITE_PORT'  // Instruction: Write 8-bit byte to expander port
  // SD Datalogger
  | 'SD_LOG_WRITE'         // Append row of variables to SD card CSV datalog
  | 'SD_CARD_READY'        // Contact: Closes if SD card is mounted and ready
  // Closed-Loop PID Controller
  | 'PID_CONTROLLER'       // Instruction: Closed-loop PID Controller block
  // Subroutines & Custom
  | 'SUBROUTINE_CALL'      // User defined Subroutine / Function block
  | 'CUSTOM_MODULE';       // User defined custom hardware or logic block

export type CompareOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';

export interface LadderElement {
  id: string;
  type: ElementType;
  category: ElementCategory;
  name: string;             // Display name / tag e.g. "START_BTN", "MOTOR_RELAY"
  pin?: string;             // e.g. "D2", "D8", "A0"
  variable?: string;        // Contains PLCVariable.id or raw string fallback
  presetMs?: number;        // for TON, TOF, TP (in milliseconds)
  presetCount?: number;     // for CTU, CTD
  compareOp?: CompareOperator; // for ANALOG_CMP, VAR_CMP
  compareValue?: number;    // for ANALOG_CMP, VAR_CMP
  // Library module specific params
  libraryId?: string;       // e.g. "servo", "liquidcrystal_i2c", "dht", "neopixel"
  servoAngle?: number;      // 0-180
  lcdRow?: number;          // 0 or 1
  lcdCol?: number;          // 0 to 15
  lcdText?: string;         // text or expression e.g. "Temp: " + TEMP + "C"
  neoPixelColor?: string;   // hex color e.g. "#00ff00"
  neoPixelLedIndex?: number;// 0 to 7
  pwmValue?: number;        // 0 to 255
  mathExpression?: string;  // e.g. "M0 = A0 / 4"
  // Variables & Arrays params
  targetVariable?: string;  // Target variable name for assignment/reading
  assignExpression?: string;// e.g. "V_BATCH_COUNT + 1" or "RECIPE_SETPOINTS[0]"
  arrayName?: string;       // Array name for indexed reading/writing
  arrayIndex?: number | string; // Index number or variable name
  // Protocol params (Dallas, I2C, SPI, UART, NRF24, 24Cxxx)
  dallasPin?: string;       // e.g. "D4"
  dallasTargetVar?: string; // e.g. "V_TEMP_C"
  i2cAddress?: string;      // e.g. "0x27"
  i2cRegister?: string;     // e.g. "0x00"
  i2cData?: string;         // e.g. "0xFF"
  spiCsPin?: string;        // e.g. "D10"
  spiDataToSend?: string;   // e.g. "0x55"
  uartMessage?: string;     // e.g. "MOTOR INDITVA" or variable name
  // NRF24 specific params
  nrfPayload?: string;      // e.g. "ALARM_ACK" or numeric value
  nrfChannel?: number;      // 0 to 125 (default 76)
  nrfPipe?: number;         // 0 to 5
  // 24Cxxx specific params
  eepromAddress?: number | string; // e.g. "0x0010" or 16
  eepromDataType?: 'byte' | 'int' | 'float' | 'string';
  eepromDataValue?: string; // Static value or expression to write
  // FIFO / LIFO & BLKMOV buffer parameters
  sourceArray?: string;     // Source array name for BLKMOV
  sourceOffset?: number | string; // Offset index (number or variable name)
  destArray?: string;       // Destination array name for BLKMOV
  destOffset?: number | string; // Offset index (number or variable name)
  blockLength?: number | string; // Number of elements to copy
  pointerVar?: string;      // Current count / head pointer variable (e.g. V_QUEUE_LEN)
  maxSize?: number;         // Max buffer capacity (default array size)
  pushValue?: string;       // Value or variable name to push into FIFO/LIFO
  // RTC Timer & Calendar specific parameters
  rtcStartHour?: number;    // 0..23 (default 8)
  rtcStartMin?: number;     // 0..59 (default 0)
  rtcEndHour?: number;      // 0..23 (default 16)
  rtcEndMin?: number;       // 0..59 (default 30)
  rtcDaysOfWeek?: number[]; // Days mask [1..7] (1=Mon, 2=Tue, ..., 7=Sun)
  rtcScheduleMode?: 'daily' | 'weekdays' | 'weekend' | 'custom';
  rtcCompareHour?: number;  // for RTC_TIME_CMP (0..23)
  rtcCompareMin?: number;   // for RTC_TIME_CMP (0..59)
  rtcCompareSec?: number;   // for RTC_TIME_CMP (0..59)
  rtcStartMonth?: number;   // 1..12 for RTC_CALENDAR_RANGE
  rtcStartDay?: number;     // 1..31
  rtcEndMonth?: number;     // 1..12
  rtcEndDay?: number;       // 1..31
  rtcYearSpecific?: number; // optional specific year (e.g. 2026), or undefined for every year
  rtcPulseInterval?: 'second' | 'minute' | 'hour' | 'midnight'; // for RTC_PULSE_TICK
  rtcVarYear?: string;      // target variable for year (e.g. "RTC_YEAR")
  rtcVarMonth?: string;     // target variable for month (e.g. "RTC_MONTH")
  rtcVarDay?: string;       // target variable for day (e.g. "RTC_DAY")
  rtcVarHour?: string;      // target variable for hour (e.g. "RTC_HOUR")
  rtcVarMin?: string;       // target variable for minute (e.g. "RTC_MIN")
  rtcVarSec?: string;       // target variable for second (e.g. "RTC_SEC")
  rtcVarDOW?: string;       // target variable for day of week (e.g. "RTC_DOW")
  // Modbus RTU & RS485 parameters
  modbusSlaveId?: number;   // 1..247
  modbusRegister?: number;  // 0-based or 40001 register offset
  modbusTargetVar?: string; // Target variable to store read register/coil
  modbusValueVar?: string;  // Variable or constant value to write
  modbusFunction?: number;  // 1, 2, 3, 4, 5, 6, 15, 16
  modbusCoilIndex?: number; // 0..255
  // Port Expander (MCP23xxx / PCF8574) params
  expanderDeviceId?: string; // e.g. "mcp23017_1" or "pcf8574_1"
  expanderPin?: string;      // e.g. "EXP_A0".."EXP_A7", "EXP_B0".."EXP_B7", "PCF_P0".."PCF_P7"
  expanderPort?: 'A' | 'B' | 'PORT';
  expanderTargetVar?: string;// Target variable to store read pin / port value
  expanderValueVar?: string; // Variable or value to write
  // Subroutine specific params
  subroutineId?: string;    // Links to Subroutine.id
  subroutineBindings?: Record<string, string>; // paramId -> pin or variable name e.g. { in_start: "D2", out_run: "D8" }
  customCppCall?: string;   // Custom C++ snippet for custom module
  // PID Controller Parameters
  pidKp?: number;           // Proportional gain Kp
  pidKi?: number;           // Integral gain Ki
  pidKd?: number;           // Derivative gain Kd
  pidSetpoint?: number;     // Target Setpoint value
  pidSetpointVar?: string;  // Optional variable holding Setpoint
  pidInputVar?: string;     // Process Variable (PV) input variable e.g. "V_TEMP_C" or "A0"
  pidOutputVar?: string;    // Control Output (CV/MV) variable e.g. "V_HEATER_PWM" or "D9"
  pidMinOutput?: number;    // Lower output clamp (default 0)
  pidMaxOutput?: number;    // Upper output clamp (default 255 or 100)
  pidSampleTimeMs?: number; // Sampling interval in ms (default 100)
  pidReverseAction?: boolean; // Reverse action flag
  comment?: string;
}

export interface ParallelBranch {
  id: string;
  elements: LadderElement[]; // Elements in series along this parallel branch
}

export interface Rung {
  id: string;
  number: number;
  comment?: string;
  branches: ParallelBranch[]; // Parallel branches (OR logic between branches, AND logic within each branch)
  coils: LadderElement[];     // Coils / Outputs executed when rung logic evaluates to TRUE
}

export interface ArduinoLibrary {
  id: string;
  name: string;
  header: string;           // e.g. "#include <Servo.h>"
  category: 'Actuators' | 'Displays' | 'Sensors' | 'Lighting' | 'Motors' | 'Communication' | 'Custom';
  description: string;
  enabled: boolean;
  isCustom?: boolean;
  requiredByModules?: ElementType[];
  setupCode?: string;       // C++ code to run in setup()
  globalCode?: string;      // Global object instantiations / constants
  officialUrl?: string;
  author?: string;
  version?: string;
}

export interface PinDefinition {
  pin: string;
  type: 'digital' | 'analog' | 'pwm';
  label: string;
  mode: 'INPUT' | 'INPUT_PULLUP' | 'OUTPUT' | 'ANALOG' | 'SPECIAL';
  usedBy?: string;
}

export interface PLCConstant {
  id: string;
  name: string;             // e.g. "MAX_TEMP", "BAUD_RATE", "TANK_LIMIT"
  type: 'int' | 'float' | 'bool' | 'uint16_t' | 'unsigned long' | 'string';
  value: number | boolean | string;
  description?: string;
}

export interface PLCVariable {
  id: string;
  name: string;             // e.g. "V_TEMP_C", "V_BATCH_COUNT", "V_AUTO_MODE"
  type: 'bool' | 'int' | 'float' | 'uint16_t' | 'int32_t' | 'string';
  initialValue: number | boolean | string;
  currentValue?: number | boolean | string;
  isRetentive?: boolean;    // Flag for EEPROM storage on power loss
  isVolatile?: boolean;
  isSystem?: boolean;       // Fixed, non-deletable system variables (e.g., SM_FIRST_SCAN)     // Volatile flag for variables modified within Interrupt Service Routines (ISR)
  description?: string;
  mappedPin?: string;       // Physical hardware pin binding (e.g. "D2", "A0", "D8")
}

export interface PLCArray {
  id: string;
  name: string;             // e.g. "RECIPE_SETPOINTS", "STAGE_DELAYS"
  elementType: 'int' | 'float' | 'bool' | 'byte';
  size: number;
  values: (number | boolean | string)[];
  description?: string;
}

// -------------------------------------------------------------
// INDUSTRIAL COMMUNICATION PROTOCOLS (Dallas, I2C, SPI, UART)
// -------------------------------------------------------------

export interface DallasSensor {
  id: string;
  name: string;             // e.g. "Tartály Hőmérő"
  romAddress?: string;      // e.g. "28-FF-64-1E"
  targetVariable: string;   // Maps to PLCVariable.name (e.g. "V_TEMP_C")
}

export interface DallasConfig {
  enabled: boolean;
  pin: string;              // e.g. "D4"
  resolution: 9 | 10 | 11 | 12; // 9 to 12-bit DS18B20 precision
  waitForConversion?: boolean;  // Synchronous (true) or non-blocking async (false)
  requestOnBoot?: boolean;      // Trigger temperature conversion in setup()
  sensors: DallasSensor[];
}

export interface I2CDevice {
  id: string;
  name: string;             // e.g. "HD44780 LCD", "DS3231 RTC", "PCF8574 IO"
  addressHex: string;       // e.g. "0x27", "0x68", "0x20"
  type: 'LCD_1602' | 'RTC_DS3231' | 'IO_PCF8574' | 'BMP280' | 'CUSTOM';
  description: string;
}

export interface I2CConfig {
  enabled: boolean;
  sdaPin: string;           // Uno: A4
  sclPin: string;           // Uno: A5
  clockSpeedKhz: number;    // 100 or 400 kHz
  timeoutMs?: number;       // Wire timeout in ms for lockup recovery (e.g. 3000ms)
  scanBusOnBoot?: boolean;  // Scan addresses 0x01..0x7F on startup and print to Serial
  devices: I2CDevice[];
}

export interface SPIDevice {
  id: string;
  name: string;             // e.g. "MAX7219 Kijelző", "MCP23S17 Expander", "SD Kártya"
  csPin: string;            // Chip Select e.g. "D10", "D9", "D4"
  type: 'MAX7219' | 'MCP23S17' | 'SD_CARD' | 'CUSTOM';
  description: string;
}

export interface SPIConfig {
  enabled: boolean;
  sckPin: string;           // Uno: D13
  misoPin: string;          // Uno: D12
  mosiPin: string;          // Uno: D11
  csPin: string;            // Default CS: D10
  clockDivider: string;     // e.g. "SPI_CLOCK_DIV4", "SPI_CLOCK_DIV16"
  dataMode: string;         // e.g. "SPI_MODE0", "SPI_MODE1", "SPI_MODE2", "SPI_MODE3"
  bitOrder?: 'MSBFIRST' | 'LSBFIRST'; // default MSBFIRST
  deselectCsPinsOnBoot?: boolean; // Set all registered CS pins to OUTPUT & HIGH on startup
  devices: SPIDevice[];
}

export interface UARTConfig {
  enabled: boolean;
  port: 'Serial' | 'Serial1' | 'Serial2' | 'SoftwareSerial';
  baudRate: number;         // 9600, 19200, 38400, 57600, 115200
  serialConfig?: 'SERIAL_8N1' | 'SERIAL_8E1' | 'SERIAL_8O1' | 'SERIAL_7E1';
  timeoutMs?: number;       // Serial.setTimeout(...) in ms
  printBootBanner?: boolean;// Print diagnostic banner in setup()
  rxPin?: string;           // For SoftwareSerial
  txPin?: string;           // For SoftwareSerial
  mode: 'DEBUG_MONITOR' | 'MODBUS_RTU' | 'CUSTOM_TELEMETRY' | 'COMMAND_RECEIVER';
  packetFormat?: string;    // e.g. "ASCII", "JSON", "MODBUS_HEX"
}

export interface NRF24Config {
  enabled: boolean;
  cePin: string;              // e.g. "D9"
  csnPin: string;             // e.g. "D10"
  channel: number;            // 0 - 125 (e.g. 76)
  dataRate: '250KBPS' | '1MBPS' | '2MBPS';
  paLevel: 'RF24_PA_MIN' | 'RF24_PA_LOW' | 'RF24_PA_HIGH' | 'RF24_PA_MAX';
  writingAddress: string;     // 5-byte identifier, e.g. "PLC01"
  readingAddress: string;     // 5-byte identifier, e.g. "PLC02"
  autoAck: boolean;
  crcLength: 'disabled' | '8-bit' | '16-bit';
  dynamicPayloads: boolean;
}

export interface EEPROM24CConfig {
  enabled: boolean;
  chipType: '24C02' | '24C04' | '24C08' | '24C16' | '24C32' | '24C64' | '24C128' | '24C256' | '24C512';
  addressHex: string;         // e.g. "0x50" or "0x57"
  capacityBytes: number;      // e.g. 4096 (for 24C32)
  pageSizeBytes: number;      // e.g. 32
  addressBytes: 1 | 2;        // 1 for 24C01..16, 2 for 24C32..512
  writeCycleDelayMs: number;  // standard 5ms
}

export interface RTCConfig {
  enabled: boolean;
  chipType: 'DS3231' | 'DS1307' | 'PCF8563';
  addressHex: string;         // e.g. "0x68"
  syncIntervalSec: number;    // Cyclic update interval into variables (e.g. 1 sec)
  autoSyncCompileTime: boolean;// If lost power, rtc.adjust(DateTime(F(__DATE__), F(__TIME__)))
  enableSquareWave1Hz?: boolean;// Enable 1Hz SQW output for precision cycle interrupt
  targetVariables: {
    year: string;             // e.g. "RTC_YEAR"
    month: string;            // e.g. "RTC_MONTH"
    day: string;              // e.g. "RTC_DAY"
    hour: string;             // e.g. "RTC_HOUR"
    minute: string;           // e.g. "RTC_MIN"
    second: string;           // e.g. "RTC_SEC"
    dayOfWeek: string;        // e.g. "RTC_DOW"
  };
}

export interface SDCardConfig {
  enabled: boolean;
  csPin: string;              // e.g. "D10" or "D4"
  spiSpeed: 'SPI_FULL_SPEED' | 'SPI_HALF_SPEED' | 'SPI_QUARTER_SPEED';
  logFileName: string;        // e.g. "datalog.csv"
  autoLogIntervalSec: number; // 0 = only ladder triggered, >0 = periodic scan log
  autoCreateCsvHeader: boolean;
  csvHeaderColumns: string;   // e.g. "TIMESTAMP_MS,HOUR,MIN,SEC,V_TEMP_C,V_FLOW_RATE,STATUS"
  logVariables: string[];     // List of variable names to write in each row
  detectCardOnBoot: boolean;  // Verify SD card presence in setup()
}

export interface ModbusRegisterMapping {
  address: number;            // Register offset (0-based)
  type: 'COIL' | 'DISCRETE_INPUT' | 'INPUT_REGISTER' | 'HOLDING_REGISTER';
  target: string;             // Pin or PLC Variable (e.g. "D8", "M0", "A0", "V_TEMP_C")
  description?: string;
}

export interface ModbusConfig {
  enabled: boolean;
  role: 'SLAVE' | 'MASTER';
  slaveId: number;            // 1..247 (default 1)
  serialPort: 'Serial' | 'Serial1' | 'Serial2' | 'SoftwareSerial';
  baudRate: number;          // 9600, 19200, 38400, 57600, 115200
  serialConfig: 'SERIAL_8N1' | 'SERIAL_8E1' | 'SERIAL_8O1';
  deRePin: string;            // MAX485 Driver Enable pin e.g. "D2", "D3", "D4", "D7", "D8", "NONE"
  rxPin?: string;             // For SoftwareSerial
  txPin?: string;             // For SoftwareSerial
  timeoutMs: number;          // Response timeout in ms (e.g. 500ms)
  pollIntervalMs?: number;    // Master poll loop interval
  holdingRegisterMappings: ModbusRegisterMapping[];
  coilMappings: ModbusRegisterMapping[];
}

export interface HardwareSupervisorConfig {
  watchdog: {
    enabled: boolean;
    timeout: '15MS' | '30MS' | '60MS' | '120MS' | '250MS' | '500MS' | '1S' | '2S' | '4S' | '8S';
    autoResetEachScan: boolean;
  };
  brownout: {
    enabled: boolean;
    level: 'DISABLED' | '1.8V' | '2.7V' | '4.3V';
    earlyPowerFailPin?: string; // e.g. "D2" (INT0)
    saveRetentiveOnPowerFail: boolean;
  };
  diagnostics: {
    logResetReasonOnBoot: boolean;
  };
}

export type ExpanderChipType = 'MCP23017' | 'MCP23008' | 'PCF8574' | 'PCF8574A' | 'PCF8575';
export type ExpanderPinMode = 'INPUT' | 'INPUT_PULLUP' | 'OUTPUT';

export interface ExpanderPinConfig {
  pinId: string;       // e.g. "EXP_A0", "EXP_B1", "PCF_P0"
  port: 'A' | 'B' | 'PORT';
  bitIndex: number;    // 0..7 or 0..15
  mode: ExpanderPinMode;
  inverted?: boolean;
  label?: string;      // User tag e.g. "Szelep 1", "Optokapu 2", "Vészleállító"
}

export interface PortExpanderDevice {
  id: string;          // e.g. "mcp23017_1"
  name: string;        // e.g. "MCP23017 16-Bit I/O Bővítő"
  chipType: ExpanderChipType;
  addressHex: string;  // e.g. "0x20", "0x21"
  enabled: boolean;
  pins: ExpanderPinConfig[];
}

export interface PortExpanderConfig {
  enabled: boolean;
  devices: PortExpanderDevice[];
}

export interface ProtocolConfigs {
  dallas: DallasConfig;
  i2c: I2CConfig;
  spi: SPIConfig;
  uart: UARTConfig;
  nrf24: NRF24Config;
  eeprom24c: EEPROM24CConfig;
  rtc: RTCConfig;
  sdCard: SDCardConfig;
  modbus: ModbusConfig;
  supervisor: HardwareSupervisorConfig;
  expander: PortExpanderConfig;
}

// -------------------------------------------------------------
// INDUSTRIAL HARDWARE & TIMER INTERRUPTS (MEGSZAKÍTÁSOK & HSC)
// -------------------------------------------------------------

export type InterruptTriggerMode = 'RISING' | 'FALLING' | 'CHANGE' | 'LOW';

export type HardwareInterruptSource = 'INT0_D2' | 'INT1_D3';

export type InterruptActionType =
  | 'INCREMENT_VAR'    // e.g. High Speed Counter (HSC) inkrementálás: V_ENCODER_TICKS++
  | 'SET_FLAG'         // e.g. Vészleállító vagy esemény jelző: V_ESTOP_ACTIVE = true
  | 'CALL_SUBROUTINE'  // Meghívja a kijelölt létra alprogramot
  | 'CUSTOM_ISR_CODE'; // Egyéni C++ ISR kód végrehajtása

export interface HardwareInterruptConfig {
  id: string;
  source: HardwareInterruptSource;
  pin: string;              // "D2" (INT0) vagy "D3" (INT1)
  name: string;             // pl. "HSC Enkóder Impulzus" vagy "Vészleállító Gomb"
  enabled: boolean;
  mode: InterruptTriggerMode; // 'RISING' | 'FALLING' | 'CHANGE' | 'LOW'
  actionType: InterruptActionType;
  targetVariable?: string;   // pl. "V_ENCODER_TICKS" vagy "V_ESTOP_ACTIVE"
  incrementStep?: number;    // default 1
  targetSubroutineId?: string; // hivatkozás Subroutine.id-re
  customCppIsr?: string;     // pl. "V_ENCODER_TICKS++; if (V_ENCODER_TICKS >= 1000) { V_BATCH_DONE = true; }"
  description?: string;
}

export interface TimerInterruptConfig {
  enabled: boolean;
  intervalMs: number;        // pl. 5, 10, 20, 50, 100 ms
  timerSource: 'TIMER1' | 'TIMER2';
  name: string;              // pl. "Timer1 10ms Izokron Megszakítás"
  actionType: InterruptActionType;
  targetVariable?: string;
  targetSubroutineId?: string;
  customCppIsr?: string;
  description?: string;
}

export interface InterruptsConfig {
  globalInterruptsEnabled: boolean; // sei() / cli() alapértelmezett állapot
  int0: HardwareInterruptConfig;
  int1: HardwareInterruptConfig;
  timer1: TimerInterruptConfig;
}

export interface InterruptLogEntry {
  id: string;
  timestamp: string;
  source: 'INT0_D2' | 'INT1_D3' | 'TIMER1' | 'INT0' | 'INT1';
  triggerMode?: InterruptTriggerMode;
  mode?: string;
  actionTaken?: string;
  action?: string;
  detail?: string;
  affectedVar?: string;
  varNewValue?: number | boolean | string;
}

// -------------------------------------------------------------
// COMPLETE PROJECT DATA STRUCTURE (MENTÉS ÉS VISSZATÖLTÉS)
// -------------------------------------------------------------

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface FeatureFlags {
  enableExperimentalBlocks: boolean;
  enableCloudSync: boolean;
  enableAdvancedDiagnostics: boolean;
}

export interface ProjectMetadata {
  id?: string;
  name: string;
  description: string;
  author?: string;
  version: string;
  targetBoard: string;      // pl. "Arduino Uno", "Arduino Nano", "Arduino Mega", "ESP32"
  createdAt?: string;
  savedAt: string;
}


export type ProgramType = 'ladder' | 'fbd';

export interface FBDBlock {
  id: string;
  type: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export interface FBDConnection {
  id: string;
  sourceBlockId: string;
  sourcePin: string;
  targetBlockId: string;
  targetPin: string;
}

export interface FBDDiagram {
  blocks: FBDBlock[];
  connections: FBDConnection[];
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  rungs?: Rung[];
  fbd?: FBDDiagram;
}

export interface Task {
  id: string;
  name: string;
  type: 'cyclic' | 'continuous';
  intervalMs?: number;
  priority: number;
  programs: Program[];
}

export interface ProjectData {
  version: string;
  metadata?: ProjectMetadata;
  name?: string;
  lastModified?: number;
  rungs: Rung[];
  setupRungs: Rung[];
  subroutines: Subroutine[];
  customModules: CustomModuleTemplate[];
  libraries: ArduinoLibrary[];
  constants: PLCConstant[];
  variables: PLCVariable[];
  arrays: PLCArray[];
  protocols: ProtocolConfigs;
  interrupts: InterruptsConfig;
  tasks?: Task[];
  stateMachines?: StateMachine[];
}

export interface UartLogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX';
  message: string;
}

export interface I2CLogEntry {
  id: string;
  timestamp: string;
  address: string;
  op: 'READ' | 'WRITE';
  data: string;
}

export interface SPILogEntry {
  id: string;
  timestamp: string;
  cs: string;
  dataOut: string;
  dataIn: string;
}

export interface NRF24PacketLogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX';
  pipe: number;
  payload: string;
  status: 'SUCCESS' | 'NO_ACK' | 'RECEIVED' | 'ACK';
  targetVar?: string;
  channel?: number;
}
export type NRF24LogEntry = NRF24PacketLogEntry;

export interface EEPROM24CLogEntry {
  id: string;
  timestamp: string;
  op: 'READ' | 'WRITE' | 'READY_POLL' | 'CLEAR';
  addressHex: string;
  dataType: 'BYTE' | 'INT' | 'FLOAT' | 'STRING' | 'ARRAY';
  value: string | number;
  operation?: 'READ' | 'WRITE';
  deviceAddress?: string;
  memoryAddress?: string;
  status?: string;
}

export interface BufferLogEntry {
  id: string;
  timestamp: string;
  operation: 'FIFO_PUSH' | 'FIFO_POP' | 'LIFO_PUSH' | 'LIFO_POP' | 'BLKMOV' | 'CLEAR';
  bufferName: string;
  itemValue?: string | number | boolean;
  pointerCount?: number;
  maxCapacity?: number;
  details: string;
  status: 'SUCCESS' | 'OVERFLOW' | 'UNDERFLOW';
}

export interface SDLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  content: string;
  sizeBytes: number;
}

export interface ModbusLogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX';
  slaveId: number;
  functionCode: number;
  functionName: string;
  address?: number;
  countOrValue?: number;
  rawFrame: string;
  crcHex: string;
  crcOk: boolean;
  status: 'OK' | 'CRC_ERROR' | 'TIMEOUT' | 'EXCEPTION';
  detail?: string;
}

export interface ExpanderLogEntry {
  id: string;
  timestamp: string;
  device: string;        // e.g. "MCP23017 (0x20)" or "PCF8574 (0x21)"
  operation: 'PIN_READ' | 'PIN_WRITE' | 'PORT_READ' | 'PORT_WRITE';
  pinOrPort: string;     // e.g. "EXP_A0" or "PORT_B" or "PCF_P0"
  value: boolean | number;
  rawHex?: string;
  status: string;
  detail?: string;
  details?: string;
}

export interface SimulationState {
  isRunning: boolean;
  cycleTimeMs: number;
  digitalInputs: Record<string, boolean>;    // e.g. "D2": true
  digitalOutputs: Record<string, boolean>;   // e.g. "D8": true
  analogInputs: Record<string, number>;      // e.g. "A0": 512, "DHT_TEMP": 24.5, "DHT_HUM": 55, "ULTRASONIC": 42
  internalFlags: Record<string, boolean>;    // e.g. "M0": true
  // Variables and arrays simulation states
  variableValues: Record<string, number | boolean | string>;
  arrayValues: Record<string, (number | boolean | string)[]>;
  // Communication protocols live telemetry
  dallasTemp: number;                       // Simulated DS18B20 live temp
  uartLogs: UartLogEntry[];                 // Simulated Serial terminal log
  i2cLogs: I2CLogEntry[];                   // Simulated I2C bus traffic
  spiLogs: SPILogEntry[];                   // Simulated SPI transactions
  nrf24Logs: NRF24PacketLogEntry[];         // Simulated NRF24 radio packets
  eeprom24cMemory: Record<string, number>;  // 24Cxxx Simulated EEPROM byte/data memory
  eeprom24cLogs: EEPROM24CLogEntry[];       // Simulated 24Cxxx EEPROM bus logs
  bufferLogs: BufferLogEntry[];             // Simulated FIFO/LIFO/BLKMOV memory buffer logs
  bufferTriggerStates?: Record<string, boolean>; // Internal edge triggers for buffer operations
  nrf24RxBuffer?: string | null;            // Unread packet in RX FIFO buffer
  // Modbus RTU / RS485 live telemetry
  modbusLogs: ModbusLogEntry[];             // Simulated Modbus RTU / RS485 telegram sniffer logs
  rs485DePinActive?: boolean;               // MAX485 DE pin active status (HIGH during TX, LOW during RX)
  // Port Expanders (MCP23xxx / PCF8574) live telemetry
  expanderInputs?: Record<string, boolean>; // e.g. "EXP_A0": true, "EXP_A1": false, "PCF_P0": true
  expanderOutputs?: Record<string, boolean>;// e.g. "EXP_B0": true, "PCF_P4": false
  expanderLogs?: ExpanderLogEntry[];        // Live bus transactions for expander read/write
  // Hardware Supervisor (Watchdog & Brown-out) Live Simulation State
  watchdogTimerMs: number;                  // Elapsed time since last wdt_reset()
  watchdogTimeoutMs: number;                // Configured WDT timeout ms (e.g. 2000)
  watchdogTripCount: number;                // Number of watchdog reboots
  faultLatched: boolean;                    // Simulation-level latch for SM_FAULT
  faultReasons: string[];                   // List of active fault reasons (e.g., "Watchdog")
  powerRailVoltage: number;                 // Simulated VCC power rail (e.g. 5.0V)
  brownoutTripVoltage: number;              // BOD threshold e.g. 4.3V
  brownoutTripCount: number;                // Number of brownout resets
  mcusrFlags: {
    porf: boolean;                          // Power-on Reset Flag
    extrf: boolean;                         // External Reset Flag
    borf: boolean;                          // Brown-out Reset Flag
    wdrf: boolean;                          // Watchdog Reset Flag
  };
  // RTC & SD Card live telemetry
  rtcTime?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
  };
  sdCardMounted?: boolean;
  sdCardLogs?: SDLogEntry[];
  timerStates: Record<string, { currentMs: number; isDone: boolean; isTiming: boolean }>;
  counterStates: Record<string, { currentCount: number; isDone: boolean }>;
  servoAngles: Record<string, number>;       // e.g. "D9": 90
  lcdLines: [string, string];                // 2 lines of 16 chars
  neoPixelColors: Record<number, string>;    // index -> hex color
  pwmOutputs: Record<string, number>;        // e.g. "D3": 128
  activeRungs: Record<string, boolean>;      // rungId -> is energized
  activeBranches: Record<string, boolean>;   // branchId -> is energized
  activeElements: Record<string, boolean>;   // elementId -> is energized / transmitting power
  hasExecutedSetup?: boolean;                // Flag indicating whether setup rungs have completed
  activeSetupRungs?: Record<string, boolean>;// setup rungId -> is energized during setup
  setupExecutionTime?: string;               // Timestamp when setup ran
  // Real-time CPU, Memory, and Scan Diagnostics
  scanDiagnostics?: ScanDiagnostics;
  // Hardware & Timer Interrupts Live Simulation Telemetry
  globalInterruptsActive?: boolean;          // sei() / cli() global state
  interruptStats?: Record<string, { triggerCount: number; lastTriggerTime?: string }>;
  interruptLogs?: InterruptLogEntry[];
}

export interface ScanDiagnostics {
  lastScanUs: number;            // Microseconds (hardware-estimated on ATmega328P)
  lastCycleMs: number;           // Target or actual cycle interval ms
  minScanUs: number;
  maxScanUs: number;
  avgScanUs: number;
  totalScans: number;
  cpuLoadPercent: number;        // e.g. 14.5%
  scanHistory: number[];         // Rolling list of recent scan times (µs)
  rungTimesUs: Record<string, number>; // rungId -> estimated execution time in µs
  memoryEstimate?: {
    sramUsedBytes: number;
    sramTotalBytes: number;
    flashUsedBytes: number;
    flashTotalBytes: number;
  };
}

export type LadderSection = 'setup' | 'loop';

export type ActivePage = 'editor' | 'simulator' | 'management' | 'macros' | 'code' | 'diagnostics';

export interface SubroutineParam {
  id: string;
  name: string; // e.g. "IN_START", "IN_SENSOR", "OUT_RUN", "OUT_VAL"
  type: 'BOOL_IN' | 'BOOL_OUT' | 'ANALOG_IN' | 'ANALOG_OUT';
  defaultPinOrVar?: string;
  description?: string;
}

export interface Subroutine {
  id: string;
  name: string; // e.g. "Motor_Vezérlés"
  codeIdentifier: string; // e.g. "FC_MotorCtrl"
  description: string;
  inputs: SubroutineParam[];
  outputs: SubroutineParam[];
  rungs: Rung[]; // The ladder rungs defining this subroutine logic!
  createdAt: number;
}

export interface CustomModuleTemplate {
  id: string;
  name: string;
  symbol: string;
  description: string;
  category: ElementCategory;
  type: ElementType;
  defaultPin?: string;
  defaultVariable?: string;
  variable?: string;
  libraryId?: string;
  libraryName?: string;
  presetMs?: number;
  presetCount?: number;
  servoAngle?: number;
  lcdText?: string;
  customCppCall?: string;
  isBuiltIn?: boolean;
  dallasTargetVar?: string;
  dallasPin?: string;
  i2cAddress?: string;
  i2cRegister?: string;
  i2cData?: string;
  spiCsPin?: string;
  spiDataToSend?: string;
  uartMessage?: string;
  targetVariable?: string;
  assignExpression?: string;
  compareOp?: CompareOperator;
  compareValue?: number;
  arrayName?: string;
  arrayIndex?: number | string;
  // NRF24 and 24Cxxx templates
  nrfPayload?: string;
  nrfChannel?: number;
  nrfPipe?: number;
  eepromAddress?: number | string;
  eepromDataType?: 'byte' | 'int' | 'float' | 'string';
  eepromDataValue?: string;
  // FIFO / LIFO & BLKMOV buffer parameters
  sourceArray?: string;
  sourceOffset?: number | string;
  destArray?: string;
  destOffset?: number | string;
  blockLength?: number | string;
  pointerVar?: string;
  maxSize?: number;
  pushValue?: string;
  // RTC Timer & Calendar specific parameters
  rtcStartHour?: number;
  rtcStartMin?: number;
  rtcEndHour?: number;
  rtcEndMin?: number;
  rtcDaysOfWeek?: number[];
  rtcScheduleMode?: 'daily' | 'weekdays' | 'weekend' | 'custom';
  rtcCompareHour?: number;
  rtcCompareMin?: number;
  rtcCompareSec?: number;
  rtcStartMonth?: number;
  rtcStartDay?: number;
  rtcEndMonth?: number;
  rtcEndDay?: number;
  rtcYearSpecific?: number;
  rtcPulseInterval?: 'second' | 'minute' | 'hour' | 'midnight';
  rtcVarYear?: string;
  rtcVarMonth?: string;
  rtcVarDay?: string;
  rtcVarHour?: string;
  rtcVarMin?: string;
  rtcVarSec?: string;
  rtcVarDOW?: string;
  // I/O Port Expander fields (MCP23017 & PCF8574)
  expanderDeviceId?: string;
  expanderPin?: string;
  expanderPort?: 'A' | 'B' | 'PORT';
  expanderTargetVar?: string;
  expanderValueVar?: string;
  // PID Controller fields
  pidKp?: number;
  pidKi?: number;
  pidKd?: number;
  pidSetpoint?: number;
  pidSetpointVar?: string;
  pidInputVar?: string;
  pidOutputVar?: string;
  pidMinOutput?: number;
  pidMaxOutput?: number;
  pidSampleTimeMs?: number;
  pidReverseAction?: boolean;
}

// -------------------------------------------------------------
// INDUSTRIAL LADDER MACROS / CIRCUITS (RUNG MACRO TEMPLATES)
// -------------------------------------------------------------

export interface MacroParameter {
  key: string;              // e.g. "START_PIN", "STOP_PIN", "MOTOR_COIL"
  label: string;            // e.g. "Start Nyomógomb Bemenet"
  type: 'pin' | 'variable' | 'number' | 'string';
  defaultValue: string;     // e.g. "D2"
  description?: string;
}

export interface LadderMacro {
  id: string;
  name: string;             // e.g. "Motor Öntartó Kör (Direct On Line)"
  category: 'motor' | 'safety' | 'analog' | 'sequencer' | 'diagnostics' | 'custom';
  description: string;
  iconName: string;         // e.g. "Cpu", "ShieldCheck", "Activity", "Layers"
  parameters: MacroParameter[];
  // Generates complete ladder rungs by substituting parameter keys
  buildRungs: (paramValues: Record<string, string>) => Rung[];
  codeExplanation?: string;
  isBuiltIn?: boolean;
}


// --- STATE MACHINE (SFC-LITE) MODELS ---
export type StateId = string;

export interface StateMachineAction {
  type: string;
  params: Record<string, unknown>;
}

export interface StateMachineCondition {
  kind: 'comparison' | 'timeout' | 'and' | 'or' | 'not' | 'always';
  left?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  right?: string | number;
  timeoutMs?: number;
  children?: StateMachineCondition[];
}

export interface StateMachineState {
  id: StateId;
  name: string;
  isInitial?: boolean;
  entryActions?: StateMachineAction[];
  exitActions?: StateMachineAction[];
}

export interface StateMachineTransition {
  id: string;
  fromStateId: StateId;
  toStateId: StateId;
  condition: StateMachineCondition;
  actions?: StateMachineAction[];
  priority: number;
  label?: string;
}

export interface StateMachine {
  id: string;
  name: string;
  states: StateMachineState[];
  transitions: StateMachineTransition[];
  currentStateId?: string;
}
