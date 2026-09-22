import React, { useState, useMemo } from 'react';
import {
  X,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  ArrowRightLeft,
  Layers,
  Zap,
  Radio,
  Sliders,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Table as TableIcon,
  Maximize2
} from 'lucide-react';
import {
  Rung,
  Subroutine,
  PLCVariable,
  ProtocolConfigs,
  InterruptsConfig,
  LadderElement
} from '../../types';
import {
  BoardType,
  BoardPinDefinition,
  ARDUINO_UNO_PINS,
  ARDUINO_MEGA_PINS,
  extractPinUsages,
  analyzePinConflicts,
  generateWiringDocumentation,
  PinUsageEntry,
  PinConflict,
  normalizePin
} from '../../utils/hardwareMapUtils';

interface HardwareMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  rungs: Rung[];
  setupRungs?: Rung[];
  subroutines?: Subroutine[];
  variables?: PLCVariable[];
  protocols?: ProtocolConfigs;
  interrupts?: InterruptsConfig;
  defaultBoard?: BoardType;
  onUpdateElementPin?: (elementId: string, newPin: string) => void;
  onUpdateVariablePin?: (variableName: string, newPin: string) => void;
}

export const HardwareMapModal: React.FC<HardwareMapModalProps> = ({
  isOpen,
  onClose,
  rungs,
  setupRungs = [],
  subroutines = [],
  variables = [],
  protocols,
  interrupts,
  defaultBoard = 'uno',
  onUpdateElementPin,
  onUpdateVariablePin
}) => {
  // Board selection state
  const [selectedBoard, setSelectedBoard] = useState<BoardType>(defaultBoard);
  // Active selected pin for deep inspection
  const [selectedPinId, setSelectedPinId] = useState<string | null>('D8');
  // View mode: 'board' (PCB Graphical View) or 'table' (Pinout Table View)
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'conflicts' | 'used' | 'inputs' | 'outputs' | 'free'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Active board pins specification
  const boardPins = useMemo<BoardPinDefinition[]>(() => {
    return selectedBoard === 'uno' ? ARDUINO_UNO_PINS : ARDUINO_MEGA_PINS;
  }, [selectedBoard]);

  // Extract all pin usages from the project
  const pinUsages = useMemo(() => {
    return extractPinUsages(rungs, setupRungs, subroutines, protocols, interrupts, variables, selectedBoard);
  }, [rungs, setupRungs, subroutines, protocols, interrupts, variables, selectedBoard]);

  // Analyze all pin conflicts and warnings
  const pinConflicts = useMemo(() => {
    return analyzePinConflicts(boardPins, pinUsages, selectedBoard);
  }, [boardPins, pinUsages, selectedBoard]);

  // Total pins count & statistics
  const stats = useMemo(() => {
    const ioPins = boardPins.filter(p => p.isDigital || p.isAnalog);
    let usedCount = 0;
    ioPins.forEach(p => {
      if ((pinUsages.get(p.id) || []).length > 0) {
        usedCount++;
      }
    });
    return {
      totalIo: ioPins.length,
      usedCount,
      freeCount: ioPins.length - usedCount,
      conflictsCount: pinConflicts.size
    };
  }, [boardPins, pinUsages, pinConflicts]);

  // Find currently selected pin object
  const selectedPinDef = useMemo(() => {
    if (!selectedPinId) return null;
    return boardPins.find(p => p.id === selectedPinId) || null;
  }, [boardPins, selectedPinId]);

  const selectedPinUsages = useMemo(() => {
    if (!selectedPinId) return [];
    return pinUsages.get(selectedPinId) || [];
  }, [pinUsages, selectedPinId]);

  const selectedPinConflict = useMemo(() => {
    if (!selectedPinId) return undefined;
    return pinConflicts.get(selectedPinId);
  }, [pinConflicts, selectedPinId]);

  // Copy wiring documentation
  const handleCopyDocumentation = () => {
    const doc = generateWiringDocumentation(boardPins, pinUsages, pinConflicts, selectedBoard);
    navigator.clipboard.writeText(doc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download documentation file
  const handleDownloadDocumentation = () => {
    const doc = generateWiringDocumentation(boardPins, pinUsages, pinConflicts, selectedBoard);
    const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arduino_PLC_Hardware_Map_${selectedBoard.toUpperCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick Auto-Resolve helper
  const handleAutoResolve = (targetUsage: PinUsageEntry, newPin: string) => {
    if (!targetUsage.elementId || !onUpdateElementPin) return;
    onUpdateElementPin(targetUsage.elementId, newPin);
    setSelectedPinId(newPin);
  };

  if (!isOpen) return null;

  // Filtered pins for table or highlight
  const filteredPins = boardPins.filter(p => {
    const usages = pinUsages.get(p.id) || [];
    const isConflicted = pinConflicts.has(p.id);

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchLabel = p.label.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchUsage = usages.some(
        u =>
          u.elementName.toLowerCase().includes(q) ||
          (u.variableName && u.variableName.toLowerCase().includes(q)) ||
          u.locationLabel.toLowerCase().includes(q)
      );
      if (!matchId && !matchLabel && !matchDesc && !matchUsage) return false;
    }

    // Category filter
    if (filterType === 'conflicts') return isConflicted;
    if (filterType === 'used') return usages.length > 0;
    if (filterType === 'free') return usages.length === 0 && (p.isDigital || p.isAnalog);
    if (filterType === 'inputs') return usages.some(u => u.direction === 'input' || u.direction === 'analog_in');
    if (filterType === 'outputs') return usages.some(u => u.direction === 'output' || u.direction === 'pwm_out');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-7xl h-[92vh] max-h-[900px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ========================================================= */}
        {/* 1. MODAL TOP HEADER */}
        {/* ========================================================= */}
        <header className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-base text-slate-100 tracking-wide">
                  Hardver Lábkiosztási Térkép (Hardware Map)
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Vizualizált Lábkiosztás & Ütközésvizsgáló
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                PLC változók és létra elemek fizikai mikrokontroller lábkiosztása és valós idejű ütközésvizsgálata
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Board Selector Switch */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setSelectedBoard('uno');
                  setSelectedPinId('D8');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBoard === 'uno'
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Arduino Uno R3</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedBoard('mega');
                  setSelectedPinId('D8');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBoard === 'mega'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Arduino Mega 2560</span>
              </button>
            </div>

            {/* Conflict Counter Badge */}
            {stats.conflictsCount > 0 ? (
              <div className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{stats.conflictsCount} Lábütközés Észlelve!</span>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>0 Ütközés (Tiszta Kiosztás)</span>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. CONFLICT BANNER (Shown if any conflicts exist) */}
        {/* ========================================================= */}
        {pinConflicts.size > 0 && (
          <div className="px-5 py-2.5 bg-rose-950/40 border-b border-rose-900/60 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Figyelem:</strong> {pinConflicts.size} fizikai lábon ütközés található (pl. több kimenet ugyanazon a lábon vagy hardver busz felülírás). Kattints a hibás lábra a javításhoz!
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from(pinConflicts.entries()).map(([pId, conflict]) => (
                <button
                  key={pId}
                  type="button"
                  onClick={() => {
                    setSelectedPinId(pId);
                    setViewMode('board');
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                >
                  <span>{pId}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. TOOLBAR & CONTROLS */}
        {/* ========================================================= */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Search box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Keresés: D8, START, V_TEMP..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px] font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Szűrés:
            </span>

            {[
              { key: 'all', label: `Mind (${boardPins.length})` },
              { key: 'conflicts', label: `Ütközések (${stats.conflictsCount})`, alert: stats.conflictsCount > 0 },
              { key: 'used', label: `Használatban (${stats.usedCount})` },
              { key: 'inputs', label: 'Bemenetek' },
              { key: 'outputs', label: 'Kimenetek' },
              { key: 'free', label: `Szabad Lábak (${stats.freeCount})` }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(f.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === f.key
                    ? f.alert
                      ? 'bg-rose-500 text-white font-bold shadow'
                      : 'bg-slate-700 text-white font-bold'
                    : f.alert
                    ? 'bg-rose-950/60 text-rose-400 border border-rose-800/80 hover:bg-rose-900/60'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Toggle and Export Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'board'
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Interaktív PCB Kártya nézet"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Grafikus Kártya</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Részletes bekötési táblázat"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bekötési Táblázat</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyDocumentation}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              title="Bekötési lista másolása Markdown formátumban"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Másolva!' : 'Másolás'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDocumentation}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              title="Bekötési dokumentáció letöltése (.md)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Exportálás (.md)</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. MAIN WORKSPACE: GRAPHICAL BOARD OR TABLE VIEW */}
        {/* ========================================================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left / Center View: PCB or Table */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-slate-950/60 border-r border-slate-800">
            {viewMode === 'board' ? (
              <div className="flex flex-col items-center justify-start min-h-full space-y-4">
                {/* Visual Board Header Legend */}
                <div className="w-full flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-400" /> Színmagyarázat:
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      <span>Bemenet (Kontakt/Sensor)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
                      <span>Kimenet (Coil/Relay)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                      <span>PWM Analóg Kimenet</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
                      <span>Analóg ADC Bemenet</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                      <span>Kommunikáció (I2C/SPI/UART)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-400/50 animate-pulse" />
                      <span className="font-bold text-rose-400">Ütközés!</span>
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    Kattints egy lábra a részletes adatokhoz és átcsoportosításhoz
                  </span>
                </div>

                {/* GRAPHICAL BOARD SILHOUETTE */}
                {selectedBoard === 'uno' ? (
                  /* ========================================================= */
                  /* ARDUINO UNO R3 GRAPHICAL BOARD */
                  /* ========================================================= */
                  <div className="relative w-full max-w-[820px] bg-gradient-to-br from-[#00818A] via-[#006A72] to-[#004A50] rounded-3xl p-5 border-4 border-[#C89B3C]/50 shadow-2xl shadow-sky-950/80 my-auto">
                    {/* PCB Silkscreen Markings & Branding */}
                    <div className="absolute top-8 left-24 text-white/90 font-mono tracking-widest text-base font-black select-none pointer-events-none drop-shadow">
                      ARDUINO <span className="text-emerald-300 font-sans">UNO R3</span>
                    </div>
                    <div className="absolute bottom-8 left-24 text-white/50 text-[10px] font-mono select-none pointer-events-none">
                      ATmega328P • 16 MHz • 5V Logic • MADE IN ITALY
                    </div>

                    {/* Hardware Components Illustrations */}
                    {/* USB-B Port */}
                    <div className="absolute top-10 -left-4 w-14 h-16 bg-gradient-to-r from-slate-300 to-slate-400 border-2 border-slate-500 rounded-sm shadow-lg flex items-center justify-center">
                      <div className="w-7 h-9 bg-slate-900 rounded-xs border border-slate-700 flex items-center justify-center">
                        <div className="w-4 h-5 bg-amber-200/40 rounded-xs" />
                      </div>
                    </div>

                    {/* DC Power Jack */}
                    <div className="absolute bottom-10 -left-5 w-16 h-18 bg-gradient-to-r from-slate-900 to-slate-950 border-2 border-slate-800 rounded-md shadow-2xl flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="absolute top-6 left-12 w-6 h-6 rounded-md bg-rose-700 border-2 border-slate-300 shadow-md flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-inner" />
                    </div>

                    {/* ATmega328P DIP-28 Chip */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[36%] w-44 h-18 bg-slate-950 border-2 border-slate-800 rounded-lg shadow-2xl flex flex-col justify-between p-2 select-none">
                      <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-2 h-4 bg-slate-800 rounded-r-full border border-slate-700" />
                      <div className="text-[11px] font-mono text-slate-400 font-bold tracking-wider text-center">
                        ATmega328P-PU
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-1">
                        <span>16MHz</span>
                        <span>AVR Core</span>
                        <span>32KB Flash</span>
                      </div>
                      <div className="flex justify-around">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div key={i} className="w-1 h-2 bg-slate-500 rounded-xs" />
                        ))}
                      </div>
                    </div>

                    {/* Status LEDs (ON, L, TX, RX) */}
                    <div className="absolute top-28 left-48 flex flex-col gap-1.5 text-[9px] font-mono text-white/70">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                        <span>ON</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${pinUsages.has('D13') ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-700'}`} />
                        <span>L (D13)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${protocols?.uart?.enabled ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-700'}`} />
                        <span>TX</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${protocols?.uart?.enabled ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-700'}`} />
                        <span>RX</span>
                      </div>
                    </div>

                    {/* ===================================================== */}
                    {/* TOP DIGITAL HEADER (D0 - D13, GND, AREF, SDA, SCL) */}
                    {/* ===================================================== */}
                    <div className="flex flex-col items-end mb-24">
                      <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 mr-2">
                        DIGITAL (PWM ~)
                      </div>
                      <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5">
                        {/* 10-pin block: SCL, SDA, AREF, GND, D13..D8 */}
                        <div className="flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'digital_top' && p.headerIndex <= 9)
                            .map(pin => renderPinSocket(pin))}
                        </div>

                        {/* Gap divider */}
                        <div className="w-2 h-6 bg-slate-800/80 rounded" />

                        {/* 8-pin block: D7..D0 */}
                        <div className="flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'digital_top' && p.headerIndex > 9)
                            .map(pin => renderPinSocket(pin))}
                        </div>
                      </div>
                    </div>

                    {/* ===================================================== */}
                    {/* BOTTOM POWER & ANALOG HEADERS */}
                    {/* ===================================================== */}
                    <div className="flex items-start justify-between">
                      {/* Left: Power Header */}
                      <div>
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 ml-2">
                          POWER
                        </div>
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'power_bottom')
                            .map(pin => renderPinSocket(pin, true))}
                        </div>
                      </div>

                      {/* Right: Analog In Header */}
                      <div className="flex flex-col items-end">
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 mr-2">
                          ANALOG IN (0-5V)
                        </div>
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'analog_bottom')
                            .map(pin => renderPinSocket(pin, true))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* ARDUINO MEGA 2560 GRAPHICAL BOARD */
                  /* ========================================================= */
                  <div className="relative w-full max-w-[960px] bg-gradient-to-br from-[#00737C] via-[#005B62] to-[#004247] rounded-3xl p-5 border-4 border-[#C89B3C]/50 shadow-2xl shadow-sky-950/80 my-auto">
                    {/* Silkscreen Branding */}
                    <div className="absolute top-8 left-24 text-white/90 font-mono tracking-widest text-base font-black select-none pointer-events-none drop-shadow">
                      ARDUINO <span className="text-indigo-300 font-sans">MEGA 2560</span>
                    </div>
                    <div className="absolute bottom-8 left-24 text-white/50 text-[10px] font-mono select-none pointer-events-none">
                      ATmega2560 • 54 Digital I/O (15 PWM) • 16 Analog Inputs • 4 UART Ports
                    </div>

                    {/* Hardware USB & DC connectors */}
                    <div className="absolute top-10 -left-4 w-14 h-16 bg-gradient-to-r from-slate-300 to-slate-400 border-2 border-slate-500 rounded-sm shadow-lg flex items-center justify-center">
                      <div className="w-7 h-9 bg-slate-900 rounded-xs border border-slate-700 flex items-center justify-center">
                        <div className="w-4 h-5 bg-amber-200/40 rounded-xs" />
                      </div>
                    </div>

                    <div className="absolute bottom-10 -left-5 w-16 h-18 bg-gradient-to-r from-slate-900 to-slate-950 border-2 border-slate-800 rounded-md shadow-2xl flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      </div>
                    </div>

                    {/* ATmega2560 Quad Flat Package (QFP-100) Square Chip */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[32%] w-24 h-24 bg-slate-950 border-2 border-slate-800 rounded-lg shadow-2xl rotate-45 flex items-center justify-center select-none">
                      <div className="-rotate-45 text-[10px] font-mono text-center text-slate-300 font-bold">
                        ATmega
                        <br />
                        2560
                      </div>
                    </div>

                    {/* Top Headers: Digital 0..13 and Communication (14..21) */}
                    <div className="flex flex-col items-end mb-20">
                      <div className="flex items-center justify-between w-full">
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 ml-44">
                          DIGITAL (PWM 2-13)
                        </div>
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 mr-2">
                          COMMUNICATION (TX/RX/SDA/SCL)
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Digital 0-13 header */}
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'digital_top')
                            .map(pin => renderPinSocket(pin))}
                        </div>

                        {/* Mega Comm header: D14..D21 */}
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'comm_mega')
                            .map(pin => renderPinSocket(pin))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Headers: Power, Analog 0-7, Analog 8-15, and Dual Digital 22-53 */}
                    <div className="flex items-start justify-between">
                      {/* Left: Power Header */}
                      <div>
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 ml-2">
                          POWER
                        </div>
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'power_bottom')
                            .map(pin => renderPinSocket(pin, true))}
                        </div>
                      </div>

                      {/* Middle: Analog In A0 - A15 */}
                      <div>
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1">
                          ANALOG IN (A0-A15)
                        </div>
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex items-center gap-1">
                          {boardPins
                            .filter(p => p.header === 'analog_bottom')
                            .map(pin => renderPinSocket(pin, true))}
                        </div>
                      </div>

                      {/* Right: Dual Row Header D22 - D53 */}
                      <div className="flex flex-col items-end">
                        <div className="text-white/80 font-mono text-[10px] font-bold tracking-wider mb-1 mr-2">
                          DIGITAL (22-53)
                        </div>
                        <div className="bg-slate-950/95 border-2 border-slate-900 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1">
                          {/* Even Row: D22, D24 ... D52 */}
                          <div className="flex items-center gap-1">
                            {boardPins
                              .filter(p => p.header === 'double_digital_mega' && p.headerIndex % 2 === 0)
                              .map(pin => renderPinSocket(pin, true, true))}
                          </div>
                          {/* Odd Row: D23, D25 ... D53 */}
                          <div className="flex items-center gap-1">
                            {boardPins
                              .filter(p => p.header === 'double_digital_mega' && p.headerIndex % 2 !== 0)
                              .map(pin => renderPinSocket(pin, true, true))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ========================================================= */
              /* DETAILED PINOUT & WIRING TABLE VIEW */
              /* ========================================================= */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Megjelenítve: {filteredPins.length} fizikai láb</span>
                  <span className="text-[11px] text-slate-500">Kattints egy sorra a láb kiválasztásához</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Láb</th>
                        <th className="py-2.5 px-3">Típus / Képesség</th>
                        <th className="py-2.5 px-3">Feszültség</th>
                        <th className="py-2.5 px-3">Hozzárendelt PLC Elem & Változó</th>
                        <th className="py-2.5 px-3">Irány</th>
                        <th className="py-2.5 px-3">Hely / Rung</th>
                        <th className="py-2.5 px-3">Állapot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                      {filteredPins.map(pin => {
                        const usages = pinUsages.get(pin.id) || [];
                        const conflict = pinConflicts.get(pin.id);
                        const isSelected = selectedPinId === pin.id;

                        return (
                          <tr
                            key={pin.id}
                            onClick={() => setSelectedPinId(pin.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-sky-950/60 text-sky-200'
                                : conflict
                                ? 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-200'
                                : usages.length > 0
                                ? 'hover:bg-slate-900/80 text-slate-200'
                                : 'hover:bg-slate-900/40 text-slate-500'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  conflict
                                    ? 'bg-rose-500 animate-pulse'
                                    : usages.length > 0
                                    ? usages[0].direction === 'output'
                                      ? 'bg-sky-500'
                                      : usages[0].direction === 'pwm_out'
                                      ? 'bg-amber-500'
                                      : usages[0].direction === 'protocol'
                                      ? 'bg-purple-500'
                                      : 'bg-emerald-500'
                                    : 'bg-slate-700'
                                }`}
                              />
                              <span className="font-bold">{pin.id}</span>
                              {pin.isPwm && <span className="text-amber-400 font-bold">~</span>}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                              {pin.isCommunication ? 'Busz / Kommunikáció' : pin.isAnalog ? 'Analóg ADC' : pin.isDigital ? 'Digitális I/O' : 'Tápellátás'}
                            </td>
                            <td className="py-2 px-3 text-slate-400">{pin.voltage}</td>
                            <td className="py-2 px-3 font-sans">
                              {usages.length === 0 ? (
                                <span className="text-slate-600 italic">Szabad</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {usages.map((u, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-200">{u.elementName}</span>
                                      {u.variableName && (
                                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-sky-400 border border-slate-800">
                                          {u.variableName}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 uppercase text-[10px]">
                              {usages.length === 0 ? '-' : usages.map(u => u.direction).join(', ')}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-400 text-[11px] truncate max-w-[180px]">
                              {usages.length === 0 ? '-' : usages.map(u => u.locationLabel).join('; ')}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {conflict ? (
                                <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px] flex items-center gap-1 shrink-0">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" /> Ütközés
                                </span>
                              ) : usages.length > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-[10px]">
                                  Bekötve
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[10px]">Szabad</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE PANEL: PIN INSPECTOR & CONFLICT RESOLUTION */}
          {/* ========================================================= */}
          <div className="w-96 bg-slate-900 p-4.5 flex flex-col justify-between overflow-y-auto shrink-0 space-y-4">
            {selectedPinDef ? (
              <div className="space-y-4">
                {/* Pin Title Header Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono text-sky-400">{selectedPinDef.id}</span>
                      {selectedPinDef.isPwm && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono font-bold">
                          PWM ~
                        </span>
                      )}
                      {selectedPinDef.isInterrupt && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono font-bold">
                          INT
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {selectedPinDef.voltage}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans">{selectedPinDef.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800/80">
                    <div>Fejléc: <span className="text-slate-200 font-medium">{selectedPinDef.header}</span></div>
                    <div>I/O Típus: <span className="text-slate-200 font-medium">{selectedPinDef.isAnalog ? 'Analóg ADC' : selectedPinDef.isDigital ? 'Digitális I/O' : 'Táp'}</span></div>
                  </div>
                </div>

                {/* Conflict Alert Box (If this pin is in conflict) */}
                {selectedPinConflict && (
                  <div className="bg-rose-950/80 border-2 border-rose-600 rounded-xl p-3.5 space-y-3 shadow-lg shadow-rose-950/50 text-xs animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-rose-200 text-sm">{selectedPinConflict.title}</h4>
                        <p className="text-rose-300/90 text-[11px] mt-1 leading-relaxed">
                          {selectedPinConflict.message}
                        </p>
                      </div>
                    </div>

                    {/* Auto-Resolve Free Pin Suggestions */}
                    {selectedPinConflict.suggestedPins.length > 0 && onUpdateElementPin && (
                      <div className="bg-slate-950/90 rounded-lg p-2.5 border border-rose-900/60 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Gyors Ütközésfeloldás (1-Kattintásos Áthelyezés):</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Kattints egy szabad lábra, hogy az ütköző elemet automatikusan áthelyezd oda:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedPinConflict.suggestedPins.map(freePin => (
                            <button
                              key={freePin}
                              type="button"
                              onClick={() => {
                                if (selectedPinConflict.conflictingUsages[0]) {
                                  handleAutoResolve(selectedPinConflict.conflictingUsages[0], freePin);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow transition-all flex items-center gap-1"
                            >
                              <span>Áthelyezés → {freePin}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Elements & Variables Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      Hozzárendelt Elemek ({selectedPinUsages.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedPinUsages.length === 0 ? 'Szabad' : 'Foglalt'}
                    </span>
                  </div>

                  {selectedPinUsages.length === 0 ? (
                    <div className="py-5 text-center text-slate-500 text-xs italic space-y-2">
                      <p>Ez a láb jelenleg szabad és bekötésre vár.</p>
                      <p className="text-[11px] text-slate-600">
                        Rendeld hozzá egy létra érintkezőhöz vagy kimenethez a szerkesztőben!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedPinUsages.map((usage, idx) => (
                        <div
                          key={usage.id || idx}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{usage.elementName}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                usage.direction === 'output'
                                  ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                  : usage.direction === 'pwm_out'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : usage.direction === 'protocol'
                                  ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}
                            >
                              {usage.direction.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-sans">
                            {usage.locationLabel}
                          </div>

                          {usage.variableName && (
                            <div className="text-[11px] flex items-center gap-1 text-slate-300">
                              <span className="text-slate-500">PLC Változó:</span>
                              <span className="font-mono text-sky-300 font-bold">{usage.variableName}</span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-500 italic">
                            {usage.details}
                          </div>

                          {/* Reassign Pin Dropdown if elementId exists */}
                          {usage.elementId && onUpdateElementPin && (
                            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 shrink-0">Láb módosítása:</span>
                              <select
                                value={selectedPinDef.id}
                                onChange={e => {
                                  if (e.target.value !== selectedPinDef.id) {
                                    handleAutoResolve(usage, e.target.value);
                                  }
                                }}
                                className="w-full py-1 px-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                              >
                                {boardPins
                                  .filter(p => p.isDigital || p.isAnalog)
                                  .map(bp => (
                                    <option key={bp.id} value={bp.id}>
                                      {bp.id} {bp.isPwm ? '(PWM)' : ''} - {bp.label}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fast Map Variable directly to this Pin */}
                {variables.length > 0 && onUpdateVariablePin && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      PLC Változó Hozzárendelése ehhez a Lábhoz:
                    </span>
                    <div className="flex gap-2">
                      <select
                        id="var-pin-select"
                        className="flex-1 py-1 px-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Válassz PLC Változót --</option>
                        {variables.map(v => (
                          <option key={v.id} value={v.name}>
                            {v.name} ({v.type}) {v.mappedPin ? `[jelenleg: ${v.mappedPin}]` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const select = document.getElementById('var-pin-select') as HTMLSelectElement;
                          if (select && select.value) {
                            onUpdateVariablePin(select.value, selectedPinDef.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
                      >
                        Bekötés
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs italic space-y-2">
                <Cpu className="w-8 h-8 mx-auto text-slate-600" />
                <p>Válassz ki egy lábat a kártyán a részletek megjelenítéséhez!</p>
              </div>
            )}

            {/* Bottom Status Footer */}
            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{selectedBoard === 'uno' ? 'ATmega328P (Uno)' : 'ATmega2560 (Mega)'}</span>
              <span>{stats.usedCount} / {stats.totalIo} láb lefoglalva</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to render interactive pin socket on the visual PCB
  function renderPinSocket(pin: BoardPinDefinition, isBottom = false, isDoubleRow = false) {
    const usages = pinUsages.get(pin.id) || [];
    const conflict = pinConflicts.get(pin.id);
    const isSelected = selectedPinId === pin.id;

    // Pin badge color
    let badgeColor = 'bg-slate-900 border-slate-700 text-slate-400';
    let dotColor = 'bg-slate-700';

    if (conflict) {
      badgeColor = 'bg-rose-950 border-rose-500 text-rose-300 ring-2 ring-rose-500/50 animate-pulse';
      dotColor = 'bg-rose-500';
    } else if (usages.length > 0) {
      const first = usages[0];
      if (first.direction === 'output') {
        badgeColor = 'bg-sky-950 border-sky-500 text-sky-200';
        dotColor = 'bg-sky-400';
      } else if (first.direction === 'pwm_out') {
        badgeColor = 'bg-amber-950 border-amber-500 text-amber-200';
        dotColor = 'bg-amber-400';
      } else if (first.direction === 'analog_in') {
        badgeColor = 'bg-teal-950 border-teal-500 text-teal-200';
        dotColor = 'bg-teal-400';
      } else if (first.direction === 'protocol') {
        badgeColor = 'bg-purple-950 border-purple-500 text-purple-200';
        dotColor = 'bg-purple-400';
      } else {
        badgeColor = 'bg-emerald-950 border-emerald-500 text-emerald-200';
        dotColor = 'bg-emerald-400';
      }
    } else if (pin.isPower) {
      badgeColor = 'bg-slate-950 border-slate-800 text-slate-500';
      dotColor = 'bg-slate-800';
    }

    return (
      <div
        key={pin.id}
        onClick={() => setSelectedPinId(pin.id)}
        className={`group relative flex flex-col items-center cursor-pointer transition-all duration-150 ${
          isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
        }`}
        title={`${pin.label}: ${usages.map(u => u.elementName).join(', ') || 'Szabad'}`}
      >
        {/* Top Pin Label (if header is top) */}
        {!isBottom && (
          <span
            className={`text-[9px] font-mono mb-1 transition-colors ${
              isSelected
                ? 'text-sky-300 font-bold scale-110'
                : conflict
                ? 'text-rose-400 font-bold'
                : usages.length > 0
                ? 'text-white font-bold'
                : 'text-white/60'
            }`}
          >
            {pin.id.replace('D', '')}
            {pin.isPwm ? '~' : ''}
          </span>
        )}

        {/* Physical Black Header Socket with Gold Pad Hole */}
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
            isSelected
              ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-sky-500/50'
              : ''
          } ${badgeColor}`}
        >
          {/* Solder hole / Status Indicator Dot */}
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} transition-all shadow-inner`} />
        </div>

        {/* Bottom Pin Label (if header is bottom) */}
        {isBottom && (
          <span
            className={`text-[9px] font-mono mt-1 transition-colors ${
              isSelected
                ? 'text-sky-300 font-bold scale-110'
                : conflict
                ? 'text-rose-400 font-bold'
                : usages.length > 0
                ? 'text-white font-bold'
                : 'text-white/60'
            }`}
          >
            {pin.id}
          </span>
        )}

        {/* Floating Tooltip Hover Preview */}
        <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full mb-2 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-[10px] text-slate-200 whitespace-nowrap shadow-2xl z-30 flex flex-col items-center">
          <span className="font-bold text-sky-400 font-mono">{pin.label}</span>
          <span className="text-slate-400">
            {conflict
              ? `⚠️ ${conflict.title}`
              : usages.length > 0
              ? usages.map(u => u.elementName).join(', ')
              : 'Szabad'}
          </span>
        </div>
      </div>
    );
  }
};
