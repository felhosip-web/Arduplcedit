import React, { useState, useCallback } from 'react';
import { Rung, LadderElement, SimulationState, CustomModuleTemplate, Subroutine, Program } from '../types';
import { ToolPalette } from '../components/ToolPalette';
import { LadderCanvas } from '../components/LadderCanvas';
import { DndContext, DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { CrossReferenceModal } from '../components/modals/CrossReferenceModal';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { ElementBlock } from '../components/ElementBlock';
import { toast } from 'react-hot-toast';
import { addElementToRung, createEmptyRung, deleteElementFromRungs, duplicateRung, moveRung, addParallelBranch, deleteParallelBranch } from '../domain/ladderOperations';
import { isCoilOrModule } from '../utils/validationUtils';
import { FBDEditor } from '../components/fbd/FBDEditor';
import { FBDDiagram, PLCVariable } from '../types';
import { SaveMacroModal } from '../components/modals/SaveMacroModal';
import { useStore } from '../store/useStore';
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
  RotateCw,
  BookmarkPlus
} from 'lucide-react';

interface EditorViewProps {
  variables?: PLCVariable[];
  activeProgram?: Program;
  activeTaskName?: string;
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
  onUpdateActiveProgramFBD?: (fbd: FBDDiagram) => void;
  onForceInput?: (element: LadderElement, forceValue?: boolean) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  variables,
  activeProgram,
  activeTaskName,
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
  onSelectActiveSubroutine,
  onUpdateActiveProgramFBD,
  onForceInput
}) => {
  // Active Section for Main Program: 'loop' (cyclic scan) or 'setup' (one-time boot)
  const [currentSection, setCurrentSection] = useState<'loop' | 'setup'>('loop');

  const [activeDragElement, setActiveDragElement] = useState<Partial<LadderElement> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [crossRefElement, setCrossRefElement] = useState<LadderElement | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

  // Custom Macro creation state
  const [isSaveMacroOpen, setIsSaveMacroOpen] = useState(false);
  const addCustomMacro = useStore((state) => state.addCustomMacro);

  const isEditingSubroutine = activeSubroutineId !== null;
  const currentSubroutine = subroutines.find((s) => s.id === activeSubroutineId);

  // Active rungs being edited: either subroutine rungs, setup rungs, or loop rungs
  const activeRungs = isEditingSubroutine && currentSubroutine
    ? currentSubroutine.rungs
    : currentSection === 'setup'
    ? setupRungs
    : mainRungs;

  const handleUpdateActiveRungs = useCallback((newRungs: Rung[]) => {
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
  }, [isEditingSubroutine, currentSubroutine, onUpdateSubroutine, currentSection, onUpdateSetupRungs, onUpdateMainRungs]);


  // Add Element to the selected rung
  const handleAddElement = useCallback((template: Partial<LadderElement>) => {
    if (activeRungs.length === 0) return;
    const targetIdx = Math.min(selectedRungIndex, activeRungs.length - 1);
    const targetRung = activeRungs[targetIdx];
    const isCoil = isCoilOrModule(template.category, template.type);
    if (isCoil && targetRung && targetRung.coils.length >= 1) {
      toast.error("Egy fokon csak egy kimenet (tekercs) lehet.");
      return;
    }
    handleUpdateActiveRungs(addElementToRung(activeRungs, targetIdx, template));
  }, [activeRungs, selectedRungIndex, handleUpdateActiveRungs]);

  const handleAddRung = useCallback(() => {
    const newRung = createEmptyRung(activeRungs.length, isEditingSubroutine);
    handleUpdateActiveRungs([...activeRungs, newRung]);
    onSelectRung(activeRungs.length);
  }, [activeRungs, isEditingSubroutine, handleUpdateActiveRungs, onSelectRung]);

  const handleDeleteRung = useCallback((id: string) => {
    if (activeRungs.length <= 1) return;
    const filtered = activeRungs.filter((r) => r.id !== id).map((r, i) => ({ ...r, number: i }));
    handleUpdateActiveRungs(filtered);
    if (selectedRungIndex >= filtered.length) {
      onSelectRung(Math.max(0, filtered.length - 1));
    }
  }, [activeRungs, handleUpdateActiveRungs, selectedRungIndex, onSelectRung]);

  const handleDuplicateRung = useCallback((id: string) => {
    handleUpdateActiveRungs(duplicateRung(activeRungs, id));
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleMoveRung = useCallback((id: string, direction: 'up' | 'down') => {
    const updated = moveRung(activeRungs, id, direction);
    handleUpdateActiveRungs(updated);
    const newIdx = updated.findIndex((r) => r.id === id);
    if (newIdx !== -1) onSelectRung(newIdx);
  }, [activeRungs, handleUpdateActiveRungs, onSelectRung]);

  // Keyboard shortcuts (Delete, Ctrl+D, Ctrl+Up/Down, Escape)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const activeTag = activeEl?.tagName?.toLowerCase();
      const isEditable = activeEl?.getAttribute('contenteditable') === 'true';
      const isInsideModal = !!activeEl?.closest('.fixed');
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || isEditable || isInsideModal || isSaveMacroOpen) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedElementIds([]);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          let currentRungs = activeRungs;
          selectedElementIds.forEach(elId => {
            currentRungs = deleteElementFromRungs(currentRungs, elId);
          });
          handleUpdateActiveRungs(currentRungs);
          setSelectedElementIds([]);
          toast.success(`${selectedElementIds.length} elem törölve`);
        } else if (selectedRungIndex >= 0 && selectedRungIndex < activeRungs.length && activeRungs.length > 1) {
          e.preventDefault();
          const targetRung = activeRungs[selectedRungIndex];
          if (targetRung) {
            handleDeleteRung(targetRung.id);
          }
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedRungIndex >= 0 && selectedRungIndex < activeRungs.length) {
          const targetRung = activeRungs[selectedRungIndex];
          if (targetRung) {
            handleDuplicateRung(targetRung.id);
            toast.success(`Fok #${targetRung.number + 1} duplikálva`);
          }
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedRungIndex > 0) {
          const targetRung = activeRungs[selectedRungIndex];
          if (targetRung) {
            handleMoveRung(targetRung.id, 'up');
          }
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedRungIndex < activeRungs.length - 1) {
          const targetRung = activeRungs[selectedRungIndex];
          if (targetRung) {
            handleMoveRung(targetRung.id, 'down');
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeRungs,
    selectedElementIds,
    selectedRungIndex,
    handleDeleteRung,
    handleDuplicateRung,
    handleMoveRung,
    handleUpdateActiveRungs
  ]);

  const handleUpdateRungComment = useCallback((id: string, comment: string) => {
    handleUpdateActiveRungs(activeRungs.map((r) => (r.id === id ? { ...r, comment } : r)));
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleAddParallelBranch = useCallback((rungId: string) => {
    handleUpdateActiveRungs(addParallelBranch(activeRungs, rungId));
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleDeleteParallelBranch = useCallback((rungId: string, branchId: string) => {
    handleUpdateActiveRungs(deleteParallelBranch(activeRungs, rungId, branchId));
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleDeleteElement = useCallback((id: string) => {
    handleUpdateActiveRungs(deleteElementFromRungs(activeRungs, id));
    setSelectedElementIds(prev => prev.filter(eId => eId !== id));
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleElementSelect = useCallback((el: LadderElement, e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      setSelectedElementIds(prev => {
        if (prev.includes(el.id)) {
          return prev.filter(id => id !== el.id);
        } else {
          return [...prev, el.id];
        }
      });
    } else {
      setSelectedElementIds([el.id]);
      onSelectElement(el);
    }
  }, [onSelectElement]);

  const handleDropElementOnBranch = useCallback((
    rungId: string,
    branchId: string,
    index: number,
    elementData: Partial<LadderElement>
  ) => {
    // Prevent dropping coils or output modules into a contact branch
    if (isCoilOrModule(elementData.category, elementData.type)) {
      toast.error("Ide csak érintkező (bemenet) típusú elemet húzhat! Tekercseket és modulokat a kimeneti (jobb) oldalra tegyen.");
      return;
    }

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
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleDropElementOnCoils = useCallback((
    rungId: string,
    index: number,
    elementData: Partial<LadderElement>
  ) => {
    // Prevent dropping input contacts into the output (coil) area
    if (!isCoilOrModule(elementData.category, elementData.type)) {
      toast.error("Ide csak kimenet (tekercs, modul) típusú elemet húzhat! Érintkezőket a bemeneti (bal) oldalra tegyen.");
      return;
    }

    const targetRung = activeRungs.find((r) => r.id === rungId);
    if (targetRung && targetRung.coils.length >= 1) {
      toast.error("Egy fokon csak egy kimenet (tekercs) lehet.");
      return;
    }

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
  }, [activeRungs, handleUpdateActiveRungs]);

  const handleDragStart = (e: any) => {
    const { active } = e;
    if (active.data.current) {
      setActiveDragElement(active.data.current);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragElement(null);
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const elementData = active.data.current as Partial<LadderElement>;
    const overId = String(over.id);

    if (overId.endsWith('_coils_drop')) {
      // It's a coil drop zone: rungId_coils_drop
      const rungId = overId.replace('_coils_drop', '');
      const rung = activeRungs.find(r => r.id === rungId);
      if (rung) {
        handleDropElementOnCoils(rungId, rung.coils.length, elementData);
      }
    } else if (overId.endsWith('_empty')) {
      // branchId_empty
      const branchId = overId.replace('_empty', '');
      const rung = activeRungs.find(r => r.branches.some(b => b.id === branchId));
      if (rung) {
        handleDropElementOnBranch(rung.id, branchId, 0, elementData);
      }
    } else if (overId.includes('_drop_')) {
      // branchId_drop_index
      const lastIndex = overId.lastIndexOf('_drop_');
      const branchId = overId.substring(0, lastIndex);
      const insertIndex = parseInt(overId.substring(lastIndex + 6), 10);
      const rung = activeRungs.find(r => r.branches.some(b => b.id === branchId));
      if (rung && !isNaN(insertIndex)) {
        handleDropElementOnBranch(rung.id, branchId, insertIndex, elementData);
      }
    }
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

        {/* Action button: Go to Management / New Subroutine / Save Macro / Macros */}
        <div className="flex items-center gap-2 shrink-0">
          {activeRungs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSaveMacroOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Aktív/kijelölt létrafok(ok) elmentése saját makróként"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Fok Mentése Makróként</span>
            </button>
          )}

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
                {activeProgram ? (
                  <>
                    <span className="text-xs font-bold text-sky-300">
                      🔄 Task: {activeTaskName} | Program: {activeProgram.name} — {mainRungs.length} fok
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-800 font-bold ml-2">
                      {activeProgram.type.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold text-sky-300">
                      🔄 loop() Ciklikus Szakasz (Folyamatos PLC Scan — {mainRungs.length} fok)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-800 font-bold ml-2">
                      50 Hz / 20 ms
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeProgram
                  ? `Szerkesztés alatt: ${activeProgram.name} (${activeProgram.type})`
                  : 'Folyamatos PLC programciklus: digitális & analóg bemenetek beolvasása ➔ létrakiértékelés ➔ kimenetek és regiszterek frissítése.'}
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

      {/* Main Workspace: Left ToolPalette, Right LadderCanvas (or FBD Placeholder) */}
      {activeProgram?.type === 'fbd' ? (
        <div className="flex-1 flex overflow-hidden bg-slate-900 border-t border-slate-800">
          <FBDEditor
            variables={variables}
            fbd={activeProgram.fbd}
            simulationState={simulationState}
            onUpdateFBD={(newFbd) => onUpdateActiveProgramFBD?.(newFbd)}
          />
        </div>
      ) : (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
          <div className="flex-1 flex overflow-hidden">
            <ToolPalette
              onAddElement={handleAddElement}
              selectedRungIndex={selectedRungIndex}
              customModules={customModules}
              subroutines={subroutines}
              onOpenManagement={onOpenManagement}
            />

            <div className="flex-1 flex flex-col min-w-0">
              <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-end">
                <input
                  type="text"
                  placeholder="Keresés létrában (változó, pin, megjegyzés)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-64 shadow-sm"
                />
              </div>
              <LadderCanvas
                rungs={activeRungs}
                searchQuery={searchQuery}
                simulationState={simulationState}
                selectedRungIndex={selectedRungIndex}
                selectedElementIds={selectedElementIds}
                isSetupSection={!isEditingSubroutine && currentSection === 'setup'}
                onSelectRung={onSelectRung}
                onSelectElement={handleElementSelect}
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
                onCrossReference={(el) => setCrossRefElement(el)}
                onForceInput={onForceInput}
              />
            </div>
          </div>

          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
            {activeDragElement ? (
              <div className="opacity-80 scale-105 transform origin-center pointer-events-none z-[9999]">
                <ElementBlock
                  element={activeDragElement as LadderElement}
                  onSelect={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {crossRefElement && (
        <CrossReferenceModal
          element={crossRefElement}
          onClose={() => setCrossRefElement(null)}
          onNavigateToRung={(taskId, programId, rungId) => {
            setCrossRefElement(null);
            setTimeout(() => {
              const el = document.getElementById(rungId);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-sky-500', 'transition-all');
                setTimeout(() => el.classList.remove('ring-4', 'ring-sky-500'), 2000);
              }
            }, 100);
          }}
        />
      )}

      {/* Save Macro Modal */}
      <SaveMacroModal
        isOpen={isSaveMacroOpen}
        selectedRungs={
          selectedRungIndex >= 0 && selectedRungIndex < activeRungs.length
            ? [activeRungs[selectedRungIndex]]
            : activeRungs.slice(0, 1)
        }
        onClose={() => setIsSaveMacroOpen(false)}
        onSave={(name, category, description) => {
          const rungsToSave =
            selectedRungIndex >= 0 && selectedRungIndex < activeRungs.length
              ? [activeRungs[selectedRungIndex]]
              : activeRungs;
          addCustomMacro(name, category, description, rungsToSave);
          toast.success(`Makró "${name}" sikeresen elmentve!`);
        }}
      />
    </div>
  );
};
