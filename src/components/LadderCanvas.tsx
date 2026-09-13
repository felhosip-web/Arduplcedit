import React, { useState } from 'react';
import { Rung, LadderElement, SimulationState } from '../types';
import { ElementBlock } from './ElementBlock';
import { Plus, ArrowUp, ArrowDown, Copy, Trash2, Split, MessageSquare } from 'lucide-react';

interface LadderCanvasProps {
  rungs: Rung[];
  simulationState: SimulationState;
  selectedRungIndex: number;
  isSetupSection?: boolean;
  onSelectRung: (index: number) => void;
  onSelectElement: (el: LadderElement) => void;
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
}

export const LadderCanvas: React.FC<LadderCanvasProps> = ({
  rungs,
  simulationState,
  selectedRungIndex,
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
  onTunePid
}) => {
  const [editingCommentRungId, setEditingCommentRungId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDropOnBranch = (e: React.DragEvent, rungId: string, branchId: string, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const elementData = JSON.parse(dataStr);
        onDropElementOnBranch(rungId, branchId, insertIndex, elementData);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDropOnCoils = (e: React.DragEvent, rungId: string, insertIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const elementData = JSON.parse(dataStr);
        onDropElementOnCoils(rungId, insertIndex, elementData);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto p-6 relative select-none">
      {/* Background Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10 pb-16">
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
            rungs.map((rung, rIndex) => {
              const isSelected = selectedRungIndex === rIndex;
              const isRungEnergized = simulationState.isRunning && (
                isSetupSection
                  ? (!!simulationState.activeSetupRungs?.[rung.id] || !!simulationState.activeRungs[rung.id])
                  : !!simulationState.activeRungs[rung.id]
              );

            return (
              <div
                key={rung.id}
                onClick={() => onSelectRung(rIndex)}
                className={`rounded-xl border transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-slate-900/90 shadow-lg shadow-sky-500/10'
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
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-100 flex-1 max-w-md focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCommentRungId(rung.id)}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1.5 truncate max-w-md"
                        title="Kattints a megjegyzés szerkesztéséhez"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{rung.comment || 'Megjegyzés hozzáadása...'}</span>
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
                      disabled={rIndex === rungs.length - 1}
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
                      disabled={rungs.length <= 1}
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
                  <div className="flex flex-col gap-3 flex-1 min-w-[280px]">
                    {rung.branches.map((branch, bIndex) => {
                      const isBranchEnergized = simulationState.isRunning && !!simulationState.activeBranches[branch.id];

                      return (
                        <div key={branch.id} className="flex items-center relative py-1">
                          {/* Branch Wire Lead */}
                          <div className={`w-3 h-0.5 shrink-0 ${
                            isBranchEnergized ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                          }`} />

                          {/* Branch Elements in Series */}
                          <div className="flex items-center flex-wrap gap-1">
                            {/* Drop zone before first element */}
                            <div
                              onDragOver={(e) => handleDragOver(e, `${branch.id}_drop_0`)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDropOnBranch(e, rung.id, branch.id, 0)}
                              className={`w-4 h-9 rounded flex items-center justify-center transition-all ${
                                dragOverTarget === `${branch.id}_drop_0`
                                  ? 'bg-sky-500/40 border-2 border-dashed border-sky-400 scale-110'
                                  : 'hover:bg-slate-800/60'
                              }`}
                            >
                              <div className={`w-full h-0.5 ${isBranchEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            </div>

                            {branch.elements.map((el, elIndex) => (
                              <React.Fragment key={el.id}>
                                <ElementBlock
                                  element={el}
                                  isActive={simulationState.activeElements[el.id]}
                                  isSimulating={simulationState.isRunning}
                                  timerState={el.variable ? simulationState.timerStates[el.variable] : undefined}
                                  counterState={el.variable ? simulationState.counterStates[el.variable] : undefined}
                                  onSelect={onSelectElement}
                                  onDelete={onDeleteElement}
                                  onTunePid={onTunePid}
                                />

                                {/* Connecting Wire & Drop zone between elements */}
                                <div
                                  onDragOver={(e) => handleDragOver(e, `${branch.id}_drop_${elIndex + 1}`)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDropOnBranch(e, rung.id, branch.id, elIndex + 1)}
                                  className={`w-6 h-9 rounded flex items-center justify-center transition-all ${
                                    dragOverTarget === `${branch.id}_drop_${elIndex + 1}`
                                      ? 'bg-sky-500/40 border-2 border-dashed border-sky-400 scale-110'
                                      : 'hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className={`w-full h-0.5 ${isBranchEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                </div>
                              </React.Fragment>
                            ))}

                            {/* If branch is empty, show drop placeholder */}
                            {branch.elements.length === 0 && (
                              <div
                                onDragOver={(e) => handleDragOver(e, `${branch.id}_empty`)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropOnBranch(e, rung.id, branch.id, 0)}
                                className={`px-4 py-2 border-2 border-dashed rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                                  dragOverTarget === `${branch.id}_empty`
                                    ? 'border-sky-400 bg-sky-950/40 text-sky-300'
                                    : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" /> Húzz ide érintkezőt
                              </div>
                            )}
                          </div>

                          {/* Delete parallel branch if more than 1 */}
                          {rung.branches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteParallelBranch(rung.id, branch.id)}
                              className="ml-2 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 text-[10px]"
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
                          isActive={isRungEnergized}
                          isSimulating={simulationState.isRunning}
                          timerState={coil.variable ? simulationState.timerStates[coil.variable] : undefined}
                          counterState={coil.variable ? simulationState.counterStates[coil.variable] : undefined}
                          onSelect={onSelectElement}
                          onDelete={onDeleteElement}
                          onTunePid={onTunePid}
                        />

                        {/* Connecting wire between multiple coils */}
                        {cIndex < rung.coils.length - 1 && (
                          <div className={`w-3 h-0.5 ${isRungEnergized ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        )}
                      </React.Fragment>
                    ))}

                    {/* Drop zone to add another coil/module */}
                    <div
                      onDragOver={(e) => handleDragOver(e, `${rung.id}_coils_drop`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropOnCoils(e, rung.id, rung.coils.length)}
                      className={`px-2 py-1.5 border border-dashed rounded-lg text-xs font-mono flex items-center gap-1 transition-all ${
                        dragOverTarget === `${rung.id}_coils_drop`
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                      }`}
                      title="Húzz ide további tekercset, időzítőt vagy könyvtár modult"
                    >
                      <Plus className="w-3 h-3" /> Kimenet
                    </div>
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
          })
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
    </div>
  );
};
