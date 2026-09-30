import React, { useState, useMemo } from 'react';
import {
  X,
  Cpu,
  Radio,
  Hash,
  Variable,
  Layers,
  CheckCircle2,
  ListFilter,
  Info,
  Shield,
  Activity
} from 'lucide-react';
import {
  Rung,
  Subroutine,
  PLCConstant,
  PLCVariable,
  PLCArray,
  Task,
  StateMachine,
  InterruptsConfig
} from '../../types';
import { extractUsedSymbols } from '../../utils/symbolExtractor';

interface UsedIOVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rungs: Rung[];
  setupRungs?: Rung[];
  subroutines?: Subroutine[];
  tasks?: Task[];
  constants?: PLCConstant[];
  variables?: PLCVariable[];
  arrays?: PLCArray[];
  stateMachines?: StateMachine[];
  interrupts?: InterruptsConfig;
}

export const UsedIOVariablesModal: React.FC<UsedIOVariablesModalProps> = ({
  isOpen,
  onClose,
  rungs,
  setupRungs = [],
  subroutines = [],
  tasks,
  constants = [],
  variables = [],
  arrays = [],
  stateMachines = [],
  interrupts
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'io' | 'markers' | 'constants' | 'variables' | 'arrays'>('all');

  const symbols = useMemo(() => {
    return extractUsedSymbols(
      rungs,
      setupRungs,
      subroutines,
      tasks,
      constants,
      variables,
      arrays,
      stateMachines,
      interrupts
    );
  }, [rungs, setupRungs, subroutines, tasks, constants, variables, arrays, stateMachines, interrupts]);

  if (!isOpen) return null;

  const inputPinsList = Array.from(symbols.inputPins).sort();
  const outputPinsList = Array.from(symbols.outputPins).sort();
  const analogPinsList = Array.from(symbols.analogPins).sort();
  const markerBitsList = Array.from(symbols.markerBits).sort((a, b) => {
    const numA = parseInt(String(a).replace('M', ''), 10) || 0;
    const numB = parseInt(String(b).replace('M', ''), 10) || 0;
    return numA - numB;
  });

  const totalUsedCount =
    inputPinsList.length +
    outputPinsList.length +
    analogPinsList.length +
    markerBitsList.length +
    symbols.usedConstants.length +
    symbols.usedVariables.length +
    symbols.usedArrays.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-slate-950 shadow-lg shadow-sky-500/20">
              <ListFilter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Aktuálisan Használt Ki/Bemenetek, Bitek és Változók
              </h2>
              <p className="text-xs text-slate-400">
                Létradiagramban és FBD-ben aktívan hivatkozott elemek ({totalUsedCount} db elem szűrve). Csak ezek kerülnek a fordított C++ kódba.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-sky-950/30 border-b border-sky-800/40 flex items-center gap-2 text-xs text-sky-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            A nem használt projektváltozók és konstansok automatikusan kiszűrésre kerülnek a generált Arduino C++ kódból a RAM és Flash memória optimalizálása érdekében.
          </span>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-950 border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Minden Használt</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">{totalUsedCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('io')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'io'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fizikai I/O Lábak</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">
              {inputPinsList.length + outputPinsList.length + analogPinsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('markers')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'markers'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Belső M Bitek</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">{markerBitsList.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('constants')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'constants'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-sky-400" />
            <span>Konstansok (K)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">{symbols.usedConstants.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'variables'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Variable className="w-3.5 h-3.5 text-indigo-400" />
            <span>Változók (D)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">{symbols.usedVariables.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arrays')}
            className={`px-3 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'arrays'
                ? 'border-sky-500 text-sky-400 bg-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Tömbök</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 font-mono">{symbols.usedArrays.length}</span>
          </button>
        </div>

        {/* Content Lists */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Section 1: Physical I/O Pins */}
          {(activeTab === 'all' || activeTab === 'io') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-800">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Hardver I/O Lábak (Bemenetek & Kimenetek)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Inputs */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>Digitális Bemenetek (INPUT)</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                      {inputPinsList.length} láb
                    </span>
                  </div>
                  {inputPinsList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nincs digitális bemenet használatban</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {inputPinsList.map((pin) => (
                        <span
                          key={pin}
                          className="px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outputs */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                    <span>Digitális Kimenetek (OUTPUT)</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800">
                      {outputPinsList.length} láb
                    </span>
                  </div>
                  {outputPinsList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nincs digitális kimenet használatban</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {outputPinsList.map((pin) => (
                        <span
                          key={pin}
                          className="px-2 py-1 rounded bg-sky-950/80 text-sky-300 border border-sky-800 font-bold"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Analog */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Analóg Lábak (ADC)</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800">
                      {analogPinsList.length} láb
                    </span>
                  </div>
                  {analogPinsList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nincs analóg láb használatban</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {analogPinsList.map((pin) => (
                        <span
                          key={pin}
                          className="px-2 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold"
                        >
                          {pin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Internal Marker Bits (M) */}
          {(activeTab === 'all' || activeTab === 'markers') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-800">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Belső Marker Bitek (M Regiszterek)</span>
              </h3>

              {markerBitsList.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic text-center">
                  Nincsenek belső marker bitek használatban a létradiagramban.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 font-mono text-xs">
                  {markerBitsList.map((mBit) => (
                    <div
                      key={mBit}
                      className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <span className="font-bold text-amber-300">{mBit}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                        bool
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Constants (K) */}
          {(activeTab === 'all' || activeTab === 'constants') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-800">
                <Hash className="w-4 h-4 text-sky-400" />
                <span>PLC Konstansok (K - Fixed Definitions)</span>
              </h3>

              {symbols.usedConstants.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic text-center">
                  Nincsenek aktív használatban lévő konstansok.
                </div>
              ) : (
                <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                        <th className="py-2 px-3">Azonosító (Név)</th>
                        <th className="py-2 px-3">Típus</th>
                        <th className="py-2 px-3">Érték</th>
                        <th className="py-2 px-3">Leírás</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {symbols.usedConstants.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-sky-300">{c.name}</td>
                          <td className="py-2 px-3 text-slate-400">{c.type}</td>
                          <td className="py-2 px-3 font-bold text-emerald-400">{String(c.value)}</td>
                          <td className="py-2 px-3 text-slate-300 font-sans text-xs">{c.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Variables (D) */}
          {(activeTab === 'all' || activeTab === 'variables') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-800">
                <Variable className="w-4 h-4 text-indigo-400" />
                <span>PLC Folyamatváltozók és Regiszterek (D)</span>
              </h3>

              {symbols.usedVariables.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic text-center">
                  Nincsenek aktív használatban lévő változók.
                </div>
              ) : (
                <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                        <th className="py-2 px-3">Változó Név</th>
                        <th className="py-2 px-3">Adattípus</th>
                        <th className="py-2 px-3">Kezdőérték</th>
                        <th className="py-2 px-3">Perzisztencia</th>
                        <th className="py-2 px-3">Leírás</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {symbols.usedVariables.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-indigo-300 flex items-center gap-2">
                            {v.name}
                            {v.isSystem && (
                              <span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded text-[10px] border border-rose-500/30 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> SM
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400">{v.type}</td>
                          <td className="py-2 px-3 font-bold text-emerald-400">{String(v.initialValue)}</td>
                          <td className="py-2 px-3">
                            {v.isRetentive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-sans font-semibold">
                                EEPROM RETAIN
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-sans">RAM</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans text-xs">{v.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Arrays */}
          {(activeTab === 'all' || activeTab === 'arrays') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-800">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>PLC Tömbök (Array Buffers & Recipes)</span>
              </h3>

              {symbols.usedArrays.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 italic text-center">
                  Nincsenek aktív használatban lévő tömbök.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {symbols.usedArrays.map((arr) => (
                    <div key={arr.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-purple-300 text-xs">{arr.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-400 border border-slate-800">
                          [{arr.size}] {arr.elementType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{arr.description || 'PLC tömb puffer'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Automatikus kódgenerálási szűrő aktív</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
