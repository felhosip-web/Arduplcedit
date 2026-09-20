1. **Rung labels / comments**
   - In `LadderCanvas.tsx`, improve the inline comment editor. Currently it uses `truncation` and a message square icon. Change it so that it is more prominent. Allow double click or a dedicated edit button to edit it. If it has a comment, show the text normally. Maybe use a text area for multi-line support or just a wider input. The requirement says: "visible on the rung header/row ... Inline edit or small edit control on the rung ... Optional: show truncated label on the canvas; full text on hover".
   - `codeGenerator.ts`: Ensure `generateRungLogicBlock` includes the comment properly, e.g., `// Rung N: comment`. It already has `out.push(\`  // --- \${prefix.toUpperCase()} RUNG #\${rung.number}: \${rung.comment || 'Fok ' + rung.number} ---\`);`, so codegen is fine! (Goal 1.3 satisfied).

2. **Search**
   - Add a search box to `EditorView.tsx` (top right, beside existing tools).
   - Add state in `EditorView.tsx` (or globally) for `searchQuery`. Pass `searchQuery` down to `LadderCanvas` -> `RungRow` -> `ElementBlock`.
   - In `ElementBlock`, if `searchQuery` matches `element.parameters` values or variables, highlight the block (e.g., `ring-2 ring-yellow-400 bg-yellow-500/10`).
   - Also allow searching rung comments.
   - For jumping to results, we could implement a small results panel below the search box, but the simplest might be just highlighting matches in the canvas for now, and maybe a "Next/Prev" button or just scrolling. The prompt asks for "Results list: rung number + element summary; click -> navigate/select that rung". We'll create a `SearchResultsPanel` floating near the search box in `EditorView.tsx`.
   - When clicking a result, use standard browser `document.getElementById` and `.scrollIntoView()` to navigate, as we already give rungs `id` in DOM, or we can add IDs.

3. **Cross-reference**
   - Add a context menu item "Keresztreferencia" in `ContextMenu.tsx` for elements.
   - We need to know what symbol was clicked (e.g., a variable like `V1` or pin name).
   - We can implement a modal `CrossReferenceModal` which takes the clicked variable ID/name.
   - The modal searches the entire store (using `useStore.getState().tasks` and `rungs` for global tasks) to find usages.
   - Categorize read (contact, compare) vs write (coil, math dest).
   - Display a list. Click -> navigate. To navigate to different tasks/programs, we might need to update global state `activeProgramId` and `activeTaskId` via store, then scroll.

4. **Pre-commit checks**
   - Make sure no TypeScript errors. Run lint and build. Call `pre_commit_instructions`.
