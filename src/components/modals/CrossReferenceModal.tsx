import React, { useMemo } from 'react';
import { X, ArrowRight, BookOpen, PenTool } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { LadderElement, Rung } from '../../types';

interface CrossReferenceModalProps {
  element: LadderElement;
  onClose: () => void;
  onNavigateToRung: (taskId: string, programId: string | null, rungId: string) => void;
}

interface Occurence {
  taskId: string;
  taskName: string;
  programId: string | null;
  programName: string;
  rung: Rung;
  type: 'READ' | 'WRITE';
  elementDetail: string;
}

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({
  element,
  onClose,
  onNavigateToRung
}) => {
  const { history } = useStore();
  const tasks = history.present.tasks || [];
  const globalRungs = history.present.rungs;

  const targetSymbol = element.variable || element.pin || element.name;

  const occurrences = useMemo(() => {
    if (!targetSymbol) return [];

    const results: Occurence[] = [];
    const searchString = targetSymbol.toLowerCase();

    const checkElement = (
      el: LadderElement,
      rung: Rung,
      taskId: string,
      taskName: string,
      programId: string | null,
      programName: string,
      isCoil: boolean
    ) => {
      const isMatch =
        (el.variable && el.variable.toLowerCase() === searchString) ||
        (el.pin && el.pin.toLowerCase() === searchString) ||
        (el.name.toLowerCase() === searchString);

      if (isMatch) {
        // Simple heuristic: coils and math dest are writes, contacts are reads.
        const isWrite = isCoil || (el.type as any) === 'MATH' || (el.type as any) === 'MOVE';
        results.push({
          taskId,
          taskName,
          programId,
          programName,
          rung,
          type: isWrite ? 'WRITE' : 'READ',
          elementDetail: el.type
        });
      }
    };

    const searchRungs = (
      rungsToSearch: Rung[],
      taskId: string,
      taskName: string,
      programId: string | null,
      programName: string
    ) => {
      for (const rung of rungsToSearch) {
        for (const branch of rung.branches) {
          for (const el of branch.elements) {
            checkElement(el, rung, taskId, taskName, programId, programName, false);
          }
        }
        for (const coil of rung.coils) {
          checkElement(coil, rung, taskId, taskName, programId, programName, true);
        }
      }
    };

    // Search tasks/programs
    tasks.forEach(task => {
      task.programs.forEach(prog => {
        if (prog.type === 'ladder') {
          searchRungs(prog.rungs, task.id, task.name, prog.id, prog.name);
        }
      });
    });

    // Search global/legacy main rungs
    if (globalRungs && globalRungs.length > 0) {
      searchRungs(globalRungs, 'global', 'Globális (Legacy)', null, 'Fő Létra');
    }

    return results;
  }, [targetSymbol, tasks, globalRungs]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center font-bold text-sky-400">?</span>
              Keresztreferencia
            </h2>
            <div className="text-sm text-slate-400 mt-1">
              Szimbólum: <span className="text-sky-300 font-mono font-bold bg-sky-950 px-2 py-0.5 rounded ml-1">{targetSymbol}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-h-[300px]">
          {occurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <p>Nincs találat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {occurrences.map((occ, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateToRung(occ.taskId, occ.programId, occ.rung.id)}
                  className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg hover:bg-slate-800 hover:border-sky-500/50 cursor-pointer transition-all group"
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-950 border border-slate-700">
                    {occ.type === 'WRITE' ? (
                      <PenTool className="w-5 h-5 text-amber-400" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${occ.type === 'WRITE' ? 'bg-amber-950/50 text-amber-300 border border-amber-900/50' : 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/50'}`}>
                        {occ.type === 'WRITE' ? 'ÍRÁS' : 'OLVASÁS'}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">
                        {occ.taskName} {occ.programId ? `› ${occ.programName}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
                      <span>Fok #{occ.rung.number}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-sky-400/80">{occ.elementDetail}</span>
                      {occ.rung.comment && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="truncate italic text-slate-500">{occ.rung.comment}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
