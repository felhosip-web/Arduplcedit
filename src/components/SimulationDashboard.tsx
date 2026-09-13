import React from 'react';
import { SimulationState, Rung } from '../types';
import { Play, Square, Gauge, Cpu, Eye, Radio, Sparkles, Activity } from 'lucide-react';

interface SimulationDashboardProps {
  simulationState: SimulationState;
  onToggleInput: (pin: string) => void;
  onSetInput: (pin: string, value: boolean) => void;
  onSetAnalogInput: (key: string, value: number) => void;
  onToggleSimulation: () => void;
  rungs: Rung[];
}

export const SimulationDashboard: React.FC<SimulationDashboardProps> = ({
  simulationState,
  onToggleInput,
  onSetInput,
  onSetAnalogInput,
  onToggleSimulation,
  rungs
}) => {
  // Extract all inputs referenced in the ladder
  const inputPinLabels: Record<string, string> = {};
  const outputPinLabels: Record<string, string> = {};

  rungs.forEach(r => {
    r.branches.forEach(b => {
      b.elements.forEach(e => {
        if (e.pin && e.category === 'contact') {
          inputPinLabels[e.pin] = e.name;
        }
      });
    });
    r.coils.forEach(e => {
      if (e.pin && (e.category === 'coil' || e.category === 'library_module')) {
        outputPinLabels[e.pin] = e.name;
      }
    });
  });

  const digitalInputPins = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
  const digitalOutputPins = ['D8', 'D9', 'D10', 'D11', 'D12', 'D13'];

  // Check which peripherals are used
  const usesServo = Object.keys(simulationState.servoAngles).length > 0;
  const usesLcd = rungs.some(r => r.coils.some(c => c.type === 'LCD_PRINT'));
  const usesDht = rungs.some(r => r.branches.some(b => b.elements.some(e => e.variable === 'DHT_TEMP' || e.variable === 'DHT_HUM')) || r.coils.some(c => c.type === 'DHT_READ'));
  const usesNeoPixel = rungs.some(r => r.coils.some(c => c.type === 'NEOPIXEL_SET'));

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4 shadow-xl">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                simulationState.isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/50'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
              }`}
            >
              {simulationState.isRunning ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> SZIMULÁCIÓ LEÁLLÍTÁSA (STOP)
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> SZIMULÁCIÓ INDÍTÁSA (RUN)
                </>
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                simulationState.isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-slate-600'
              }`} />
              <span className="text-slate-300">
                PLC ÁLLAPOT: <strong className={simulationState.isRunning ? 'text-emerald-400' : 'text-slate-500'}>
                  {simulationState.isRunning ? 'RUNNING (50 Hz)' : 'STOPPED'}
                </strong>
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Kattints a bemeneti gombokra az áramkör teszteléséhez valós időben!</span>
          </div>
        </div>

        {/* Testbench Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Digitális Bemenetek (Switches & Buttons) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Radio className="w-4 h-4" /> BEMENETEK (D2 - D7)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">INPUT_PULLUP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {digitalInputPins.map((pin) => {
                const isHigh = !!simulationState.digitalInputs[pin];
                const label = inputPinLabels[pin] || `Bemenet ${pin}`;
                const isUsed = !!inputPinLabels[pin];

                return (
                  <div
                    key={pin}
                    className={`p-2 rounded-lg border transition-all flex flex-col justify-between ${
                      isHigh
                        ? 'bg-sky-950/50 border-sky-400/80 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : isUsed
                        ? 'bg-slate-900 border-slate-700/80'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-200">{pin}</span>
                      <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-slate-700'}`} />
                    </div>
                    <div className="text-[10px] text-slate-400 truncate my-1" title={label}>
                      {label}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {/* Toggle button */}
                      <button
                        type="button"
                        onClick={() => onToggleInput(pin)}
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${
                          isHigh
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isHigh ? 'BE' : 'KI'}
                      </button>
                      {/* Momentary push button */}
                      <button
                        type="button"
                        onMouseDown={() => onSetInput(pin, true)}
                        onMouseUp={() => onSetInput(pin, false)}
                        onTouchStart={() => onSetInput(pin, true)}
                        onTouchEnd={() => onSetInput(pin, false)}
                        className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 text-slate-300 rounded text-[9px] font-mono select-none"
                        title="Nyomógomb (nyomva tartva aktív)"
                      >
                        PULSE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Digitális Kimenetek & Relék (D8 - D13) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-4 h-4" /> KIMENETEK & RELÉK (D8 - D13)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">24V / RELAY</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {digitalOutputPins.map((pin) => {
                const isHigh = !!simulationState.digitalOutputs[pin];
                const label = outputPinLabels[pin] || `Kimenet ${pin}`;
                const isUsed = !!outputPinLabels[pin];

                return (
                  <div
                    key={pin}
                    className={`p-2 rounded-lg border transition-all flex flex-col justify-between ${
                      isHigh
                        ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : isUsed
                        ? 'bg-slate-900 border-slate-700/80'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-200">{pin}</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full border border-white/20 transition-all ${
                          isHigh
                            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]'
                            : 'bg-slate-800'
                        }`} />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate my-1 font-medium" title={label}>
                      {label}
                    </div>
                    <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-center ${
                      isHigh ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isHigh ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Analóg & Szenzor Bemenetek */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Gauge className="w-4 h-4" /> ANALÓG & SZENZOROK
              </span>
              <span className="text-[10px] text-slate-400 font-mono">A0..A5</span>
            </div>

            {/* A0 Potentiometer */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>A0 Potméter:</span>
                <span className="text-amber-400 font-bold">{simulationState.analogInputs['A0'] ?? 512}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1023"
                value={simulationState.analogInputs['A0'] ?? 512}
                onChange={(e) => onSetAnalogInput('A0', Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* DHT Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>DHT Hőmérséklet:</span>
                <span className="text-rose-400 font-bold">{(simulationState.analogInputs['DHT_TEMP'] ?? 24).toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={simulationState.analogInputs['DHT_TEMP'] ?? 24}
                onChange={(e) => onSetAnalogInput('DHT_TEMP', Number(e.target.value))}
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* DHT Humidity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>DHT Páratartalom:</span>
                <span className="text-sky-400 font-bold">{(simulationState.analogInputs['DHT_HUM'] ?? 55).toFixed(0)} %</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={simulationState.analogInputs['DHT_HUM'] ?? 55}
                onChange={(e) => onSetAnalogInput('DHT_HUM', Number(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Virtuális Hardver Perifériák (LCD, Servo, NeoPixel) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Cpu className="w-4 h-4" /> KÖNYVTÁR PERIFÉRIÁK
              </span>
              <span className="text-[10px] text-slate-400 font-mono">I2C / PWM</span>
            </div>

            {/* 16x2 Virtual I2C LCD Display */}
            <div className="p-2.5 bg-blue-900 border-2 border-slate-700 rounded-lg shadow-inner font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-blue-300/80 mb-1 border-b border-blue-800/80 pb-0.5">
                <span>16x2 I2C LCD (0x27)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="bg-blue-950/90 text-sky-100 p-1.5 rounded border border-blue-700/50 space-y-0.5 tracking-wider font-bold">
                <div className="truncate h-4">{simulationState.lcdLines[0] || 'ARDUINO PLC...'}</div>
                <div className="truncate h-4">{simulationState.lcdLines[1] || 'ALLOK...'}</div>
              </div>
            </div>

            {/* Servo Gauge */}
            <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-xs">
                <div className="text-slate-400 text-[10px]">SZERVÓ MOTOR (D9)</div>
                <div className="font-mono text-cyan-300 font-bold text-sm">
                  {simulationState.servoAngles['D9'] ?? 0}°
                </div>
              </div>
              {/* Rotating gauge needle */}
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 relative flex items-center justify-center bg-slate-950">
                <div
                  className="w-4 h-0.5 bg-cyan-400 origin-left absolute left-1/2 transition-transform duration-300"
                  style={{ transform: `rotate(${(simulationState.servoAngles['D9'] ?? 0) - 90}deg)` }}
                />
                <div className="w-1.5 h-1.5 bg-cyan-200 rounded-full z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
