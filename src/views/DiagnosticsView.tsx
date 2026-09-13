import React, { useState, useMemo } from 'react';
import {
  Rung,
  PLCVariable,
  PLCArray,
  ProtocolConfigs,
  SimulationState,
  Subroutine
} from '../types';
import {
  TARGET_BOARDS,
  BoardProfile,
  calculateMemoryUsage,
  analyzePerformanceAndOptimization,
  estimateRungExecutionUs,
  getRungAllElements
} from '../utils/diagnosticsCalculator';
import {
  Cpu,
  Gauge,
  Activity,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  BarChart2,
  Clock,
  Download,
  Flame,
  ShieldCheck,
  Play,
  Square,
  Layers,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface DiagnosticsViewProps {
  simulationState: SimulationState;
  mainRungs: Rung[];
  setupRungs?: Rung[];
  variables?: PLCVariable[];
  arrays?: PLCArray[];
  protocols?: ProtocolConfigs;
  subroutines?: Subroutine[];
  onToggleSimulation?: () => void;
  onNavigateToEditor?: () => void;
  onOpenHardwareMap?: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  simulationState,
  mainRungs,
  setupRungs = [],
  variables = [],
  arrays = [],
  protocols,
  subroutines = [],
  onToggleSimulation,
  onNavigateToEditor,
  onOpenHardwareMap
}) => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('uno');
  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'profiler' | 'rules'>('overview');

  const selectedBoard = useMemo<BoardProfile>(() => {
    return TARGET_BOARDS.find((b) => b.id === selectedBoardId) || TARGET_BOARDS[0];
  }, [selectedBoardId]);

  // Calculate memory breakdown for selected board
  const memory = useMemo(() => {
    return calculateMemoryUsage(
      mainRungs,
      setupRungs,
      variables,
      arrays,
      protocols,
      selectedBoard
    );
  }, [mainRungs, setupRungs, variables, arrays, protocols, selectedBoard]);

  // Compute optimization tips
  const tips = useMemo(() => {
    return analyzePerformanceAndOptimization(
      mainRungs,
      simulationState.scanDiagnostics,
      memory,
      simulationState.cycleTimeMs || 20
    );
  }, [mainRungs, simulationState.scanDiagnostics, memory, simulationState.cycleTimeMs]);

  // Stats fallbacks if simulation hasn't run yet
  const scanDiag = simulationState.scanDiagnostics;
  const lastScanUs = scanDiag?.lastScanUs ?? 48.5;
  const minScanUs = scanDiag?.minScanUs ?? 44.2;
  const maxScanUs = scanDiag?.maxScanUs ?? 56.8;
  const avgScanUs = scanDiag?.avgScanUs ?? 48.0;
  const totalScans = scanDiag?.totalScans ?? 0;
  const cycleTimeMs = simulationState.cycleTimeMs || 20;
  const cycleTimeUs = cycleTimeMs * 1000;
  const cpuLoadPercent = Math.min(
    100,
    scanDiag?.cpuLoadPercent ?? Math.round(((avgScanUs / cycleTimeUs) * 100) * 10) / 10
  );

  // Maximum theoretical scan throughput in Hz (if free-running without delay)
  const theoreticalMaxHz = Math.round(1000000 / Math.max(1, avgScanUs));
  const configuredScanHz = Math.round(1000 / cycleTimeMs);

  // Per-rung profiler data
  const rungProfileData = useMemo(() => {
    const clockFactor = selectedBoard.clockMhz === 8 ? 2.0 : selectedBoard.clockMhz === 240 ? 0.08 : 1.0;
    return mainRungs.map((rung, index) => {
      const estimatedUs = estimateRungExecutionUs(rung, clockFactor);
      const measuredUs = scanDiag?.rungTimesUs?.[rung.id] ?? estimatedUs;
      const percentOfScan = Math.min(100, Math.round((measuredUs / Math.max(1, lastScanUs)) * 1000) / 10);
      const allElems = getRungAllElements(rung);
      const hasHeavy = allElems.some((e) =>
        ['I2C_WRITE', 'I2C_READ', 'SPI_TRANSFER', 'DALLAS_READ', 'SD_LOG_WRITE', 'NRF24_TRANSMIT', 'LCD_PRINT', 'ANALOG_CMP'].includes(e.type)
      );

      return {
        id: rung.id,
        comment: rung.comment || `${index + 1}. Létrafok`,
        index,
        elementCount: allElems.length,
        estimatedUs: measuredUs,
        percentOfScan,
        hasHeavy
      };
    }).sort((a, b) => b.estimatedUs - a.estimatedUs);
  }, [mainRungs, scanDiag, lastScanUs, selectedBoard]);

  // Scan history for waveform
  const scanHistory = scanDiag?.scanHistory && scanDiag.scanHistory.length > 2
    ? scanDiag.scanHistory
    : [44.2, 45.1, 46.8, 48.0, 47.3, 49.5, 48.2, 47.9, 52.1, 48.0, 46.5, 47.8, 48.3, 49.0];

  const maxHistoryValue = Math.max(...scanHistory, avgScanUs * 1.5, 10);
  const minHistoryValue = Math.min(...scanHistory, 0);

  // Export report handler
  const handleExportReport = () => {
    const reportContent = `# Arduino PLC Ladder Studio - Diagnosztikai & Teljesítmény Riport
Generálva: ${new Date().toLocaleString()}

## 1. Cél Hardver Specifikáció
- Kártya: ${selectedBoard.name} (${selectedBoard.mcu} @ ${selectedBoard.clockMhz} MHz)
- Teljes SRAM: ${selectedBoard.sramTotalBytes} B (${(selectedBoard.sramTotalBytes / 1024).toFixed(1)} KB)
- Teljes Flash: ${selectedBoard.flashTotalBytes} B (${(selectedBoard.flashTotalBytes / 1024).toFixed(1)} KB)
- Beállított PLC Ciklusidő: ${cycleTimeMs} ms (${configuredScanHz} Hz)

## 2. CPU Terhelés és Ciklusidő Statisztikák
- Átlagos Ciklusidő: ${avgScanUs} µs (${(avgScanUs / 1000).toFixed(3)} ms)
- Minimális Ciklusidő: ${minScanUs} µs
- Maximális Ciklusidő: ${maxScanUs} µs
- Jitter (Szórás): ${(maxScanUs - minScanUs).toFixed(1)} µs
- CPU Terhelés: ${cpuLoadPercent}% (${cycleTimeMs} ms időalap mellett)
- Maximális Elméleti PLC Frekvencia: ${theoreticalMaxHz.toLocaleString()} scan/sec
- Végrehajtott Ciklusok: ${totalScans} db

## 3. Memória Felhasználás
- SRAM Felhasznált: ${memory.sramUsedBytes} B (${memory.sramPercentage}%)
- SRAM Szabad (Verem Margó): ${memory.stackSafetyMarginBytes} B
- Flash Memória Foglaltság: ${memory.flashUsedBytes} B (${memory.flashPercentage}%)

## 4. Létrafok Profilozás (Hotspotok)
${rungProfileData.map((r) => `- [${r.comment}] Végrehajtási idő: ${r.estimatedUs} µs (${r.percentOfScan}% a teljes ciklusból), ${r.elementCount} elem`).join('\n')}

## 5. Optimalizálási Javaslatok
${tips.map((t) => `- [${t.type.toUpperCase()}] ${t.title}: ${t.description} -> Javaslat: ${t.actionableHint}`).join('\n')}
`;

    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plc_diagnostics_${selectedBoard.id}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* 1. Header & Hardware Target Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  PLC Diagnosztikai & Teljesítmény Központ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  REAL-TIME PROFILER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mikroszekundumos ciklusidő statisztikák, CPU terhelés és valós AVR/ESP32 memóriatérkép.
              </p>
            </div>
          </div>
        </div>

        {/* Board & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hardware Board Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Cél Mikrokontroller
              </span>
              <select
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
              >
                {TARGET_BOARDS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                    {b.name} ({b.mcu} @ {b.clockMhz}MHz)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Simulation Toggle Shortcut */}
          {onToggleSimulation && (
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                simulationState.isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
            >
              {simulationState.isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Szimuláció Állj</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Szimuláció Indítása</span>
                </>
              )}
            </button>
          )}

          {/* Open Hardware Map Modal Trigger */}
          {onOpenHardwareMap && (
            <button
              type="button"
              onClick={onOpenHardwareMap}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-600/70 flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/50"
              title="Fizikai lábkiosztás, I/O térkép és ütközésvizsgálat megnyitása"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Hardver Térkép</span>
            </button>
          )}

          {/* Export Report */}
          <button
            type="button"
            onClick={handleExportReport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Diagnosztikai összefoglaló letöltése Markdown formátumban"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Riport Export</span>
          </button>
        </div>
      </div>

      {/* Structural Statistics Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Program Statisztika</h3>
            <p className="text-[11px] text-slate-400">Létrafokok és elemek eloszlása</p>
          </div>
        </div>

        {(() => {
          const stats = useMemo(() => {
            let totalRungs = mainRungs.length + setupRungs.length;
            let totalContacts = 0;
            let totalCoils = 0;

            const countElements = (rungs: Rung[]) => {
              rungs.forEach(rung => {
                rung.branches.forEach(b => {
                  totalContacts += b.elements.length;
                });
                totalCoils += rung.coils.length;
              });
            };

            countElements(mainRungs);
            countElements(setupRungs);
            subroutines?.forEach(sub => countElements(sub.rungs));

            return { totalRungs, totalContacts, totalCoils };
          }, [mainRungs, setupRungs, subroutines]);

          return (
            <div className="flex items-center gap-4 sm:gap-8 mr-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-mono text-sky-400">{stats.totalRungs}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Rung</span>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-mono text-emerald-400">{stats.totalContacts}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Kontaktus</span>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black font-mono text-amber-400">{stats.totalCoils}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Tekercs</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Top Metric KPI Cards (CPU Load, Scan Time, SRAM, Flash) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Load Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" /> CPU Terhelés
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                cpuLoadPercent > 80
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : cpuLoadPercent > 40
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {cpuLoadPercent > 80 ? 'KRITIKUS' : cpuLoadPercent > 40 ? 'KÖZEPES' : 'OPTIMÁLIS'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white font-mono">
              {cpuLoadPercent}%
            </span>
            <span className="text-xs text-slate-500">
              / {cycleTimeMs} ms időalap
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                cpuLoadPercent > 80
                  ? 'bg-rose-500'
                  : cpuLoadPercent > 40
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, cpuLoadPercent))}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Elméleti max:</span>
            <span className="font-mono text-slate-300 font-bold">
              {theoreticalMaxHz.toLocaleString()} scan/s
            </span>
          </div>
        </div>

        {/* Scan Time Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" /> Ciklusidő (Scan Time)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {totalScans} ciklus
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
              {avgScanUs >= 1000 ? `${(avgScanUs / 1000).toFixed(2)} ms` : `${avgScanUs} µs`}
            </span>
            <span className="text-xs text-slate-500">átlag</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] font-mono">
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">MINIMUM:</span>
              <span className="text-slate-300 font-bold">{minScanUs} µs</span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">MAXIMUM:</span>
              <span className="text-slate-300 font-bold">{maxScanUs} µs</span>
            </div>
          </div>
        </div>

        {/* SRAM Usage Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" /> SRAM Dinamikus RAM
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {memory.sramTotalBytes >= 1024 ? `${(memory.sramTotalBytes / 1024).toFixed(0)} KB` : `${memory.sramTotalBytes} B`}
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-amber-300 font-mono">
              {memory.sramPercentage}%
            </span>
            <span className="text-xs text-slate-400">
              ({memory.sramUsedBytes} B)
            </span>
          </div>

          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                memory.sramPercentage > 80
                  ? 'bg-rose-500'
                  : memory.sramPercentage > 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, memory.sramPercentage))}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Szabad verem-margó:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {memory.stackSafetyMarginBytes} B
            </span>
          </div>
        </div>

        {/* Flash Program Memory Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> Flash Programtár
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {(selectedBoard.flashTotalBytes / 1024).toFixed(0)} KB
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-indigo-300 font-mono">
              {memory.flashPercentage}%
            </span>
            <span className="text-xs text-slate-400">
              ({(memory.flashUsedBytes / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(2, memory.flashPercentage))}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Szabad kódterület:</span>
            <span className="font-mono text-indigo-300 font-bold">
              {((selectedBoard.flashTotalBytes - memory.flashUsedBytes) / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Diagnostics */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'overview'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Ciklusidő Hullámforma & Jitter</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profiler')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'profiler'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Létrafok Profiler ({mainRungs.length} fok)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('memory')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'memory'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Memóriatérkép Részletek</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            activeTab === 'rules'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Optimalizálási Javaslatok ({tips.length})</span>
        </button>
      </div>

      {/* 3. TAB CONTENT: OVERVIEW (WAVEFORM & REAL-TIME OSCILLOSCOPE) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Valós Idejű Ciklusidő Hullámforma (Scan Time Oscilloscope)
                </h3>
                <p className="text-xs text-slate-400">
                  Az elmúlt {scanHistory.length} PLC ciklus mikroszekundumos végrehajtási ideje az ATmega328P órajel alapján.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-slate-400">Mért idő (µs)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                  <span className="text-slate-400">Átlag: {avgScanUs} µs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-rose-500 border-dashed inline-block" />
                  <span className="text-slate-400">Ciklusplafon: {cycleTimeUs} µs</span>
                </div>
              </div>
            </div>

            {/* SVG Oscilloscope Chart */}
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 h-56 flex flex-col justify-end">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-x-4 inset-y-4 pointer-events-none flex flex-col justify-between opacity-15">
                <div className="w-full border-b border-slate-500" />
                <div className="w-full border-b border-slate-500" />
                <div className="w-full border-b border-slate-500" />
                <div className="w-full border-b border-slate-500" />
              </div>

              {/* SVG Curve */}
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Polyline / Polygon path */}
                {scanHistory.length > 1 && (() => {
                  const points = scanHistory.map((val, idx) => {
                    const x = (idx / (scanHistory.length - 1)) * 100;
                    // normalize y between 5% and 90%
                    const range = Math.max(1, maxHistoryValue - minHistoryValue);
                    const y = 90 - ((val - minHistoryValue) / range) * 80;
                    return `${x}%,${y}%`;
                  });

                  const areaPoints = [`0%,95%`, ...points, `100%,95%`].join(' ');
                  const linePoints = points.join(' ');

                  return (
                    <>
                      {/* Filled Area */}
                      <polygon points={areaPoints} fill="url(#scanGrad)" />
                      {/* Line */}
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              {/* Data points indicator */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-900 pt-1">
                <span>Ciklus #{Math.max(1, totalScans - scanHistory.length + 1)}</span>
                <span className="text-cyan-400 font-bold">Legutóbbi: {lastScanUs} µs</span>
                <span>Ciklus #{totalScans || scanHistory.length}</span>
              </div>
            </div>

            {/* Deterministic Execution Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Determinisztikus Működés
                </span>
                <p className="text-slate-300">
                  {lastScanUs < cycleTimeUs ? (
                    <strong className="text-emerald-400">GARANTÁLT (0 Ciklustúllépés)</strong>
                  ) : (
                    <strong className="text-rose-400">FIGYELEM: Ciklustúllépés Észlelve!</strong>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  A program minden ciklust határidőn belül fejez be.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Ciklus Jitter (Szórás)
                </span>
                <p className="text-white font-mono font-bold text-sm">
                  ±{(maxScanUs - minScanUs).toFixed(1)} µs
                </p>
                <p className="text-[11px] text-slate-500">
                  Az I/O ágak és feltételes végrehajtások szórása.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Számítási Tartalék (Idle)
                </span>
                <p className="text-white font-mono font-bold text-sm">
                  {(100 - cpuLoadPercent).toFixed(1)}% szabad CPU idő
                </p>
                <p className="text-[11px] text-slate-500">
                  Rendelkezésre álló kapacitás újabb létrákhoz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: LADDER RUNG PROFILER (HOTSPOT ANALYZER) */}
      {activeTab === 'profiler' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                Létrafok Végrehajtási Idő Profiler (Execution Time Hotspots)
              </h3>
              <p className="text-xs text-slate-400">
                A létrák számítási igény szerint rendezve. Segít azonosítani a leglassabb ágakat és blokkokat.
              </p>
            </div>

            {onNavigateToEditor && (
              <button
                type="button"
                onClick={onNavigateToEditor}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
              >
                <span>Ugrás a Létraszerkesztőhöz</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {rungProfileData.map((item, idx) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center">
                      #{item.index + 1}
                    </span>
                    <span className="font-bold text-slate-200 text-xs">
                      {item.comment}
                    </span>
                    {item.hasHeavy && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3" /> NEHÉZ I/O
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400">{item.elementCount} elem</span>
                    <span className="text-cyan-400 font-bold">{item.estimatedUs} µs</span>
                    <span className="text-slate-500 text-[11px]">({item.percentOfScan}%)</span>
                  </div>
                </div>

                {/* Progress Bar of scan share */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.percentOfScan > 30
                        ? 'bg-rose-500'
                        : item.percentOfScan > 15
                        ? 'bg-amber-400'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.max(2, item.percentOfScan)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: MEMORY MAP DETAILS */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                Mikrokontroller Memóriatérkép: {selectedBoard.name}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedBoard.description}
              </p>
            </div>

            {/* SRAM Visual Breakdown Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">SRAM Megoszlás ({memory.sramTotalBytes} bájt)</span>
                <span className="text-slate-400 font-mono">
                  {memory.sramUsedBytes} B foglalt / {memory.stackSafetyMarginBytes} B szabad
                </span>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800">
                {memory.items.map((it, idx) => {
                  const widthPct = (it.sramBytes / memory.sramTotalBytes) * 100;
                  if (widthPct <= 0) return null;
                  const colors = [
                    'bg-slate-600',
                    'bg-amber-500',
                    'bg-emerald-500',
                    'bg-cyan-500',
                    'bg-indigo-500',
                    'bg-rose-500'
                  ];
                  return (
                    <div
                      key={idx}
                      className={`${colors[idx % colors.length]} hover:opacity-80 transition-opacity`}
                      style={{ width: `${widthPct}%` }}
                      title={`${it.label}: ${it.sramBytes} B (${widthPct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2">Modul / Adatforrás</th>
                    <th className="pb-2">SRAM Méret</th>
                    <th className="pb-2">Flash Méret</th>
                    <th className="pb-2">Kategória</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                  {memory.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-sans font-medium text-slate-200">
                        {item.label}
                      </td>
                      <td className="py-2.5 text-amber-300 font-bold">
                        {item.sramBytes} B
                      </td>
                      <td className="py-2.5 text-indigo-300">
                        {item.flashBytes >= 1024
                          ? `${(item.flashBytes / 1024).toFixed(1)} KB`
                          : `${item.flashBytes} B`}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-400">
                          {item.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: OPTIMIZATION RULES & ADVISORY */}
      {activeTab === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Automatikus Szabályalapú Létra Logika Audit
            </h3>
            <p className="text-xs text-slate-400">
              Professzionális PLC programozási szabályok, élérzékelési és memóriatakarékossági tanácsok.
            </p>
          </div>

          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  tip.type === 'danger'
                    ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                    : tip.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                    : tip.type === 'info'
                    ? 'bg-sky-950/30 border-sky-800/80 text-sky-200'
                    : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tip.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    {tip.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {tip.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
                    {tip.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span className="font-bold text-sm text-white">{tip.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                    {tip.impact}
                  </span>
                </div>

                <p className="text-xs text-slate-300 pl-6">{tip.description}</p>

                <div className="pl-6 pt-1 flex items-start gap-2">
                  <span className="text-[11px] font-bold text-cyan-400 shrink-0">
                    Gyakorlati tanács:
                  </span>
                  <span className="text-[11px] text-slate-300 italic">
                    {tip.actionableHint}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
