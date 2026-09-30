import { LadderElement } from '../types';

export type AddressMode = 'pin' | 'var';

/**
 * Ensures strict mutual exclusivity between physical pin addressing and internal variable / marker addressing.
 * In 'pin' mode: pin is preserved/set, variable is explicitly undefined.
 * In 'var' mode: variable is preserved/set, pin is explicitly undefined.
 */
export function normalizeCoilBinding(
  element: LadderElement,
  addressMode: AddressMode,
  selectedPin?: string,
  selectedVariable?: string
): { pin: string | undefined; variable: string | undefined } {
  if (addressMode === 'pin') {
    return {
      pin: (selectedPin !== undefined ? selectedPin : element.pin) || undefined,
      variable: undefined
    };
  } else {
    return {
      pin: undefined,
      variable: (selectedVariable !== undefined ? selectedVariable : element.variable) || undefined
    };
  }
}
