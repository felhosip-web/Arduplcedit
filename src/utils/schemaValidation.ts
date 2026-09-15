import { z } from 'zod';
import { ProjectData } from '../types';

export const LadderElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.string(),
  name: z.string(),
  pin: z.string().optional(),
  variable: z.string().optional(),
  presetMs: z.number().optional(),
  presetCount: z.number().optional(),
  compareOp: z.enum(['>', '>=', '<', '<=', '==', '!=']).optional(),
  compareValue: z.number().optional(),
  libraryId: z.string().optional(),
  servoAngle: z.number().optional(),
  lcdRow: z.number().optional(),
  lcdCol: z.number().optional(),
  lcdText: z.string().optional(),
  neoPixelColor: z.string().optional(),
  neoPixelLedIndex: z.number().optional(),
  pwmValue: z.number().optional(),
  mathExpression: z.string().optional(),
  targetVariable: z.string().optional(),
  assignExpression: z.string().optional(),
  arrayName: z.string().optional(),
  arrayIndex: z.union([z.number(), z.string()]).optional(),
  dallasPin: z.string().optional(),
  dallasTargetVar: z.string().optional(),
  i2cAddress: z.string().optional(),
  i2cRegister: z.string().optional(),
  i2cData: z.string().optional(),
  spiCsPin: z.string().optional(),
  spiDataToSend: z.string().optional(),
  uartMessage: z.string().optional(),
  nrfPayload: z.string().optional(),
  nrfChannel: z.number().optional(),
  nrfPipe: z.number().optional(),
  eepromAddress: z.union([z.number(), z.string()]).optional(),
  eepromDataType: z.enum(['byte', 'int', 'float', 'string']).optional(),
  eepromDataValue: z.string().optional(),
  sourceArray: z.string().optional(),
  sourceOffset: z.union([z.number(), z.string()]).optional(),
  destArray: z.string().optional(),
  destOffset: z.union([z.number(), z.string()]).optional(),
  blockLength: z.union([z.number(), z.string()]).optional(),
  pointerVar: z.string().optional(),
  maxSize: z.number().optional(),
  pushValue: z.string().optional(),
  rtcStartHour: z.number().optional(),
  rtcStartMin: z.number().optional(),
  rtcEndHour: z.number().optional(),
  rtcEndMin: z.number().optional(),
  rtcDaysOfWeek: z.array(z.number()).optional(),
  rtcScheduleMode: z.enum(['daily', 'weekdays', 'weekend', 'custom']).optional(),
  rtcCompareHour: z.number().optional(),
  rtcCompareMin: z.number().optional(),
  rtcCompareSec: z.number().optional(),
  rtcStartMonth: z.number().optional(),
  rtcStartDay: z.number().optional(),
  rtcEndMonth: z.number().optional(),
  rtcEndDay: z.number().optional(),
  rtcYearSpecific: z.number().optional(),
  rtcPulseInterval: z.enum(['second', 'minute', 'hour', 'midnight']).optional(),
  rtcVarYear: z.string().optional(),
  rtcVarMonth: z.string().optional(),
  rtcVarDay: z.string().optional(),
  rtcVarHour: z.string().optional(),
  rtcVarMin: z.string().optional(),
  rtcVarSec: z.string().optional(),
  rtcVarDOW: z.string().optional(),
  modbusSlaveId: z.number().optional(),
  modbusRegister: z.number().optional(),
  modbusTargetVar: z.string().optional(),
  modbusValueVar: z.string().optional(),
  modbusFunction: z.number().optional(),
  modbusCoilIndex: z.number().optional(),
  expanderDeviceId: z.string().optional(),
  expanderPin: z.string().optional(),
  expanderPort: z.enum(['A', 'B', 'PORT']).optional(),
  expanderTargetVar: z.string().optional(),
  expanderValueVar: z.string().optional(),
  subroutineId: z.string().optional(),
  subroutineBindings: z.record(z.string(), z.string()).optional(),
  customCppCall: z.string().optional(),
  pidKp: z.number().optional(),
  pidKi: z.number().optional(),
  pidKd: z.number().optional(),
  pidSetpoint: z.number().optional(),
  pidSetpointVar: z.string().optional(),
  pidInputVar: z.string().optional(),
  pidOutputVar: z.string().optional(),
  pidMinOutput: z.number().optional(),
  pidMaxOutput: z.number().optional(),
  pidSampleTimeMs: z.number().optional(),
  pidReverseAction: z.boolean().optional(),
  comment: z.string().optional(),
});

export const ParallelBranchSchema = z.object({
  id: z.string(),
  elements: z.array(LadderElementSchema),
});

export const RungSchema = z.object({
  id: z.string(),
  number: z.number(),
  comment: z.string().optional(),
  branches: z.array(ParallelBranchSchema),
  coils: z.array(LadderElementSchema),
});

export const SubroutineParamSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['BOOL_IN', 'BOOL_OUT', 'ANALOG_IN', 'ANALOG_OUT']),
  defaultPinOrVar: z.string().optional(),
  description: z.string().optional(),
});

export const SubroutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  codeIdentifier: z.string(),
  description: z.string(),
  inputs: z.array(SubroutineParamSchema),
  outputs: z.array(SubroutineParamSchema),
  rungs: z.array(RungSchema),
  createdAt: z.number(),
});

export const CustomModuleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  description: z.string(),
  category: z.string(),
  type: z.string(),
  defaultPin: z.string().optional(),
  defaultVariable: z.string().optional(),
  variable: z.string().optional(),
  libraryId: z.string().optional(),
  libraryName: z.string().optional(),
  isBuiltIn: z.boolean().optional(),
}).passthrough();

export const ArduinoLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  header: z.string(),
  category: z.enum(['Actuators', 'Displays', 'Sensors', 'Lighting', 'Motors', 'Communication', 'Custom']),
  description: z.string(),
  enabled: z.boolean(),
  isCustom: z.boolean().optional(),
  setupCode: z.string().optional(),
  globalCode: z.string().optional(),
  officialUrl: z.string().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
}).passthrough();

export const PLCConstantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['int', 'float', 'bool', 'uint16_t', 'unsigned long', 'string']),
  value: z.union([z.number(), z.boolean(), z.string()]),
  description: z.string().optional(),
});

export const PLCVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['bool', 'int', 'float', 'uint16_t', 'int32_t', 'string']),
  initialValue: z.union([z.number(), z.boolean(), z.string()]),
  currentValue: z.union([z.number(), z.boolean(), z.string()]).optional(),
  isRetentive: z.boolean().optional(),
  isVolatile: z.boolean().optional(),
  description: z.string().optional(),
  mappedPin: z.string().optional(),
});

export const PLCArraySchema = z.object({
  id: z.string(),
  name: z.string(),
  elementType: z.enum(['int', 'float', 'bool', 'byte']),
  size: z.number(),
  values: z.array(z.union([z.number(), z.boolean(), z.string()])),
  description: z.string().optional(),
});


export const FBDBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  properties: z.record(z.string(), z.any()).optional(),
});

export const FBDConnectionSchema = z.object({
  id: z.string(),
  sourceBlockId: z.string(),
  sourcePin: z.string(),
  targetBlockId: z.string(),
  targetPin: z.string(),
});

export const FBDDiagramSchema = z.object({
  blocks: z.array(FBDBlockSchema),
  connections: z.array(FBDConnectionSchema),
});

export const ProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['ladder', 'fbd']),
  rungs: z.array(RungSchema).optional(),
  fbd: FBDDiagramSchema.optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['cyclic', 'continuous']),
  intervalMs: z.number().optional(),
  priority: z.number(),
  programs: z.array(ProgramSchema),
});

export const ProjectDataSchema = z.object({
  version: z.string(),
  name: z.string().optional(),
  lastModified: z.number().optional(),
  rungs: z.array(RungSchema).optional(),
  setupRungs: z.array(RungSchema).optional(),
  subroutines: z.array(SubroutineSchema).optional(),
  customModules: z.array(CustomModuleTemplateSchema).optional(),
  libraries: z.array(ArduinoLibrarySchema).optional(),
  constants: z.array(PLCConstantSchema).optional(),
  variables: z.array(PLCVariableSchema).optional(),
  arrays: z.array(PLCArraySchema).optional(),
  protocols: z.any().optional(), // Can be fully typed later if needed
  interrupts: z.any().optional(),
  tasks: z.array(TaskSchema).optional(),
}).passthrough();

export function migrateProjectData(data: any): ProjectData {
  const result = ProjectDataSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Érvénytelen projekt fájl: ${result.error.message}`);
  }

  const project = result.data as ProjectData;

  // Basic migration fixes
  if (!project.rungs) project.rungs = [];
  if (!project.setupRungs) project.setupRungs = [];
  if (!project.subroutines) project.subroutines = [];
  if (!project.variables) project.variables = [];
  if (!project.constants) project.constants = [];
  if (!project.arrays) project.arrays = [];
  if (!project.version) project.version = '3.1.0';

  // Migration for tasks
  if (!project.tasks || project.tasks.length === 0) {
    project.tasks = [{
      id: 'task_main',
      name: 'Main Task',
      type: 'cyclic',
      intervalMs: 10,
      priority: 1,
      programs: [{
        id: 'prog_main',
        name: 'Main Program',
        type: 'ladder',
        rungs: project.rungs || []
      }]
    }];
  }

  return project as ProjectData;
}
