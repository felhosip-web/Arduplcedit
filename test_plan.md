# Goal 1: Rung labels / comments easy to see and edit
1. Enhance `src/components/LadderCanvas.tsx` to always show the comment input or text in the rung header, and style it for better visibility. Add truncation and hover tooltips for long comments. (Currently there is a hidden or simple inline comment edit - make it more prominent and user friendly).
2. Ensure `src/utils/codeGenerator.ts` generates `// Rung N: ...` if a comment is present. (Already mostly there, but ensure consistency).

# Goal 2: Search for a variable/pin/symbol across the ladder
1. Add a Search bar component in the `EditorView.tsx` toolbar or above the `LadderCanvas`.
2. Create a generic search logic to find references in ladder elements (contacts, coils, ops).
3. The search should filter and match element parameters, variable names, pin names, and optionally rung comments.
4. Render results as a dropdown or list, clicking a result will auto-scroll/jump to that rung (using `element.scrollIntoView()` via refs, or selecting the rung/element via global state).
5. Apply a highlight style (e.g. `ring-2 ring-yellow-400`) to matching elements on the `LadderCanvas` via a new `searchQuery` prop or store state.

# Goal 3: Cross-reference (where a symbol is read vs written)
1. Add a "Keresztreferencia" (Cross-reference) action to the element context menu in `src/components/ContextMenu.tsx`.
2. When triggered, open a simple modal or side panel (can create a new component `src/components/modals/CrossReferenceModal.tsx`).
3. The modal logic will scan all cyclic ladder programs and global rungs for the selected symbol (variable or pin name).
4. Categorize usages into **Read** (e.g., normally open, normally closed contacts, compare operators) and **Write** (e.g., coils, reset, math/move operations output).
5. Present the list. Clicking an entry should ideally navigate the user to that program/rung.
