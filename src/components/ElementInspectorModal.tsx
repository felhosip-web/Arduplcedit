import React, { useState, useEffect } from 'react';
import {
  LadderElement,
  ElementType,
  CompareOperator,
  Subroutine,
  PLCConstant,
  PLCVariable,
  PLCArray
} from '../types';
import {
  X,
  Save,
  Cpu,
  Sparkles,
  Hash,
  Clock,
  Sliders,
  Layers,
  Network,
  Variable as VariableIcon,
  Radio,
  HardDrive,
  ListOrdered,
  ArrowRightLeft,
  Calendar,
  Activity
} from 'lucide-react';

interface ElementInspectorModalProps {
  element: LadderElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: LadderElement) => void;
  onOpenPidTuner?: () => void;
  subroutines?: Subroutine[];
  constants?: PLCConstant[];
  variables?: PLCVariable[];
  arrays?: PLCArray[];
}

const ARDUINO_DIGITAL_PINS = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'];
const ARDUINO_ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const EXPANDER_MCP_A_PINS = ['EXP_A0', 'EXP_A1', 'EXP_A2', 'EXP_A3', 'EXP_A4', 'EXP_A5', 'EXP_A6', 'EXP_A7'];
const EXPANDER_MCP_B_PINS = ['EXP_B0', 'EXP_B1', 'EXP_B2', 'EXP_B3', 'EXP_B4', 'EXP_B5', 'EXP_B6', 'EXP_B7'];
const EXPANDER_PCF_PINS = ['PCF_P0', 'PCF_P1', 'PCF_P2', 'PCF_P3', 'PCF_P4', 'PCF_P5', 'PCF_P6', 'PCF_P7'];

export const renderVariableOptions = (variables: PLCVariable[], includeSystem: boolean = false) => {
  const normalVars = variables.filter(v => !v.isSystem);
  const systemVars = variables.filter(v => v.isSystem);

  return (
    <>
      <optgroup label="Felhasználói Változók">
        {normalVars.map((v) => (
          <option key={v.id} value={v.name}>
            {v.name} ({v.type})
          </option>
        ))}
      </optgroup>
      {includeSystem && systemVars.length > 0 && (
        <optgroup label="Rendszer (SM)">
          {systemVars.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name} ({v.type})
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
};

export const ElementInspectorModal: React.FC<ElementInspectorModalProps> = ({
  element,
  isOpen,
  onClose,
  onSave,
  onOpenPidTuner,
  subroutines = [],
  constants = [],
  variables = [],
  arrays = []
}) => {
  const [formData, setFormData] = useState<LadderElement | null>(null);
  const [pinTab, setPinTab] = useState<'arduino' | 'mcp_a' | 'mcp_b' | 'pcf'>('arduino');

  useEffect(() => {
    if (element) {
      setFormData({ ...element });
      if (element.pin?.startsWith('EXP_A')) {
        setPinTab('mcp_a');
      } else if (element.pin?.startsWith('EXP_B')) {
        setPinTab('mcp_b');
      } else if (element.pin?.startsWith('PCF_')) {
        setPinTab('pcf');
      } else {
        setPinTab('arduino');
      }
    }
  }, [element]);

  if (!isOpen || !formData) return null;

  const currentSub = subroutines.find(s => s.id === formData.subroutineId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const isProtocol =
    formData.category === 'protocol' ||
    ['DALLAS_READ', 'I2C_WRITE', 'I2C_READ', 'SPI_TRANSFER', 'UART_PRINT', 'UART_READ'].includes(formData.type);

  const isVariableOp =
    formData.category === 'variable_op' || ['VAR_ASSIGN', 'VAR_CMP', 'MOV', 'WAND', 'WOR', 'WXOR', 'WNOT', 'SHL', 'SHR', 'JMP', 'LBL'].includes(formData.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg border ${
                isProtocol
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isVariableOp
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
              }`}
            >
              {isProtocol ? (
                <Network className="w-5 h-5" />
              ) : isVariableOp ? (
                <VariableIcon className="w-5 h-5" />
              ) : (
                <Sliders className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">
                {isProtocol ? 'Protokoll Elem Konfiguráció' : isVariableOp ? 'Változó / Művelet Beállítás' : 'Modul / Érintkező Beállítása'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {formData.id} &bull; <span className="text-sky-300 font-semibold">{formData.type}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Name / Tag */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Megnevezés / Tag Név
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-sm"
              placeholder="pl. START_GOMB vagy MOTOR_RELE"
              required
            />
          </div>

          {/* Internal Flag selection (M bits & SM special bits) */}
          {(formData.type === 'INTERNAL_FLAG_CONTACT' || formData.type === 'INTERNAL_FLAG_COIL') && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                  <HardDrive className="w-4 h-4" /> Belső flag (M bit) kiválasztása
                </span>
                {formData.variable && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    Kiválasztva: {formData.variable}
                  </span>
                )}
              </div>

              {/* Standard M Bit Grid M0..M15 */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-300 font-medium">
                  Standard M Bitek (M0 - M15)
                </label>
                <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  {Array.from({ length: 16 }, (_, i) => `M${i}`).map((mBit) => (
                    <button
                      key={mBit}
                      type="button"
                      onClick={() => setFormData({ ...formData, variable: mBit, pin: undefined })}
                      className={`px-1.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                        formData.variable === mBit
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {mBit}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Special Bits (SM_*) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-300 font-medium">
                  Rendszer bitek (SM Special Bits)
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800 max-h-40 overflow-y-auto">
                  {variables
                    .filter((v) => v.isSystem)
                    .map((sysVar) => (
                      <button
                        key={sysVar.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, variable: sysVar.name, pin: undefined })}
                        className={`p-2 rounded text-left text-xs border transition-colors flex flex-col justify-between ${
                          formData.variable === sysVar.name
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <span className="font-mono font-bold text-amber-300 text-[11px] truncate">
                          {sysVar.name}
                        </span>
                        {sysVar.description && (
                          <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {sysVar.description}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {/* Custom M address / free-text variable input */}
              <div className="pt-2 border-t border-amber-900/60 flex items-center gap-2">
                <label className="text-xs text-slate-300 whitespace-nowrap">Egyedi M Cím / Változó:</label>
                <input
                  type="text"
                  value={formData.variable || ''}
                  onChange={(e) => setFormData({ ...formData, variable: e.target.value, pin: undefined })}
                  placeholder="pl. M1002 vagy SM_CUSTOM"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Pin selection (Arduino & I/O Expanders MCP23xxx / PCF8574) */}
          {((formData.category === 'contact' && formData.type !== 'INTERNAL_FLAG_CONTACT') ||
            (formData.category === 'coil' && formData.type !== 'INTERNAL_FLAG_COIL') ||
            formData.type === 'SERVO_WRITE' ||
            formData.type === 'DHT_READ' ||
            formData.type === 'PWM_OUT') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  I/O Láb Kiosztás (Fizikai vagy Bővítő Busz)
                </label>
                {formData.pin && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    Kiválasztva: <strong>{formData.pin}</strong>
                  </span>
                )}
              </div>

              {/* Pin source tab navigation */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPinTab('arduino')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    pinTab === 'arduino'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Arduino Lábak (D2-D13)
                </button>
                <button
                  type="button"
                  onClick={() => setPinTab('mcp_a')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    pinTab === 'mcp_a'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MCP23017 Port A (8-Bit)
                </button>
                <button
                  type="button"
                  onClick={() => setPinTab('mcp_b')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    pinTab === 'mcp_b'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MCP23017 Port B (8-Bit)
                </button>
                <button
                  type="button"
                  onClick={() => setPinTab('pcf')}
                  className={`px-2.5 py-1 rounded transition-colors font-medium ${
                    pinTab === 'pcf'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PCF8574 (8-Bit)
                </button>
              </div>

              {/* Tab 1: Arduino Standard Digital Pins */}
              {pinTab === 'arduino' && (
                <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  {ARDUINO_DIGITAL_PINS.map((pin) => (
                    <button
                      key={pin}
                      type="button"
                      onClick={() => setFormData({ ...formData, pin })}
                      className={`px-2 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                        formData.pin === pin
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {pin}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab 2: MCP23017 Port A Pins (EXP_A0 .. EXP_A7) */}
              {pinTab === 'mcp_a' && (
                <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-cyan-900/40">
                  <div className="text-[11px] text-cyan-400 font-mono">
                    MCP23017 (I2C: 0x20) Port A — kétirányú / bemenet / felhúzás:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPANDER_MCP_A_PINS.map((pin) => (
                      <button
                        key={pin}
                        type="button"
                        onClick={() => setFormData({ ...formData, pin })}
                        className={`px-2 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                          formData.pin === pin
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-slate-800 text-cyan-200 border-slate-700 hover:border-cyan-600'
                        }`}
                      >
                        {pin}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: MCP23017 Port B Pins (EXP_B0 .. EXP_B7) */}
              {pinTab === 'mcp_b' && (
                <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-cyan-900/40">
                  <div className="text-[11px] text-cyan-400 font-mono">
                    MCP23017 (I2C: 0x20) Port B — kimenetek / relék / szelepek:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPANDER_MCP_B_PINS.map((pin) => (
                      <button
                        key={pin}
                        type="button"
                        onClick={() => setFormData({ ...formData, pin })}
                        className={`px-2 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                          formData.pin === pin
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-slate-800 text-cyan-200 border-slate-700 hover:border-cyan-600'
                        }`}
                      >
                        {pin}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: PCF8574 Pins (PCF_P0 .. PCF_P7) */}
              {pinTab === 'pcf' && (
                <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-emerald-900/40">
                  <div className="text-[11px] text-emerald-400 font-mono">
                    PCF8574 (I2C: 0x21) Kvázi-kétirányú I/O Lábak:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPANDER_PCF_PINS.map((pin) => (
                      <button
                        key={pin}
                        type="button"
                        onClick={() => setFormData({ ...formData, pin })}
                        className={`px-2 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                          formData.pin === pin
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : 'bg-slate-800 text-emerald-200 border-slate-700 hover:border-emerald-600'
                        }`}
                      >
                        {pin}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.type === 'ANALOG_CMP' && (
                <div className="grid grid-cols-6 gap-1.5 mt-2">
                  {ARDUINO_ANALOG_PINS.map((pin) => (
                    <button
                      key={pin}
                      type="button"
                      onClick={() => setFormData({ ...formData, pin, variable: pin })}
                      className={`px-2 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                        formData.pin === pin
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {pin}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VAR_ASSIGN (Változó vagy Tömb Értékadás) */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'VAR_ASSIGN' && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <VariableIcon className="w-4 h-4" /> Változó vagy Tömb Elem Módosítása
              </div>

              {/* Target Selector: Variable or Array */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cél Változó</label>
                  <select
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetVariable: e.target.value,
                        variable: e.target.value,
                        arrayName: undefined
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    <option value="">-- Válassz változót --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">VAGY Tömb Index</label>
                  <div className="flex gap-1.5">
                    <select
                      value={formData.arrayName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          arrayName: e.target.value || undefined,
                          arrayIndex: formData.arrayIndex ?? 0
                        })
                      }
                      className="w-2/3 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono"
                    >
                      <option value="">-- Tömb --</option>
                      {arrays.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}[{a.size}]
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      placeholder="idx"
                      value={formData.arrayIndex ?? 0}
                      onChange={(e) => setFormData({ ...formData, arrayIndex: Number(e.target.value) })}
                      disabled={!formData.arrayName}
                      className="w-1/3 bg-slate-900 border border-slate-700 rounded px-1.5 py-1.5 text-xs font-mono text-center text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Expression */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Értékadás Kifejezés (C++ / Logika)</label>
                <input
                  type="text"
                  value={formData.assignExpression || ''}
                  onChange={(e) => setFormData({ ...formData, assignExpression: e.target.value })}
                  placeholder="pl. V_BATCH_COUNT + 1 vagy 45.0 vagy true"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-amber-200"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">Gyors sablon:</span>
                  {[
                    `${formData.targetVariable || 'V_BATCH_COUNT'} + 1`,
                    '0',
                    '100',
                    'true',
                    'false',
                    'MAX_TEMP'
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setFormData({ ...formData, assignExpression: tpl })}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* PROGRAM CONTROL FLOW (JMP, LBL) */}
          {/* ------------------------------------------------------------- */}
          {(formData.type === 'JMP' || formData.type === 'LBL') && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <VariableIcon className="w-4 h-4" /> Vezérlésátadás ({formData.type})
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Ugrási Címke Neve (Label Name)
                </label>
                <input
                  type="text"
                  value={formData.labelName || ''}
                  onChange={(e) => setFormData({ ...formData, labelName: e.target.value.toUpperCase() })}
                  placeholder="pl. LBL_SKIP vagy LBL_NEXT"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono uppercase"
                  required
                />
              </div>

              <p className="text-[11px] text-slate-400">
                {formData.type === 'JMP'
                  ? 'Ha a létrafok energizált, a szimulátor és az Arduino kód átugrik a későbbi LBL címkére rendelkező fokra.'
                  : 'Ez a fok szolgál ugrási célpontként a megfelelő névvel rendelkező JMP utasítás számára.'}
              </p>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* COMBINATIONAL LOGIC GATES (COMB_AND, COMB_AND3, COMB_OR, COMB_OR3, COMB_XOR, COMB_NOT) */}
          {/* ------------------------------------------------------------- */}
          {['COMB_AND', 'COMB_AND3', 'COMB_OR', 'COMB_OR3', 'COMB_XOR', 'COMB_NOT'].includes(formData.type) && (
            <div className="p-3.5 bg-sky-950/30 border border-sky-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                <Cpu className="w-4 h-4" /> Kombinációs Logikai Kapu ({formData.type})
              </div>

              {/* Bemenet 1 (In1) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Bemenet 1 (In1: Pin / Változó / M bit)</label>
                  <select
                    value={formData.sourceVariable || ''}
                    onChange={(e) => setFormData({ ...formData, sourceVariable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                  >
                    <option value="">-- Válassz változót / M bitet --</option>
                    {renderVariableOptions(variables, true)}
                    <optgroup label="Arduino Digitális Bemenetek">
                      {ARDUINO_DIGITAL_PINS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">VAGY Egyedi Megnevezés / Pin</label>
                  <input
                    type="text"
                    value={formData.sourceVariable || ''}
                    onChange={(e) => setFormData({ ...formData, sourceVariable: e.target.value })}
                    placeholder="pl. M0 vagy D2 vagy V_IN1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Bemenet 2 (In2) - for AND, AND3, OR, OR3, XOR */}
              {formData.type !== 'COMB_NOT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Bemenet 2 (In2: Pin / Változó / M bit)</label>
                    <select
                      value={formData.operandB || ''}
                      onChange={(e) => setFormData({ ...formData, operandB: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-teal-300 font-mono"
                    >
                      <option value="">-- Válassz változót / M bitet --</option>
                      {renderVariableOptions(variables, true)}
                      <optgroup label="Arduino Digitális Bemenetek">
                        {ARDUINO_DIGITAL_PINS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">VAGY Egyedi Megnevezés / Pin</label>
                    <input
                      type="text"
                      value={formData.operandB || ''}
                      onChange={(e) => setFormData({ ...formData, operandB: e.target.value })}
                      placeholder="pl. M1 vagy D3 vagy V_IN2"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Bemenet 3 (In3) - for AND3, OR3 */}
              {['COMB_AND3', 'COMB_OR3'].includes(formData.type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Bemenet 3 (In3: Pin / Változó / M bit)</label>
                    <select
                      value={formData.operandC || ''}
                      onChange={(e) => setFormData({ ...formData, operandC: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    >
                      <option value="">-- Válassz változót / M bitet --</option>
                      {renderVariableOptions(variables, true)}
                      <optgroup label="Arduino Digitális Bemenetek">
                        {ARDUINO_DIGITAL_PINS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">VAGY Egyedi Megnevezés / Pin</label>
                    <input
                      type="text"
                      value={formData.operandC || ''}
                      onChange={(e) => setFormData({ ...formData, operandC: e.target.value })}
                      placeholder="pl. M2 vagy D4 vagy V_IN3"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Kimenet (Out) */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Kimenet (Out: Változó / M bit / Pin)</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetVariable: e.target.value,
                        variable: e.target.value
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    <option value="">-- Válassz kimeneti változót / M bitet --</option>
                    {renderVariableOptions(variables, true)}
                    <optgroup label="Arduino Digitális Kimenetek">
                      {ARDUINO_DIGITAL_PINS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </optgroup>
                  </select>

                  <input
                    type="text"
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetVariable: e.target.value,
                        variable: e.target.value
                      })
                    }
                    placeholder="pl. M3 vagy D8 vagy V_OUT"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {formData.type === 'COMB_AND' && 'Kombinációs logikai ÉS kapu: Ki = Be1 && Be2.'}
                {formData.type === 'COMB_AND3' && 'Kombinációs logikai 3-bemenetű ÉS kapu: Ki = Be1 && Be2 && Be3.'}
                {formData.type === 'COMB_OR' && 'Kombinációs logikai VAGY kapu: Ki = Be1 || Be2.'}
                {formData.type === 'COMB_OR3' && 'Kombinációs logikai 3-bemenetű VAGY kapu: Ki = Be1 || Be2 || Be3.'}
                {formData.type === 'COMB_XOR' && 'Kombinációs logikai Kizáró VAGY kapu: Ki = Be1 ^ Be2.'}
                {formData.type === 'COMB_NOT' && 'Kombinációs logikai Inverter kapu: Ki = !Be1.'}
              </p>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* WORD & BIT OPERATIONS (MOV, WAND, WOR, WXOR, WNOT, SHL, SHR) */}
          {/* ------------------------------------------------------------- */}
          {['MOV', 'WAND', 'WOR', 'WXOR', 'WNOT', 'SHL', 'SHR'].includes(formData.type) && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <VariableIcon className="w-4 h-4" /> Word & Bitenkénti Művelet ({formData.type})
              </div>

              {/* Destination Variable */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Cél Változó (Destination / dest)
                </label>
                <select
                  value={formData.targetVariable || formData.variable || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetVariable: e.target.value,
                      variable: e.target.value
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                >
                  <option value="">-- Válassz célváltozót --</option>
                  {renderVariableOptions(variables, true)}
                </select>
              </div>

              {/* Operand A / Source Variable or Constant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    {formData.type === 'MOV'
                      ? 'Forrás (Source)'
                      : formData.type === 'SHL' || formData.type === 'SHR'
                      ? 'Érték (Value)'
                      : 'Operand A (a)'}
                  </label>
                  <select
                    value={formData.sourceVariable || ''}
                    onChange={(e) => setFormData({ ...formData, sourceVariable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                  >
                    <option value="">-- Válassz változót / konstansot --</option>
                    {renderVariableOptions(variables, true)}
                    {constants.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">VAGY Statikus Érték / Változó Név</label>
                  <input
                    type="text"
                    value={formData.sourceVariable || ''}
                    onChange={(e) => setFormData({ ...formData, sourceVariable: e.target.value })}
                    placeholder="pl. V_A vagy 255"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Operand B for WAND, WOR, WXOR */}
              {['WAND', 'WOR', 'WXOR'].includes(formData.type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Operand B (b)</label>
                    <select
                      value={formData.operandB || ''}
                      onChange={(e) => setFormData({ ...formData, operandB: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-teal-300 font-mono"
                    >
                      <option value="">-- Válassz változót / konstansot --</option>
                      {renderVariableOptions(variables, true)}
                      {constants.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.value})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">VAGY Statikus Érték (Hex / Dec)</label>
                    <input
                      type="text"
                      value={formData.operandB || ''}
                      onChange={(e) => setFormData({ ...formData, operandB: e.target.value })}
                      placeholder="pl. V_B vagy 0x0F vagy 15"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Shift Count for SHL, SHR */}
              {['SHL', 'SHR'].includes(formData.type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Léptetések száma (n)</label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={formData.shiftCount ?? 1}
                      onChange={(e) =>
                        setFormData({ ...formData, shiftCount: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">VAGY Változó Név</label>
                    <select
                      value={typeof formData.shiftCount === 'string' ? formData.shiftCount : ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shiftCount: e.target.value || formData.shiftCount
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    >
                      <option value="">-- Statikus szám használata --</option>
                      {renderVariableOptions(variables, true)}
                    </select>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                {formData.type === 'MOV' && 'Átmásolja a forrás értékét a célváltozóba: dest = source.'}
                {formData.type === 'WAND' && 'Bitenkénti AND (ÉS) műveletet hajt végre: dest = a & b.'}
                {formData.type === 'WOR' && 'Bitenkénti OR (VAGY) műveletet hajt végre: dest = a | b.'}
                {formData.type === 'WXOR' && 'Bitenkénti XOR (Kizáró Vagy) műveletet hajt végre: dest = a ^ b.'}
                {formData.type === 'WNOT' && 'Bitenkénti NOT (Invertálás) műveletet hajt végre: dest = ~a.'}
                {formData.type === 'SHL' && 'Bites léptetést hajt végre balra: dest = value << n.'}
                {formData.type === 'SHR' && 'Bitenkénti logikai léptetést hajt végre jobbra: dest = value >> n.'}
              </p>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VAR_CMP (Változó Összehasonlítás) */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'VAR_CMP' && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <VariableIcon className="w-4 h-4" /> Változó / Tömb Érték Összehasonlítás (Kontaktus)
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Változó / Operand</label>
                  <select
                    value={formData.variable || formData.targetVariable || 'V_TEMP_C'}
                    onChange={(e) =>
                      setFormData({ ...formData, variable: e.target.value, targetVariable: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    {renderVariableOptions(variables, true)}
                    {arrays.map((a) => (
                      <option key={a.id} value={`${a.name}[0]`}>
                        {a.name}[0]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Reláció</label>
                  <select
                    value={formData.compareOp || '>'}
                    onChange={(e) => setFormData({ ...formData, compareOp: e.target.value as CompareOperator })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value=">">&gt; Nagyobb</option>
                    <option value=">=">&gt;= Nagyobb-egyenlő</option>
                    <option value="<">&lt; Kisebb</option>
                    <option value="<=">&lt;= Kisebb-egyenlő</option>
                    <option value="==">== Egyenlő</option>
                    <option value="!=">!= Nem egyenlő</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Határérték</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.compareValue ?? 65}
                    onChange={(e) => setFormData({ ...formData, compareValue: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-slate-100"
                  />
                </div>
              </div>

              {constants.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Válassz konstans értéket:</span>
                  <div className="flex flex-wrap gap-1">
                    {constants.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, compareValue: Number(c.value) || 0 })}
                        className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-sky-400"
                      >
                        {c.name} ({c.value})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* DALLAS DS18B20 PROTOCOL */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'DALLAS_READ' && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/80 rounded-lg space-y-3">
              <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <Network className="w-4 h-4" /> Dallas DS18B20 1-Wire Hőmérséklet Beolvasás
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">1-Wire Adatláb</label>
                  <select
                    value={formData.dallasPin || formData.pin || 'D4'}
                    onChange={(e) => setFormData({ ...formData, dallasPin: e.target.value, pin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    {ARDUINO_DIGITAL_PINS.map((p) => (
                      <option key={p} value={p}>
                        {p} (DQ Busz)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Hőmérséklet Mentése Változóba</label>
                  <select
                    value={formData.dallasTargetVar || formData.variable || 'V_TEMP_C'}
                    onChange={(e) =>
                      setFormData({ ...formData, dallasTargetVar: e.target.value, variable: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                  >
                    {variables
                      .filter((v) => v.type === 'float' || v.type === 'int')
                      .map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                A Dallas DS18B20 digitális hőszenzor OneWire buszon keresztül, 12 bites felbontással olvassa be a Celsius fokot a megadott PLC változóba.
              </p>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* I2C WRITE & READ PROTOCOL */}
          {/* ------------------------------------------------------------- */}
          {(formData.type === 'I2C_WRITE' || formData.type === 'I2C_READ') && (
            <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/80 rounded-lg space-y-3">
              <div className="text-cyan-400 text-xs font-semibold flex items-center gap-1.5">
                <Network className="w-4 h-4" /> I2C Busz Művelet ({formData.type === 'I2C_WRITE' ? 'Írás / Write' : 'Olvasás / Read'})
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Eszköz Cím (Hex)</label>
                  <input
                    type="text"
                    value={formData.i2cAddress || '0x27'}
                    onChange={(e) => setFormData({ ...formData, i2cAddress: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-cyan-300 text-center"
                    placeholder="0x27"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Regiszter (Hex)</label>
                  <input
                    type="text"
                    value={formData.i2cRegister || '0x00'}
                    onChange={(e) => setFormData({ ...formData, i2cRegister: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-slate-200 text-center"
                    placeholder="0x00"
                  />
                </div>
                <div>
                  {formData.type === 'I2C_WRITE' ? (
                    <>
                      <label className="block text-xs text-slate-300 mb-1">Adatbájt (Hex)</label>
                      <input
                        type="text"
                        value={formData.i2cData || '0xFF'}
                        onChange={(e) => setFormData({ ...formData, i2cData: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-amber-300 text-center"
                        placeholder="0xFF"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs text-slate-300 mb-1">Cél Változó</label>
                      <select
                        value={formData.targetVariable || formData.variable || 'V_BATCH_COUNT'}
                        onChange={(e) =>
                          setFormData({ ...formData, targetVariable: e.target.value, variable: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-emerald-300"
                      >
                        {renderVariableOptions(variables, true)}
                      </select>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 text-[10px] text-slate-400">
                <span>Gyakori címek:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, i2cAddress: '0x27' })}
                  className="hover:text-cyan-300 underline"
                >
                  0x27 (LCD)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, i2cAddress: '0x68' })}
                  className="hover:text-cyan-300 underline"
                >
                  0x68 (RTC)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, i2cAddress: '0x3C' })}
                  className="hover:text-cyan-300 underline"
                >
                  0x3C (OLED)
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SPI TRANSFER PROTOCOL */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'SPI_TRANSFER' && (
            <div className="p-3.5 bg-blue-950/30 border border-blue-800/80 rounded-lg space-y-3">
              <div className="text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                <Network className="w-4 h-4" /> SPI Busz Adatküldés és Válasz Fogadás
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Chip Select (CS)</label>
                  <select
                    value={formData.spiCsPin || 'D10'}
                    onChange={(e) => setFormData({ ...formData, spiCsPin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    {['D10', 'D9', 'D8', 'D7', 'D4'].map((p) => (
                      <option key={p} value={p}>
                        {p} (CS)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Kimenő Bájt (MOSI)</label>
                  <input
                    type="text"
                    value={formData.spiDataToSend || '0x55'}
                    onChange={(e) => setFormData({ ...formData, spiDataToSend: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-blue-300 text-center"
                    placeholder="0x55"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Válasz Változóba</label>
                  <select
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, targetVariable: e.target.value, variable: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-emerald-300"
                  >
                    <option value="">(Nem ment)</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* UART PRINT PROTOCOL */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'UART_PRINT' && (
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/80 rounded-lg space-y-3">
              <div className="text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
                <Radio className="w-4 h-4" /> UART (Serial) Soros Telemetria Kiküldés
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Egyedi Üzenet Szövege</label>
                <input
                  type="text"
                  value={formData.uartMessage || ''}
                  onChange={(e) => setFormData({ ...formData, uartMessage: e.target.value })}
                  placeholder="pl. [PLC ALARM] Túlmelegedés aktiválva!"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-indigo-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">VAGY Dinamikus Változó Értéke</label>
                  <select
                    value={formData.variable || ''}
                    onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200"
                  >
                    <option value="">-- Nincs változó hozzárendelve --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Baud Ráta</label>
                  <input
                    type="text"
                    disabled
                    value="115200 Baud"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* NRF24L01+ WIRELESS RF TRANSCEIVER */}
          {/* ------------------------------------------------------------- */}
          {formData.type.startsWith('NRF24_') && (
            <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/80 rounded-lg space-y-3">
              <div className="text-cyan-400 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4" /> NRF24L01+ 2.4GHz Vezeték Nélküli Rádió ({formData.type})
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                  RF24.h
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">CE Vezérlő Láb</label>
                  <select
                    value={formData.pin || 'D9'}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    {['D9', 'D8', 'D7', 'D4', 'D2'].map((p) => (
                      <option key={p} value={p}>{p} (CE)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">CSN (SPI CS)</label>
                  <select
                    value={formData.spiCsPin || 'D10'}
                    onChange={(e) => setFormData({ ...formData, spiCsPin: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    {['D10', 'D8', 'D7'].map((p) => (
                      <option key={p} value={p}>{p} (CSN)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">RF Csatorna (0-125)</label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    value={formData.nrfChannel ?? 76}
                    onChange={(e) => setFormData({ ...formData, nrfChannel: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-cyan-300 text-center"
                  />
                </div>
              </div>

              {formData.type === 'NRF24_TRANSMIT' && (
                <div className="space-y-2 pt-1 border-t border-cyan-900/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Kiküldendő Változó Értéke</label>
                      <select
                        value={formData.variable || ''}
                        onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200"
                      >
                        <option value="">-- Statikus szöveges üzenet használata --</option>
                        {renderVariableOptions(variables, true)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Statikus Csomag Szöveg</label>
                      <input
                        type="text"
                        value={formData.nrfPayload || ''}
                        onChange={(e) => setFormData({ ...formData, nrfPayload: e.target.value })}
                        placeholder="pl. BATCH_DONE vagy START_PUMP"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-cyan-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'NRF24_RECEIVE' && (
                <div className="space-y-2 pt-1 border-t border-cyan-900/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Célváltozó az Érkezett Csomaghoz</label>
                      <select
                        value={formData.targetVariable || formData.variable || ''}
                        onChange={(e) => setFormData({ ...formData, targetVariable: e.target.value, variable: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-emerald-300"
                      >
                        <option value="">-- Válassz célváltozót --</option>
                        {renderVariableOptions(variables, true)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Olvasási Pipe Index (1-5)</label>
                      <select
                        value={formData.nrfPipe ?? 1}
                        onChange={(e) => setFormData({ ...formData, nrfPipe: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200"
                      >
                        {[1, 2, 3, 4, 5].map((p) => (
                          <option key={p} value={p}>Pipe #{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'NRF24_AVAILABLE' && (
                <p className="text-[11px] text-slate-300">
                  Ez a záró érintkező akkor vezet áramot, ha a rádió RX pufferében új, beérkezett adatcsomag van (<span className="font-mono text-cyan-300">radio.available()</span>).
                </p>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 24Cxxx I2C EEPROM MEMORY */}
          {/* ------------------------------------------------------------- */}
          {formData.type.startsWith('EEPROM_24C_') && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3">
              <div className="text-amber-400 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" /> 24Cxxx Külső I2C EEPROM Nem-felejtő Memória
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                  AT24C02..512
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">I2C Chip Cím</label>
                  <select
                    value={formData.i2cAddress || '0x50'}
                    onChange={(e) => setFormData({ ...formData, i2cAddress: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    {['0x50', '0x51', '0x52', '0x53', '0x54', '0x55', '0x56', '0x57'].map((addr) => (
                      <option key={addr} value={addr}>{addr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Memóriacím (Hex/Dec)</label>
                  <input
                    type="text"
                    value={formData.eepromAddress || '0x0010'}
                    onChange={(e) => setFormData({ ...formData, eepromAddress: e.target.value })}
                    placeholder="0x0010"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-xs text-amber-300 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Adattípus Formátum</label>
                  <select
                    value={formData.eepromDataType || 'float'}
                    onChange={(e) => setFormData({ ...formData, eepromDataType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value="byte">Bájt (uint8_t, 1 bájt)</option>
                    <option value="int">Egész (int16_t, 2 bájt)</option>
                    <option value="float">Lebegőpontos (float, 4 bájt)</option>
                    <option value="string">Szöveg (ASCII)</option>
                  </select>
                </div>
              </div>

              {formData.type === 'EEPROM_24C_WRITE' && (
                <div className="space-y-2 pt-1 border-t border-amber-900/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Kiírandó PLC Változó</label>
                      <select
                        value={formData.variable || ''}
                        onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300"
                      >
                        <option value="">-- Statikus érték megadása --</option>
                        {renderVariableOptions(variables, true)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">VAGY Statikus Konstans Érték</label>
                      <input
                        type="text"
                        value={formData.eepromDataValue || ''}
                        onChange={(e) => setFormData({ ...formData, eepromDataValue: e.target.value })}
                        placeholder="pl. 45.5 vagy 100"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'EEPROM_24C_READ' && (
                <div className="space-y-2 pt-1 border-t border-amber-900/60">
                  <label className="block text-xs text-slate-300 mb-1">Cél PLC Változó a Beolvasott Értékhez</label>
                  <select
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) => setFormData({ ...formData, targetVariable: e.target.value, variable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-emerald-300"
                  >
                    <option value="">-- Válassz célváltozót --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>
              )}

              {(formData.type === 'EEPROM_24C_SAVE_RECIPE' || formData.type === 'EEPROM_24C_LOAD_RECIPE') && (
                <div className="space-y-2 pt-1 border-t border-amber-900/60">
                  <label className="block text-xs text-slate-300 mb-1">Kezelt PLC Tömb (Recept / Kalibráció)</label>
                  <select
                    value={formData.arrayName || (arrays.length > 0 ? arrays[0].name : '')}
                    onChange={(e) => setFormData({ ...formData, arrayName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-purple-300"
                  >
                    {arrays.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} [{a.size}] ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'EEPROM_24C_CHECK' && (
                <p className="text-[11px] text-slate-300">
                  Ez a záró érintkező akkor vezet, ha a 24Cxxx I2C EEPROM válaszol a címzésre (ACK ellenőrzés és belső írási ciklus befejeződés vizsgálata).
                </p>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FIFO / LIFO QUEUE & STACK BUFFERS */}
          {/* ------------------------------------------------------------- */}
          {['FIFO_PUSH', 'FIFO_POP', 'LIFO_PUSH', 'LIFO_POP', 'BUFFER_EMPTY', 'BUFFER_FULL'].includes(formData.type) && (
            <div className="p-3.5 bg-teal-950/30 border border-teal-800/80 rounded-lg space-y-3">
              <div className="text-teal-400 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4" />
                  {formData.type.startsWith('FIFO')
                    ? 'FIFO Körpuffer / Sor Kezelés (First-In, First-Out)'
                    : formData.type.startsWith('LIFO')
                    ? 'LIFO Veremtár Kezelés (Last-In, First-Out)'
                    : 'Puffer Állapot Érintkező'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700">
                  {formData.type}
                </span>
              </div>

              {/* Target Array Selection */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Céltömb (Tároló Puffer)</label>
                <select
                  value={formData.arrayName || (arrays.length > 0 ? arrays[0].name : 'QUEUE_BUFFER')}
                  onChange={(e) => setFormData({ ...formData, arrayName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-teal-300"
                >
                  {arrays.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} [{a.size}] ({a.elementType}) - {a.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pointer / Count Variable */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Elemszám / Mutató Változó</label>
                  <select
                    value={formData.pointerVar || 'V_QUEUE_LEN'}
                    onChange={(e) => setFormData({ ...formData, pointerVar: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300"
                  >
                    <option value="">-- Automatikus belső mutató --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Követi a pufferben lévő elemek számát.
                  </p>
                </div>

                {/* Max capacity */}
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Maximális Kapacitás (Elem)</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={formData.maxSize ?? 8}
                    onChange={(e) => setFormData({ ...formData, maxSize: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Túlcsordulás elleni korlát (alapérték a tömb mérete).
                  </p>
                </div>
              </div>

              {/* PUSH Operations */}
              {(formData.type === 'FIFO_PUSH' || formData.type === 'LIFO_PUSH') && (
                <div className="pt-2 border-t border-teal-900/60 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Beírandó Változó Értéke</label>
                    <select
                      value={formData.variable || ''}
                      onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-emerald-300"
                    >
                      <option value="">-- Statikus konstans használata --</option>
                      {renderVariableOptions(variables, true)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">VAGY Statikus Konstans</label>
                    <input
                      type="text"
                      value={formData.pushValue || ''}
                      onChange={(e) => setFormData({ ...formData, pushValue: e.target.value })}
                      placeholder="pl. 42.5 vagy 1"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-teal-200"
                    />
                  </div>
                </div>
              )}

              {/* POP Operations */}
              {(formData.type === 'FIFO_POP' || formData.type === 'LIFO_POP') && (
                <div className="pt-2 border-t border-teal-900/60">
                  <label className="block text-xs text-slate-300 mb-1">Célváltozó a Kiolvasott Elemhez</label>
                  <select
                    value={formData.targetVariable || formData.variable || ''}
                    onChange={(e) => setFormData({ ...formData, targetVariable: e.target.value, variable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-emerald-300"
                  >
                    <option value="">-- Válassz célváltozót --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formData.type === 'FIFO_POP'
                      ? 'A sor legrégebbi eleme (index 0) ide másolódik, majd a sor elemei 1-gyel előre léptetnek.'
                      : 'A verem tetején lévő legutóbbi elem ide másolódik, majd lekerül a veremből.'}
                  </p>
                </div>
              )}

              {/* Contact Explanations */}
              {formData.type === 'BUFFER_EMPTY' && (
                <p className="text-[11px] text-slate-300">
                  Ez a kontaktus akkor zár (vezet áramot), ha a kiválasztott pufferben 0 elem van (üres).
                </p>
              )}
              {formData.type === 'BUFFER_FULL' && (
                <p className="text-[11px] text-slate-300">
                  Ez a kontaktus akkor zár (vezet áramot), ha a puffer elemszáma elérte a maximális kapacitást (tele).
                </p>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* BLKMOV BLOCK MOVE */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'BLKMOV' && (
            <div className="p-3.5 bg-blue-950/30 border border-blue-800/80 rounded-lg space-y-3">
              <div className="text-blue-400 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4" /> BLKMOV Memóriablokk Másolás (IEC SFC20 / Rockwell COP)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">
                  BLOCK MOVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Source Array */}
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-[11px] font-semibold text-blue-300 block mb-1">Forrás Tömb (SRC)</span>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Tömb Kiválasztása</label>
                  <select
                    value={formData.sourceArray || (arrays.length > 0 ? arrays[0].name : 'RECIPE_SETPOINTS')}
                    onChange={(e) => setFormData({ ...formData, sourceArray: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-blue-300 mb-2"
                  >
                    {arrays.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} [{a.size}]
                      </option>
                    ))}
                  </select>

                  <label className="block text-[10px] text-slate-400 mb-0.5">Kezdő Index (Offset)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sourceOffset ?? 0}
                    onChange={(e) => setFormData({ ...formData, sourceOffset: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-200"
                  />
                </div>

                {/* Dest Array */}
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-[11px] font-semibold text-emerald-300 block mb-1">Cél Tömb (DEST)</span>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Tömb Kiválasztása</label>
                  <select
                    value={formData.destArray || (arrays.length > 1 ? arrays[1].name : (arrays[0]?.name || 'WORK_BUFFER'))}
                    onChange={(e) => setFormData({ ...formData, destArray: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-emerald-300 mb-2"
                  >
                    {arrays.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} [{a.size}]
                      </option>
                    ))}
                  </select>

                  <label className="block text-[10px] text-slate-400 mb-0.5">Kezdő Index (Offset)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.destOffset ?? 0}
                    onChange={(e) => setFormData({ ...formData, destOffset: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Másolandó Elemek Száma (Hossz)</label>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={formData.blockLength ?? 4}
                  onChange={(e) => setFormData({ ...formData, blockLength: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A rendszer automatikusan ellenőrzi a tömbhatárokat a memóriahibák és túlcsordulások elkerülése érdekében.
                </p>
              </div>
            </div>
          )}

          {/* Timer Settings */}
          {formData.category === 'timer' && (
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <Clock className="w-4 h-4" /> Időzítő Beállítások ({formData.type})
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Időzítő Változó</label>
                  <input
                    type="text"
                    value={formData.variable || 'T1'}
                    onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Késleltetés (ms)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={formData.presetMs ?? 1000}
                    onChange={(e) => setFormData({ ...formData, presetMs: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {[500, 1000, 2000, 3000, 5000].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setFormData({ ...formData, presetMs: ms })}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded text-xs font-mono text-slate-300"
                  >
                    {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Counter Settings */}
          {formData.category === 'counter' && (
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                <Hash className="w-4 h-4" /> Számláló Beállítások ({formData.type})
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Számláló Változó</label>
                  <input
                    type="text"
                    value={formData.variable || 'CNT1'}
                    onChange={(e) => setFormData({ ...formData, variable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Célérték (Preset)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.presetCount ?? 5}
                    onChange={(e) => setFormData({ ...formData, presetCount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Servo Settings */}
          {formData.type === 'SERVO_WRITE' && (
            <div className="p-3 bg-slate-800/60 border border-cyan-800/60 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> Szervó Szög Beállítás (Servo.h)
                </span>
                <span className="font-mono text-sm">{formData.servoAngle ?? 90}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={formData.servoAngle ?? 90}
                onChange={(e) => setFormData({ ...formData, servoAngle: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <button type="button" onClick={() => setFormData({ ...formData, servoAngle: 0 })} className="hover:text-cyan-300">
                  0° (Balra)
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, servoAngle: 90 })} className="hover:text-cyan-300">
                  90° (Közép)
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, servoAngle: 180 })} className="hover:text-cyan-300">
                  180° (Jobbra)
                </button>
              </div>
            </div>
          )}

          {/* LCD Settings */}
          {formData.type === 'LCD_PRINT' && (
            <div className="p-3 bg-slate-800/60 border border-emerald-800/60 rounded-lg space-y-3">
              <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> I2C LCD Kijelző Szöveg (LiquidCrystal_I2C.h)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Sor (0 vagy 1)</label>
                  <select
                    value={formData.lcdRow ?? 0}
                    onChange={(e) => setFormData({ ...formData, lcdRow: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value={0}>0. Sor (Felső)</option>
                    <option value={1}>1. Sor (Alsó)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Kezdő oszlop (0-15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.lcdCol ?? 0}
                    onChange={(e) => setFormData({ ...formData, lcdCol: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Kiírandó Szöveg / Érték</label>
                <input
                  type="text"
                  maxLength={16}
                  value={formData.lcdText || ''}
                  onChange={(e) => setFormData({ ...formData, lcdText: e.target.value })}
                  placeholder="pl. RENDSZER AKTIV"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-emerald-300"
                />
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* I/O Expander (MCP23017 / PCF8574) Module Configuration */}
          {/* ------------------------------------------------------------- */}
          {(formData.type === 'EXPANDER_READ_PIN' ||
            formData.type === 'EXPANDER_WRITE_PIN' ||
            formData.type === 'EXPANDER_READ_PORT' ||
            formData.type === 'EXPANDER_WRITE_PORT') && (
            <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/80 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-cyan-400 font-semibold text-xs border-b border-cyan-900/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> I/O Port Bővítő Busz Művelet (MCP23xxx / PCF8574)
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200">
                  I2C Kétirányú
                </span>
              </div>

              {/* Expander Device & Chip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cél Eszköz / Chip</label>
                  <select
                    value={formData.expanderDeviceId || 'mcp23017_1'}
                    onChange={(e) => setFormData({ ...formData, expanderDeviceId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                  >
                    <option value="mcp23017_1">MCP23017 16-Bit (0x20)</option>
                    <option value="pcf8574_1">PCF8574 8-Bit (0x21)</option>
                  </select>
                </div>

                {/* Port Selection for Port Read/Write */}
                {(formData.type === 'EXPANDER_READ_PORT' || formData.type === 'EXPANDER_WRITE_PORT') && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Port Kiválasztás</label>
                    <select
                      value={formData.expanderPort || 'A'}
                      onChange={(e) => setFormData({ ...formData, expanderPort: e.target.value as 'A' | 'B' | 'PORT' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    >
                      <option value="A">Port A (8-Bit: EXP_A0..A7)</option>
                      <option value="B">Port B (8-Bit: EXP_B0..B7)</option>
                      <option value="PORT">PCF8574 PORT (8-Bit: PCF_P0..P7)</option>
                    </select>
                  </div>
                )}

                {/* Pin Selection for Pin Read/Write */}
                {(formData.type === 'EXPANDER_READ_PIN' || formData.type === 'EXPANDER_WRITE_PIN') && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Bővítő Láb (Pin)</label>
                    <select
                      value={formData.expanderPin || formData.pin || (formData.type === 'EXPANDER_READ_PIN' ? 'EXP_A0' : 'EXP_B0')}
                      onChange={(e) => setFormData({ ...formData, expanderPin: e.target.value, pin: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                    >
                      <optgroup label="MCP23017 Port A">
                        {EXPANDER_MCP_A_PINS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </optgroup>
                      <optgroup label="MCP23017 Port B">
                        {EXPANDER_MCP_B_PINS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </optgroup>
                      <optgroup label="PCF8574 Lábak">
                        {EXPANDER_PCF_PINS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>

              {/* Target / Value Variable */}
              {(formData.type === 'EXPANDER_READ_PIN' || formData.type === 'EXPANDER_READ_PORT') && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Cél PLC Változó (Ahová a kiolvasott érték mentődik)
                  </label>
                  <select
                    value={formData.expanderTargetVar || formData.targetVariable || ''}
                    onChange={(e) => setFormData({ ...formData, expanderTargetVar: e.target.value, targetVariable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    <option value="">-- Válassz PLC változót --</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>
              )}

              {formData.type === 'EXPANDER_WRITE_PORT' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Kiírandó Port Érték (Változó vagy Érték 0..255)
                  </label>
                  <input
                    type="text"
                    value={formData.expanderValueVar || '255'}
                    onChange={(e) => setFormData({ ...formData, expanderValueVar: e.target.value })}
                    placeholder="pl. V_PORTB_OUT vagy 0xFF vagy 255"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-200 font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Subroutine Call Bindings Settings */}
          {formData.type === 'SUBROUTINE_CALL' && currentSub && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-700/80 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs">
                <Layers className="w-4 h-4" /> Alprogram Paraméter Bekötések ({currentSub.codeIdentifier})
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Bemeneti Paraméterek (Inputs)
                </div>
                {currentSub.inputs.map((param) => {
                  const currentBinding =
                    formData.subroutineBindings?.[param.name] || param.defaultPinOrVar || 'D2';
                  return (
                    <div
                      key={param.id}
                      className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded border border-slate-800"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-emerald-300">{param.name}</div>
                        <div className="text-[10px] text-slate-400">{param.description || 'Logikai bemenet'}</div>
                      </div>
                      <input
                        type="text"
                        value={currentBinding}
                        onChange={(e) => {
                          const newBindings = { ...(formData.subroutineBindings || {}) };
                          newBindings[param.name] = e.target.value.toUpperCase();
                          setFormData({ ...formData, subroutineBindings: newBindings });
                        }}
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300 text-center uppercase"
                        placeholder="D2 / M0"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-1 border-t border-indigo-900/60">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Kimeneti Paraméterek (Outputs)
                </div>
                {currentSub.outputs.map((param) => {
                  const currentBinding =
                    formData.subroutineBindings?.[param.name] || param.defaultPinOrVar || 'D8';
                  return (
                    <div
                      key={param.id}
                      className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded border border-slate-800"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-300">{param.name}</div>
                        <div className="text-[10px] text-slate-400">{param.description || 'Logikai kimenet'}</div>
                      </div>
                      <input
                        type="text"
                        value={currentBinding}
                        onChange={(e) => {
                          const newBindings = { ...(formData.subroutineBindings || {}) };
                          newBindings[param.name] = e.target.value.toUpperCase();
                          setFormData({ ...formData, subroutineBindings: newBindings });
                        }}
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300 text-center uppercase"
                        placeholder="D8 / M1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RTC & Calendar Configuration Forms */}
          {formData.type === 'RTC_TIME_RANGE' && (
            <div className="p-3 bg-slate-800/60 border border-amber-800/60 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Napi Időintervallum Kapcsoló (Időablak)
                </span>
                <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-amber-300">
                  {String(formData.rtcStartHour ?? 8).padStart(2, '0')}:{String(formData.rtcStartMin ?? 0).padStart(2, '0')} - {String(formData.rtcEndHour ?? 16).padStart(2, '0')}:{String(formData.rtcEndMin ?? 30).padStart(2, '0')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300">Kezdő Időpont</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Óra (0-23)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.rtcStartHour ?? 8}
                        onChange={(e) => setFormData({ ...formData, rtcStartHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Perc (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.rtcStartMin ?? 0}
                        onChange={(e) => setFormData({ ...formData, rtcStartMin: Math.max(0, Math.min(59, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/80 rounded border border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300">Befejező Időpont</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Óra (0-23)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.rtcEndHour ?? 16}
                        onChange={(e) => setFormData({ ...formData, rtcEndHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Perc (0-59)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.rtcEndMin ?? 30}
                        onChange={(e) => setFormData({ ...formData, rtcEndMin: Math.max(0, Math.min(59, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Day of week filter */}
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">
                  Aktív Napok Szűrése (Hét Napjai: 1 = Hétfő ... 7 = Vasárnap)
                </label>
                <div className="flex gap-1.5">
                  {[
                    { num: 1, label: 'H' },
                    { num: 2, label: 'K' },
                    { num: 3, label: 'Sze' },
                    { num: 4, label: 'Cs' },
                    { num: 5, label: 'P' },
                    { num: 6, label: 'Szo' },
                    { num: 7, label: 'V' }
                  ].map((d) => {
                    const days = formData.rtcDaysOfWeek || [1, 2, 3, 4, 5, 6, 7];
                    const isSelected = days.includes(d.num);
                    return (
                      <button
                        key={d.num}
                        type="button"
                        onClick={() => {
                          const nextDays = isSelected
                            ? days.filter((x) => x !== d.num)
                            : [...days, d.num].sort();
                          setFormData({ ...formData, rtcDaysOfWeek: nextDays });
                        }}
                        className={`flex-1 py-1 text-xs font-mono font-bold rounded transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RTC_TIME_CMP' && (
            <div className="p-3 bg-slate-800/60 border border-amber-800/60 rounded-lg space-y-3">
              <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Pontos Időpont Komparátor Kontakt
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Művelet</label>
                  <select
                    value={formData.compareOp || '>='}
                    onChange={(e) => setFormData({ ...formData, compareOp: e.target.value as CompareOperator })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-amber-300"
                  >
                    <option value="==">== (Pontosan egyenlő)</option>
                    <option value=">=">&gt;= (Elérte vagy elmúlt)</option>
                    <option value="<=">&lt;= (Még előtte vagy most)</option>
                    <option value=">">&gt; (Utána)</option>
                    <option value="<">&lt; (Előtte)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Óra (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.rtcCompareHour ?? 18}
                    onChange={(e) => setFormData({ ...formData, rtcCompareHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Perc (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.rtcCompareMin ?? 0}
                    onChange={(e) => setFormData({ ...formData, rtcCompareMin: Math.max(0, Math.min(59, Number(e.target.value))) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RTC_CALENDAR_RANGE' && (
            <div className="p-3 bg-slate-800/60 border border-teal-800/60 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-teal-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Naptári Időszak / Évszak Kapcsoló
                </span>
                <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-teal-300">
                  {String(formData.rtcStartMonth ?? 5).padStart(2, '0')}.{String(formData.rtcStartDay ?? 1).padStart(2, '0')} - {String(formData.rtcEndMonth ?? 9).padStart(2, '0')}.{String(formData.rtcEndDay ?? 30).padStart(2, '0')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300">Kezdő Dátum</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Hónap (1-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.rtcStartMonth ?? 5}
                        onChange={(e) => setFormData({ ...formData, rtcStartMonth: Math.max(1, Math.min(12, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-teal-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Nap (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.rtcStartDay ?? 1}
                        onChange={(e) => setFormData({ ...formData, rtcStartDay: Math.max(1, Math.min(31, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-teal-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/80 rounded border border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300">Befejező Dátum</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Hónap (1-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.rtcEndMonth ?? 9}
                        onChange={(e) => setFormData({ ...formData, rtcEndMonth: Math.max(1, Math.min(12, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-teal-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">Nap (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.rtcEndDay ?? 30}
                        onChange={(e) => setFormData({ ...formData, rtcEndDay: Math.max(1, Math.min(31, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-teal-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RTC_PULSE_TICK' && (
            <div className="p-3 bg-slate-800/60 border border-amber-800/60 rounded-lg space-y-3">
              <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Valós Idejű Óra Órajel Impulzus (1 Scan Ciklus)
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Impulzus Gyakoriság (Tick)</label>
                <select
                  value={formData.rtcPulseInterval || 'second'}
                  onChange={(e) => setFormData({ ...formData, rtcPulseInterval: e.target.value as 'second' | 'minute' | 'hour' | 'midnight' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-amber-300"
                >
                  <option value="second">Másodpercenként 1 ciklusos impulzus (1 Hz)</option>
                  <option value="minute">Percenként 1 ciklusos impulzus (Percváltáskor)</option>
                  <option value="hour">Óránként 1 ciklusos impulzus (Óra átlépésekor)</option>
                  <option value="midnight">Éjfélkor 1 ciklusos impulzus (Napváltás: 00:00:00)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kiváló számlálók periodikus léptetésére vagy ciklikus SD naplózás indítására.
                </p>
              </div>
            </div>
          )}

          {formData.type === 'RTC_READ_TIME' && (
            <div className="p-3 bg-slate-800/60 border border-amber-800/60 rounded-lg space-y-3">
              <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> RTC Hardver Olvasás és Változó Regiszterekbe Másolás
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Óra Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarHour || 'RTC_HOUR'}
                    onChange={(e) => setFormData({ ...formData, rtcVarHour: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Perc Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarMin || 'RTC_MIN'}
                    onChange={(e) => setFormData({ ...formData, rtcVarMin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Másodperc Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarSec || 'RTC_SEC'}
                    onChange={(e) => setFormData({ ...formData, rtcVarSec: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Év Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarYear || 'RTC_YEAR'}
                    onChange={(e) => setFormData({ ...formData, rtcVarYear: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Hónap Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarMonth || 'RTC_MONTH'}
                    onChange={(e) => setFormData({ ...formData, rtcVarMonth: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nap Célváltozó</label>
                  <input
                    type="text"
                    value={formData.rtcVarDay || 'RTC_DAY'}
                    onChange={(e) => setFormData({ ...formData, rtcVarDay: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RTC_SET_TIME' && (
            <div className="p-3 bg-slate-800/60 border border-amber-800/60 rounded-lg space-y-3">
              <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Hardveres RTC Idő Átírása / Beállítása
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Új Óra (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.rtcStartHour ?? 12}
                    onChange={(e) => setFormData({ ...formData, rtcStartHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Új Perc (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.rtcStartMin ?? 0}
                    onChange={(e) => setFormData({ ...formData, rtcStartMin: Math.max(0, Math.min(59, Number(e.target.value))) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CLOSED-LOOP PID CONTROLLER BLOCK */}
          {/* ------------------------------------------------------------- */}
          {formData.type === 'PID_CONTROLLER' && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-amber-400 font-semibold text-xs border-b border-amber-900/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Zárt Hurkú PID Szabályzó Blokk
                </div>
                {onOpenPidTuner && (
                  <button
                    type="button"
                    onClick={onOpenPidTuner}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5" /> PID Hangoló & Tesztpad
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-sky-300 mb-1">Kp (Arányos)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.pidKp ?? 3.2}
                    onChange={(e) => setFormData({ ...formData, pidKp: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-300 mb-1">Ki (Integráló)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.pidKi ?? 0.8}
                    onChange={(e) => setFormData({ ...formData, pidKi: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-rose-300 mb-1">Kd (Differenciáló)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.pidKd ?? 0.6}
                    onChange={(e) => setFormData({ ...formData, pidKd: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-rose-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Alapjel (Setpoint SP)</label>
                  <input
                    type="number"
                    value={formData.pidSetpoint ?? 60}
                    onChange={(e) => setFormData({ ...formData, pidSetpoint: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Bemenet (PV: Pin v. Változó)</label>
                  <input
                    type="text"
                    value={formData.pidInputVar || formData.pin || 'A0'}
                    onChange={(e) => setFormData({ ...formData, pidInputVar: e.target.value.toUpperCase(), pin: e.target.value.toUpperCase() })}
                    placeholder="A0 vagy V_TEMP"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-emerald-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Kimenet (CV: PWM Pin v. Változó)</label>
                  <input
                    type="text"
                    value={formData.pidOutputVar || 'D9'}
                    onChange={(e) => setFormData({ ...formData, pidOutputVar: e.target.value.toUpperCase() })}
                    placeholder="D9 vagy V_PWM"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-purple-300 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Min Kimenet</label>
                  <input
                    type="number"
                    value={formData.pidMinOutput ?? 0}
                    onChange={(e) => setFormData({ ...formData, pidMinOutput: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Kimenet (pl. 255)</label>
                  <input
                    type="number"
                    value={formData.pidMaxOutput ?? 255}
                    onChange={(e) => setFormData({ ...formData, pidMaxOutput: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Ciklusidő (ms)</label>
                  <input
                    type="number"
                    value={formData.pidSampleTimeMs ?? 50}
                    onChange={(e) => setFormData({ ...formData, pidSampleTimeMs: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Comment */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Megjegyzés (Opcionális)
            </label>
            <input
              type="text"
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs"
              placeholder="pl. Dallas hőmérséklet beolvasás és regiszter frissítés"
            />
          </div>

          {/* Footer Save & Cancel */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all"
            >
              <Save className="w-4 h-4" /> Mentés
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
