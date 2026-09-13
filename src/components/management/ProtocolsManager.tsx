import React, { useState } from 'react';
import { ProtocolConfigs, DallasSensor, I2CDevice, SPIDevice, RTCConfig, SDCardConfig } from '../../types';
import {
  Network,
  Cpu,
  Radio,
  Sliders,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Info,
  Layers,
  Thermometer,
  Clock,
  HardDrive,
  Code,
  Calendar,
  FileSpreadsheet,
  Terminal,
  Activity
} from 'lucide-react';

interface ProtocolsManagerProps {
  protocols: ProtocolConfigs;
  onUpdateProtocols: (protocols: ProtocolConfigs) => void;
}

export const ProtocolsManager: React.FC<ProtocolsManagerProps> = ({
  protocols,
  onUpdateProtocols
}) => {
  const [activeProto, setActiveProto] = useState<'dallas' | 'i2c' | 'spi' | 'uart' | 'rtc' | 'sd'>('dallas');

  // Dallas Sensor Modal
  const [dallasModalOpen, setDallasModalOpen] = useState(false);
  const [dallasSensorName, setDallasSensorName] = useState('');
  const [dallasSensorRom, setDallasSensorRom] = useState('');
  const [dallasTargetVar, setDallasTargetVar] = useState('');

  // I2C Device Modal
  const [i2cModalOpen, setI2cModalOpen] = useState(false);
  const [i2cDevName, setI2cDevName] = useState('');
  const [i2cDevAddr, setI2cDevAddr] = useState('0x27');
  const [i2cDevType, setI2cDevType] = useState('LCD_1602');
  const [i2cDevDesc, setI2cDevDesc] = useState('');

  // SPI Device Modal
  const [spiModalOpen, setSpiModalOpen] = useState(false);
  const [spiDevName, setSpiDevName] = useState('');
  const [spiDevCs, setSpiDevCs] = useState('D10');
  const [spiDevType, setSpiDevType] = useState('MAX7219');
  const [spiDevDesc, setSpiDevDesc] = useState('');

  // Safe defaults if rtc or sdCard are not yet set
  const rtcConfig: RTCConfig = protocols.rtc || {
    enabled: true,
    chipType: 'DS3231',
    addressHex: '0x68',
    syncIntervalSec: 1,
    autoSyncCompileTime: true,
    enableSquareWave1Hz: false,
    targetVariables: {
      year: 'RTC_YEAR',
      month: 'RTC_MONTH',
      day: 'RTC_DAY',
      hour: 'RTC_HOUR',
      minute: 'RTC_MIN',
      second: 'RTC_SEC',
      dayOfWeek: 'RTC_DOW'
    }
  };

  const sdConfig: SDCardConfig = protocols.sdCard || {
    enabled: true,
    csPin: 'D10',
    spiSpeed: 'SPI_HALF_SPEED',
    logFileName: 'datalog.csv',
    autoLogIntervalSec: 5,
    autoCreateCsvHeader: true,
    csvHeaderColumns: 'TIMESTAMP_MS,YEAR,MONTH,DAY,HOUR,MIN,SEC,V_TEMP_C,V_FLOW_RATE,STATUS',
    logVariables: ['RTC_HOUR', 'RTC_MIN', 'RTC_SEC', 'V_TEMP_C', 'V_FLOW_RATE'],
    detectCardOnBoot: true
  };

  // --- Handlers: Dallas ---
  const handleToggleDallas = () => {
    onUpdateProtocols({
      ...protocols,
      dallas: { ...protocols.dallas, enabled: !protocols.dallas.enabled }
    });
  };

  const handleUpdateDallasConfig = (fields: Partial<typeof protocols.dallas>) => {
    onUpdateProtocols({
      ...protocols,
      dallas: { ...protocols.dallas, ...fields }
    });
  };

  const handleAddDallasSensor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dallasSensorName.trim()) return;

    const newSensor: DallasSensor = {
      id: `ds_${Date.now()}`,
      name: dallasSensorName,
      romAddress: dallasSensorRom || '28-XX-XX-XX-XX-XX-XX-XX',
      targetVariable: dallasTargetVar || 'V_TEMP_C'
    };

    onUpdateProtocols({
      ...protocols,
      dallas: {
        ...protocols.dallas,
        sensors: [...protocols.dallas.sensors, newSensor]
      }
    });
    setDallasModalOpen(false);
    setDallasSensorName('');
    setDallasSensorRom('');
    setDallasTargetVar('');
  };

  const handleDeleteDallasSensor = (id: string) => {
    onUpdateProtocols({
      ...protocols,
      dallas: {
        ...protocols.dallas,
        sensors: protocols.dallas.sensors.filter((s) => s.id !== id)
      }
    });
  };

  // --- Handlers: I2C ---
  const handleToggleI2C = () => {
    onUpdateProtocols({
      ...protocols,
      i2c: { ...protocols.i2c, enabled: !protocols.i2c.enabled }
    });
  };

  const handleUpdateI2CConfig = (fields: Partial<typeof protocols.i2c>) => {
    onUpdateProtocols({
      ...protocols,
      i2c: { ...protocols.i2c, ...fields }
    });
  };

  const handleAddI2CDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!i2cDevName.trim()) return;

    const newDev: I2CDevice = {
      id: `i2c_${Date.now()}`,
      name: i2cDevName,
      addressHex: i2cDevAddr || '0x27',
      type: i2cDevType as any,
      description: i2cDevDesc
    };

    onUpdateProtocols({
      ...protocols,
      i2c: {
        ...protocols.i2c,
        devices: [...protocols.i2c.devices, newDev]
      }
    });
    setI2cModalOpen(false);
    setI2cDevName('');
    setI2cDevAddr('0x27');
    setI2cDevDesc('');
  };

  const handleDeleteI2CDevice = (id: string) => {
    onUpdateProtocols({
      ...protocols,
      i2c: {
        ...protocols.i2c,
        devices: protocols.i2c.devices.filter((d) => d.id !== id)
      }
    });
  };

  // --- Handlers: SPI ---
  const handleToggleSPI = () => {
    onUpdateProtocols({
      ...protocols,
      spi: { ...protocols.spi, enabled: !protocols.spi.enabled }
    });
  };

  const handleUpdateSPIConfig = (fields: Partial<typeof protocols.spi>) => {
    onUpdateProtocols({
      ...protocols,
      spi: { ...protocols.spi, ...fields }
    });
  };

  const handleAddSPIDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spiDevName.trim()) return;

    const newDev: SPIDevice = {
      id: `spi_${Date.now()}`,
      name: spiDevName,
      csPin: spiDevCs || 'D10',
      type: spiDevType as any,
      description: spiDevDesc
    };

    onUpdateProtocols({
      ...protocols,
      spi: {
        ...protocols.spi,
        devices: [...protocols.spi.devices, newDev]
      }
    });
    setSpiModalOpen(false);
    setSpiDevName('');
    setSpiDevCs('D10');
    setSpiDevDesc('');
  };

  const handleDeleteSPIDevice = (id: string) => {
    onUpdateProtocols({
      ...protocols,
      spi: {
        ...protocols.spi,
        devices: protocols.spi.devices.filter((d) => d.id !== id)
      }
    });
  };

  // --- Handlers: UART ---
  const handleToggleUART = () => {
    onUpdateProtocols({
      ...protocols,
      uart: { ...protocols.uart, enabled: !protocols.uart.enabled }
    });
  };

  const handleUpdateUARTConfig = (fields: Partial<typeof protocols.uart>) => {
    onUpdateProtocols({
      ...protocols,
      uart: { ...protocols.uart, ...fields }
    });
  };

  // --- Handlers: RTC ---
  const handleToggleRTC = () => {
    onUpdateProtocols({
      ...protocols,
      rtc: { ...rtcConfig, enabled: !rtcConfig.enabled }
    });
  };

  const handleUpdateRTCConfig = (fields: Partial<RTCConfig>) => {
    onUpdateProtocols({
      ...protocols,
      rtc: { ...rtcConfig, ...fields }
    });
  };

  const handleUpdateRTCTargetVar = (key: keyof RTCConfig['targetVariables'], value: string) => {
    onUpdateProtocols({
      ...protocols,
      rtc: {
        ...rtcConfig,
        targetVariables: {
          ...rtcConfig.targetVariables,
          [key]: value
        }
      }
    });
  };

  // --- Handlers: SD Card ---
  const handleToggleSD = () => {
    onUpdateProtocols({
      ...protocols,
      sdCard: { ...sdConfig, enabled: !sdConfig.enabled }
    });
  };

  const handleUpdateSDConfig = (fields: Partial<SDCardConfig>) => {
    onUpdateProtocols({
      ...protocols,
      sdCard: { ...sdConfig, ...fields }
    });
  };

  return (
    <div className="space-y-6">
      {/* Protocol selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Dallas */}
        <button
          type="button"
          onClick={() => setActiveProto('dallas')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'dallas'
              ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400">1-WIRE</span>
            <span
              className={`w-2 h-2 rounded-full ${
                protocols.dallas.enabled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">Dallas DS18B20</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {protocols.dallas.pin} &bull; {protocols.dallas.resolution}-bit
          </div>
        </button>

        {/* 2. I2C */}
        <button
          type="button"
          onClick={() => setActiveProto('i2c')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'i2c'
              ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-cyan-400">I2C BUS</span>
            <span
              className={`w-2 h-2 rounded-full ${
                protocols.i2c.enabled ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">Wire.h Busz</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {protocols.i2c.clockSpeedKhz} kHz &bull; {protocols.i2c.devices.length} eszköz
          </div>
        </button>

        {/* 3. SPI */}
        <button
          type="button"
          onClick={() => setActiveProto('spi')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'spi'
              ? 'bg-blue-950/60 border-blue-400 ring-2 ring-blue-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-blue-400">SPI BUS</span>
            <span
              className={`w-2 h-2 rounded-full ${
                protocols.spi.enabled ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">SPI.h Busz</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            CS: {protocols.spi.csPin} &bull; {protocols.spi.clockDivider.replace('SPI_CLOCK_', '')}
          </div>
        </button>

        {/* 4. UART */}
        <button
          type="button"
          onClick={() => setActiveProto('uart')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'uart'
              ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-indigo-400">UART</span>
            <span
              className={`w-2 h-2 rounded-full ${
                protocols.uart.enabled ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">Soros Port</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {protocols.uart.baudRate} Baud &bull; 8N1
          </div>
        </button>

        {/* 5. Külső RTC */}
        <button
          type="button"
          onClick={() => setActiveProto('rtc')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'rtc'
              ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400">RTC ÓRA</span>
            <span
              className={`w-2 h-2 rounded-full ${
                rtcConfig.enabled ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">Külső RTC</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {rtcConfig.chipType} &bull; {rtcConfig.addressHex}
          </div>
        </button>

        {/* 6. SD Kártya */}
        <button
          type="button"
          onClick={() => setActiveProto('sd')}
          className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeProto === 'sd'
              ? 'bg-rose-950/60 border-rose-400 ring-2 ring-rose-500/30 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider text-rose-400">SD KÁRTYA</span>
            <span
              className={`w-2 h-2 rounded-full ${
                sdConfig.enabled ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,1)]' : 'bg-slate-700'
              }`}
            />
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">SD Datalogger</div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            CS: {sdConfig.csPin} &bull; CSV Napló
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. DALLAS ONE-WIRE CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'dallas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Dallas 1-Wire DS18B20 Hőmérséklet Mérés
                </h3>
                <p className="text-xs text-slate-400">
                  Egyetlen digitális lábon láncolható címzett digitális hőszenzor hálózat ipari pontossággal.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">Protokoll engedélyezve:</span>
              <input
                type="checkbox"
                checked={protocols.dallas.enabled}
                onChange={handleToggleDallas}
                className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">setup() inicializálás</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">OneWire DQ Adatláb</label>
                <select
                  value={protocols.dallas.pin}
                  onChange={(e) => handleUpdateDallasConfig({ pin: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
                >
                  {['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].map((p) => (
                    <option key={p} value={p}>
                      {p} (DQ Busz)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Mintavételi Felbontás</label>
                <select
                  value={protocols.dallas.resolution}
                  onChange={(e) => handleUpdateDallasConfig({ resolution: Number(e.target.value) as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value={9}>9-bit (0.5 °C - 93ms)</option>
                  <option value={10}>10-bit (0.25 °C - 187ms)</option>
                  <option value={11}>11-bit (0.125 °C - 375ms)</option>
                  <option value={12}>12-bit (0.0625 °C - 750ms)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Konverziós Mód</label>
                <select
                  value={protocols.dallas.waitForConversion !== false ? 'sync' : 'async'}
                  onChange={(e) => handleUpdateDallasConfig({ waitForConversion: e.target.value === 'sync' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="sync">Szinkron (Blokkoló)</option>
                  <option value="async">Aszinkron (PLC ciklust nem akaszt)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Indítási Konverzió</label>
                <select
                  value={protocols.dallas.requestOnBoot !== false ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateDallasConfig({ requestOnBoot: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Azonnali requestTemperatures()</option>
                  <option value="no">Csak loop() ciklusban kérve</option>
                </select>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-emerald-300/90 whitespace-pre">
{`  // Dallas 1-Wire inicializálása
  dallasSensors.begin();
  dallasSensors.setResolution(${protocols.dallas.resolution});
  dallasSensors.setWaitForConversion(${protocols.dallas.waitForConversion !== false});
  ${protocols.dallas.requestOnBoot !== false ? 'dallasSensors.requestTemperatures(); // Indítási első mérés' : '// Mérés loop-ban'}`}
              </pre>
            </div>
          </div>

          {/* Sensors list */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Regisztrált DS18B20 Hőszenzorok ({protocols.dallas.sensors.length})
              </span>
              <button
                type="button"
                onClick={() => setDallasModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60"
              >
                <Plus className="w-3.5 h-3.5" /> Új Szenzor
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {protocols.dallas.sensors.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                      <span>{s.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-800">
                        {s.targetVariable}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">{s.romAddress}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDallasSensor(s.id)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. I2C WIRE BUS CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'i2c' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  I2C (Inter-Integrated Circuit / TWI) Wire Busz
                </h3>
                <p className="text-xs text-slate-400">
                  Kétvezetékes szinkron busz perifériáknak: LCD kijelzők, külső RTC, I/O expanderek, EEPROM.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">Protokoll engedélyezve:</span>
              <input
                type="checkbox"
                checked={protocols.i2c.enabled}
                onChange={handleToggleI2C}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">Wire.h inicializálás</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SDA Vonal (Adat)</label>
                <input
                  type="text"
                  disabled
                  value={protocols.i2c.sdaPin}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-center text-cyan-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SCL Vonal (Órajel)</label>
                <input
                  type="text"
                  disabled
                  value={protocols.i2c.sclPin}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-center text-cyan-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Busz Sebesség (Clock)</label>
                <select
                  value={protocols.i2c.clockSpeedKhz}
                  onChange={(e) => handleUpdateI2CConfig({ clockSpeedKhz: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value={100}>100 kHz (Standard)</option>
                  <option value={400}>400 kHz (Fast Mode)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Buszpásztázás Bootkor</label>
                <select
                  value={protocols.i2c.scanBusOnBoot !== false ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateI2CConfig({ scanBusOnBoot: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Igen (Címek kiírása Serial-ra)</option>
                  <option value="no">Nem (Gyorsabb indulás)</option>
                </select>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-cyan-300/90 whitespace-pre">
{`  // I2C Wire busz inicializálása
  Wire.begin();
  Wire.setClock(${protocols.i2c.clockSpeedKhz * 1000}UL);
  #if defined(WIRE_HAS_TIMEOUT)
  Wire.setWireTimeout(3000000UL, true); // I2C deadlock recovery
  #endif
  ${protocols.i2c.scanBusOnBoot !== false ? '// Busz címek automatikus pásztázása és kiírása Soros monitorra' : '// Nincs boot pásztázás'}`}
              </pre>
            </div>
          </div>

          {/* Devices list */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Regisztrált I2C Eszközök ({protocols.i2c.devices.length})
              </span>
              <button
                type="button"
                onClick={() => setI2cModalOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60"
              >
                <Plus className="w-3.5 h-3.5" /> Új Eszköz
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {protocols.i2c.devices.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                      <span>{d.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-cyan-800">
                        {d.addressHex}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{d.description || d.type}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteI2CDevice(d.id)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SPI PROTOCOL CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'spi' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  SPI (Serial Peripheral Interface) Nagysebességű Busz
                </h3>
                <p className="text-xs text-slate-400">
                  Full-duplex szinkron kommunikáció kijelzőkkel, SD-kártyákkal és I/O expanderekkel.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">Protokoll engedélyezve:</span>
              <input
                type="checkbox"
                checked={protocols.spi.enabled}
                onChange={handleToggleSPI}
                className="w-4 h-4 rounded text-blue-500 accent-blue-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">SPI.h inicializálás</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Órajel Osztó (Clock Div)</label>
                <select
                  value={protocols.spi.clockDivider}
                  onChange={(e) => handleUpdateSPIConfig({ clockDivider: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="SPI_CLOCK_DIV2">DIV2 (8 MHz)</option>
                  <option value="SPI_CLOCK_DIV4">DIV4 (4 MHz - Alap)</option>
                  <option value="SPI_CLOCK_DIV8">DIV8 (2 MHz)</option>
                  <option value="SPI_CLOCK_DIV16">DIV16 (1 MHz)</option>
                  <option value="SPI_CLOCK_DIV32">DIV32 (500 kHz)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Adatmód (Clock Pol/Phase)</label>
                <select
                  value={protocols.spi.dataMode}
                  onChange={(e) => handleUpdateSPIConfig({ dataMode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="SPI_MODE0">MODE0 (CPOL=0, CPHA=0)</option>
                  <option value="SPI_MODE1">MODE1 (CPOL=0, CPHA=1)</option>
                  <option value="SPI_MODE2">MODE2 (CPOL=1, CPHA=0)</option>
                  <option value="SPI_MODE3">MODE3 (CPOL=1, CPHA=1)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bit Sorrend</label>
                <select
                  value={protocols.spi.bitOrder || 'MSBFIRST'}
                  onChange={(e) => handleUpdateSPIConfig({ bitOrder: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="MSBFIRST">MSBFIRST (Legfelsőbb bit)</option>
                  <option value="LSBFIRST">LSBFIRST (Legalsó bit)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">CS Lábak Inaktiválása</label>
                <select
                  value={protocols.spi.deselectCsPinsOnBoot !== false ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateSPIConfig({ deselectCsPinsOnBoot: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Igen (Mind HIGH-ra bootkor)</option>
                  <option value="no">Nem</option>
                </select>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-blue-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-blue-300/90 whitespace-pre">
{`  // SPI busz inicializálása
  pinMode(PIN_SPI_CS, OUTPUT);
  digitalWrite(PIN_SPI_CS, HIGH); // CS deselect
  SPI.begin();
  SPI.setClockDivider(${protocols.spi.clockDivider});
  SPI.setDataMode(${protocols.spi.dataMode});
  SPI.setBitOrder(${protocols.spi.bitOrder || 'MSBFIRST'});`}
              </pre>
            </div>
          </div>

          {/* Devices list */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Regisztrált SPI Perifériák ({protocols.spi.devices.length})
              </span>
              <button
                type="button"
                onClick={() => setSpiModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/60"
              >
                <Plus className="w-3.5 h-3.5" /> Új SPI Eszköz
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {protocols.spi.devices.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                      <span>{d.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-blue-400 border border-blue-800">
                        CS: {d.csPin}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{d.description || d.type}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSPIDevice(d.id)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. UART SERIAL CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'uart' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  UART Soros Port & Diagnosztika
                </h3>
                <p className="text-xs text-slate-400">
                  Valós idejű telemetria, hibakereső naplózás és külső SCADA / HMI kommunikáció.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">Protokoll engedélyezve:</span>
              <input
                type="checkbox"
                checked={protocols.uart.enabled}
                onChange={handleToggleUART}
                className="w-4 h-4 rounded text-indigo-500 accent-indigo-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">Serial.begin() konfiguráció</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Baud Ráta (Sebesség)</label>
                <select
                  value={protocols.uart.baudRate}
                  onChange={(e) => handleUpdateUARTConfig({ baudRate: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-indigo-300 font-mono font-bold"
                >
                  <option value={9600}>9600 Baud</option>
                  <option value={19200}>19200 Baud</option>
                  <option value={38400}>38400 Baud</option>
                  <option value={57600}>57600 Baud</option>
                  <option value={115200}>115200 Baud (Javasolt)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Soros Keretformátum</label>
                <select
                  value={protocols.uart.serialConfig || 'SERIAL_8N1'}
                  onChange={(e) => handleUpdateUARTConfig({ serialConfig: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="SERIAL_8N1">SERIAL_8N1 (8 bit, No parity, 1 stop)</option>
                  <option value="SERIAL_8E1">SERIAL_8E1 (Even parity)</option>
                  <option value="SERIAL_8O1">SERIAL_8O1 (Odd parity)</option>
                  <option value="SERIAL_7E1">SERIAL_7E1 (7 bit Even)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Serial Timeout (ms)</label>
                <input
                  type="number"
                  value={protocols.uart.timeoutMs ?? 100}
                  onChange={(e) => handleUpdateUARTConfig({ timeoutMs: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Boot Üdvözlő Banner</label>
                <select
                  value={protocols.uart.printBootBanner !== false ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateUARTConfig({ printBootBanner: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Igen (Projekt banner kiírása)</option>
                  <option value="no">Nem (Tiszta kimenet)</option>
                </select>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-indigo-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-indigo-300/90 whitespace-pre">
{`  // UART Soros Port beállítása
  Serial.begin(${protocols.uart.baudRate}, ${protocols.uart.serialConfig || 'SERIAL_8N1'});
  Serial.setTimeout(${protocols.uart.timeoutMs ?? 100});
  ${protocols.uart.printBootBanner !== false ? 'Serial.println(F("[PLC SETUP] Arduino PLC Rendszer Indítása..."));' : '// Banner kikapcsolva'}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. KÜLSŐ RTC (REAL-TIME CLOCK) CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'rtc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Külső Valós Idejű Óra (RTC Modul)
                </h3>
                <p className="text-xs text-slate-400">
                  Precíziós hardveres időzítés DS3231 (TCXO hőmérséklet-kompenzált) vagy DS1307 I2C óramodullal.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">RTC engedélyezve:</span>
              <input
                type="checkbox"
                checked={rtcConfig.enabled}
                onChange={handleToggleRTC}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">RTClib inicializálás</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">RTC Chip Típus</label>
                <select
                  value={rtcConfig.chipType}
                  onChange={(e) => handleUpdateRTCConfig({ chipType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                >
                  <option value="DS3231">DS3231 (Nagy pontosság, ±2ppm)</option>
                  <option value="DS1307">DS1307 (Standard)</option>
                  <option value="PCF8563">PCF8563</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">I2C HEX Cím</label>
                <input
                  type="text"
                  value={rtcConfig.addressHex}
                  onChange={(e) => handleUpdateRTCConfig({ addressHex: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Szinkronizáció Ciklusideje (mp)</label>
                <select
                  value={rtcConfig.syncIntervalSec}
                  onChange={(e) => handleUpdateRTCConfig({ syncIntervalSec: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value={1}>1 másodpercenként</option>
                  <option value={2}>2 másodpercenként</option>
                  <option value={5}>5 másodpercenként</option>
                  <option value={10}>10 másodpercenként</option>
                  <option value={60}>1 percenként</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tápkimaradás Kezelés</label>
                <select
                  value={rtcConfig.autoSyncCompileTime ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateRTCConfig({ autoSyncCompileTime: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Fordítási idő szinkron (lostPower)</option>
                  <option value="no">Ne módosítsa az időt</option>
                </select>
              </div>
            </div>

            {/* Target Variables Mapping */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                PLC Változók Automatikus Feltöltése az RTC Órából:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Év (Year)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.year}
                    onChange={(e) => handleUpdateRTCTargetVar('year', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hónap (Month)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.month}
                    onChange={(e) => handleUpdateRTCTargetVar('month', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Nap (Day)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.day}
                    onChange={(e) => handleUpdateRTCTargetVar('day', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Óra (Hour)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.hour}
                    onChange={(e) => handleUpdateRTCTargetVar('hour', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Perc (Minute)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.minute}
                    onChange={(e) => handleUpdateRTCTargetVar('minute', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Mp (Second)</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.second}
                    onChange={(e) => handleUpdateRTCTargetVar('second', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hét napja</span>
                  <input
                    type="text"
                    value={rtcConfig.targetVariables.dayOfWeek}
                    onChange={(e) => handleUpdateRTCTargetVar('dayOfWeek', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-amber-300"
                  />
                </div>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-amber-300/90 whitespace-pre">
{`  // Külső RTC inicializálása
  if (!rtc.begin()) {
    Serial.println(F("[RTC HIBA] Valós idejű óra nem elérhető a 0x68 címen!"));
  } else {
    ${rtcConfig.autoSyncCompileTime ? 'if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));' : '// Nincs auto adjust'}
    DateTime _now = rtc.now();
    ${rtcConfig.targetVariables.hour} = _now.hour();
    ${rtcConfig.targetVariables.minute} = _now.minute();
    ${rtcConfig.targetVariables.second} = _now.second();
  }`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. KÜLSŐ SD KÁRTYA CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {activeProto === 'sd' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Külső SD Kártya SPI Datalogger
                </h3>
                <p className="text-xs text-slate-400">
                  Ipari folyamatadatok, műszakok, hőmérsékletek és riasztási események CSV fájlba mentése FAT32 SD kártyára.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-semibold">SD Kártya engedélyezve:</span>
              <input
                type="checkbox"
                checked={sdConfig.enabled}
                onChange={handleToggleSD}
                className="w-4 h-4 rounded text-rose-500 accent-rose-500"
              />
            </label>
          </div>

          {/* Setup Configuration Panel */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" /> Alapértelmezett setup() Beállítások
              </span>
              <span className="text-[11px] text-slate-500">SD.h inicializálás</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Chip Select (CS Láb)</label>
                <select
                  value={sdConfig.csPin}
                  onChange={(e) => handleUpdateSDConfig({ csPin: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono font-bold"
                >
                  {['D10', 'D4', 'D8', 'D9', 'D7'].map((p) => (
                    <option key={p} value={p}>
                      {p} (SD CS Láb)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SPI Busz Sebesség</label>
                <select
                  value={sdConfig.spiSpeed}
                  onChange={(e) => handleUpdateSDConfig({ spiSpeed: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="SPI_HALF_SPEED">SPI_HALF_SPEED (Ajánlott, stabil)</option>
                  <option value="SPI_FULL_SPEED">SPI_FULL_SPEED (Gyors)</option>
                  <option value="SPI_QUARTER_SPEED">SPI_QUARTER_SPEED (Zajos környezet)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Naplófájl Neve</label>
                <input
                  type="text"
                  value={sdConfig.logFileName}
                  onChange={(e) => handleUpdateSDConfig({ logFileName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono"
                  placeholder="datalog.csv"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Automatikus CSV Fejléc</label>
                <select
                  value={sdConfig.autoCreateCsvHeader ? 'yes' : 'no'}
                  onChange={(e) => handleUpdateSDConfig({ autoCreateCsvHeader: e.target.value === 'yes' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="yes">Igen (Ha még nem létezik a fájl)</option>
                  <option value="no">Nem</option>
                </select>
              </div>
            </div>

            {/* CSV Format and Logging Settings */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  CSV Oszlop Fejléc (Fejléc sor, ha a fájl új):
                </label>
                <input
                  type="text"
                  value={sdConfig.csvHeaderColumns}
                  onChange={(e) => handleUpdateSDConfig({ csvHeaderColumns: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Automatikus ciklikus naplózási intervallum (mp):
                  </label>
                  <select
                    value={sdConfig.autoLogIntervalSec}
                    onChange={(e) => handleUpdateSDConfig({ autoLogIntervalSec: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value={0}>0 (Csak létra logikából indítva)</option>
                    <option value={1}>1 másodpercenként</option>
                    <option value={5}>5 másodpercenként</option>
                    <option value={10}>10 másodpercenként</option>
                    <option value={30}>30 másodpercenként</option>
                    <option value={60}>1 percenként</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Naplózandó PLC változók (vesszővel elválasztva):
                  </label>
                  <input
                    type="text"
                    value={sdConfig.logVariables.join(', ')}
                    onChange={(e) =>
                      handleUpdateSDConfig({
                        logVariables: e.target.value.split(',').map((v) => v.trim()).filter(Boolean)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono"
                    placeholder="RTC_HOUR, RTC_MIN, RTC_SEC, V_TEMP_C, V_FLOW_RATE"
                  />
                </div>
              </div>
            </div>

            {/* C++ Setup Code Preview */}
            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="text-[10px] text-rose-400 font-bold uppercase block mb-1">
                Generált void setup() részlet:
              </span>
              <pre className="text-rose-300/90 whitespace-pre">
{`  // Külső SD Kártya inicializálása
  pinMode(PIN_SD_CS, OUTPUT);
  if (!SD.begin(PIN_SD_CS)) {
    Serial.println(F("[SD HIBA] SD kártya csatolás meghiúsult!"));
    sdCardReady = false;
  } else {
    Serial.println(F("[SD OK] SD Kártya csatolva!"));
    sdCardReady = true;
    ${sdConfig.autoCreateCsvHeader ? `if (!SD.exists("${sdConfig.logFileName}")) {
      dataLogFile = SD.open("${sdConfig.logFileName}", FILE_WRITE);
      if (dataLogFile) { dataLogFile.println(F("${sdConfig.csvHeaderColumns}")); dataLogFile.close(); }
    }` : '// Nincs automatikus fejléc'}
  }`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Dallas Sensor --- */}
      {dallasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm">Új Dallas DS18B20 Szenzor</h3>
              <button type="button" onClick={() => setDallasModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDallasSensor} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Szenzor Megnevezése</label>
                <input
                  type="text"
                  required
                  value={dallasSensorName}
                  onChange={(e) => setDallasSensorName(e.target.value)}
                  placeholder="pl. Puffer Hőmérő 1"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Cél Változó (Ahová a °C mentődik)</label>
                <input
                  type="text"
                  required
                  value={dallasTargetVar}
                  onChange={(e) => setDallasTargetVar(e.target.value)}
                  placeholder="pl. V_TEMP_C"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Egyedi ROM Cím (Opcionális)</label>
                <input
                  type="text"
                  value={dallasSensorRom}
                  onChange={(e) => setDallasSensorRom(e.target.value)}
                  placeholder="28-AA-3B-84-07-00-00-51"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 font-mono text-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDallasModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Mégse
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-500 font-bold text-slate-950">
                  Hozzáadás
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add I2C Device --- */}
      {i2cModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm">Új I2C Busz Eszköz Regisztrálása</h3>
              <button type="button" onClick={() => setI2cModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddI2CDevice} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Eszköz Neve</label>
                <input
                  type="text"
                  required
                  value={i2cDevName}
                  onChange={(e) => setI2cDevName(e.target.value)}
                  placeholder="pl. OLED 0.96 Kijelző vagy DS3231 RTC"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">HEX Cím</label>
                  <input
                    type="text"
                    required
                    value={i2cDevAddr}
                    onChange={(e) => setI2cDevAddr(e.target.value)}
                    placeholder="0x27"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Típus</label>
                  <select
                    value={i2cDevType}
                    onChange={(e) => setI2cDevType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-2 text-slate-200"
                  >
                    <option value="LCD_1602">LCD 1602 (0x27)</option>
                    <option value="RTC_DS3231">RTC DS3231 (0x68)</option>
                    <option value="OLED_SSD1306">OLED SSD1306 (0x3C)</option>
                    <option value="IO_PCF8574">PCF8574 Expander (0x20)</option>
                    <option value="CUSTOM">Egyéni I2C Eszköz</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Leírás</label>
                <input
                  type="text"
                  value={i2cDevDesc}
                  onChange={(e) => setI2cDevDesc(e.target.value)}
                  placeholder="pl. Rendszerállapot megjelenítés"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setI2cModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Mégse
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-cyan-500 font-bold text-slate-950">
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add SPI Device --- */}
      {spiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm">Új SPI Periféria Hozzáadása</h3>
              <button type="button" onClick={() => setSpiModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSPIDevice} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Periféria Neve</label>
                <input
                  type="text"
                  required
                  value={spiDevName}
                  onChange={(e) => setSpiDevName(e.target.value)}
                  placeholder="pl. MAX7219 Numerikus Kijelző"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Chip Select (CS) Láb</label>
                  <select
                    value={spiDevCs}
                    onChange={(e) => setSpiDevCs(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-2 font-mono text-blue-300"
                  >
                    {['D10', 'D9', 'D8', 'D7', 'D4'].map((p) => (
                      <option key={p} value={p}>
                        {p} (CS)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Típus</label>
                  <select
                    value={spiDevType}
                    onChange={(e) => setSpiDevType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-2 text-slate-200"
                  >
                    <option value="MAX7219">MAX7219 LED Mátrix / 7-Seg</option>
                    <option value="MCP23S17">MCP23S17 16-bit IO</option>
                    <option value="SD_CARD">SD Kártya Modul</option>
                    <option value="CUSTOM">Egyéni SPI Eszköz</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Leírás</label>
                <input
                  type="text"
                  value={spiDevDesc}
                  onChange={(e) => setSpiDevDesc(e.target.value)}
                  placeholder="pl. 8 jegyű numerikus számláló kijelző"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSpiModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Mégse
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-blue-500 font-bold text-slate-950">
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
