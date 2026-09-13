import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink,
  Zap,
  Activity,
  Radio,
  Search
} from 'lucide-react';
import { Rung, ArduinoLibrary, ProtocolConfigs, Subroutine, PLCVariable, PLCConstant, PLCArray, InterruptsConfig } from '../types';

interface CodeViewProps {
  code: string;
  projectName?: string;
  rungs: Rung[];
  setupRungs: Rung[];
  libraries: ArduinoLibrary[];
  protocols: ProtocolConfigs;
  subroutines: Subroutine[];
  variables: PLCVariable[];
  constants: PLCConstant[];
  arrays: PLCArray[];
  interrupts?: InterruptsConfig;
  onOpenSimulator: () => void;
  onOpenEditor: () => void;
}

export const CodeView: React.FC<CodeViewProps> = ({
  code,
  projectName = 'Arduino_PLC_Ladder_Sketch',
  rungs,
  setupRungs,
  libraries,
  protocols,
  subroutines,
  variables,
  constants,
  arrays,
  interrupts,
  onOpenSimulator,
  onOpenEditor
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'setup' | 'loop' | 'subroutines'>('all');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const codeLines = useMemo(() => code.split('\n'), [code]);

  // Highlight syntax keywords
  const renderHighlightedLine = (line: string) => {
    // Comments
    if (line.trim().startsWith('//')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }
    if (line.trim().startsWith('/*') || line.trim().endsWith('*/')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }

    // Includes
    if (line.trim().startsWith('#include')) {
      return (
        <span>
          <span className="text-purple-400 font-bold">#include </span>
          <span className="text-emerald-300">{line.replace('#include', '').trim()}</span>
        </span>
      );
    }

    // Defines / Constants
    if (line.trim().startsWith('#define') || line.trim().startsWith('const ')) {
      return <span className="text-amber-300">{line}</span>;
    }

    // Function declarations
    if (line.includes('void setup()') || line.includes('void loop()')) {
      return (
        <span className="text-sky-300 font-bold bg-sky-950/40 px-1 rounded">
          {line}
        </span>
      );
    }

    return <span>{line}</span>;
  };

  // Filtered lines if user searches
  const lineNumbersToHighlight = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    const term = searchTerm.toLowerCase();
    const matches = new Set<number>();
    codeLines.forEach((l, i) => {
      if (l.toLowerCase().includes(term)) matches.add(i + 1);
    });
    return matches;
  }, [codeLines, searchTerm]);

  // Jump to section in editor
  const handleJumpTo = (target: string) => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const activeLibs = libraries.filter((l) => l.enabled);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 select-none">
      {/* Top Action & Stats Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                4. Arduino C++ Kódgenerátor (.ino)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-bold">
                PROD-READY SKETCH
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Teljes körűen fordítható Arduino IDE v2 kód setup() és loop() szétválasztott kiértékeléssel
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Keresés a kódban..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 w-44 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              copied
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Kód kimásolva!' : 'Kód Másolása'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Letöltés (.ino)</span>
          </button>
        </div>
      </div>

      {/* Main Content: Split Sidebar + Big Code Editor Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Information & Architecture Sidebar */}
        <aside className="w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          {/* Architecture Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>PLC Architektúra</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Célhardver:</span>
                <span className="font-mono font-semibold text-slate-200">Arduino Uno / Nano</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Scan Ciklusidő:</span>
                <span className="font-mono font-semibold text-emerald-400">20 ms (50 Hz)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">UART Baud:</span>
                <span className="font-mono font-semibold text-sky-400">{protocols.uart.baudRate} bps</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Kód Sorok száma:</span>
                <span className="font-mono font-semibold text-amber-400">{codeLines.length} sor</span>
              </div>
            </div>
          </div>

          {/* Setup vs Loop Section Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Kezelt Létra Szakaszok</span>
            </h3>

            {/* Setup block */}
            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>setup() Szakasz</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold">
                  {setupRungs.length} fok
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Bekapcsoláskor pontosan egyszer fut le (inicializáló létrák, alapértékek, üdvözlés).
              </p>
            </div>

            {/* Loop block */}
            <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-800/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>loop() Szakasz</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-200 font-bold">
                  {rungs.length} fok
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Ciklikus PLC program scan (bemenet olvasás ➔ logika ➔ kimenet írás).
              </p>
            </div>

            {/* Subroutines count */}
            {subroutines.length > 0 && (
              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300">Alprogramok (FC blokkok):</span>
                <span className="font-mono text-indigo-200 font-bold">{subroutines.length} db</span>
              </div>
            )}
          </div>

          {/* I/O Pin Map Overview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-400" />
              <span>Arduino Pin Lábkiosztás</span>
            </h3>

            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400 py-0.5 border-b border-slate-800/40">
                <span className="text-emerald-400 font-bold">D2 – D7</span>
                <span>Digitális Bemenetek (Pullup)</span>
              </div>
              <div className="flex justify-between text-slate-400 py-0.5 border-b border-slate-800/40">
                <span className="text-sky-400 font-bold">D8 – D13</span>
                <span>Digitális Kimenetek (Relé/LED)</span>
              </div>
              <div className="flex justify-between text-slate-400 py-0.5 border-b border-slate-800/40">
                <span className="text-amber-400 font-bold">A0 – A3</span>
                <span>Analóg Bemenetek (0-1023)</span>
              </div>
              <div className="flex justify-between text-slate-400 py-0.5">
                <span className="text-indigo-400 font-bold">A4 / A5</span>
                <span>I2C Busz (SDA / SCL)</span>
              </div>
            </div>
          </div>

          {/* Active Libraries */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Aktív C++ Könyvtárak</span>
            </h3>

            {activeLibs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">Csak natív Arduino API használatban.</p>
            ) : (
              <div className="space-y-1">
                {activeLibs.map((lib) => (
                  <div
                    key={lib.id}
                    className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800"
                  >
                    <span className="text-slate-300 font-mono">{lib.headerFile}</span>
                    <span className="text-[10px] text-emerald-400">v{lib.version}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fast Navigation Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={onOpenEditor}
              className="w-full py-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vissza a Létra Szerkesztőbe</span>
            </button>

            <button
              type="button"
              onClick={onOpenSimulator}
              className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Megnyitás a Szimulátorban</span>
            </button>
          </div>
        </aside>

        {/* Right Code Display Area */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Quick Notice Header */}
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Ez a C++ forráskód közvetlenül bemásolható az Arduino IDE-be, PlatformIO-ba vagy Arduino Cloud-ba.
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">Kódméret:</span>
              <span className="text-sky-400 font-bold">{(code.length / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Monospaced Code Box with Line Numbers */}
          <div className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed p-4 select-text">
            <div className="min-w-full inline-block">
              {codeLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isMatch = lineNumbersToHighlight.has(lineNum);

                return (
                  <div
                    key={idx}
                    className={`flex items-start hover:bg-slate-900/60 rounded px-1 transition-colors ${
                      isMatch ? 'bg-amber-500/20 border-l-2 border-amber-400' : ''
                    }`}
                  >
                    {/* Line number gutter */}
                    <span className="w-12 shrink-0 text-right pr-4 text-slate-600 select-none font-mono text-[11px]">
                      {lineNum}
                    </span>

                    {/* Code content */}
                    <span className="text-slate-300 whitespace-pre">
                      {renderHighlightedLine(line)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
