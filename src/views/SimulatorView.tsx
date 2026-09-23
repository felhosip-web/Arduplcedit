import React, { useState } from 'react';
import { SimulationState, Rung, Subroutine, PLCConstant, PLCVariable, PLCArray, ProtocolConfigs } from '../types';
import { Play, Square, StepForward, RotateCcw, Activity, Gauge, Cpu, Radio, Sparkles, Sliders, Layers, Eye } from 'lucide-react';
import { ElementBlock } from '../components/ElementBlock';
import { ProtocolTelemetryPanel } from '../components/simulator/ProtocolTelemetryPanel';

interface SimulatorViewProps {
  simulationState: SimulationState;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  onStepSimulation: () => void;
  onToggleInput: (pin: string) => void;
  onSetInput: (pin: string, val: boolean) => void;
  onSetAnalogInput: (key: string, val: number) => void;
  mainRungs: Rung[];
  subroutines: Subroutine[];
  constants?: PLCConstant[];
  variables?: PLCVariable[];
  arrays?: PLCArray[];
  protocols?: ProtocolConfigs;
  onSetVariableValue?: (name: string, value: number | boolean | string) => void;
  onSetDallasTemp?: (temp: number) => void;
  onSimulateUartReceive?: (message: string) => void;
  onSimulateNrfReceive?: (payload: string) => void;
  onSetEeprom24cMemory?: (address: string, value: number) => void;
  onSimulateSDLog?: (content: string) => void;
  onSyncRTC?: () => void;
  onClearLogs?: () => void;
  onNavigateToDiagnostics?: () => void;
  onForceInput?: (element: LadderElement, forceValue?: boolean) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  simulationState,
  onToggleSimulation,
  onResetSimulation,
  onStepSimulation,
  onToggleInput,
  onSetInput,
  onSetAnalogInput,
  mainRungs,
  subroutines,
  constants,
  variables,
  arrays,
  protocols,
  onSetVariableValue,
  onSetDallasTemp,
  onSimulateUartReceive,
  onSimulateNrfReceive,
  onSetEeprom24cMemory,
  onSimulateSDLog,
  onSyncRTC,
  onClearLogs,
  onNavigateToDiagnostics,
  onForceInput
}) => {
  // Input button modes: toggle (switch) or momentary (pushbutton)
  const [inputModes, setInputModes] = useState<Record<string, 'push' | 'toggle'>>({
    D2: 'push',
    D3: 'push',
    D4: 'toggle',
    D5: 'toggle',
    D6: 'toggle',
    D7: 'toggle'
  });

  const [activeMonitorTab, setActiveMonitorTab] = useState<'main' | string>('main');

  const toggleInputMode = (pin: string) => {
    setInputModes((prev) => ({
      ...prev,
      [pin]: prev[pin] === 'push' ? 'toggle' : 'push'
    }));
  };

  // Find labels for pins in current rungs
  const inputPinLabels: Record<string, string> = {};
  const outputPinLabels: Record<string, string> = {};

  const currentRungsToInspect = activeMonitorTab === 'main'
    ? mainRungs
    : subroutines.find((s) => s.id === activeMonitorTab)?.rungs || mainRungs;

  mainRungs.forEach((r) => {
    r.branches.forEach((b) => {
      b.elements.forEach((e) => {
        if (e.pin && e.category === 'contact') inputPinLabels[e.pin] = e.name;
      });
    });
    r.coils.forEach((e) => {
      if (e.pin) outputPinLabels[e.pin] = e.name;
    });
  });

  const digitalInputPins = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
  const digitalOutputPins = ['D8', 'D9', 'D10', 'D11', 'D12', 'D13'];
  const flagKeys = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950 p-5 space-y-6">
      {/* Top Header & Simulation Scan Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* RUN / STOP main toggle */}
          <button
            type="button"
            onClick={onToggleSimulation}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 shadow-xl transition-all ${
              simulationState.isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/40'
            }`}
          >
            {simulationState.isRunning ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                <span>LEÁLLÍTÁS (STOP)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>SZIMULÁCIÓ INDÍTÁSA (RUN)</span>
              </>
            )}
          </button>

          {/* Single Step button */}
          <button
            type="button"
            onClick={onStepSimulation}
            disabled={simulationState.isRunning}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Egyetlen PLC ciklus (Scan cycle) végrehajtása manuálisan"
          >
            <StepForward className="w-4 h-4 text-sky-400" />
            <span>Léptetés (Step)</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onResetSimulation}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Összes bemenet, időzítő és kimenet visszaállítása alaphelyzetbe"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Alaphelyzet</span>
          </button>

          {/* Live Status indicator */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
            <span
              className={`w-3 h-3 rounded-full ${
                simulationState.isRunning
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-300 font-medium">
              PLC SCAN:{' '}
              <strong className={simulationState.isRunning ? 'text-emerald-400' : 'text-slate-500'}>
                {simulationState.isRunning ? '50 Hz (20ms ciklus)' : 'KÉSZENLÉT (STOP)'}
              </strong>
            </span>
          </div>

          {/* Live Scan Time & CPU Load Telemetry Badge */}
          {simulationState.scanDiagnostics && (
            <button
              type="button"
              onClick={onNavigateToDiagnostics}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 font-mono text-xs transition-colors group cursor-pointer"
              title="Kattints a részletes Diagnosztika & CPU Profiler megnyitásához"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-slate-400">Scan:</span>
              <span className="text-cyan-300 font-bold">
                {simulationState.scanDiagnostics.lastScanUs} µs
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">CPU:</span>
              <span
                className={`font-bold ${
                  simulationState.scanDiagnostics.cpuLoadPercent > 80
                    ? 'text-rose-400'
                    : simulationState.scanDiagnostics.cpuLoadPercent > 40
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {simulationState.scanDiagnostics.cpuLoadPercent}%
              </span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Interaktív tesztpad: kattints a gombokra, húzd a csúszkákat és figyeld az élő létrát!</span>
        </div>
      </div>

      {/* Main Interactive Testbench Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Digitális Bemenetek (D2 - D7) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 font-bold text-xs text-sky-400 uppercase tracking-wider">
              <Radio className="w-4 h-4" /> Bemenetek (D2 - D7)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Nyomó / Kapcsoló</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {digitalInputPins.map((pin) => {
              const isHigh = !!simulationState.digitalInputs[pin];
              const mode = inputModes[pin] || 'push';
              const label = inputPinLabels[pin] || `Bemenet ${pin}`;

              return (
                <div
                  key={pin}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isHigh
                      ? 'bg-sky-950/60 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-slate-200">{pin}</span>
                    <button
                      type="button"
                      onClick={() => toggleInputMode(pin)}
                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                      title="Váltás nyomógomb (push) és kapcsoló (toggle) mód között"
                    >
                      {mode === 'push' ? 'GOMB' : 'KAPCS'}
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate mb-2" title={label}>
                    {label}
                  </div>

                  {/* Interactive Button */}
                  {mode === 'push' ? (
                    <button
                      type="button"
                      onMouseDown={() => onSetInput(pin, true)}
                      onMouseUp={() => onSetInput(pin, false)}
                      onMouseLeave={() => onSetInput(pin, false)}
                      onTouchStart={() => onSetInput(pin, true)}
                      onTouchEnd={() => onSetInput(pin, false)}
                      className={`w-full py-1.5 rounded-lg font-mono text-xs font-bold transition-all select-none ${
                        isHigh
                          ? 'bg-sky-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950'
                      }`}
                    >
                      {isHigh ? 'NYOMVA (1)' : 'NYOMÁS (0)'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleInput(pin)}
                      className={`w-full py-1.5 rounded-lg font-mono text-xs font-bold transition-all select-none ${
                        isHigh
                          ? 'bg-sky-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isHigh ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Analóg Bemenetek & Szenzorok */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 font-bold text-xs text-amber-400 uppercase tracking-wider">
              <Gauge className="w-4 h-4" /> Analóg & Szenzorok
            </span>
            <span className="text-[10px] text-slate-500 font-mono">A0 & DHT</span>
          </div>

          {/* Potentiometer A0 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">Potenciométer A0:</span>
              <span className="text-amber-400 font-bold">
                {simulationState.analogInputs['A0'] ?? 512} ({((simulationState.analogInputs['A0'] ?? 512) * (5.0 / 1023.0)).toFixed(2)}V)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1023"
              value={simulationState.analogInputs['A0'] ?? 512}
              onChange={(e) => onSetAnalogInput('A0', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* DHT Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">DHT Hőmérséklet:</span>
              <span className="text-rose-400 font-bold">
                {(simulationState.analogInputs['DHT_TEMP'] ?? 24.5).toFixed(1)} °C
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="0.5"
              value={simulationState.analogInputs['DHT_TEMP'] ?? 24.5}
              onChange={(e) => onSetAnalogInput('DHT_TEMP', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Ultrasonic Distance */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">HC-SR04 Távolság:</span>
              <span className="text-cyan-400 font-bold">
                {simulationState.analogInputs['ULTRASONIC'] ?? 35} cm
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="300"
              value={simulationState.analogInputs['ULTRASONIC'] ?? 35}
              onChange={(e) => onSetAnalogInput('ULTRASONIC', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* 3. Digitális Kimenetek (Relék & LED D8 - D13) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 font-bold text-xs text-emerald-400 uppercase tracking-wider">
              <Cpu className="w-4 h-4" /> Kimenetek & Relék (D8 - D13)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Állapot</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {digitalOutputPins.map((pin) => {
              const isHigh = !!simulationState.digitalOutputs[pin];
              const label = outputPinLabels[pin] || `Kimenet ${pin}`;
              const pwmVal = simulationState.pwmOutputs[pin];

              return (
                <div
                  key={pin}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isHigh
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-slate-200">{pin}</span>
                    <span
                      className={`w-3 h-3 rounded-full border transition-all ${
                        isHigh
                          ? 'bg-emerald-400 border-white shadow-[0_0_8px_rgba(52,211,153,1)]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  </div>

                  <div className="text-[10px] text-slate-400 truncate" title={label}>
                    {label}
                  </div>

                  <div className="mt-2 text-center py-1 rounded bg-slate-900/90 border border-slate-800 font-mono text-[11px] font-bold">
                    {pwmVal !== undefined && pwmVal > 0 ? (
                      <span className="text-cyan-400">PWM: {pwmVal}</span>
                    ) : isHigh ? (
                      <span className="text-emerald-300">BEKAPCSOLVA</span>
                    ) : (
                      <span className="text-slate-500">KIKAPCSOLVA</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Interaktív Perifériák (LCD, Servo, NeoPixel, Markerek) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 font-bold text-xs text-purple-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Modulok & Perifériák
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Hardver</span>
          </div>

          {/* I2C 16x2 LCD Display */}
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 rounded-xl shadow-inner font-mono text-xs">
            <div className="text-[9px] text-emerald-400/80 uppercase font-bold tracking-widest mb-1">
              HD44780 16x2 I2C LCD Kijelző
            </div>
            <div className="bg-emerald-900/60 p-2 rounded border border-emerald-600/40 text-emerald-200 tracking-wider space-y-0.5 select-none font-bold">
              <div className="truncate">{simulationState.lcdLines[0]}</div>
              <div className="truncate">{simulationState.lcdLines[1]}</div>
            </div>
          </div>

          {/* Servo & NeoPixel row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Servo visual dial */}
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
              <div className="text-[10px] text-cyan-400 font-mono mb-1 font-bold">SZERVÓ TENGELY</div>
              <div className="relative w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-900">
                <div
                  className="absolute w-1 h-5 bg-cyan-400 origin-bottom rounded transition-transform duration-200"
                  style={{ transform: `rotate(${(simulationState.servoAngles['D9'] ?? 90) - 90}deg)` }}
                />
                <div className="w-2 h-2 rounded-full bg-slate-300 z-10" />
              </div>
              <div className="text-[11px] font-mono text-cyan-300 font-bold mt-1">
                {simulationState.servoAngles['D9'] ?? 90}°
              </div>
            </div>

            {/* NeoPixel LEDs */}
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
              <div className="text-[10px] text-purple-400 font-mono mb-1 font-bold">NEOPIXEL SZALAG</div>
              <div className="grid grid-cols-4 gap-1.5 my-1">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                  const color = simulationState.neoPixelColors[idx] || '#222';
                  return (
                    <span
                      key={idx}
                      className="w-3.5 h-3.5 rounded-full border border-white/20 transition-colors"
                      style={{ backgroundColor: color, boxShadow: color !== '#222' ? `0 0 6px ${color}` : undefined }}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] font-mono text-slate-400">8x WS2812 RGB</div>
            </div>
          </div>

          {/* Memory Flags (M0 - M7) */}
          <div>
            <div className="text-[10px] text-slate-400 font-mono mb-1 flex items-center justify-between">
              <span>BELSŐ FLAGS (M0 - M7):</span>
            </div>
            <div className="grid grid-cols-8 gap-1 font-mono text-center text-[10px]">
              {flagKeys.map((f) => {
                const active = !!simulationState.internalFlags[f];
                return (
                  <div
                    key={f}
                    className={`py-1 rounded border transition-colors ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {f}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Industrial Protocols & Process Variables Live Telemetry Panel */}
      <ProtocolTelemetryPanel
        simulationState={simulationState}
        constants={constants}
        variables={variables}
        arrays={arrays}
        protocols={protocols}
        onSetVariableValue={onSetVariableValue}
        onSetDallasTemp={onSetDallasTemp}
        onSimulateUartReceive={onSimulateUartReceive}
        onSimulateNrfReceive={onSimulateNrfReceive}
        onSetEeprom24cMemory={onSetEeprom24cMemory}
        onSimulateSDLog={onSimulateSDLog}
        onSyncRTC={onSyncRTC}
        onClearLogs={onClearLogs}
      />

      {/* Real-time Execution Monitor (Live Ladder View) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>Valós Idejű Létra Végrehajtás Monitor (Live Execution)</span>
                {simulationState.isRunning && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
                    LIVE SCANNING
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                A zöld vonalak és elemek jelzik az áramló logikai tápfeszültséget és a végrehajtott alprogramokat.
              </p>
            </div>
          </div>

          {/* Selector for Main Ladder vs Subroutine live monitor */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveMonitorTab('main')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeMonitorTab === 'main'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Főprogram ({mainRungs.length} fok)
            </button>
            {subroutines.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveMonitorTab(sub.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeMonitorTab === sub.id
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Ladder Canvas Render */}
        <div className="space-y-4 pt-2">
          {currentRungsToInspect.map((rung) => {
            const isRungEnergized = !!simulationState.activeRungs[rung.id];

            return (
              <div
                key={rung.id}
                className={`p-4 rounded-xl border transition-all ${
                  isRungEnergized
                    ? 'bg-slate-900/90 border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                {/* Rung Header */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400">Fok #{rung.number}</span>
                    {rung.comment && <span className="text-slate-400 italic">"{rung.comment}"</span>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isRungEnergized ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {isRungEnergized ? 'TÁPFESZÜLTSÉG ALATT (ON)' : 'NYITOTT (OFF)'}
                  </span>
                </div>

                {/* Ladder Diagram Circuit representation */}
                <div className="flex items-center gap-3">
                  {/* Left Power Rail */}
                  <div className="w-2.5 h-16 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />

                  {/* Branches & Elements */}
                  <div className="flex-1 flex flex-col gap-2">
                    {rung.branches.map((branch) => {
                      const isBranchActive = !!simulationState.activeBranches[branch.id];
                      return (
                        <div key={branch.id} className="flex items-center gap-2 relative">
                          <div className={`h-0.5 w-6 ${isBranchActive ? 'bg-emerald-400' : 'bg-slate-700'}`} />

                          {branch.elements.length === 0 ? (
                            <span className="text-xs text-slate-600 font-mono italic px-2">Vezeték (üres)</span>
                          ) : (
                            branch.elements.map((el) => {
                              const isElActive = !!simulationState.activeElements[el.id];
                              return (
                                <div key={el.id} className="flex items-center">
                                  <ElementBlock
                                    element={el}
                                    isActive={isElActive}
                                    isSimulating={simulationState.isRunning}
                                    timerState={el.variable ? simulationState.timerStates[el.variable] : undefined}
                                    counterState={el.variable ? simulationState.counterStates[el.variable] : undefined}
                                    onSelect={() => {}}
                                    onDelete={() => {}}
                                    onForceInput={onForceInput}
                                  />
                                  <div className={`h-0.5 w-4 ${isElActive ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                                </div>
                              );
                            })
                          )}

                          <div className={`h-0.5 flex-1 ${isBranchActive ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Coils & Output Blocks */}
                  <div className="flex items-center gap-2 pl-2">
                    {rung.coils.map((c) => {
                      const isCoilActive = isRungEnergized;
                      return (
                        <ElementBlock
                          key={c.id}
                          element={c}
                          isActive={isCoilActive}
                          isSimulating={simulationState.isRunning}
                          timerState={c.variable ? simulationState.timerStates[c.variable] : undefined}
                          counterState={c.variable ? simulationState.counterStates[c.variable] : undefined}
                          onSelect={() => {}}
                          onDelete={() => {}}
                          onForceInput={onForceInput}
                        />
                      );
                    })}
                  </div>

                  {/* Right Neutral Rail */}
                  <div className="w-2.5 h-16 bg-slate-700 rounded-sm shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
