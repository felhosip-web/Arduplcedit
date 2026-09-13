import React, { useState } from 'react';
import {
  LadderMacro,
  Rung,
  PLCVariable,
  PLCConstant,
  PLCArray
} from '../types';
import {
  Zap,
  Activity,
  ShieldCheck,
  Layers,
  Cpu,
  Clock,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
  Copy,
  PlusCircle,
  HelpCircle,
  BookOpen,
  ChevronRight,
  Info,
  CheckCircle2,
  Settings,
  Code
} from 'lucide-react';

interface MacrosViewProps {
  macros: LadderMacro[];
  onInsertMacroToLadder: (rungs: Rung[], macroName: string) => void;
  onOpenEditor: () => void;
  onOpenSimulator: () => void;
  variables: PLCVariable[];
  constants: PLCConstant[];
  arrays: PLCArray[];
}

export const MacrosView: React.FC<MacrosViewProps> = ({
  macros,
  onInsertMacroToLadder,
  onOpenEditor,
  onOpenSimulator,
  variables,
  constants,
  arrays
}) => {
  const [selectedMacroId, setSelectedMacroId] = useState<string>(macros[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    macros.forEach((m) => {
      init[m.id] = {};
      m.parameters.forEach((p) => {
        init[m.id][p.key] = p.defaultValue;
      });
    });
    return init;
  });
  const [insertedNotice, setInsertedNotice] = useState<string | null>(null);

  const selectedMacro = macros.find((m) => m.id === selectedMacroId) || macros[0];

  const currentParams = paramValues[selectedMacro?.id || ''] || {};

  const handleParamChange = (macroId: string, paramKey: string, val: string) => {
    setParamValues((prev) => ({
      ...prev,
      [macroId]: {
        ...(prev[macroId] || {}),
        [paramKey]: val
      }
    }));
  };

  const handleApplyMacro = () => {
    if (!selectedMacro) return;
    const generatedRungs = selectedMacro.buildRungs(currentParams);
    onInsertMacroToLadder(generatedRungs, selectedMacro.name);
    setInsertedNotice(`A(z) "${selectedMacro.name}" sikeresen beillesztve a létraprogram végére!`);
    setTimeout(() => {
      setInsertedNotice(null);
    }, 4000);
  };

  const categories = [
    { id: 'all', label: 'Összes Makró', count: macros.length },
    { id: 'motor', label: 'Motor & Meghajtás', count: macros.filter((m) => m.category === 'motor').length },
    { id: 'safety', label: 'Biztonsági Körök', count: macros.filter((m) => m.category === 'safety').length },
    { id: 'analog', label: 'Szabályzók & Analóg', count: macros.filter((m) => m.category === 'analog').length },
    { id: 'sequencer', label: 'Számlálók & Ciklus', count: macros.filter((m) => m.category === 'sequencer').length },
    { id: 'diagnostics', label: 'Ütemadók & Diagnosztika', count: macros.filter((m) => m.category === 'diagnostics').length }
  ];

  const filteredMacros = macros.filter((m) => selectedCategory === 'all' || m.category === selectedCategory);

  const getMacroIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-red-400" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-sky-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-sky-400" />;
    }
  };

  // Build preview of rungs using current parameter values
  const previewRungs = selectedMacro ? selectedMacro.buildRungs(currentParams) : [];

  return (
    <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Banner */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 tracking-wide">
                Ipari Létra Makrók és Sablonok
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800/80">
                PLC Circuit Templates
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Paraméterezhető kész áramköri egységek (motorindítók, biztonsági körök, oszcillátorok, hiszterézisek), melyek közvetlenül beilleszthetők a létrába.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {insertedNotice && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/90 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-medium animate-fade-in shadow-lg shadow-emerald-900/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{insertedNotice}</span>
            <button
              type="button"
              onClick={onOpenEditor}
              className="ml-2 underline font-bold hover:text-emerald-100 cursor-pointer"
            >
              Létrára ugrás &rarr;
            </button>
          </div>
        )}
      </header>

      {/* Main Content: Left Categories & Macro List | Right Macro Config & Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Category tabs and Macro Selector */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          {/* Categories Pill Bar */}
          <div className="p-3 border-b border-slate-800/80 flex flex-wrap gap-1.5 bg-slate-950/40">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-slate-950/30 text-slate-950 font-mono'
                      : 'bg-slate-800 text-slate-400 font-mono'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Macro Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMacros.map((macro) => {
              const isSelected = macro.id === selectedMacroId;
              return (
                <button
                  key={macro.id}
                  type="button"
                  onClick={() => setSelectedMacroId(macro.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-950/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {getMacroIcon(macro.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {macro.name}
                      </h4>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {macro.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {macro.parameters.length} paraméter
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {macro.buildRungs({}).length} létrafok
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Side: Macro Parameter Configuration & Live Ladder Preview */}
        {selectedMacro && (
          <section className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            {/* Macro Detail Header */}
            <div className="p-6 border-b border-slate-800/80 bg-slate-900/30 flex items-start justify-between gap-6 shrink-0">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                  {getMacroIcon(selectedMacro.iconName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-100">{selectedMacro.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedMacro.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {selectedMacro.description}
                  </p>
                  {selectedMacro.codeExplanation && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800/80">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{selectedMacro.codeExplanation}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Insert into Ladder */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyMacro}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Beillesztés a Létrába</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {previewRungs.length} létrafokot ad hozzá
                </span>
              </div>
            </div>

            {/* Middle Section: Parameters on Left, Generated Rungs Preview on Right */}
            <div className="flex-1 flex overflow-hidden">
              {/* Parameters Panel */}
              <div className="w-80 border-r border-slate-800/80 bg-slate-900/20 p-5 overflow-y-auto space-y-4 shrink-0">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Makró Paraméterek
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Rendelje hozzá a gép hardveres pinjeit és változóit a sablonhoz:
                </p>

                <div className="space-y-3">
                  {selectedMacro.parameters.map((param) => {
                    const currentVal = currentParams[param.key] ?? param.defaultValue;
                    return (
                      <div key={param.key} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                          <span>{param.label}</span>
                          <span className="text-[10px] font-mono text-slate-400 px-1 rounded bg-slate-800">
                            {param.key}
                          </span>
                        </label>
                        {param.description && (
                          <p className="text-[10px] text-slate-400">{param.description}</p>
                        )}
                        <div className="relative">
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleParamChange(selectedMacro.id, param.key, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                            placeholder={param.defaultValue}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ladder Visual Preview */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0 mb-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Generált Létrafokok Előnézete ({previewRungs.length} Rung)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Valós időben frissül a fenti paraméterek alapján
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {previewRungs.map((rung, rIdx) => (
                    <div
                      key={rung.id || rIdx}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner space-y-3"
                    >
                      {/* Rung Header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center text-[11px] border border-amber-500/30">
                            #{rIdx}
                          </span>
                          <span className="text-slate-300 font-mono text-xs">{rung.comment}</span>
                        </div>
                      </div>

                      {/* Visual Rung Rail */}
                      <div className="relative flex items-center justify-between bg-slate-950 rounded-lg p-3 border border-slate-800/80">
                        {/* Left Power Rail */}
                        <div className="w-1.5 self-stretch bg-sky-500 rounded-full shrink-0" title="Bal tápsín" />

                        {/* Branches Container */}
                        <div className="flex-1 px-4 space-y-2">
                          {rung.branches.map((branch, bIdx) => (
                            <div key={branch.id || bIdx} className="flex items-center gap-2 flex-wrap">
                              {branch.elements.map((el) => (
                                <div
                                  key={el.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs flex items-center gap-1.5 shadow-sm"
                                >
                                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-amber-400 border border-slate-700">
                                    {el.type}
                                  </span>
                                  <span className="font-semibold text-slate-200">
                                    {el.variable || el.name || el.targetVariable}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* Coils Container */}
                        <div className="flex items-center gap-2 shrink-0 border-l border-slate-800 pl-4">
                          {rung.coils.map((c) => (
                            <div
                              key={c.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs flex items-center gap-1.5"
                            >
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-900/80 text-emerald-300">
                                {c.type}
                              </span>
                              <span className="font-bold text-emerald-300">
                                {c.variable || c.name}
                              </span>
                              {c.presetMs !== undefined && (
                                <span className="text-[10px] font-mono text-emerald-400">
                                  ({c.presetMs}ms)
                                </span>
                              )}
                              {c.presetCount !== undefined && (
                                <span className="text-[10px] font-mono text-emerald-400">
                                  ({c.presetCount}db)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Right Neutral Rail */}
                        <div className="w-1.5 self-stretch bg-indigo-500 rounded-full shrink-0 ml-4" title="Jobb sín" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
