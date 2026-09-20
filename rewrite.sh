# 1. LadderCanvas.tsx
sed -i 's/<span className="truncate">{rung.comment || '\'Megjegyzés hozzáadása...\''}<\/span>/<span className="whitespace-pre-wrap break-words text-sm font-medium leading-tight">{rung.comment || '\'Megjegyzés hozzáadása...\''}<\/span>/g' src/components/LadderCanvas.tsx
sed -i 's/className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-100 flex-1 max-w-md focus:outline-none focus:border-sky-500"/className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 flex-1 focus:outline-none focus:border-sky-500 shadow-sm"/g' src/components/LadderCanvas.tsx
sed -i 's/className="text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1.5 truncate max-w-md"/className="text-slate-300 hover:text-slate-100 cursor-pointer flex items-start gap-2 bg-slate-800\/40 hover:bg-slate-800 px-2 py-1 rounded transition-colors flex-1"/g' src/components/LadderCanvas.tsx
sed -i 's/<MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" \/>/<MessageSquare className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" \/>/g' src/components/LadderCanvas.tsx

# 2. Add searchQuery to LadderCanvas props
sed -i 's/selectedRungIndex: number;/selectedRungIndex: number;\n  searchQuery?: string;/g' src/components/LadderCanvas.tsx
sed -i 's/isSelected: boolean;/isSelected: boolean;\n  searchQuery?: string;/g' src/components/LadderCanvas.tsx
sed -i 's/isSelected,/isSelected,\n  searchQuery,/g' src/components/LadderCanvas.tsx
sed -i 's/onTunePid?: (el: LadderElement) => void;/onTunePid?: (el: LadderElement) => void;\n  onCrossReference?: (el: LadderElement) => void;/g' src/components/LadderCanvas.tsx
sed -i 's/onTunePid,/onTunePid,\n  onCrossReference,/g' src/components/LadderCanvas.tsx

# 3. Add searchQuery to ElementBlock in LadderCanvas
sed -i 's/onContextMenu={(e) => onContextMenuOpen(e, el)}/onContextMenu={(e) => onContextMenuOpen(e, el)}\n                        searchQuery={searchQuery}/g' src/components/LadderCanvas.tsx
sed -i 's/onContextMenu={(e) => onContextMenuOpen(e, coil)}/onContextMenu={(e) => onContextMenuOpen(e, coil)}\n                searchQuery={searchQuery}/g' src/components/LadderCanvas.tsx
sed -i 's/isSelected={selectedRungIndex === rIndex}/isSelected={selectedRungIndex === rIndex}\n            searchQuery={searchQuery}/g' src/components/LadderCanvas.tsx

# 4. ContextMenu props in LadderCanvas
sed -i 's/onTunePid={onTunePid}/onTunePid={onTunePid}\n            onCrossReference={onCrossReference}/g' src/components/LadderCanvas.tsx
sed -i 's/onTunePid={onTunePid}/onTunePid={onTunePid}\n                onCrossReference={onCrossReference}/g' src/components/LadderCanvas.tsx

# 5. ElementBlock.tsx
sed -i 's/onContextMenu?: (e: React.MouseEvent) => void;/onContextMenu?: (e: React.MouseEvent) => void;\n  searchQuery?: string;/g' src/components/ElementBlock.tsx
sed -i 's/onContextMenu\n})/onContextMenu,\n  searchQuery\n})/' src/components/ElementBlock.tsx

cat << 'INNER_EOF' > patch_eb.sh
sed -i '/const isPassing = isSimulating && isActive;/a \
\
  const isMatch = React.useMemo(() => {\
    if (!searchQuery || searchQuery.trim() === "") return false;\
    const q = searchQuery.toLowerCase();\
    if (element.name.toLowerCase().includes(q)) return true;\
    if (element.variable && element.variable.toLowerCase().includes(q)) return true;\
    if (element.pin && element.pin.toLowerCase().includes(q)) return true;\
    if (element.comment && element.comment.toLowerCase().includes(q)) return true;\
    if (element.parameters) {\
      for (const val of Object.values(element.parameters)) {\
        if (String(val).toLowerCase().includes(q)) return true;\
      }\
    }\
    return false;\
  }, [searchQuery, element]);\
' src/components/ElementBlock.tsx
INNER_EOF
bash patch_eb.sh

cat << 'INNER_EOF' > patch_eb2.sh
sed -i 's/isPassing\n          ? '\''bg-emerald-950\/20/isMatch\n          ? '\''bg-yellow-500\/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] z-10'\''\n          : isPassing\n            ? '\''bg-emerald-950\/20/g' src/components/ElementBlock.tsx
INNER_EOF
bash patch_eb2.sh

# 6. EditorView.tsx
sed -i 's/const \[activeDragElement, setActiveDragElement\] = useState<Partial<LadderElement> | null>(null);/const [activeDragElement, setActiveDragElement] = useState<Partial<LadderElement> | null>(null);\n  const [searchQuery, setSearchQuery] = useState("");\n  const [crossRefElement, setCrossRefElement] = useState<LadderElement | null>(null);/g' src/views/EditorView.tsx
sed -i "s/import { DndContext, DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit\/core';/import { DndContext, DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit\/core';\nimport { CrossReferenceModal } from '..\/components\/modals\/CrossReferenceModal';/g" src/views/EditorView.tsx

cat << 'INNER_EOF' > patch_ev.sh
sed -i 's/<LadderCanvas\n              rungs={activeRungs}\n              simulationState={simulationState}\n              selectedRungIndex={selectedRungIndex}\n              isSetupSection={!isEditingSubroutine && currentSection === '"'setup'"'}\n              onSelectRung={onSelectRung}/<div className="flex-1 flex flex-col min-w-0">\n              <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-end">\n                <input\n                  type="text"\n                  placeholder="Keresés létrában (változó, pin, megjegyzés)..."\n                  value={searchQuery}\n                  onChange={(e) => setSearchQuery(e.target.value)}\n                  className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-64 shadow-sm"\n                \/>\n              <\/div>\n              <LadderCanvas\n                rungs={activeRungs}\n                searchQuery={searchQuery}\n                simulationState={simulationState}\n                selectedRungIndex={selectedRungIndex}\n                isSetupSection={!isEditingSubroutine && currentSection === '"'setup'"'}\n                onSelectRung={onSelectRung}/g' src/views/EditorView.tsx
INNER_EOF
bash patch_ev.sh

sed -i 's/onDropElementOnCoils={handleDropElementOnCoils}\n            \/>/onDropElementOnCoils={handleDropElementOnCoils}\n              onCrossReference={(el) => setCrossRefElement(el)}\n            \/>\n            <\/div>/g' src/views/EditorView.tsx

cat << 'INNER_EOF' > patch_ev2.sh
sed -i '/<\/DndContext>/a \
      {crossRefElement && (\
        <CrossReferenceModal\
          element={crossRefElement}\
          onClose={() => setCrossRefElement(null)}\
          onNavigateToRung={(taskId, programId, rungId) => {\
            setCrossRefElement(null);\
            setTimeout(() => {\
              const el = document.getElementById(rungId);\
              if (el) {\
                el.scrollIntoView({ behavior: "smooth", block: "center" });\
                el.classList.add("ring-4", "ring-sky-500", "transition-all");\
                setTimeout(() => el.classList.remove("ring-4", "ring-sky-500"), 2000);\
              }\
            }, 100);\
          }}\
        />\
      )}\
' src/views/EditorView.tsx
INNER_EOF
bash patch_ev2.sh

# 7. ContextMenu.tsx
sed -i 's/onTunePid?: (element: LadderElement) => void;/onTunePid?: (element: LadderElement) => void;\n  onCrossReference?: (element: LadderElement) => void;/g' src/components/ContextMenu.tsx
sed -i 's/onTunePid\n})/onTunePid,\n  onCrossReference\n})/' src/components/ContextMenu.tsx

cat << 'INNER_EOF' > patch_cm.sh
sed -i '/PID Hangolás\n        <\/button>/a \
      )}\n\
\n      {onCrossReference && (\
        <button\
          type="button"\
          className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2"\
          onClick={(e) => {\
            e.stopPropagation();\
            onCrossReference(element);\
            onClose();\
          }}\
        >\
          <span className="w-4 h-4 flex items-center justify-center font-bold text-sky-400">?<\/span>\
          Keresztreferencia\
        <\/button>\
' src/components/ContextMenu.tsx
INNER_EOF
bash patch_cm.sh

# 8. CrossReferenceModal.tsx
cat << 'INNER_EOF' > src/components/modals/CrossReferenceModal.tsx
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
INNER_EOF
