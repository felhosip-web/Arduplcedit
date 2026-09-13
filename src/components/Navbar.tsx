import React, { useState, useRef, useEffect } from 'react';
import {
  FileCode,
  Activity,
  Sliders,
  Terminal,
  FolderOpen,
  Save,
  RefreshCw,
  Cpu,
  ChevronDown,
  Layers,
  Sparkles,
  Gauge,
  Undo2,
  Redo2,
  Settings
} from 'lucide-react';
import { EXAMPLE_PROJECTS, ExampleProject } from '../data/exampleProjects';
import { ActivePage } from '../types';

interface NavbarProps {
  activePage: ActivePage;
  onChangePage: (page: ActivePage) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onOpenCodeViewer: () => void;
  onLoadExample: (example: ExampleProject) => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onResetProject: () => void;
  onOpenSaveLoadModal?: () => void;
  onOpenHardwareMap?: () => void;
  pinConflictCount?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onChangePage,
  isSimulating,
  onToggleSimulation,
  onOpenCodeViewer,
  onLoadExample,
  onExportProject,
  onImportProject,
  onResetProject,
  onOpenSaveLoadModal,
  onOpenHardwareMap,
  pinConflictCount = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
      if (editMenuRef.current && !editMenuRef.current.contains(e.target as Node)) {
        setEditMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Brand / Classic Menu System */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-sm tracking-wide">
                Arduino PLC Ladder Studio
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/80">
                v2.1
              </span>
            </div>
          </div>
        </div>

        {/* Classic Menu */}
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 relative">
          {/* File Menu */}
          <div className="relative" ref={fileMenuRef}>
            <button
              onClick={() => { setFileMenuOpen(!fileMenuOpen); setEditMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${fileMenuOpen ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}
            >
              Fájl
            </button>
            {fileMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
                <button
                  onClick={() => { onResetProject(); setFileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-rose-400" /> Új Projekt
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <label className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white cursor-pointer flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Importálás (JSON)
                  <input type="file" accept=".json" onChange={(e) => { handleFileChange(e); setFileMenuOpen(false); }} className="hidden" />
                </label>
                <button
                  onClick={() => { onExportProject(); setFileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Exportálás (JSON)
                </button>
                {onOpenSaveLoadModal && (
                  <>
                    <div className="h-px bg-slate-700 my-1" />
                    <button
                      onClick={() => { onOpenSaveLoadModal(); setFileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 hover:text-white flex items-center gap-2 text-indigo-300"
                    >
                      <Save className="w-4 h-4" /> Projekt Kezelő (Slotok)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative" ref={editMenuRef}>
            <button
              onClick={() => { setEditMenuOpen(!editMenuOpen); setFileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${editMenuOpen ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}
            >
              Szerkesztés
            </button>
            {editMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
                <button
                  onClick={() => { if(canUndo && onUndo) onUndo(); setEditMenuOpen(false); }}
                  disabled={!canUndo}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 justify-between ${canUndo ? 'hover:bg-slate-700 hover:text-white' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className="flex items-center gap-2"><Undo2 className="w-4 h-4" /> Visszavonás</div>
                  <span className="text-xs text-slate-500">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => { if(canRedo && onRedo) onRedo(); setEditMenuOpen(false); }}
                  disabled={!canRedo}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 justify-between ${canRedo ? 'hover:bg-slate-700 hover:text-white' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className="flex items-center gap-2"><Redo2 className="w-4 h-4" /> Újra</div>
                  <span className="text-xs text-slate-500">Ctrl+Y</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative">
             <button
                onClick={() => onChangePage('management')}
                className="px-3 py-1.5 rounded-lg transition-colors hover:text-white hover:bg-slate-800/50 flex items-center gap-1.5"
             >
                <Settings className="w-4 h-4" /> Beállítások
             </button>
          </div>
        </div>
      </div>

      {/* 6 Main Pages Navigation Tabs */}
      <nav className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
        {/* 1. Létra Szerkesztő */}
        <button
          type="button"
          onClick={() => onChangePage('editor')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'editor'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Létra</span>
        </button>

        {/* 2. Szimulátor */}
        <button
          type="button"
          onClick={() => onChangePage('simulator')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'simulator'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>2. Szimulátor</span>
          {isSimulating && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* 3. Makrók (Dedikált Áramköri Sablonok Oldal) */}
        <button
          type="button"
          onClick={() => onChangePage('macros')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'macros'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>3. Makrók</span>
        </button>

        {/* 4. Menedzsment */}
        <button
          type="button"
          onClick={() => onChangePage('management')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'management'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>4. Menedzsment</span>
        </button>

        {/* 5. Arduino Kód */}
        <button
          type="button"
          onClick={() => onChangePage('code')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'code'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>5. Arduino Kód</span>
        </button>

        {/* 6. Diagnosztika */}
        <button
          type="button"
          onClick={() => onChangePage('diagnostics')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activePage === 'diagnostics'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>6. Diagnosztika</span>
        </button>
      </nav>

      {/* Right Action Controls */}
      <div className="flex items-center gap-3">
        {/* Undo/Redo quick buttons */}
        <div className="flex items-center gap-1 mr-2 border-r border-slate-700 pr-3">
          <button
            type="button"
            onClick={() => { if(canUndo && onUndo) onUndo(); }}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}
            title="Visszavonás (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { if(canRedo && onRedo) onRedo(); }}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}
            title="Újra (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Examples Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExamplesOpen(!examplesOpen)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Példák</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {examplesOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Beépített PLC Példaprogramok
              </div>
              {EXAMPLE_PROJECTS.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    onLoadExample(ex);
                    setExamplesOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex flex-col"
                >
                  <span className="font-semibold text-sky-300">{ex.name}</span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{ex.description}</span>
                  {ex.requiredLibraries.length > 0 && (
                    <span className="text-[10px] text-cyan-400 font-mono mt-0.5">
                      Lib: {ex.requiredLibraries.join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hardware Map Modal Trigger */}
        {onOpenHardwareMap && (
          <button
            type="button"
            onClick={onOpenHardwareMap}
            className={`px-3 py-1.5 rounded-lg border font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              pinConflictCount > 0
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900/90 animate-pulse'
                : 'bg-sky-950/60 border-sky-600/70 text-sky-300 hover:bg-sky-900/60 hover:text-white'
            }`}
            title="Hardver Lábkiosztási Térkép & Ütközésvizsgálat (Arduino Uno & Mega)"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardver Térkép</span>
            {pinConflictCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {pinConflictCount}
              </span>
            )}
          </button>
        )}

        {/* Arduino Code Generator Modal Trigger */}
        <button
          type="button"
          onClick={onOpenCodeViewer}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
        >
          <Terminal className="w-4 h-4" />
          <span>Arduino Kód (.ino)</span>
        </button>
      </div>
    </header>
  );
};
