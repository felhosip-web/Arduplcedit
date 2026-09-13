import React, { useState } from 'react';
import { SimulationState, PLCConstant, PLCVariable, PLCArray, ProtocolConfigs } from '../../types';
import {
  Radio,
  Network,
  Cpu,
  Thermometer,
  Layers,
  Variable,
  Hash,
  Send,
  Trash2,
  Sliders,
  Sparkles,
  ArrowRight,
  Wifi,
  Database,
  HardDrive,
  ListOrdered,
  ArrowRightLeft,
  Clock,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';

interface ProtocolTelemetryPanelProps {
  simulationState: SimulationState;
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
}

export const ProtocolTelemetryPanel: React.FC<ProtocolTelemetryPanelProps> = ({
  simulationState,
  constants = [],
  variables = [],
  arrays = [],
  protocols,
  onSetVariableValue,
  onSetDallasTemp,
  onSimulateUartReceive,
  onSimulateNrfReceive,
  onSetEeprom24cMemory,
  onSimulateSDLog,
  onSyncRTC,
  onClearLogs
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'uart' | 'i2c' | 'spi' | 'dallas' | 'nrf24' | 'eeprom24c' | 'buffers' | 'rtc' | 'sd' | 'interrupts' | 'expanders'>('variables');
  const [uartInputText, setUartInputText] = useState('');
  const [nrfInputText, setNrfInputText] = useState('');
  const [eepromTestAddr, setEepromTestAddr] = useState('0x0010');
  const [eepromTestVal, setEepromTestVal] = useState('100');
  const [sdCustomLog, setSdCustomLog] = useState('V_TEMP_C: 25.4, ALARM: 0');

  const handleSendUart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uartInputText.trim()) return;
    if (onSimulateUartReceive) {
      onSimulateUartReceive(uartInputText.trim());
    }
    setUartInputText('');
  };

  const handleSendNrf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nrfInputText.trim()) return;
    if (onSimulateNrfReceive) {
      onSimulateNrfReceive(nrfInputText.trim());
    }
    setNrfInputText('');
  };

  const handleWriteEeprom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eepromTestAddr.trim()) return;
    const num = parseFloat(eepromTestVal) || 0;
    if (onSetEeprom24cMemory) {
      onSetEeprom24cMemory(eepromTestAddr.trim(), num);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Panel Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span>Ipari Protokollok & Változók Telemetria Központ</span>
              {simulationState.isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Valós idejű buszfigyelő, soros konzol, Dallas hőszenzor emulátor és dinamikus folyamatváltozó monitor.
            </p>
          </div>
        </div>

        {/* Tab selection buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'variables'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Variable className="w-3.5 h-3.5" />
            <span>Változók & Tömbök</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('uart')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'uart'
                ? 'bg-indigo-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>UART Soros ({simulationState.uartLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('i2c')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'i2c'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>I2C Busz ({simulationState.i2cLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spi')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'spi'
                ? 'bg-blue-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>SPI Busz ({simulationState.spiLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dallas')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'dallas'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Dallas 1-Wire ({simulationState.dallasTemp}°C)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nrf24')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'nrf24'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>NRF24 RF ({(simulationState.nrf24Logs || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('eeprom24c')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'eeprom24c'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>24Cxxx EEPROM ({Object.keys(simulationState.eeprom24cMemory || {}).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('buffers')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'buffers'
                ? 'bg-teal-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Puffer / FIFO-LIFO ({(simulationState.bufferLogs || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rtc')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'rtc'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              RTC Óra (
              {simulationState.rtcTime
                ? `${String(simulationState.rtcTime.hour).padStart(2, '0')}:${String(simulationState.rtcTime.minute).padStart(2, '0')}:${String(simulationState.rtcTime.second).padStart(2, '0')}`
                : '00:00:00'}
              )
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sd')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'sd'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>SD Kártya ({(simulationState.sdCardLogs || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interrupts')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'interrupts'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Megszakítások ({(simulationState.interruptLogs || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expanders')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'expanders'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>I/O Bővítők ({(simulationState.expanderLogs || []).length})</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. TAB: VARIABLES & ARRAYS LIVE MONITOR */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'variables' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          {/* Variables Column */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Variable className="w-4 h-4" /> PLC Folyamatváltozók Értékei
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Dinamikus RAM</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {variables.map((v) => {
                const liveVal =
                  simulationState.variableValues[v.name] !== undefined
                    ? simulationState.variableValues[v.name]
                    : v.initialValue;

                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg hover:border-amber-500/50 transition-colors"
                  >
                    <div>
                      <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                        <span>{v.name}</span>
                        <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {v.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {v.description || 'Folyamatváltozó'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono font-bold text-emerald-400 text-sm">
                        {String(liveVal)}
                      </div>

                      {/* Manual Override controls */}
                      {typeof liveVal === 'number' && onSetVariableValue && (
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => onSetVariableValue(v.name, Number(liveVal) + 1)}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono font-bold text-[10px]"
                            title="+1"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetVariableValue(v.name, Math.max(0, Number(liveVal) - 1))}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono font-bold text-[10px]"
                            title="-1"
                          >
                            -
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {variables.length === 0 && (
                <div className="text-center py-6 text-slate-500 font-sans">
                  Nincsenek definiált változók. A Menedzsment fülön adhatsz hozzá újakat!
                </div>
              )}
            </div>
          </div>

          {/* Arrays Column */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> PLC Tömbök Élő Regiszterei
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Indexelt Bufferek</span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {arrays.map((a) => {
                const liveArr = simulationState.arrayValues[a.name] || a.values;

                return (
                  <div key={a.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-purple-300">{a.name}</span>
                      <span className="text-[10px] text-slate-400">
                        [{a.size}] {a.elementType}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {liveArr.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded flex items-center gap-1"
                        >
                          <span className="text-slate-500 text-[9px]">[{idx}]</span>
                          <span className="text-emerald-400 font-bold">{String(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {arrays.length === 0 && (
                <div className="text-center py-6 text-slate-500 font-sans">
                  Nincsenek definiált tömbök.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. TAB: UART SERIAL CONSOLE */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'uart' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Hardveres UART Port: 115200 Baud (8N1) &bull; TX/RX Soros Monitor</span>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="hover:text-rose-400 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Konzol törlése
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-52 overflow-y-auto space-y-1 font-mono text-xs">
            {simulationState.uartLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-10 font-sans italic">
                Nincs soros adatforgalom. A [UART TX] létra elemek automatikusan küldik az üzeneteket ide!
              </div>
            ) : (
              simulationState.uartLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-2 hover:bg-slate-900/60 py-0.5 px-1 rounded">
                  <span className="text-slate-500 text-[10px]">[{log.timestamp}]</span>
                  <span
                    className={`font-bold text-[10px] px-1 rounded ${
                      log.direction === 'TX'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {log.direction}
                  </span>
                  <span className={log.direction === 'TX' ? 'text-indigo-200' : 'text-emerald-300'}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Serial RX Input simulator */}
          <form onSubmit={handleSendUart} className="flex items-center gap-2">
            <input
              type="text"
              value={uartInputText}
              onChange={(e) => setUartInputText(e.target.value)}
              placeholder="Soros bemenet szimulálása (RX küldés az Arduinónak)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Küldés
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. TAB: I2C BUS TRAFFIC LOGS */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'i2c' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>I2C (Wire.h) Csomag Napló &bull; SDA: A4 / SCL: A5 &bull; 100 kHz Busz</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="py-1 px-2">Időbélyeg</th>
                  <th className="py-1 px-2">I2C HEX Cím</th>
                  <th className="py-1 px-2">Művelet</th>
                  <th className="py-1 px-2">Átvitt Adat / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {simulationState.i2cLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60">
                    <td className="py-1.5 px-2 text-slate-500 text-[10px]">{log.timestamp}</td>
                    <td className="py-1.5 px-2 font-bold text-cyan-400">{log.address}</td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.op === 'WRITE'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {log.op}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-200">{log.data}</td>
                  </tr>
                ))}
                {simulationState.i2cLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600 font-sans italic">
                      Nincs I2C forgalom. Aktiválj egy [I2C WRITE] vagy [I2C READ] létra elemet!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. TAB: SPI TRANSACTIONS LOGS */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'spi' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>SPI (SPI.h) Tranzakció Napló &bull; SCK: D13 / MISO: D12 / MOSI: D11</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="py-1 px-2">Időbélyeg</th>
                  <th className="py-1 px-2">Chip Select (CS)</th>
                  <th className="py-1 px-2">MOSI (Data Out)</th>
                  <th className="py-1 px-2">MISO (Data In)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {simulationState.spiLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60">
                    <td className="py-1.5 px-2 text-slate-500 text-[10px]">{log.timestamp}</td>
                    <td className="py-1.5 px-2 font-bold text-blue-400">{log.cs}</td>
                    <td className="py-1.5 px-2 text-emerald-300 font-bold">{log.dataOut}</td>
                    <td className="py-1.5 px-2 text-cyan-300 font-bold">{log.dataIn}</td>
                  </tr>
                ))}
                {simulationState.spiLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600 font-sans italic">
                      Nincs SPI tranzakció. Aktiválj egy [SPI XFER] létra elemet!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. TAB: DALLAS 1-WIRE DS18B20 LIVE PROBE */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'dallas' && (
        <div className="space-y-4 font-sans text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-slate-400 text-xs">Aktuális Szimulált Dallas DS18B20 Hőmérséklet:</div>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                {simulationState.dallasTemp.toFixed(1)} °C
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                OneWire DQ Busz: <span className="text-emerald-400 font-mono font-bold">D4</span> &bull; 12-bit felbontás
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Fagy (-10°C)', val: -10 },
                { label: '0°C Fagyás', val: 0 },
                { label: 'Szoba (24°C)', val: 24 },
                { label: 'Riasztás (65°C)', val: 65 },
                { label: 'Forrás (100°C)', val: 100 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onSetDallasTemp && onSetDallasTemp(p.val)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Slider */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-slate-400 text-xs font-mono">
              <span>-55 °C (Min)</span>
              <span className="font-bold text-emerald-400 text-sm">{simulationState.dallasTemp} °C</span>
              <span>+125 °C (Max)</span>
            </div>
            <input
              type="range"
              min={-55}
              max={125}
              step={0.5}
              value={simulationState.dallasTemp}
              onChange={(e) => onSetDallasTemp && onSetDallasTemp(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              A létradiagramban lévő <span className="font-mono text-emerald-400 font-bold">[1-WIRE DS18]</span> blokkok közvetlenül ebből a szondából olvassák a hőmérsékletet és írják be a célváltozóba (pl. <span className="font-mono text-amber-400">V_TEMP_C</span>).
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. TAB: NRF24L01+ 2.4GHz RF TRANSCEIVER MONITOR & INJECTOR */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'nrf24' && (
        <div className="space-y-4 font-sans text-xs">
          {/* Header & Status Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
                  <Wifi className="w-4 h-4" /> nRF24L01+ 2.4GHz RF Adó-Vevő Modul
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30">
                  SPI + CE: D9 / CSN: D10
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                <span>Csatorna: <strong className="text-rose-300">{protocols?.nrf24?.channel ?? 76} ({2400 + (protocols?.nrf24?.channel ?? 76)} MHz)</strong></span>
                <span>Sebesség: <strong className="text-rose-300">{protocols?.nrf24?.dataRate || '1MBPS'}</strong></span>
                <span>Teljesítmény: <strong className="text-rose-300">{protocols?.nrf24?.paLevel || 'HIGH'}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-mono">RX Puffer Állapot:</div>
              <div className="font-mono font-bold text-xs text-rose-300">
                {simulationState.nrf24RxBuffer ? `"${simulationState.nrf24RxBuffer}"` : 'Üres (Várakozás)'}
              </div>
            </div>
          </div>

          {/* Simulated Packet Injector (Incoming RF packet from remote PLC/Node) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-rose-400" /> Vezeték Nélküli Csomag Küldése (RX Emulátor)
              </span>
              <span className="text-[10px] text-slate-400">
                A csomag beérkezésekor az <span className="text-rose-400 font-mono">[NRF24 RX OK]</span> kontakt aktívvá válik!
              </span>
            </div>

            <form onSubmit={handleSendNrf} className="flex gap-2">
              <input
                type="text"
                value={nrfInputText}
                onChange={(e) => setNrfInputText(e.target.value)}
                placeholder="Írj be tetszőleges rádiós payloadot (pl. START_CYCLE, 42.5, SETPOINT_100)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Csomag Küldése</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-500">Gyors tesztcsomagok:</span>
              {[
                'START_CMD',
                'STOP_CMD',
                'SETPOINT:75.0',
                'ALARM_ACK',
                'PING_NODE_2'
              ].map((msg) => (
                <button
                  key={msg}
                  type="button"
                  onClick={() => onSimulateNrfReceive && onSimulateNrfReceive(msg)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 rounded-lg text-slate-300 font-mono text-[10px] transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* RF Packet Traffic Log Stream */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-rose-400" /> NRF24 Rádiós Csomag Forgalmi Napló
              </span>
              {onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors"
                  title="Napló törlése"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] pr-1">
              {(!simulationState.nrf24Logs || simulationState.nrf24Logs.length === 0) ? (
                <div className="text-slate-600 italic text-center py-6">
                  Még nincs NRF24 rádiós csomag rögzítve. Használj NRF24 adás vagy vétel blokkot a létrában!
                </div>
              ) : (
                simulationState.nrf24Logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-900/90 border border-slate-800/80 hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.direction === 'TX'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.direction === 'TX' ? 'TX ADÁS' : 'RX VÉTEL'}
                      </span>
                      <span className="text-slate-400 text-[10px]">CH{log.channel} P{log.pipe}:</span>
                      <span className="font-bold text-slate-100">"{log.payload}"</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[9px] border border-emerald-500/20">
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 7. TAB: 24Cxxx EXTERNAL I2C EEPROM MEMORY MAP & TRANSACTION LOG */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'eeprom24c' && (
        <div className="space-y-4 font-sans text-xs">
          {/* Header & Status Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4" /> 24Cxxx Soros I2C EEPROM Memória Modul
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                  I2C Cím: {protocols?.eeprom24c?.i2cAddress || '0x50'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                <span>Típus: <strong className="text-amber-300">{protocols?.eeprom24c?.chipType || '24C256'}</strong></span>
                <span>Kapacitás: <strong className="text-amber-300">32 KB (256 Kbit)</strong></span>
                <span>Oldalméret: <strong className="text-amber-300">{protocols?.eeprom24c?.pageSizeBytes || 64} Bájt</strong></span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-mono">Tárolt memóriacímek száma:</div>
              <div className="font-mono font-bold text-sm text-amber-300">
                {Object.keys(simulationState.eeprom24cMemory || {}).length} bejegyzés
              </div>
            </div>
          </div>

          {/* Quick Memory Injection / Manual Tester */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-400" /> Közvetlen EEPROM Írás / Beállítás
              </span>
              <span className="text-[10px] text-slate-400">
                Teszteld a recept vagy mentett érték betöltését a létradiagramban!
              </span>
            </div>

            <form onSubmit={handleWriteEeprom} className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono text-[11px]">Cím:</span>
                <input
                  type="text"
                  value={eepromTestAddr}
                  onChange={(e) => setEepromTestAddr(e.target.value)}
                  placeholder="0x0010"
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono text-[11px]">Érték:</span>
                <input
                  type="text"
                  value={eepromTestVal}
                  onChange={(e) => setEepromTestVal(e.target.value)}
                  placeholder="100.5"
                  className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Érték Írása EEPROM-ba</span>
              </button>
            </form>
          </div>

          {/* Memory Inspector & Log Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory Dump Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> EEPROM Memória Tartalom (Non-Volatile)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">I2C Busz</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] pr-1">
                {(!simulationState.eeprom24cMemory || Object.keys(simulationState.eeprom24cMemory).length === 0) ? (
                  <div className="text-slate-600 italic text-center py-6">
                    Még nincs adat az EEPROM-ban. Használj 24C EEPROM író blokkot!
                  </div>
                ) : (
                  Object.entries(simulationState.eeprom24cMemory).map(([addr, val]) => (
                    <div
                      key={addr}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-500/40"
                    >
                      <span className="text-amber-300 font-bold">{addr}</span>
                      <span className="text-slate-400 font-sans text-[10px]">Float / Int</span>
                      <span className="text-slate-100 font-bold">{val}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* EEPROM Transaction Log */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-400" /> I2C Tranzakciós Napló
                </span>
                {onClearLogs && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-900 transition-colors"
                    title="Napló törlése"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] pr-1">
                {(!simulationState.eeprom24cLogs || simulationState.eeprom24cLogs.length === 0) ? (
                  <div className="text-slate-600 italic text-center py-6">
                    Még nincs naplózott I2C EEPROM művelet.
                  </div>
                ) : (
                  simulationState.eeprom24cLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            log.operation === 'WRITE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {log.operation}
                        </span>
                        <span className="text-slate-400">{log.memoryAddress}:</span>
                        <span className="font-bold text-slate-100">{String(log.value)}</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[9px]">
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 8. TAB: FIFO / LIFO QUEUE-STACK & BLKMOV MEMORY TELEMETRY */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'buffers' && (
        <div className="space-y-4 text-xs font-sans">
          {/* Top Info Banner */}
          <div className="bg-teal-950/40 border border-teal-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="font-bold text-teal-200">Ipari Puffer & Veremtár Kezelés (IEC 61131-3)</span>
                <p className="text-[11px] text-teal-400/80">
                  Biztonságos, kötött méretű FIFO (First-In, First-Out) sorok, LIFO (Last-In, First-Out) veremtárak és hardveres BLKMOV memóriablokk átmásolás.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="px-2 py-1 rounded bg-slate-900 border border-teal-800 text-teal-300">
                Sor Mutató: <strong className="text-amber-300">{Number(simulationState.variableValues['V_QUEUE_LEN'] ?? 0)}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-teal-800 text-teal-300">
                Legutóbb kiolvasva: <strong className="text-emerald-300">{String(simulationState.variableValues['V_POPPED_VAL'] ?? 0)}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Active Array Buffers Visualizer */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-teal-400 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" /> PLC Puffer & Adatbázis Tömbök
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Tömb Alapú Memória</span>
              </div>

              <div className="space-y-3">
                {arrays.map((arr) => {
                  const currentVals = simulationState.arrayValues[arr.name] || arr.values;
                  const isQueueBuffer = arr.name === 'QUEUE_BUFFER';
                  const count = isQueueBuffer
                    ? Number(simulationState.variableValues['V_QUEUE_LEN'] ?? 0)
                    : currentVals.filter(v => v !== 0 && v !== '' && v !== false).length;
                  const pct = Math.min(100, Math.round((count / arr.size) * 100));

                  return (
                    <div key={arr.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 font-mono text-xs">{arr.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            [{arr.size}] ({arr.elementType})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            count === 0
                              ? 'bg-slate-800 text-slate-400'
                              : count >= arr.size
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          }`}>
                            {count === 0 ? 'ÜRES (EMPTY)' : count >= arr.size ? 'TELE (FULL)' : `${count}/${arr.size} elem`}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            count >= arr.size ? 'bg-rose-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Elements Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1 font-mono text-[10px]">
                        {currentVals.map((val, idx) => {
                          const isActiveSlot = isQueueBuffer && idx < count;
                          return (
                            <div
                              key={idx}
                              className={`p-1 text-center rounded border transition-colors ${
                                isActiveSlot
                                  ? 'bg-teal-950/80 border-teal-600 text-teal-200 font-bold shadow-xs'
                                  : 'bg-slate-950 border-slate-800/60 text-slate-500'
                              }`}
                              title={`Index [${idx}]: ${val}`}
                            >
                              <div className="text-[8px] text-slate-500">[{idx}]</div>
                              <div className="truncate">{String(val)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Live Transaction Logs */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-teal-400" /> Puffer Műveleti Napló
                </span>
                {onClearLogs && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-900 transition-colors"
                    title="Napló törlése"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono text-[11px] pr-1 flex-1">
                {(!simulationState.bufferLogs || simulationState.bufferLogs.length === 0) ? (
                  <div className="text-slate-600 italic text-center py-10">
                    Még nincs lefutott FIFO, LIFO vagy BLKMOV művelet. A létra végrehajtásakor itt azonnal megjelennek a tranzakciók.
                  </div>
                ) : (
                  simulationState.bufferLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-slate-900/90 border border-slate-800/90 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">{log.timestamp}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              log.operation.includes('PUSH')
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : log.operation.includes('POP')
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {log.operation}
                          </span>
                          <span className="text-slate-400">{log.bufferName}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : log.status === 'OVERFLOW'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 pl-1">{log.details}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 9. TAB: RTC REAL-TIME CLOCK TELEMETRY */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'rtc' && (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-200">
                  Külső Valós Idejű Óra Telemetria ({protocols?.rtc?.chipType || 'DS3231'})
                </span>
                <p className="text-[11px] text-amber-400/80">
                  Hardveres RTC időszenzor I2C 0x68 buszon. Automatikus PLC naptár és óra regiszterek szinkronizálása.
                </p>
              </div>
            </div>
            {onSyncRTC && (
              <button
                type="button"
                onClick={onSyncRTC}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Szinkronizálás PC Idővel</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clock LCD Display */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider font-bold">
                Aktuális Hardveres RTC Idő
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-wider bg-slate-900 border border-amber-500/30 rounded-xl px-6 py-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                {simulationState.rtcTime
                  ? `${String(simulationState.rtcTime.hour).padStart(2, '0')}:${String(simulationState.rtcTime.minute).padStart(2, '0')}:${String(simulationState.rtcTime.second).padStart(2, '0')}`
                  : '10:30:00'}
              </div>
              <div className="text-slate-400 font-mono text-xs">
                {simulationState.rtcTime
                  ? `${simulationState.rtcTime.year}. ${String(simulationState.rtcTime.month).padStart(2, '0')}. ${String(simulationState.rtcTime.day).padStart(2, '0')}. (Nap: ${simulationState.rtcTime.dayOfWeek})`
                  : '2026. 09. 12.'}
              </div>
              <div className="flex gap-2 text-[10px] text-slate-500">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  I2C Cím: <strong className="text-slate-300">{protocols?.rtc?.addressHex || '0x68'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  TCXO pontosság: <strong className="text-emerald-400">±2 ppm</strong>
                </span>
              </div>
            </div>

            {/* Mapped Variables Monitor */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200">RTC PLC Regiszter Változók</span>
                <span className="text-[10px] text-slate-500 font-mono">Dinamikus RAM</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { label: 'Év (RTC_YEAR)', val: simulationState.variableValues['RTC_YEAR'] ?? (simulationState.rtcTime?.year ?? 2026) },
                  { label: 'Hónap (RTC_MONTH)', val: simulationState.variableValues['RTC_MONTH'] ?? (simulationState.rtcTime?.month ?? 9) },
                  { label: 'Nap (RTC_DAY)', val: simulationState.variableValues['RTC_DAY'] ?? (simulationState.rtcTime?.day ?? 12) },
                  { label: 'Óra (RTC_HOUR)', val: simulationState.variableValues['RTC_HOUR'] ?? (simulationState.rtcTime?.hour ?? 10) },
                  { label: 'Perc (RTC_MIN)', val: simulationState.variableValues['RTC_MIN'] ?? (simulationState.rtcTime?.minute ?? 30) },
                  { label: 'Mp (RTC_SEC)', val: simulationState.variableValues['RTC_SEC'] ?? (simulationState.rtcTime?.second ?? 0) },
                  { label: 'Hét Napja (RTC_DOW)', val: simulationState.variableValues['RTC_DOW'] ?? (simulationState.rtcTime?.dayOfWeek ?? 6) },
                  { label: 'Ciklikus Frissítés', val: `${protocols?.rtc?.syncIntervalSec ?? 1} mp` }
                ].map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">{item.label}</span>
                    <span className="text-amber-300 font-bold">{String(item.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 10. TAB: SD CARD DATALOGGER TELEMETRY */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'sd' && (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-200">
                  Külső SD Kártya SPI Datalogger Telemetria
                </span>
                <p className="text-[11px] text-rose-400/80">
                  Fájlrendszer: FAT32 &bull; CS Láb: {protocols?.sdCard?.csPin || 'D10'} &bull; Naplófájl:{' '}
                  {protocols?.sdCard?.logFileName || 'datalog.csv'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-900 border border-emerald-800 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                KÁRTYA CSATOLVA (READY)
              </span>
            </div>
          </div>

          {/* Log inject form */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                Szimulált Soros Naplórekord Hozzáadása
              </span>
              <span className="text-[10px] text-slate-500 font-mono">APPEND FÁJLMŰVELET</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sdCustomLog}
                onChange={(e) => setSdCustomLog(e.target.value)}
                placeholder="V_TEMP_C: 25.4, ALARM: 0"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (onSimulateSDLog && sdCustomLog.trim()) {
                    onSimulateSDLog(sdCustomLog.trim());
                  }
                }}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Naplózás</span>
              </button>
            </div>
          </div>

          {/* CSV File Content Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {protocols?.sdCard?.logFileName || 'datalog.csv'} Tartalma (
                {(simulationState.sdCardLogs || []).length} sor)
              </span>
              {onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors"
                  title="Napló törlése"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-[11px] pr-1">
              {(!simulationState.sdCardLogs || simulationState.sdCardLogs.length === 0) ? (
                <div className="text-slate-600 italic text-center py-6">
                  Még nincs naplózott sor az SD kártyán.
                </div>
              ) : (
                simulationState.sdCardLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-1.5 rounded flex items-center justify-between border ${
                      idx === 0
                        ? 'bg-slate-900 border-rose-900/60 text-rose-300 font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[9px] text-slate-500">{log.timestamp}</span>
                      <span className="truncate">{log.content}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                      {log.sizeBytes} B
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 11. TAB: MEGSZAKÍTÁSOK (INTERRUPTS & HSC) TELEMETRIA */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'interrupts' && (
        <div className="space-y-4 text-xs font-sans">
          {/* Header & Global Interrupts State */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <span>Hardver (INT0, INT1) és Időzítő (Timer1) Megszakítás Monitor</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    simulationState.globalInterruptsActive !== false
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border-rose-800'
                  }`}>
                    {simulationState.globalInterruptsActive !== false ? 'INTERRUPTS() AKTÍV' : 'NOINTERRUPTS() TILTVA'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Valós idejű megszakítás kiszolgáló futások (ISR), hardveres élfigyelés (D2/D3) és volatile változók.
                </p>
              </div>
            </div>

            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-colors"
                title="Megszakítás napló ürítése"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Napló Ürítése</span>
              </button>
            )}
          </div>

          {/* 3 Channels: INT0, INT1, Timer1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* INT0 Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                    <span className="font-bold text-slate-200">INT0 (Arduino Pin D2)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    D2: {simulationState.digitalInputs['D2'] ? 'HIGH (1)' : 'LOW (0)'}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lezajlott lefutások:</span>
                    <span className="font-bold text-rose-400">
                      {simulationState.interruptStats?.int0?.triggerCount ?? 0} alkalom
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utolsó trigger:</span>
                    <span className="text-slate-300">
                      {simulationState.interruptStats?.int0?.lastTriggerTime || 'Még nem futott le'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1">
                    Külső megszakítás (pl. Vészleállító vagy HSC enkóder A-csatorna)
                  </div>
                </div>
              </div>
            </div>

            {/* INT1 Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="font-bold text-slate-200">INT1 (Arduino Pin D3)</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    D3: {simulationState.digitalInputs['D3'] ? 'HIGH (1)' : 'LOW (0)'}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lezajlott lefutások:</span>
                    <span className="font-bold text-orange-400">
                      {simulationState.interruptStats?.int1?.triggerCount ?? 0} alkalom
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utolsó trigger:</span>
                    <span className="text-slate-300">
                      {simulationState.interruptStats?.int1?.lastTriggerTime || 'Még nem futott le'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1">
                    Második hardveres megszakítás (pl. Pozíció referencia / index)
                  </div>
                </div>
              </div>
            </div>

            {/* Timer1 Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-slate-200">Timer1 16-bit CTC</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    ISR(TIMER1_COMPA)
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lezajlott lefutások:</span>
                    <span className="font-bold text-cyan-400">
                      {simulationState.interruptStats?.timer1?.triggerCount ?? 0} alkalom
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utolsó trigger:</span>
                    <span className="text-slate-300">
                      {simulationState.interruptStats?.timer1?.lastTriggerTime || 'Még nem futott le'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1">
                    Periodikus hardver időzítés pontos időszeleteléshez és mintavételhez
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological ISR Event Log */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Valós Idejű Megszakítás Napló ({(simulationState.interruptLogs || []).length} esemény)
              </span>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-[11px] pr-1">
              {(!simulationState.interruptLogs || simulationState.interruptLogs.length === 0) ? (
                <div className="text-slate-600 italic text-center py-6">
                  Még nem történt megszakítás (kapcsold be a szimulációt és válts állapotot a D2 vagy D3 bemeneten).
                </div>
              ) : (
                simulationState.interruptLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-2 rounded flex items-center justify-between border ${
                      idx === 0
                        ? 'bg-slate-900 border-rose-900/70 text-rose-300 font-bold'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-[9px] text-slate-500 shrink-0">{log.timestamp}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                        log.source === 'INT0'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : log.source === 'INT1'
                          ? 'bg-orange-950 text-orange-400 border border-orange-800'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      }`}>
                        {log.source} ({log.mode})
                      </span>
                      <span className="truncate">{log.detail}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {log.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 12. TAB: I/O EXPANDERS (MCP23017 & PCF8574) LIVE MONITOR */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'expanders' && (
        <div className="space-y-4 text-xs font-sans">
          {/* Hardware Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MCP23017 Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> MCP23017 (0x20) 16-Bit I/O Bővítő
                </span>
                <span className="text-[10px] text-slate-500 font-mono">I2C 0x20 Busz</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Két 8-bites kétirányú port: Port A (bemenetek felhúzással) és Port B (kimenetek).
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-slate-400 font-bold mb-1">Port A (EXP_A0 - A7)</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
                      const pin = `EXP_A${idx}`;
                      const val = !!(simulationState.expanderInputs?.[pin] ?? simulationState.expanderOutputs?.[pin]);
                      return (
                        <div
                          key={pin}
                          className={`text-center py-1 rounded font-mono text-[10px] font-bold ${
                            val
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-950 text-slate-500 border border-slate-800'
                          }`}
                        >
                          A{idx}: {val ? '1' : '0'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-slate-400 font-bold mb-1">Port B (EXP_B0 - B7)</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
                      const pin = `EXP_B${idx}`;
                      const val = !!(simulationState.expanderOutputs?.[pin] ?? simulationState.expanderInputs?.[pin]);
                      return (
                        <div
                          key={pin}
                          className={`text-center py-1 rounded font-mono text-[10px] font-bold ${
                            val
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-950 text-slate-500 border border-slate-800'
                          }`}
                        >
                          B{idx}: {val ? '1' : '0'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PCF8574 Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> PCF8574 (0x21) 8-Bit Kvázi-Kétirányú Bővítő
                </span>
                <span className="text-[10px] text-slate-500 font-mono">I2C 0x21 Busz</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                8-bites kvázi-kétirányú I/O port, nyitott kollektoros felépítéssel.
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400 font-bold mb-1">Port P (PCF_P0 - P7)</div>
                <div className="grid grid-cols-8 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => {
                    const pin = `PCF_P${idx}`;
                    const val = !!(simulationState.expanderOutputs?.[pin] ?? simulationState.expanderInputs?.[pin]);
                    return (
                      <div
                        key={pin}
                        className={`text-center py-1 rounded font-mono text-[10px] font-bold ${
                          val
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        P{idx}: {val ? '1' : '0'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Expander Bus Transaction Logs */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                I/O Bővítő Tranzakció Napló ({(simulationState.expanderLogs || []).length} esemény)
              </span>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-[11px] pr-1">
              {(!simulationState.expanderLogs || simulationState.expanderLogs.length === 0) ? (
                <div className="text-slate-600 italic text-center py-6">
                  Még nem történt bővítő I/O művelet (használd az EXP_ vagy PCF_ lábakat vagy a bővítő tekercseket).
                </div>
              ) : (
                simulationState.expanderLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-2 rounded flex items-center justify-between border ${
                      idx === 0
                        ? 'bg-slate-900 border-emerald-900/70 text-emerald-300 font-bold'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-[9px] text-slate-500 shrink-0">{log.timestamp}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                        log.device.includes('MCP')
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {log.device}
                      </span>
                      <span className="text-slate-400">{log.operation}</span>
                      <span className="text-slate-200">{log.target}</span>
                      <span className="truncate text-slate-400">{log.detail}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 shrink-0 font-mono font-bold">
                      {log.rawHex || String(log.value)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
