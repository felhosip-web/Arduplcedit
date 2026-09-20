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
