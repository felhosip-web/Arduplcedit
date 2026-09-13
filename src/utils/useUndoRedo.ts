import { useState, useCallback } from 'react';

export function useUndoRedo<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((newPresent: T | ((curr: T) => T)) => {
    setPresent((currentPresent) => {
      const resolvedPresent =
        typeof newPresent === 'function'
          ? (newPresent as (curr: T) => T)(currentPresent)
          : newPresent;

      if (resolvedPresent === currentPresent) return currentPresent;

      setPast((p) => [...p, currentPresent]);
      setFuture([]);
      return resolvedPresent;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      const newPast = p.slice(0, p.length - 1);

      setPresent((currentPresent) => {
        setFuture((f) => [currentPresent, ...f]);
        return previous;
      });

      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      const newFuture = f.slice(1);

      setPresent((currentPresent) => {
        setPast((p) => [...p, currentPresent]);
        return next;
      });

      return newFuture;
    });
  }, []);

  const clear = useCallback((newPresent?: T) => {
    setPast([]);
    setFuture([]);
    if (newPresent !== undefined) {
      setPresent(newPresent);
    }
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    clear,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
