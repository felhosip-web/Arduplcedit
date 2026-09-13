import React, { useState } from 'react';
import { Rung, LadderElement, SimulationState, CustomModuleTemplate, Subroutine } from '../types';
import { ToolPalette } from '../components/ToolPalette';
import { LadderCanvas } from '../components/LadderCanvas';
import {
  Layers,
  Plus,
  ArrowLeft,
  Cpu,
  Sliders,
  CheckCircle2,
  FileCode,
  Play,
  Sparkles,
  Zap,
  RotateCw
} from 'lucide-react';

interface EditorViewProps {
  // Main loop ladder
  mainRungs: Rung[];
  onUpdateMainRungs: (rungs: Rung[]) => void;
  // Setup ladder (boot once)
  setupRungs: Rung[];
  onUpdateSetupRungs: (rungs: Rung[]) => void;
  // Subroutines
  subroutines: Subroutine[];
  onUpdateSubroutine: (updated: Subroutine) => void;
  onCreateSubroutine: (sub: Subroutine) => void;
  // Modules
  customModules: CustomModuleTemplate[];
  // Shared state
  simulationState: SimulationState;
  selectedRungIndex: number;
  onSelectRung: (idx: number) => void;
  onSelectElement: (el: LadderElement) => void;
  onOpenManagement: () => void;
  onOpenSimulator: () => void;
  onOpenMacros?: () => void;
  // External selection request (e.g. from management)
  activeSubroutineId: string | null;
  onSelectActiveSubroutine: (id: string | null) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  mainRungs,
  onUpdateMainRungs,
  setupRungs,
  onUpdateSetupRungs,
  subroutines,
  onUpdateSubroutine,
  onCreateSubroutine,
  customModules,
  simulationState,
  selectedRungIndex,
  onSelectRung,
  onSelectElement,
  onOpenManagement,
  onOpenSimulator,
  onOpenMacros,
  activeSubroutineId,
  onSelectActiveSubroutine
}) => {
  // Active Section for Main Program: 'loop' (cyclic scan) or 'setup' (one-time boot)
  const [currentSection, setCurrentSection] = useState<'loop' | 'setup'>('loop');

  const isEditingSubroutine = activeSubroutineId !== null;
  const currentSubroutine = subroutines.find((s) => s.id === activeSubroutineId);

  // Active rungs being edited: either subroutine rungs, setup rungs, or loop rungs
  const activeRungs = isEditingSubroutine && currentSubroutine
    ? currentSubroutine.rungs
    : currentSection === 'setup'
    ? setupRungs
    : mainRungs;

  const handleUpdateActiveRungs = (newRungs: Rung[]) => {
    if (isEditingSubroutine && currentSubroutine) {
      onUpdateSubroutine({
        ...currentSubroutine,
        rungs: newRungs
      });
    } else if (currentSection === 'setup') {
      onUpdateSetupRungs(newRungs);
    } else {
      onUpdateMainRungs(newRungs);
    }
  };

  // Add Element to the selected rung
  const handleAddElement = (template: Partial<LadderElement>) => {
    if (activeRungs.length === 0) return;
    const targetIdx = Math.min(selectedRungIndex, activeRungs.length - 1);
    const targetRung = activeRungs[targetIdx];

    const newElement: LadderElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: template.type || 'NO_CONTACT',
      category: template.category || 'contact',
      name: template.name || 'ELEM',
      pin: template.pin,
      variable: template.variable,
      libraryId: template.libraryId,
      presetMs: template.presetMs,
      presetCount: template.presetCount,
      servoAngle: template.servoAngle,
      lcdText: template.lcdText,
      subroutineId: template.subroutineId,
      subroutineBindings: template.subroutineBindings,
      customCppCall: template.customCppCall,
      comment: template.comment
    };

    const updatedRungs = [...activeRungs];
    const isCoilOrModule = template.category === 'coil' || template.category === 'library_module' || template.type === 'SUBROUTINE_CALL';

    if (isCoilOrModule) {
      updatedRungs[targetIdx] = {
        ...targetRung,
        coils: [...targetRung.coils, newElement]
      };
    } else {
      // Add to branch 0
      const currentBranches = [...targetRung.branches];
      if (currentBranches.length === 0) {
        currentBranches.push({ id: `b_${Date.now()}`, elements: [newElement] });
      } else {
        currentBranches[0] = {
          ...currentBranches[0],
          elements: [...currentBranches[0].elements, newElement]
        };
      }
      updatedRungs[targetIdx] = {
        ...targetRung,
        branches: currentBranches
      };
    }

    handleUpdateActiveRungs(updatedRungs);
  };

  // Canvas Rung actions
  const handleAddRung = () => {
    const newRung: Rung = {
      id: `rung_${Date.now()}`,
      number: activeRungs.length,
      comment: isEditingSubroutine ? `Alprogram logikai lépés #${activeRungs.length}` : '',
      branches: [
        {
          id: `branch_${Date.now()}`,
          elements: []
        }
      ],
      coils: []
    };
    handleUpdateActiveRungs([...activeRungs, newRung]);
    onSelectRung(activeRungs.length);
  };

  const handleDeleteRung = (id: string) => {
    if (activeRungs.length <= 1) return;
    const filtered = activeRungs.filter((r) => r.id !== id).map((r, i) => ({ ...r, number: i }));
    handleUpdateActiveRungs(filtered);
    if (selectedRungIndex >= filtered.length) {
      onSelectRung(Math.max(0, filtered.length - 1));
    }
  };

  const handleDuplicateRung = (id: string) => {
    const rungToDup = activeRungs.find((r) => r.id === id);
    if (!rungToDup) return;
    const dup: Rung = {
      ...rungToDup,
      id: `rung_${Date.now()}`,
      number: activeRungs.length,
      branches: rungToDup.branches.map((b) => ({
        ...b,
        id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        elements: b.elements.map((el) => ({ ...el, id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` }))
      })),
      coils: rungToDup.coils.map((c) => ({ ...c, id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` }))
    };
    handleUpdateActiveRungs([...activeRungs, dup]);
  };

  const handleMoveRung = (id: string, direction: 'up' | 'down') => {
    const index = activeRungs.findIndex((r) => r.id === id);
    if (index === -1) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= activeRungs.length) return;

    const copy = [...activeRungs];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    handleUpdateActiveRungs(copy.map((r, i) => ({ ...r, number: i })));
    onSelectRung(newIdx);
  };

  const handleUpdateRungComment = (id: string, comment: string) => {
    handleUpdateActiveRungs(activeRungs.map((r) => (r.id === id ? { ...r, comment } : r)));
  };

  const handleAddParallelBranch = (rungId: string) => {
    handleUpdateActiveRungs(
      activeRungs.map((r) => {
        if (r.id !== rungId) return r;
        return {
          ...r,
          branches: [...r.branches, { id: `branch_${Date.now()}`, elements: [] }]
        };
      })
    );
  };

  const handleDeleteParallelBranch = (rungId: string, branchId: string) => {
    handleUpdateActiveRungs(
      activeRungs.map((r) => {
        if (r.id !== rungId) return r;
        if (r.branches.length <= 1) return r;
        return {
          ...r,
          branches: r.branches.filter((b) => b.id !== branchId)
        };
      })
    );
  };

  const handleDeleteElement = (id: string) => {
    handleUpdateActiveRungs(
      activeRungs.map((r) => ({
        ...r,
        branches: r.branches.map((b) => ({
          ...b,
          elements: b.elements.filter((el) => el.id !== id)
        })),
        coils: r.coils.filter((c) => c.id !== id)
      }))
    );
  };

  const handleDropElementOnBranch = (
    rungId: string,
    branchId: string,
    index: number,
    elementData: Partial<LadderElement>
  ) => {
    const newElement: LadderElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: elementData.type || 'NO_CONTACT',
      category: elementData.category || 'contact',
      name: elementData.name || 'ELEM',
      pin: elementData.pin,
      variable: elementData.variable,
      presetMs: elementData.presetMs,
      presetCount: elementData.presetCount,
      compareOp: elementData.compareOp,
      compareValue: elementData.compareValue,
      subroutineId: elementData.subroutineId,
      subroutineBindings: elementData.subroutineBindings,
      comment: elementData.comment
    };

    handleUpdateActiveRungs(
      activeRungs.map((r) => {
        if (r.id !== rungId) return r;
        return {
          ...r,
          branches: r.branches.map((b) => {
            if (b.id !== branchId) return b;
            const elements = [...b.elements];
            elements.splice(index, 0, newElement);
            return { ...b, elements };
          })
        };
      })
    );
  };

  const handleDropElementOnCoils = (
    rungId: string,
    index: number,
    elementData: Partial<LadderElement>
  ) => {
    const newElement: LadderElement = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: elementData.type || 'COIL_NORMAL',
      category: elementData.category || 'coil',
      name: elementData.name || 'COIL',
      pin: elementData.pin,
      variable: elementData.variable,
      presetMs: elementData.presetMs,
      presetCount: elementData.presetCount,
      servoAngle: elementData.servoAngle,
      lcdText: elementData.lcdText,
      neoPixelColor: elementData.neoPixelColor,
      neoPixelLedIndex: elementData.neoPixelLedIndex,
      pwmValue: elementData.pwmValue,
      subroutineId: elementData.subroutineId,
      subroutineBindings: elementData.subroutineBindings,
      comment: elementData.comment
    };

    handleUpdateActiveRungs(
      activeRungs.map((r) => {
        if (r.id !== rungId) return r;
        const coils = [...r.coils];
        coils.splice(index, 0, newElement);
        return { ...r, coils };
      })
    );
  };

  // Quick insert current subroutine into main ladder
  const handleInsertSubroutineToMain = () => {
    if (!currentSubroutine) return;
    const defaultBindings: Record<string, string> = {};
    currentSubroutine.inputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D2';
    });
    currentSubroutine.outputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D8';
    });

    const newSubCall: LadderElement = {
      id: `sub_call_${Date.now()}`,
      type: 'SUBROUTINE_CALL',
      category: 'subroutine',
      name: currentSubroutine.name,
      subroutineId: currentSubroutine.id,
      subroutineBindings: defaultBindings,
      comment: currentSubroutine.codeIdentifier
    };

    // Add to first or last rung in main ladder
    const targetIdx = Math.min(selectedRungIndex, mainRungs.length - 1);
    const updated = [...mainRungs];
    updated[targetIdx] = {
      ...updated[targetIdx],
      coils: [...updated[targetIdx].coils, newSubCall]
    };
    onUpdateMainRungs(updated);
    onSelectActiveSubroutine(null); // Switch back to main
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Program & Section Selector Top Ribbon */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            Főprogram Szakaszok:
          </span>

          {/* Section: loop() (Ciklikus Scan) */}
          <button
            type="button"
            onClick={() => {
              onSelectActiveSubroutine(null);
              setCurrentSection('loop');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isEditingSubroutine && currentSection === 'loop'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.3)] font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
            title="Ciklikus 50 Hz PLC scan hurok"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>🔄 loop() Ciklikus Szakasz</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950/40 font-bold">
              {mainRungs.length} fok
            </span>
          </button>

          {/* Section: setup() (Boot egyszer lefutó) */}
          <button
            type="button"
            onClick={() => {
              onSelectActiveSubroutine(null);
              setCurrentSection('setup');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isEditingSubroutine && currentSection === 'setup'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-bold'
                : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800 hover:text-white border border-amber-900/60'
            }`}
            title="Bekapcsoláskor egyszer lefutó inicializálás"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ setup() Indítási Szakasz</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-200 font-bold">
              {setupRungs.length} fok
            </span>
          </button>

          {subroutines.length > 0 && (
            <>
              <span className="text-slate-700 mx-1">|</span>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Alprogramok:
              </span>
            </>
          )}

          {/* Subroutines Tabs */}
          {subroutines.map((sub) => {
            const isSelected = activeSubroutineId === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectActiveSubroutine(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)] font-bold'
                    : 'bg-slate-800/80 text-indigo-300 hover:bg-slate-800 hover:text-white border border-indigo-900/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">{sub.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-200">
                  FC ({sub.rungs.length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Action button: Go to Management / New Subroutine / Macros */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenMacros && (
            <button
              type="button"
              onClick={onOpenMacros}
              className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Makró Sablonok...</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenManagement}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Új Alprogram / Modul...</span>
          </button>
        </div>
      </div>

      {/* Subroutine Context Header Banner (when editing a subroutine) */}
      {isEditingSubroutine && currentSubroutine && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-b border-indigo-900/80 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectActiveSubroutine(null)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Vissza a Főprogramhoz
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Alprogram Szerkesztése: {currentSubroutine.name} ({currentSubroutine.codeIdentifier})
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentSubroutine.description} | 
                <span className="text-emerald-400 ml-1">Bemenetek: {currentSubroutine.inputs.map(i => i.name).join(', ') || 'Nincs'}</span> | 
                <span className="text-amber-400 ml-1">Kimenetek: {currentSubroutine.outputs.map(o => o.name).join(', ') || 'Nincs'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsertSubroutineToMain}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              title="Beszúrja ezt az alprogramot a főprogram kiválasztott fokába"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Hozzáadás a Főprogramhoz Modulként
            </button>
          </div>
        </div>
      )}

      {/* Main Section Header Banner: when editing setup() */}
      {!isEditingSubroutine && currentSection === 'setup' && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  ⚡ setup() Indítási Szakasz (Boot Inicializálás — {setupRungs.length} fok)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-800 font-bold">
                  EGYSZER FUT LE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ezek a létrafokok a mikrokontroller bekapcsolásakor (setup()) futnak le pontosan egyszer inicializálásra (alapértékek, LCD üdvözlés, szervó nullázás).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentSection('loop')}
            className="px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-800/80 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Váltás a loop() ciklikus szakaszra ➔</span>
          </button>
        </div>
      )}

      {/* Main Section Header Banner: when editing loop() */}
      {!isEditingSubroutine && currentSection === 'loop' && (
        <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-900 border-b border-sky-900/60 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-300">
                  🔄 loop() Ciklikus Szakasz (Folyamatos PLC Scan — {mainRungs.length} fok)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-800 font-bold">
                  50 Hz / 20 ms
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Folyamatos PLC programciklus: digitális & analóg bemenetek beolvasása ➔ létrakiértékelés ➔ kimenetek és regiszterek frissítése.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentSection('setup')}
            className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Váltás a setup() szakaszra ({setupRungs.length} fok) ➔</span>
          </button>
        </div>
      )}

      {/* Main Workspace: Left ToolPalette, Right LadderCanvas */}
      <div className="flex-1 flex overflow-hidden">
        <ToolPalette
          onAddElement={handleAddElement}
          selectedRungIndex={selectedRungIndex}
          customModules={customModules}
          subroutines={subroutines}
          onOpenManagement={onOpenManagement}
        />

        <LadderCanvas
          rungs={activeRungs}
          simulationState={simulationState}
          selectedRungIndex={selectedRungIndex}
          isSetupSection={!isEditingSubroutine && currentSection === 'setup'}
          onSelectRung={onSelectRung}
          onSelectElement={onSelectElement}
          onDeleteElement={handleDeleteElement}
          onAddRung={handleAddRung}
          onDeleteRung={handleDeleteRung}
          onDuplicateRung={handleDuplicateRung}
          onMoveRung={handleMoveRung}
          onUpdateRungComment={handleUpdateRungComment}
          onAddParallelBranch={handleAddParallelBranch}
          onDeleteParallelBranch={handleDeleteParallelBranch}
          onDropElementOnBranch={handleDropElementOnBranch}
          onDropElementOnCoils={handleDropElementOnCoils}
        />
      </div>
    </div>
  );
};
