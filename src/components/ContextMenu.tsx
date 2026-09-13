import React, { useEffect, useRef } from 'react';
import { Settings2, Trash2, Activity } from 'lucide-react';
import { LadderElement } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  element: LadderElement;
  onClose: () => void;
  onEdit: (element: LadderElement) => void;
  onDelete: (id: string) => void;
  onTunePid?: (element: LadderElement) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  element,
  onClose,
  onEdit,
  onDelete,
  onTunePid
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    // Also close on scroll
    document.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-[100] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 w-48 text-sm text-slate-200"
      style={{ top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()} // prevent native menu on the custom menu itself
    >
      <div className="px-3 py-1 border-b border-slate-700 mb-1 text-[11px] font-mono text-slate-400 truncate">
        Elem: {element.name}
      </div>

      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(element);
          onClose();
        }}
      >
        <Settings2 className="w-4 h-4 text-sky-400" /> Szerkesztés
      </button>

      {element.type === 'PID_CONTROLLER' && onTunePid && (
        <button
          type="button"
          className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onTunePid(element);
            onClose();
          }}
        >
          <Activity className="w-4 h-4 text-amber-400" /> PID Hangolás
        </button>
      )}

      <div className="h-px bg-slate-700 my-1 mx-2" />

      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-rose-950/60 hover:text-rose-400 flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(element.id);
          onClose();
        }}
      >
        <Trash2 className="w-4 h-4 text-rose-500" /> Törlés
      </button>
    </div>
  );
};
