import { ElementType, ElementCategory } from '../types';

/**
 * Helper to determine whether a module/element is allowed in a given ladder section.
 * - setup(): one-shot boot initialization (MOV, VAR_ASSIGN, boot messages, RTC set, EEPROM recipe, SERVO attach, basic contacts/coils).
 * - loop(): cyclic 50 Hz scan (timers, counters, JMP/LBL, bitwise ops, logic gates, PID, communication polling).
 */
export function isModuleAllowedInSection(
  type: ElementType,
  category: ElementCategory,
  section: 'setup' | 'loop'
): boolean {
  if (section === 'loop') {
    // Virtually all blocks are valid in cyclic loop scan
    return true;
  }

  // ALLOWED IN SETUP (Initialization / Boot blocks)
  // 1. Basic contacts & coils for setting boot flags or reading pins on startup
  if (
    type === 'NO_CONTACT' ||
    type === 'NC_CONTACT' ||
    type === 'INTERNAL_FLAG_CONTACT' ||
    type === 'COIL_NORMAL' ||
    type === 'COIL_INV' ||
    type === 'COIL_SET' ||
    type === 'COIL_RESET' ||
    type === 'INTERNAL_FLAG_COIL'
  ) {
    return true;
  }

  // 2. Initial values & variable assignments
  if (type === 'MOV' || type === 'VAR_ASSIGN' || type === 'BLKMOV') {
    return true;
  }

  // 3. One-time boot displays, messages, and parameter setups
  if (
    type === 'LCD_PRINT' ||
    type === 'UART_PRINT' ||
    type === 'SERVO_WRITE' ||
    type === 'PWM_OUT' ||
    type === 'NEOPIXEL_SET' ||
    type === 'RTC_SET_TIME' ||
    type === 'EEPROM_24C_SAVE_RECIPE' ||
    type === 'EEPROM_24C_LOAD_RECIPE' ||
    type === 'EEPROM_24C_WRITE' ||
    type === 'EXPANDER_WRITE_PIN' ||
    type === 'EXPANDER_WRITE_PORT' ||
    type === 'NRF24_CONFIG'
  ) {
    return true;
  }

  // HIDE IN SETUP (Cyclic/Scan-only blocks: Timers, Counters, JMP/LBL, Bitwise, COMB Gates, PID, etc.)
  return false;
}
