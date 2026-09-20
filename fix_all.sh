# 1. EditorView.tsx
sed -i 's/const \[activeDragElement, setActiveDragElement\] = useState<Partial<LadderElement> | null>(null);/const [activeDragElement, setActiveDragElement] = useState<Partial<LadderElement> | null>(null);\n  const [searchQuery, setSearchQuery] = useState("");\n  const [crossRefElement, setCrossRefElement] = useState<LadderElement | null>(null);/g' src/views/EditorView.tsx
sed -i "s/import { DndContext, DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit\/core';/import { DndContext, DragEndEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit\/core';\nimport { CrossReferenceModal } from '..\/components\/modals\/CrossReferenceModal';/g" src/views/EditorView.tsx

cat << 'INNER_EOF' > /tmp/repl_ev_c.txt
<<<<<<< SEARCH
            <LadderCanvas
              rungs={activeRungs}
              simulationState={simulationState}
              selectedRungIndex={selectedRungIndex}
              isSetupSection={!isEditingSubroutine && currentSection === 'setup'}
              onSelectRung={onSelectRung}
=======
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
                isSetupSection={!isEditingSubroutine && currentSection === 'setup'}
                onSelectRung={onSelectRung}
>>>>>>> REPLACE
INNER_EOF

cat << 'INNER_EOF' > /tmp/repl_ev_c2.txt
<<<<<<< SEARCH
              onDeleteParallelBranch={handleDeleteParallelBranch}
              onDropElementOnBranch={handleDropElementOnBranch}
              onDropElementOnCoils={handleDropElementOnCoils}
            />
          </div>
=======
                onDeleteParallelBranch={handleDeleteParallelBranch}
                onDropElementOnBranch={handleDropElementOnBranch}
                onDropElementOnCoils={handleDropElementOnCoils}
                onCrossReference={(el) => setCrossRefElement(el)}
              />
            </div>
          </div>
>>>>>>> REPLACE
INNER_EOF

cat << 'INNER_EOF' > /tmp/repl_ev_c3.txt
<<<<<<< SEARCH
        </DndContext>
      )}
    </div>
  );
};
=======
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
    </div>
  );
};
>>>>>>> REPLACE
INNER_EOF
