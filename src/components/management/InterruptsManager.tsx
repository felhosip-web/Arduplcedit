import React, { useState } from 'react';
import {
  Zap,
  Cpu,
  Clock,
  ShieldAlert,
  Play,
  Check,
  AlertTriangle,
  Code,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Sliders,
  Settings,
  Flame
} from 'lucide-react';
import {
  InterruptsConfig,
  HardwareInterruptConfig,
  TimerInterruptConfig,
  PLCVariable,
  Subroutine,
  InterruptTriggerMode,
  InterruptActionType
} from '../../types';

interface InterruptsManagerProps {
  interrupts: InterruptsConfig;
  onUpdateInterrupts: (config: InterruptsConfig) => void;
  variables: PLCVariable[];
  onUpdateVariable: (v: PLCVariable) => void;
  subroutines: Subroutine[];
}

export const InterruptsManager: React.FC<InterruptsManagerProps> = ({
  interrupts,
  onUpdateInterrupts,
  variables,
  onUpdateVariable,
  subroutines
}) => {
  const [activeTab, setActiveTab] = useState<'hardware' | 'timer' | 'guide'>('hardware');

  const updateInt0 = (patch: Partial<HardwareInterruptConfig>) => {
    onUpdateInterrupts({
      ...interrupts,
      int0: { ...interrupts.int0, ...patch }
    });
  };

  const updateInt1 = (patch: Partial<HardwareInterruptConfig>) => {
    onUpdateInterrupts({
      ...interrupts,
      int1: { ...interrupts.int1, ...patch }
    });
  };

  const updateTimer1 = (patch: Partial<TimerInterruptConfig>) => {
    onUpdateInterrupts({
      ...interrupts,
      timer1: { ...interrupts.timer1, ...patch }
    });
  };

  const ensureVariableIsVolatile = (varName?: string) => {
    if (!varName) return;
    const v = variables.find((item) => item.name === varName);
    if (v && !v.isVolatile) {
      onUpdateVariable({ ...v, isVolatile: true });
    }
  };

  // Generate live C++ code snippet preview
  const generatePreviewCode = (): string => {
    const lines: string[] = [];
    lines.push('// --- MEGSZAKÍTÁS KEZELŐ RUTINOK (ISR) ---');

    if (interrupts.int0.enabled) {
      lines.push('void isr_INT0_pin2_handler() {');
      if (interrupts.int0.actionType === 'INCREMENT_VAR') {
        const step = interrupts.int0.incrementStep || 1;
        const target = interrupts.int0.targetVariable || 'V_ENCODER_TICKS';
        lines.push(`  ${target} += ${step};`);
      } else if (interrupts.int0.actionType === 'SET_FLAG') {
        const target = interrupts.int0.targetVariable || 'V_ESTOP_ACTIVE';
        lines.push(`  ${target} = true;`);
      } else if (interrupts.int0.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find((s) => s.id === interrupts.int0.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}()` : '// (Nincs alprogram kijelölve)'};`);
      } else if (interrupts.int0.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.int0.customCppIsr || '// egyéni kód...'}`);
      }
      lines.push('}');
      lines.push('');
    }

    if (interrupts.int1.enabled) {
      lines.push('void isr_INT1_pin3_handler() {');
      if (interrupts.int1.actionType === 'INCREMENT_VAR') {
        const step = interrupts.int1.incrementStep || 1;
        const target = interrupts.int1.targetVariable || 'V_ENCODER_TICKS';
        lines.push(`  ${target} += ${step};`);
      } else if (interrupts.int1.actionType === 'SET_FLAG') {
        const target = interrupts.int1.targetVariable || 'V_ESTOP_ACTIVE';
        lines.push(`  ${target} = true;`);
      } else if (interrupts.int1.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find((s) => s.id === interrupts.int1.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}()` : '// (Nincs alprogram kijelölve)'};`);
      } else if (interrupts.int1.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.int1.customCppIsr || '// egyéni kód...'}`);
      }
      lines.push('}');
      lines.push('');
    }

    if (interrupts.timer1.enabled) {
      lines.push('ISR(TIMER1_COMPA_vect) {');
      if (interrupts.timer1.actionType === 'CALL_SUBROUTINE') {
        const sub = subroutines.find((s) => s.id === interrupts.timer1.targetSubroutineId);
        lines.push(`  ${sub ? `sub_${sub.name}()` : '// (Periodikus szubrutin)'};`);
      } else if (interrupts.timer1.actionType === 'CUSTOM_ISR_CODE') {
        lines.push(`  ${interrupts.timer1.customCppIsr || '// egyéni timer kód...'}`);
      } else {
        lines.push('  // Periodikus időzítő tick lefutás');
      }
      lines.push('}');
      lines.push('');
    }

    lines.push('void setup() {');
    lines.push('  // ... egyéb PLC inicializálás ...');
    if (interrupts.int0.enabled) {
      lines.push('  pinMode(2, INPUT_PULLUP);');
      lines.push(`  attachInterrupt(digitalPinToInterrupt(2), isr_INT0_pin2_handler, ${interrupts.int0.mode});`);
    }
    if (interrupts.int1.enabled) {
      lines.push('  pinMode(3, INPUT_PULLUP);');
      lines.push(`  attachInterrupt(digitalPinToInterrupt(3), isr_INT1_pin3_handler, ${interrupts.int1.mode});`);
    }
    if (interrupts.timer1.enabled) {
      lines.push(`  // Timer1 beállítása ${interrupts.timer1.intervalMs} ms periódusra (CTC mód)`);
      lines.push('  TCCR1A = 0; TCCR1B = 0; TCNT1 = 0;');
      lines.push(`  OCR1A = ${(interrupts.timer1.intervalMs * 250) - 1}; // 16MHz/64 osztó`);
      lines.push('  TCCR1B |= (1 << WGM12) | (1 << CS11) | (1 << CS10);');
      lines.push('  TIMSK1 |= (1 << OCIE1A);');
    }
    if (interrupts.globalInterruptsEnabled) {
      lines.push('  interrupts(); // Globális megszakítások engedélyezése');
    }
    lines.push('}');

    return lines.join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-100">
              Hardver és Időzítő Megszakítások (Interrupts & HSC)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
              Valós Idejű ISR
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            A mikrokontroller hardveres megszakításai (D2/INT0 és D3/INT1) azonnal megszakítják a normál 20 ms-os PLC ciklust,
            így garantálják a nagy sebességű optikai enkóderek (HSC) egyetlen impulzusának sem elvesztését, valamint a vészleállítók
            azonnali, mikromásodperces reakcióidejét.
          </p>
        </div>

        {/* Global Interrupts Toggle */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 shrink-0">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-200">Globális Megszakítások</div>
            <div className="text-[10px] text-slate-400 font-mono">sei() / cli()</div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateInterrupts({
                ...interrupts,
                globalInterruptsEnabled: !interrupts.globalInterruptsEnabled
              })
            }
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              interrupts.globalInterruptsEnabled ? 'bg-rose-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                interrupts.globalInterruptsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`py-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'hardware'
              ? 'border-rose-500 text-rose-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Külső Hardver Megszakítások (INT0 / INT1)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className={`py-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'timer'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Időzítő Megszakítás (Timer1 ISR)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`py-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'guide'
              ? 'border-amber-500 text-amber-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Generált C++ Kód & Elmélet</span>
        </button>
      </div>

      {/* TAB 1: HARDWARE INTERRUPTS */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* INT0 Card (D2) */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xs font-mono font-bold text-rose-400">
                  D2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    INT0 Külső Megszakítás
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Arduino Uno / Nano: Pin D2</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {interrupts.int0.enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
                </span>
                <button
                  type="button"
                  onClick={() => updateInt0({ enabled: !interrupts.int0.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    interrupts.int0.enabled ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      interrupts.int0.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Megszakítás Megnevezése / Feladata
                </label>
                <input
                  type="text"
                  value={interrupts.int0.name}
                  onChange={(e) => updateInt0({ name: e.target.value })}
                  placeholder="pl. HSC Enkóder Gyorsszámláló"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Trigger Kiváltó Élmód
                  </label>
                  <select
                    value={interrupts.int0.mode}
                    onChange={(e) => updateInt0({ mode: e.target.value as InterruptTriggerMode })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-rose-500 font-mono"
                  >
                    <option value="RISING">RISING (Felfutó él 0-&gt;1)</option>
                    <option value="FALLING">FALLING (Lefutó él 1-&gt;0)</option>
                    <option value="CHANGE">CHANGE (Bármely élváltás)</option>
                    <option value="LOW">LOW (Alacsony jelszint)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Végrehajtandó Művelet (Action)
                  </label>
                  <select
                    value={interrupts.int0.actionType}
                    onChange={(e) => updateInt0({ actionType: e.target.value as InterruptActionType })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="INCREMENT_VAR">Számláló Inkrementálás (HSC)</option>
                    <option value="SET_FLAG">Biztonsági Flag Aktiválás</option>
                    <option value="CALL_SUBROUTINE">Alprogram Meghívása (FC)</option>
                    <option value="CUSTOM_ISR_CODE">Egyéni C++ ISR Kód</option>
                  </select>
                </div>
              </div>

              {/* Action specific fields */}
              {interrupts.int0.actionType === 'INCREMENT_VAR' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Cél Enkóder Változó (HSC):</span>
                    <span className="text-[10px] text-amber-400 font-mono">Automatikusan volatile!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={interrupts.int0.targetVariable || 'V_ENCODER_TICKS'}
                      onChange={(e) => {
                        updateInt0({ targetVariable: e.target.value });
                        ensureVariableIsVolatile(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-rose-500"
                    >
                      {variables.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Lépés:</span>
                      <input
                        type="number"
                        value={interrupts.int0.incrementStep ?? 1}
                        onChange={(e) => updateInt0({ incrementStep: parseInt(e.target.value) || 1 })}
                        className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {interrupts.int0.actionType === 'SET_FLAG' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300">Aktiválandó Vészjelző Változó:</span>
                  <select
                    value={interrupts.int0.targetVariable || 'V_ESTOP_ACTIVE'}
                    onChange={(e) => {
                      updateInt0({ targetVariable: e.target.value });
                      ensureVariableIsVolatile(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono"
                  >
                    {variables
                      .filter((v) => v.type === 'bool')
                      .map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} (bool flag)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {interrupts.int0.actionType === 'CALL_SUBROUTINE' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300">Meghívandó Alprogram:</span>
                  <select
                    value={interrupts.int0.targetSubroutineId || ''}
                    onChange={(e) => updateInt0({ targetSubroutineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  >
                    <option value="">-- Válassz Alprogramot --</option>
                    {subroutines.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rungs.length} létrafok)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {interrupts.int0.actionType === 'CUSTOM_ISR_CODE' && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Egyéni C++ ISR Kód:
                  </label>
                  <textarea
                    rows={3}
                    value={interrupts.int0.customCppIsr || ''}
                    onChange={(e) => updateInt0({ customCppIsr: e.target.value })}
                    placeholder="V_ENCODER_TICKS++; if (V_ENCODER_TICKS >= 1000) { V_BATCH_DONE = true; }"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-rose-300 text-xs font-mono focus:border-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Megjegyzés / Funkcionális leírás
                </label>
                <input
                  type="text"
                  value={interrupts.int0.description || ''}
                  onChange={(e) => updateInt0({ description: e.target.value })}
                  placeholder="pl. Négyszögjel adó 1000 P/R enkóder az A fázison"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* INT1 Card (D3) */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold text-indigo-400">
                  D3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    INT1 Külső Megszakítás
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Arduino Uno / Nano: Pin D3</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {interrupts.int1.enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
                </span>
                <button
                  type="button"
                  onClick={() => updateInt1({ enabled: !interrupts.int1.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    interrupts.int1.enabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      interrupts.int1.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Megszakítás Megnevezése / Feladata
                </label>
                <input
                  type="text"
                  value={interrupts.int1.name}
                  onChange={(e) => updateInt1({ name: e.target.value })}
                  placeholder="pl. Hardveres Vészleállító (E-STOP)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Trigger Kiváltó Élmód
                  </label>
                  <select
                    value={interrupts.int1.mode}
                    onChange={(e) => updateInt1({ mode: e.target.value as InterruptTriggerMode })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="FALLING">FALLING (Lefutó él 1-&gt;0)</option>
                    <option value="RISING">RISING (Felfutó él 0-&gt;1)</option>
                    <option value="CHANGE">CHANGE (Bármely élváltás)</option>
                    <option value="LOW">LOW (Alacsony jelszint)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Végrehajtandó Művelet (Action)
                  </label>
                  <select
                    value={interrupts.int1.actionType}
                    onChange={(e) => updateInt1({ actionType: e.target.value as InterruptActionType })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SET_FLAG">Biztonsági Flag Aktiválás (E-STOP)</option>
                    <option value="INCREMENT_VAR">Számláló Inkrementálás (HSC)</option>
                    <option value="CALL_SUBROUTINE">Alprogram Meghívása (FC)</option>
                    <option value="CUSTOM_ISR_CODE">Egyéni C++ ISR Kód</option>
                  </select>
                </div>
              </div>

              {/* Action specific fields */}
              {interrupts.int1.actionType === 'SET_FLAG' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Aktiválandó Vészjelző Változó:</span>
                    <span className="text-[10px] text-amber-400 font-mono">Automatikusan volatile!</span>
                  </div>
                  <select
                    value={interrupts.int1.targetVariable || 'V_ESTOP_ACTIVE'}
                    onChange={(e) => {
                      updateInt1({ targetVariable: e.target.value });
                      ensureVariableIsVolatile(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-indigo-500"
                  >
                    {variables
                      .filter((v) => v.type === 'bool')
                      .map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} (bool flag)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {interrupts.int1.actionType === 'INCREMENT_VAR' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300">Cél Változó:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={interrupts.int1.targetVariable || 'V_ENCODER_TICKS'}
                      onChange={(e) => {
                        updateInt1({ targetVariable: e.target.value });
                        ensureVariableIsVolatile(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono"
                    >
                      {variables.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={interrupts.int1.incrementStep ?? 1}
                      onChange={(e) => updateInt1({ incrementStep: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {interrupts.int1.actionType === 'CALL_SUBROUTINE' && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300">Meghívandó Alprogram:</span>
                  <select
                    value={interrupts.int1.targetSubroutineId || ''}
                    onChange={(e) => updateInt1({ targetSubroutineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  >
                    <option value="">-- Válassz Alprogramot --</option>
                    {subroutines.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rungs.length} létrafok)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {interrupts.int1.actionType === 'CUSTOM_ISR_CODE' && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Egyéni C++ ISR Kód:
                  </label>
                  <textarea
                    rows={3}
                    value={interrupts.int1.customCppIsr || ''}
                    onChange={(e) => updateInt1({ customCppIsr: e.target.value })}
                    placeholder="V_ESTOP_ACTIVE = true; digitalWrite(8, LOW);"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 text-xs font-mono focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Megjegyzés / Funkcionális leírás
                </label>
                <input
                  type="text"
                  value={interrupts.int1.description || ''}
                  onChange={(e) => updateInt1({ description: e.target.value })}
                  placeholder="pl. Pult oldali NC biztonsági retesz érintkező"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMER INTERRUPT */}
      {activeTab === 'timer' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Timer1 Hardveres Időzítő Megszakítás (Periodic Timer ISR)
                </h3>
                <p className="text-xs text-slate-400">
                  16-bites hardveres CTC időzítő izokron, determinisztikus szabályozáshoz (pl. PID, szekvenszer)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateTimer1({ enabled: !interrupts.timer1.enabled })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                interrupts.timer1.enabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  interrupts.timer1.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Időzítő Megszakítás Neve
              </label>
              <input
                type="text"
                value={interrupts.timer1.name}
                onChange={(e) => updateTimer1({ name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mintavételezési Periódus (ms)
                </label>
                <select
                  value={interrupts.timer1.intervalMs}
                  onChange={(e) => updateTimer1({ intervalMs: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono"
                >
                  <option value={1}>1 ms (1000 Hz - Ultramagas frekvencia)</option>
                  <option value={2}>2 ms (500 Hz)</option>
                  <option value={5}>5 ms (200 Hz)</option>
                  <option value={10}>10 ms (100 Hz - Szabványos szabályozás)</option>
                  <option value={20}>20 ms (50 Hz)</option>
                  <option value={50}>50 ms (20 Hz)</option>
                  <option value={100}>100 ms (10 Hz)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Végrehajtandó Művelet
                </label>
                <select
                  value={interrupts.timer1.actionType}
                  onChange={(e) => updateTimer1({ actionType: e.target.value as InterruptActionType })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                >
                  <option value="CALL_SUBROUTINE">Alprogram Meghívása (FC)</option>
                  <option value="CUSTOM_ISR_CODE">Egyéni C++ ISR Kód</option>
                  <option value="INCREMENT_VAR">Számláló Inkrementálás</option>
                </select>
              </div>
            </div>

            {interrupts.timer1.actionType === 'CALL_SUBROUTINE' && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300">Periodikusan lefutó Alprogram:</span>
                <select
                  value={interrupts.timer1.targetSubroutineId || ''}
                  onChange={(e) => updateTimer1({ targetSubroutineId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs"
                >
                  <option value="">-- Válassz Alprogramot --</option>
                  {subroutines.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rungs.length} létrafok)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {interrupts.timer1.actionType === 'CUSTOM_ISR_CODE' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Egyéni Timer1 C++ ISR Kód:
                </label>
                <textarea
                  rows={3}
                  value={interrupts.timer1.customCppIsr || ''}
                  onChange={(e) => updateTimer1({ customCppIsr: e.target.value })}
                  placeholder="// gyors számítások az időzített megszakításban"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GENERATED C++ CODE & THEORY */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              Generált C++ Megszakítási Kód Előnézete (.ino kimenet)
            </h3>
            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {generatePreviewCode()}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Miért kritikus a PLC-ben?
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A PLC programok ciklikusan futnak (pl. 20 ms). Ha egy gyors tengely 2 ms alatt ad egy impulzust, a normál beolvasás
                az esetek 90%-ában lemaradna róla. A hardver megszakítás viszont mikromásodpercen belül reagál.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> A 'volatile' kulcsszó
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Minden olyan változót, amelyet egy megszakításban módosítunk (pl. számláló), a mikrokontroller C++ fordítója számára
                <span className="text-amber-300 font-mono"> volatile</span>-nak kell deklarálni, hogy ne a regiszterekből, hanem a valódi SRAM-ból olvassa a főciklus.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Hardveres Vészleállító (E-STOP)
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A D3 / INT1 megszakítás FALLING élre állítva azonnal érzékeli a biztonsági relé vagy a vészgomb lefutó élét,
                azonnal reteszeli a kimeneteket, még mielőtt a főciklus egyetlen sort is futna.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
