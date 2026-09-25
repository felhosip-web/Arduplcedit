import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Rung, LadderElement, SimulationState } from '../types';
import { ElementBlock } from './ElementBlock';
import { Plus, ArrowUp, ArrowDown, Copy, Trash2, Split, MessageSquare, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { validateRungs, ValidationError } from '../utils/validationUtils';
import { TransformWrapper, TransformComponent, useControls, useTransformComponent } from 'react-zoom-pan-pinch';
import { ContextMenu } from './ContextMenu';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';

// Helper component for droppable zones
const DroppableZone = ({ id, children, className }: any) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-sky-500/40 border-2 border-dashed border-sky-400 scale-110' : ''}`}
    >
      {children}
    </div>
  );
};

// Zoom control buttons overlay using react-zoom-pan-pinch controls
const ZoomControlsOverlay: React.FC = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const scale = useTransformComponent(({ state }) => state.scale);
  const scalePercent = Math.round(scale * 100);

  return (
    <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg shadow-xl backdrop-blur-sm text-xs text-slate-300">
      <span className="text-[11px] font-mono text-slate-400 px-1 border-r border-slate-800 select-none">
        Ctrl + görgő: zoom
      </span>
      <span className="font-mono text-xs text-sky-400 font-bold min-w-[3.5rem] text-center select-none">
        {scalePercent}%
      </span>
      <div className="w-px h-4 bg-slate-800 mx-0.5" />
      <button
        type="button"
        onClick={() => zoomIn(0.1)}
        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-sky-300 rounded transition-colors"
        title="Nagyítás (+10%)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut(0.1)}
        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-sky-300 rounded transition-colors"
        title="Kicsinyítés (-10%)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-slate-800 mx-0.5" />
      <button
        type="button"
        onClick={() => resetTransform()}
        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-sky-300 rounded transition-colors"
        title="Nézet Alaphelyzetbe"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

// Wheel zoom container wrapper enforcing Ctrl+wheel fine-grained zoom
const CanvasWheelHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoomToPoint, instance } = useControls();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom when Ctrl or Cmd key is pressed
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const currentScale = instance.state.scale;
        // Fine-grained scale adjustment factor clamped to +/-0.08 per wheel tick
        const deltaFactor = -e.deltaY * 0.001;
        const clampedDeltaFactor = Math.min(0.08, Math.max(-0.08, deltaFactor));
        const factor = 1 + clampedDeltaFactor;

        const minScale = instance.setup.minScale ?? 0.2;
        const maxScale = instance.setup.maxScale ?? 2.0;

        const targetScale = Math.min(maxScale, Math.max(minScale, currentScale * factor));

        if (Math.abs(targetScale - currentScale) > 0.0001) {
          zoomToPoint(targetScale, e.clientX, e.clientY, 0);
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [zoomToPoint, instance]);

  return (
    <div
      ref={containerRef}
      id="ladder-canvas-container"
      className="flex-1 bg-slate-950 overflow-hidden relative select-none h-full w-full"
    >
      {children}
    </div>
  );
};

interface LadderCanvasProps {
  rungs: Rung[];
  simulationState: SimulationState;
  selectedRungIndex: number;
  selectedElementIds?: string[];
  searchQuery?: string;
  isSetupSection?: boolean;
  onSelectRung: (index: number) => void;
  onSelectElement: (el: LadderElement, e?: React.MouseEvent) => void;
  onDeleteElement: (id: string) => void;
  onAddRung: () => void;
  onDeleteRung: (id: string) => void;
  onDuplicateRung: (id: string) => void;
  onMoveRung: (id: string, direction: 'up' | 'down') => void;
  onUpdateRungComment: (id: string, comment: string) => void;
  onAddParallelBranch: (rungId: string) => void;
  onDeleteParallelBranch: (rungId: string, branchId: string) => void;
  onDropElementOnBranch: (rungId: string, branchId: string, index: number, elementData: Partial<LadderElement>) => void;
  onDropElementOnCoils: (rungId: string, index: number, elementData: Partial<LadderElement>) => void;
  onTunePid?: (el: LadderElement) => void;
  onCrossReference?: (el: LadderElement) => void;
  onForceInput?: (element: LadderElement, forceValue?: boolean) => void;
}

// --- Inner Memoized Component for each Rung (Virtualization/Memoization) ---
interface RungRowProps {
  rung: Rung;
  rIndex: number;
  isSelected: boolean;
  selectedElementIds?: string[];
  searchQuery?: string;
  simulationState: SimulationState;
  isSetupSection: boolean;
  validationErrors: ValidationError[];
  onSelectRung: (index: number) => void;
  onSelectElement: (el: LadderElement, e?: React.MouseEvent) => void;
  onDeleteElement: (id: string) => void;
  onMoveRung: (id: string, direction: 'up' | 'down') => void;
  onUpdateRungComment: (id: string, comment: string) => void;
  onAddParallelBranch: (rungId: string) => void;
  onDeleteParallelBranch: (rungId: string, branchId: string) => void;
  onDropElementOnBranch: (rungId: string, branchId: string, insertIndex: number, elementData: Partial<LadderElement>) => void;
  onDropElementOnCoils: (rungId: string, insertIndex: number, elementData: Partial<LadderElement>) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  dragOverTarget: string | null;
  onDuplicateRung: (id: string) => void;
  onDeleteRung: (id: string) => void;
  onTunePid?: (el: LadderElement) => void;
  onCrossReference?: (el: LadderElement) => void;
  onForceInput?: (element: LadderElement, forceValue?: boolean) => void;
  totalRungsCount: number;
  onContextMenuOpen: (e: React.MouseEvent, element: LadderElement) => void;
}

const RungRow: React.FC<RungRowProps> = React.memo(({
  rung,
  rIndex,
  isSelected,
  selectedElementIds = [],
  searchQuery,
  simulationState,
  isSetupSection,
  validationErrors,
  onSelectRung,
  onSelectElement,
  onDeleteElement,
  onMoveRung,
  onUpdateRungComment,
  onAddParallelBranch,
  onDeleteParallelBranch,
  onDropElementOnBranch,
  onDropElementOnCoils,
  onDragOver,
  onDragLeave,
  dragOverTarget,
  onDuplicateRung,
  onDeleteRung,
  onTunePid,
  onCrossReference,
  onForceInput,
  totalRungsCount,
  onContextMenuOpen
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  const [editingCommentRungId, setEditingCommentRungId] = useState<string | null>(null);

  // Intersection Observer for Virtualization
  useEffect(() => {
    if (!rowRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);

  // Use a fixed height placeholder if the rung is off-screen
  if (!isVisible) {
    return (
      <div ref={rowRef} className="h-32 bg-slate-900/20 border border-slate-800 rounded-xl mb-6"></div>
    );
  }

  const isRungEnergized = simulationState.isRunning && (
    isSetupSection
      ? (!!simulationState.activeSetupRungs?.[rung.id] || !!simulationState.activeRungs[rung.id])
      : !!simulationState.activeRungs[rung.id]
  );

  const rungErrors = validationErrors.filter((e) => e.rungId === rung.id);
  const hasErrors = rungErrors.length > 0;

  const handleDropOnBranchLocal = (e: React.DragEvent, branchId: string, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const elementData = JSON.parse(dataStr);
        onDropElementOnBranch(rung.id, branchId, insertIndex, elementData);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDropOnCoilsLocal = (e: React.DragEvent, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const elementData = JSON.parse(dataStr);
        onDropElementOnCoils(rung.id, insertIndex, elementData);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onSelectRung(rIndex)}
      className={`rounded-xl border transition-all ${
        isSelected
          ? 'border-sky-500 bg-slate-900/90 shadow-lg shadow-sky-500/10'
          : hasErrors
          ? 'border-rose-500/50 bg-rose-950/20 hover:border-rose-500/80'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
      }`}
    >
      {/* Rung Header */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 rounded-t-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
            isRungEnergized
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_#10b981]'
              : isSelected
              ? 'bg-sky-500 text-slate-950'
              : 'bg-slate-800 text-slate-300'
          }`}>
            #{rung.number}
          </span>

          {/* Inline Comment */}
          {editingCommentRungId === rung.id ? (
            <input
              type="text"
              autoFocus
              defaultValue={rung.comment || ''}
              onBlur={(e) => {
                onUpdateRungComment(rung.id, e.target.value);
                setEditingCommentRungId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateRungComment(rung.id, (e.target as HTMLInputElement).value);
                  setEditingCommentRungId(null);
                }
              }}
              placeholder="Megjegyzés a fokhoz..."
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 flex-1 focus:outline-none focus:border-sky-500 shadow-sm"
            />
          ) : (
            <div
              onClick={() => setEditingCommentRungId(rung.id)}
              className="text-slate-300 hover:text-slate-100 cursor-pointer flex items-start gap-2 bg-slate-800/40 hover:bg-slate-800 px-2 py-1 rounded transition-colors flex-1"
              title="Kattints a megjegyzés szerkesztéséhez"
            >
              <MessageSquare className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap break-words text-sm font-medium leading-tight">{rung.comment || 'Megjegyzés hozzáadása...'}</span>
            </div>
          )}

          {hasErrors && (
             <div className="flex flex-col ml-2 group relative">
               <div className="flex items-center gap-1 text-rose-400">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="font-bold text-xs">{rungErrors.length} Hiba</span>
               </div>
               {/* Tooltip on hover */}
               <div className="hidden group-hover:flex absolute top-full left-0 mt-1 flex-col gap-1 z-50 bg-rose-950 border border-rose-800 p-2 rounded shadow-xl w-64 text-rose-200 text-[10px]">
                 {rungErrors.map((err, i) => (
                   <div key={i} className="flex gap-1.5">
                     <span className="shrink-0">•</span>
                     <span>{err.message}</span>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* Rung Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddParallelBranch(rung.id);
            }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 rounded text-[11px] flex items-center gap-1 border border-slate-700 transition-colors"
            title="Párhuzamos ág (VAGY / OR logika) hozzáadása"
          >
            <Split className="w-3 h-3" /> + Ág (OR)
          </button>

          <button
            type="button"
            disabled={rIndex === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveRung(rung.id, 'up');
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded transition-colors"
            title="Fok mozgatása feljebb"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={rIndex === totalRungsCount - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMoveRung(rung.id, 'down');
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded transition-colors"
            title="Fok mozgatása lejjebb"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateRung(rung.id);
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Fok duplikálása"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={totalRungsCount <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRung(rung.id);
            }}
            className="p-1 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 disabled:opacity-30 rounded transition-colors"
            title="Fok törlése"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rung Schematic Body */}
      <div className="p-4 flex items-center min-h-[110px] overflow-x-auto">
        {/* Left Connection from Live Rail */}
        <div className="flex items-center shrink-0">
          <span className={`w-4 h-1 rounded-l ${
            simulationState.isRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
          }`} />
        </div>

        {/* Parallel Branches (Left / Contacts Section) */}
        <div className="relative flex flex-col gap-3 flex-1 min-w-[280px]">
          {/* Left Vertical Rail for OR logic */}
          {rung.branches.length > 1 && (
            <div
              className={`absolute left-0 top-[22px] bottom-[22px] w-0.5 z-10 transition-colors ${
                simulationState.isRunning ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
              }`}
            />
          )}

          {/* Right Vertical Rail for OR logic */}
          {rung.branches.length > 1 && (
            <div
              className={`absolute right-0 top-[22px] bottom-[22px] w-0.5 z-10 transition-colors ${
                simulationState.isRunning && rung.branches.some(b => !!simulationState.activeBranches[b.id])
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-slate-600'
              }`}
            />
          )}

          {rung.branches.map((branch) => {
            const isBranchEnergized = simulationState.isRunning && !!simulationState.activeBranches[branch.id];

            return (
              <div key={branch.id} className="flex items-center relative py-1">
                {/* Branch Wire Lead */}
                <div className={`w-3 h-0.5 shrink-0 ${
                  isBranchEnergized ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                }`} />

                {/* Branch Elements in Series */}
                <div className="flex items-center gap-1">
                  {/* Drop zone before first element */}
                  <DroppableZone
                    id={`${branch.id}_drop_0`}
                    className="w-4 h-9 rounded flex items-center justify-center transition-all hover:bg-slate-800/60"
                  >
                    <div className={`w-full h-0.5 pointer-events-none ${isBranchEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </DroppableZone>

                  {branch.elements.map((el, elIndex) => (
                    <React.Fragment key={el.id}>
                      <ElementBlock
                        element={el}
                        isActive={simulationState.activeElements[el.id]}
                        isSimulating={simulationState.isRunning}
                        isSelected={selectedElementIds.includes(el.id)}
                        timerState={el.variable ? (simulationState.timerStates[el.variable] || (el.variable.startsWith('var_') ? Object.entries(simulationState.timerStates).find(([k]) => k === el.variable)?.[1] : undefined)) : undefined}
                        counterState={el.variable ? (simulationState.counterStates[el.variable] || (el.variable.startsWith('var_') ? Object.entries(simulationState.counterStates).find(([k]) => k === el.variable)?.[1] : undefined)) : undefined}
                        onSelect={onSelectElement}
                        onDelete={onDeleteElement}
                        onTunePid={onTunePid}
                        onContextMenu={(e) => onContextMenuOpen(e, el)}
                        onForceInput={onForceInput}
                        searchQuery={searchQuery}
                      />

                      {/* Connecting Wire & Drop zone between elements */}
                      <DroppableZone
                        id={`${branch.id}_drop_${elIndex + 1}`}
                        className="w-6 h-9 rounded flex items-center justify-center transition-all hover:bg-slate-800/60"
                      >
                        <div className={`w-full h-0.5 pointer-events-none ${isBranchEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      </DroppableZone>
                    </React.Fragment>
                  ))}

                  {/* If branch is empty, show drop placeholder */}
                  {branch.elements.length === 0 && (
                    <DroppableZone
                      id={`${branch.id}_empty`}
                      className="px-4 py-2 border-2 border-dashed rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400"
                    >
                      <Plus className="w-3.5 h-3.5 pointer-events-none" /> <span className="pointer-events-none">Húzz ide érintkezőt</span>
                    </DroppableZone>
                  )}
                </div>

                {/* Right Lead Wire to Right Vertical Rail */}
                <div className={`flex-1 min-w-[12px] h-0.5 ${
                  isBranchEnergized ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                }`} />

                {/* Delete parallel branch if more than 1 */}
                {rung.branches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteParallelBranch(rung.id, branch.id)}
                    className="ml-1 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 text-[10px] shrink-0 z-20"
                    title="Párhuzamos ág törlése"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Connecting Wire between contacts and coils */}
        <div className="flex-1 flex items-center min-w-[24px]">
          <div className={`w-full h-0.5 transition-colors ${
            isRungEnergized ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
          }`} />
        </div>

        {/* Right Side: Coils and Output Modules */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {rung.coils.map((coil, cIndex) => (
            <React.Fragment key={coil.id}>
              <ElementBlock
                element={coil}
                isActive={simulationState.activeElements[coil.id] ?? isRungEnergized}
                isSimulating={simulationState.isRunning}
                isSelected={selectedElementIds.includes(coil.id)}
                timerState={coil.variable ? (simulationState.timerStates[coil.variable] || (coil.variable.startsWith('var_') ? Object.entries(simulationState.timerStates).find(([k]) => k === coil.variable)?.[1] : undefined)) : undefined}
                counterState={coil.variable ? (simulationState.counterStates[coil.variable] || (coil.variable.startsWith('var_') ? Object.entries(simulationState.counterStates).find(([k]) => k === coil.variable)?.[1] : undefined)) : undefined}
                onSelect={onSelectElement}
                onDelete={onDeleteElement}
                onTunePid={onTunePid}
                onContextMenu={(e) => onContextMenuOpen(e, coil)}
                onForceInput={onForceInput}
                searchQuery={searchQuery}
              />

              {/* Connecting wire between multiple coils */}
              {cIndex < rung.coils.length - 1 && (
                <div className={`w-3 h-0.5 ${isRungEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              )}
            </React.Fragment>
          ))}

          {/* Drop zone to add coil/module (max 1 output per rung) */}
          {rung.coils.length === 0 ? (
            <DroppableZone
              id={`${rung.id}_coils_drop`}
              className="px-2 py-1.5 border border-dashed rounded-lg text-xs font-mono flex items-center gap-1 transition-all border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400"
            >
              <div className="flex items-center gap-1 pointer-events-none" title="Húzz ide tekercset, időzítőt vagy könyvtár modult">
                 <Plus className="w-3 h-3" /> Kimenet
              </div>
            </DroppableZone>
          ) : (
            <div className="px-2 py-1 text-[10px] font-mono text-slate-600 border border-slate-800 rounded bg-slate-950/40 select-none" title="Egy fokon legfejlebb egy kimenet lehet">
              Max 1 kimenet
            </div>
          )}
        </div>

        {/* Right Return to GND Rail */}
        <div className="flex items-center shrink-0 ml-1">
          <span className={`w-4 h-1 rounded-r ${
            isRungEnergized ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-sky-500'
          }`} />
        </div>
      </div>
    </div>
  );
});

export const LadderCanvas: React.FC<LadderCanvasProps> = ({
  rungs,
  simulationState,
  selectedRungIndex,
  selectedElementIds = [],
  searchQuery,
  isSetupSection = false,
  onSelectRung,
  onSelectElement,
  onDeleteElement,
  onAddRung,
  onDeleteRung,
  onDuplicateRung,
  onMoveRung,
  onUpdateRungComment,
  onAddParallelBranch,
  onDeleteParallelBranch,
  onDropElementOnBranch,
  onDropElementOnCoils,
  onTunePid,
  onCrossReference,
  onForceInput
}) => {
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const dragTargetRef = useRef<string | null>(null);
  const rafId = useRef<number | null>(null);

  const [contextMenuInfo, setContextMenuInfo] = useState<{
    x: number;
    y: number;
    element: LadderElement;
  } | null>(null);

  const handleContextMenuOpen = useCallback((e: React.MouseEvent, element: LadderElement) => {
    e.preventDefault();
    e.stopPropagation();

    // Attempt to position within the relative parent.
    // Use closest to find the scrollable container offset
    const container = document.getElementById('ladder-canvas-container');
    if(container) {
       const rect = container.getBoundingClientRect();
       setContextMenuInfo({
         x: e.clientX - rect.left + container.scrollLeft,
         y: e.clientY - rect.top + container.scrollTop,
         element
       });
    } else {
       setContextMenuInfo({
         x: e.clientX,
         y: e.clientY,
         element
       });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Throttle the drag over target update using requestAnimationFrame
    if (dragTargetRef.current !== targetId) {
      dragTargetRef.current = targetId;
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          setDragOverTarget(dragTargetRef.current);
          rafId.current = null;
        });
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragTargetRef.current = null;
    setDragOverTarget(null);
  }, []);

  const variables = useStore((state: any) => state.history.present.variables);
  const constants = useStore((state: any) => state.history.present.constants);
  const arrays = useStore((state: any) => state.history.present.arrays);

  const validationErrors = useMemo(() => validateRungs(rungs, variables, constants, arrays), [rungs, variables, constants, arrays]);

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.2}
      maxScale={2}
      wheel={{ disabled: true }}
      panning={{ velocityDisabled: true }}
      centerZoomedOut={false}
      limitToBounds={false}
    >
      <CanvasWheelHandler>
        <ZoomControlsOverlay />

        {contextMenuInfo && (
          <ContextMenu
            x={contextMenuInfo.x}
            y={contextMenuInfo.y}
            element={contextMenuInfo.element}
            onClose={() => setContextMenuInfo(null)}
            onEdit={onSelectElement}
            onDelete={onDeleteElement}
            onTunePid={onTunePid}
            onCrossReference={onCrossReference}
          />
        )}

        {/* Background Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', minHeight: '100%', padding: '24px' }}>
          <div className="max-w-5xl mx-auto relative z-10 pb-16 w-full">
            {/* Top Power Rail Legend */}
            <div className="flex justify-between items-center px-4 mb-4 text-xs font-mono font-bold">
              <div className="flex items-center gap-2 text-rose-400">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <span>+24V / +5V (TÁPVONAL - LIVE RAIL)</span>
              </div>
              <div className={`px-2.5 py-1 rounded text-[11px] font-sans font-bold flex items-center gap-1.5 ${
                isSetupSection
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                  : 'text-slate-400'
              }`}>
                {isSetupSection ? (
                  <span>⚡ SETUP SZAKASZ (Egyszer lefutó bekapcsolási inicializálás)</span>
                ) : (
                  <span>🔄 LOOP SZAKASZ (Ciklikus 50 Hz PLC Scan)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sky-400">
                <span>(NULLAVONAL - GND RAIL) 0V</span>
                <span className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              </div>
            </div>

            {/* Rungs Container */}
            <div className="relative border-l-4 border-r-4 border-l-rose-500 border-r-sky-500 bg-slate-900/40 rounded-lg p-4 space-y-6 shadow-2xl">
              {rungs.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {isSetupSection ? 'Még nincs létrafok a setup() szakaszban' : 'Még nincs létrafok a loop() szakaszban'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isSetupSection
                      ? 'A mikrokontroller bekapcsolásakor (setup()) egyszer lefutó létrákhoz kattints az "Új Létrafok Hozzáadása" gombra!'
                      : 'Kattints az "Új Létrafok Hozzáadása" gombra vagy húzz be elemeket a bal oldali palettáról!'}
                  </p>
                </div>
              ) : (
                rungs.map((rung, rIndex) => (
                  <RungRow
                    key={rung.id}
                    rung={rung}
                    rIndex={rIndex}
                    isSelected={selectedRungIndex === rIndex}
                    selectedElementIds={selectedElementIds}
                    searchQuery={searchQuery}
                    simulationState={simulationState}
                    isSetupSection={isSetupSection}
                    validationErrors={validationErrors}
                    onSelectRung={onSelectRung}
                    onSelectElement={onSelectElement}
                    onDeleteElement={onDeleteElement}
                    onMoveRung={onMoveRung}
                    onUpdateRungComment={onUpdateRungComment}
                    onAddParallelBranch={onAddParallelBranch}
                    onDeleteParallelBranch={onDeleteParallelBranch}
                    onDropElementOnBranch={onDropElementOnBranch}
                    onDropElementOnCoils={onDropElementOnCoils}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    dragOverTarget={dragOverTarget}
                    onDuplicateRung={onDuplicateRung}
                    onDeleteRung={onDeleteRung}
                    onTunePid={onTunePid}
                    onCrossReference={onCrossReference}
                    onForceInput={onForceInput}
                    totalRungsCount={rungs.length}
                    onContextMenuOpen={handleContextMenuOpen}
                  />
                ))
              )}
            </div>

            {/* Add New Rung Button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onAddRung}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500 text-slate-200 hover:text-sky-300 font-semibold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                Új Létrafok Hozzáadása (+ Rung)
              </button>
            </div>
          </div>
        </TransformComponent>
      </CanvasWheelHandler>
    </TransformWrapper>
  );
};
