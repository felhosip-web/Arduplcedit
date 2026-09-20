sed -i '/<\/DndContext>/a \
      )} \
\
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
    <\/div>\
  );\
};' src/views/EditorView.tsx
