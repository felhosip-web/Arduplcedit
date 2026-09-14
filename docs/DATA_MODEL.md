# Arduino PLC Ladder Studio - Data Model and File Format

This document details the core data structures and architectural design used in the Arduino PLC Ladder Studio application, focusing on state management, referential integrity, and the import/export pipeline.

## 1. Global State Management (Zustand)

The application utilizes a centralized state manager (`src/store/useStore.ts`) powered by **Zustand**. This replaces extensive prop-drilling and scattered `useState` hooks.

### The `LadderState` Interface
The fundamental building blocks of a project are grouped into the `LadderState` interface. This exact structure is what is pushed to and popped from the Undo/Redo history stack:

```typescript
export interface LadderState {
  rungs: Rung[];                   // Main cyclic loop rungs
  setupRungs: Rung[];              // One-time boot rungs
  subroutines: Subroutine[];       // User-defined functional blocks
  variables: PLCVariable[];        // Internal/External variables and flags
  constants: PLCConstant[];        // Global compile-time constants
  arrays: PLCArray[];              // Indexed array buffers
  protocols: ProtocolConfigs;      // Configuration for Dallas, I2C, SPI, Modbus, etc.
  interrupts: InterruptsConfig;    // Hardware and Timer interrupts
}
```

### Undo/Redo (History Stack)
The store wraps `LadderState` inside a history object:
```typescript
interface HistoryState {
  past: LadderState[];
  present: LadderState;
  future: LadderState[];
}
```
Every time a domain operation executes (e.g., adding a rung, modifying a variable), the previous `present` state is pushed onto `past`, the new state becomes `present`, and `future` is cleared.

## 2. Referential Integrity & Symbol Addressing

To maintain strict data integrity, the application relies on a **Symbol Table** mapping mechanism.

### The `PLCVariable` Model
Variables and Constants are stored with a unique `id` and a user-defined `name`.
```typescript
export interface PLCVariable {
  id: string;              // e.g. "var_163102001"
  name: string;            // User identifier, e.g. "M0", "START_BTN", "V_TEMP"
  type: 'bool' | 'int' | 'float' | 'uint16_t' | 'int32_t' | 'string';
  initialValue: any;
  // ...
}
```

### Ladder Element References
Elements placed on a ladder rung (`LadderElement`) do **not** store the string name of the variable they point to. Instead, they store the unique `id`.

```typescript
export interface LadderElement {
  id: string;
  type: ElementType;       // e.g. 'NO_CONTACT', 'COIL_NORMAL'
  variable?: string;       // Contains the PLCVariable.id (e.g., "var_1234")
  targetVariable?: string; // Contains the PLCVariable.id for assignments
  // ...
}
```
* **Benefit:** If a user renames a variable in the Data Manager (e.g., from `M0` to `MAIN_START`), the `id` remains the same. The UI elements dynamically resolve the display name via `useStore`, instantly updating all visuals across the canvas without needing to traverse and update every single rung.

### Orphan Checking
The `validateRungs` function inside `src/utils/validationUtils.ts` actively checks for orphans. If an element's `variable` prop contains an ID that no longer exists in the `variables` or `constants` array (because it was deleted), the validation system flags it as an "Orphaned connection" and visually warns the user on the canvas.

## 3. Schema Validation & Import (Zod)

When importing a project JSON, the raw data cannot be trusted. The `src/utils/schemaValidation.ts` module uses **Zod** to guarantee the structural integrity of the input.

### Migration Pipeline
1.  **Parse:** The JSON is loaded from disk.
2.  **Schema Check:** `ProjectDataSchema.safeParse()` evaluates the structure.
3.  **Migration:** The `migrateProjectData(data)` function receives the parsed object. If the project comes from an older version (e.g., v1 or v2) where certain arrays (like `setupRungs` or `subroutines`) did not exist, the migration function backfills these with empty defaults to prevent crashes.

## 4. PLCopen XML Support

For interoperability with industry-standard software (like Codesys or TwinCAT), the editor includes a foundational exporter to the **PLCopen TC6 XML** standard (`src/utils/plcOpenXmlUtils.ts`).

*   It utilizes the `xml2js` library to build the XML DOM.
*   It maps standard variables to `localVars` (`BOOL`, `INT`, `REAL`).
*   It walks the `rungs` and translates `branches` and `coils` into standard PLCopen `<contact>` and `<coil>` elements.
*   Note: Due to the extreme complexity of the PLCopen specification, the current implementation supports a simplified subset of the data model.