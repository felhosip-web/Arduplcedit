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
