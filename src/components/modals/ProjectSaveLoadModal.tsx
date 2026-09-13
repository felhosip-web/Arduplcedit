import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Download,
  Upload,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Clock,
  User,
  Info,
  Trash2,
  RefreshCw,
  Zap,
  Activity,
  FileCheck
} from 'lucide-react';
import {
  Rung,
  Subroutine,
  CustomModuleTemplate,
  ArduinoLibrary,
  PLCConstant,
  PLCVariable,
  PLCArray,
  ProtocolConfigs,
  InterruptsConfig,
  ProjectData,
  ProjectMetadata
} from '../../types';
import { DEFAULT_PROTOCOLS } from '../../data/defaultProtocols';
import { DEFAULT_INTERRUPTS } from '../../data/defaultInterrupts';

interface LocalSlot {
  slotIndex: number;
  data: ProjectData | null;
  savedAt?: string;
  name?: string;
}

const LOCAL_SLOTS_KEY = 'arduino_plc_saved_slots_v1';

interface ProjectSaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata?: ProjectMetadata;
  onUpdateMetadata?: (meta: ProjectMetadata) => void;
  rungs?: Rung[];
  setupRungs?: Rung[];
  subroutines?: Subroutine[];
  customModules?: CustomModuleTemplate[];
  libraries?: ArduinoLibrary[];
  constants?: PLCConstant[];
  variables?: PLCVariable[];
  arrays?: PLCArray[];
  protocols?: ProtocolConfigs;
  interrupts?: InterruptsConfig;
  currentProject?: ProjectData;
  onLoadFullProject?: (project: ProjectData) => void;
  onLoadProject?: (project: ProjectData) => void;
}

export const ProjectSaveLoadModal: React.FC<ProjectSaveLoadModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onUpdateMetadata,
  rungs,
  setupRungs,
  subroutines,
  customModules,
  libraries,
  constants,
  variables,
  arrays,
  protocols,
  interrupts,
  currentProject,
  onLoadFullProject,
  onLoadProject
}) => {
  const effectiveRungs = rungs ?? currentProject?.rungs ?? [];
  const effectiveSetupRungs = setupRungs ?? currentProject?.setupRungs ?? [];
  const effectiveSubroutines = subroutines ?? currentProject?.subroutines ?? [];
  const effectiveCustomModules = customModules ?? currentProject?.customModules ?? [];
  const effectiveLibraries = libraries ?? currentProject?.libraries ?? [];
  const effectiveConstants = constants ?? currentProject?.constants ?? [];
  const effectiveVariables = variables ?? currentProject?.variables ?? [];
  const effectiveArrays = arrays ?? currentProject?.arrays ?? [];
  const effectiveProtocols = protocols ?? currentProject?.protocols ?? DEFAULT_PROTOCOLS;
  const effectiveInterrupts = interrupts ?? currentProject?.interrupts ?? DEFAULT_INTERRUPTS;

  const initialMeta: ProjectMetadata = metadata ?? currentProject?.metadata ?? {
    name: currentProject?.name || 'Arduino_PLC_Program',
    description: 'Ipari Arduino PLC létraprogram',
    author: 'PLC Mérnök',
    version: currentProject?.version || '1.0.0',
    targetBoard: 'Arduino Uno',
    savedAt: new Date().toISOString()
  };

  const handleLoad = onLoadFullProject || onLoadProject || (() => {});

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'slots'>('export');

  // Metadata edit form
  const [projName, setProjName] = useState(initialMeta.name || 'Arduino_PLC_Program');
  const [projDesc, setProjDesc] = useState(initialMeta.description || '');
  const [projAuthor, setProjAuthor] = useState(initialMeta.author || 'PLC Programozó');
  const [projVersion, setProjVersion] = useState(initialMeta.version || '1.0.0');
  const [targetBoard, setTargetBoard] = useState(initialMeta.targetBoard || 'Arduino Uno');

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportData, setParsedImportData] = useState<ProjectData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success toast
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Browser slots state
  const [slots, setSlots] = useState<LocalSlot[]>([
    { slotIndex: 1, data: null },
    { slotIndex: 2, data: null },
    { slotIndex: 3, data: null },
    { slotIndex: 4, data: null },
    { slotIndex: 5, data: null }
  ]);

  // Load saved slots from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SLOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlots(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load slots from storage', e);
    }
  }, []);

  // Update initial form values when opening
  useEffect(() => {
    if (isOpen) {
      setProjName(initialMeta.name || 'Arduino_PLC_Program');
      setProjDesc(initialMeta.description || '');
      setProjAuthor(initialMeta.author || 'PLC Programozó');
      setProjVersion(initialMeta.version || '1.0.0');
      setTargetBoard(initialMeta.targetBoard || 'Arduino Uno');
      setImportFile(null);
      setParsedImportData(null);
      setImportError(null);
      setSuccessNotice(null);
    }
  }, [isOpen, initialMeta.name, initialMeta.description, initialMeta.author, initialMeta.version, initialMeta.targetBoard]);

  if (!isOpen) return null;

  // Build current project data snapshot
  const buildCurrentProjectData = (): ProjectData => {
    const updatedMeta: ProjectMetadata = {
      name: projName.trim() || 'Arduino_PLC_Program',
      description: projDesc.trim(),
      author: projAuthor.trim(),
      version: projVersion.trim(),
      targetBoard,
      savedAt: new Date().toISOString()
    };

    return {
      version: '3.5',
      name: projName.trim() || 'Arduino_PLC_Program',
      metadata: updatedMeta,
      rungs: effectiveRungs,
      setupRungs: effectiveSetupRungs,
      subroutines: effectiveSubroutines,
      customModules: effectiveCustomModules,
      libraries: effectiveLibraries,
      constants: effectiveConstants,
      variables: effectiveVariables,
      arrays: effectiveArrays,
      protocols: effectiveProtocols,
      interrupts: effectiveInterrupts
    };
  };

  // Export JSON file download
  const handleExportJSON = () => {
    const projData = buildCurrentProjectData();
    if (onUpdateMetadata && projData.metadata) {
      onUpdateMetadata(projData.metadata);
    }

    const jsonStr = JSON.stringify(projData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = projName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${safeName}_v${projVersion}_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setSuccessNotice(`A(z) "${link.download}" fájl sikeresen exportálva és letöltve!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Process imported JSON file
  const processJsonFile = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setParsedImportData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // Validation checks
        if (!json.rungs && !json.metadata) {
          throw new Error('A megadott JSON nem érvényes Arduino PLC projektfájl! Hiányzó létrafok adatok.');
        }

        // Backward compatibility if imported file is from older format
        const normalizedData: ProjectData = {
          version: json.version || '3.5',
          name: json.name || json.metadata?.name || file.name.replace(/\.json$/i, ''),
          metadata: json.metadata || {
            name: file.name.replace(/\.json$/i, ''),
            description: 'Importált PLC konfiguráció',
            author: 'Ismeretlen',
            version: '1.0.0',
            targetBoard: 'Arduino Uno',
            savedAt: json.exportedAt || new Date().toISOString()
          },
          rungs: Array.isArray(json.rungs) ? json.rungs : [],
          setupRungs: Array.isArray(json.setupRungs) ? json.setupRungs : [],
          subroutines: Array.isArray(json.subroutines) ? json.subroutines : [],
          customModules: Array.isArray(json.customModules) ? json.customModules : [],
          libraries: Array.isArray(json.libraries) ? json.libraries : [],
          constants: Array.isArray(json.constants) ? json.constants : [],
          variables: Array.isArray(json.variables) ? json.variables : [],
          arrays: Array.isArray(json.arrays) ? json.arrays : [],
          protocols: json.protocols || effectiveProtocols,
          interrupts: json.interrupts || effectiveInterrupts
        };

        setParsedImportData(normalizedData);
      } catch (err: any) {
        setImportError(err.message || 'Hiba történt a JSON fájl feldolgozása közben!');
      }
    };
    reader.onerror = () => {
      setImportError('A fájl beolvasása meghiúsult.');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  };

  // Confirm and Apply Import
  const handleConfirmImport = () => {
    if (!parsedImportData) return;
    handleLoad(parsedImportData);
    const projectName = parsedImportData.metadata?.name || parsedImportData.name || 'Projekt';
    setSuccessNotice(`A(z) "${projectName}" projekt sikeresen betöltve!`);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Save to browser slot
  const handleSaveToSlot = (slotIdx: number) => {
    const projData = buildCurrentProjectData();
    const projTitle = projData.metadata?.name || projData.name || `Projekt ${slotIdx}`;
    const updated = slots.map((s) =>
      s.slotIndex === slotIdx
        ? {
            slotIndex: slotIdx,
            data: projData,
            name: projTitle,
            savedAt: new Date().toLocaleString('hu-HU')
          }
        : s
    );
    setSlots(updated);
    try {
      localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(updated));
      setSuccessNotice(`Projekt elmentve a(z) ${slotIdx}. mentési rekeszbe!`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Load from browser slot
  const handleLoadFromSlot = (slot: LocalSlot) => {
    if (!slot.data) return;
    handleLoad(slot.data);
    const slotTitle = slot.data.metadata?.name || slot.data.name || `${slot.slotIndex}. slot`;
    setSuccessNotice(`A(z) "${slotTitle}" sikeresen betöltve a(z) ${slot.slotIndex}. rekeszből!`);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Clear slot
  const handleClearSlot = (slotIdx: number) => {
    const updated = slots.map((s) => (s.slotIndex === slotIdx ? { slotIndex: slotIdx, data: null } : s));
    setSlots(updated);
    try {
      localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Projekt Mentése & Visszatöltése
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                  JSON & Rekeszek
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Létrasémák, alprogramok, változók, protokollok és megszakítások teljeskörű importálása és exportálása
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Success Notification */}
        {successNotice && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Top Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Projekt Mentése (JSON Export)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Projekt Visszatöltése (JSON Import)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'slots'
                ? 'border-amber-500 text-amber-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>3. Böngésző Mentési Rekeszek (Slots)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900/90">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Project Metadata form */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Projekt Adatlap & Metaadatok
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Projekt Neve
                    </label>
                    <input
                      type="text"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      placeholder="pl. Motor_Vezérlés_HSC"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Programozó / Szerző
                    </label>
                    <input
                      type="text"
                      value={projAuthor}
                      onChange={(e) => setProjAuthor(e.target.value)}
                      placeholder="pl. Nagy János (Automatizálási mérnök)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Projekt Verzió
                    </label>
                    <input
                      type="text"
                      value={projVersion}
                      onChange={(e) => setProjVersion(e.target.value)}
                      placeholder="pl. 1.0.0"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cél Mikrokontroller Hardver
                    </label>
                    <select
                      value={targetBoard}
                      onChange={(e) => setTargetBoard(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                    >
                      <option value="Arduino Uno">Arduino Uno R3 (ATmega328P)</option>
                      <option value="Arduino Nano">Arduino Nano V3 (ATmega328P)</option>
                      <option value="Arduino Mega">Arduino Mega 2560 (ATmega2560)</option>
                      <option value="ESP32">ESP32 DevKit (240MHz Dual-Core)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Projekt Részletes Leírása
                  </label>
                  <textarea
                    rows={2}
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    placeholder="Írd le a vezérlési folyamatot, bekötéseket és célfeladatot..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Project Snapshot Stats */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                  A mentésre kerülő projekt tartalma:
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <Layers className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">{rungs.length} db</div>
                    <div className="text-[10px] text-slate-400">Fő Létrafok</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">{setupRungs.length} db</div>
                    <div className="text-[10px] text-slate-400">Setup Létrafok</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <Cpu className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">{subroutines.length} db</div>
                    <div className="text-[10px] text-slate-400">Alprogram (FC)</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <Activity className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">
                      {variables.length + constants.length} db
                    </div>
                    <div className="text-[10px] text-slate-400">Változó / Reg.</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <Zap className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">
                      {(interrupts.int0.enabled ? 1 : 0) +
                        (interrupts.int1.enabled ? 1 : 0) +
                        (interrupts.timer1.enabled ? 1 : 0)} aktív
                    </div>
                    <div className="text-[10px] text-slate-400">Megszakítás</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <FileCode className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-base font-bold text-slate-200">
                      {libraries.filter((l) => l.enabled).length} db
                    </div>
                    <div className="text-[10px] text-slate-400">Könyvtár</div>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-5 h-5" />
                  <span>Projekt Mentése & Letöltése JSON Fájlként</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  A letöltött JSON fájl bármikor visszatölthető ezen a felületen, vagy megosztható kollégákkal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processJsonFile(file);
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 text-emerald-400" />
                </div>

                <h3 className="text-sm font-bold text-slate-200 mb-1">
                  Húzd ide a projekt JSON fájlt, vagy kattints a tallózáshoz
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Támogatott formátum: <span className="text-emerald-400 font-mono">*.json</span> (korábbi verziók
                  projektjei is automatikusan konvertálódnak)
                </p>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold">Érvénytelen projektfájl: </span>
                    {importError}
                  </div>
                </div>
              )}

              {/* Parsed Preview Card */}
              {parsedImportData && (
                <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-slate-100">
                          {parsedImportData.metadata.name || 'Névtelen Projekt'}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          v{parsedImportData.metadata.version || '1.0'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {parsedImportData.metadata.description || 'Nincs megadva leírás'}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <div>Szerző: {parsedImportData.metadata.author || 'Ismeretlen'}</div>
                      <div>Cél: {parsedImportData.metadata.targetBoard || 'Arduino Uno'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Létrafokok:</span>
                      <span className="font-bold text-slate-200">
                        {parsedImportData.rungs?.length || 0} db fő + {parsedImportData.setupRungs?.length || 0} setup
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Alprogramok:</span>
                      <span className="font-bold text-slate-200">
                        {parsedImportData.subroutines?.length || 0} db
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Változók:</span>
                      <span className="font-bold text-slate-200">
                        {parsedImportData.variables?.length || 0} db
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Megszakítások:</span>
                      <span className="font-bold text-slate-200">
                        {parsedImportData.interrupts ? 'Konfigurálva' : 'Alapértelmezett'}
                      </span>
                    </div>
                  </div>

                  {/* Warning and Confirm Button */}
                  <div className="pt-2">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Figyelem: A visszatöltés jóváhagyásával a jelenlegi munkaterület felülírásra kerül!
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-5 h-5" />
                      <span>Projekt Visszatöltése és Betöltése a Szerkesztőbe</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BROWSER SLOTS */}
          {activeTab === 'slots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> Gyorsmentési Rekeszek a Böngészőben
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ments el vagy tölts vissza projekteket közvetlenül a böngésző helyi tárhelyéről fájlletöltés nélkül.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {slots.map((slot) => {
                  const hasData = !!slot.data;
                  return (
                    <div
                      key={slot.slotIndex}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        hasData
                          ? 'bg-slate-950 border-slate-700/80 hover:border-amber-500/40'
                          : 'bg-slate-950/40 border-slate-800/80 border-dashed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                            hasData
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          #{slot.slotIndex}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-200">
                              {hasData ? slot.name || `Mentett Projekt #${slot.slotIndex}` : `Üres Rekesz #${slot.slotIndex}`}
                            </span>
                            {hasData && (
                              <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                {slot.data?.rungs.length} létrafok
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {hasData ? (
                              <>
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Mentve: {slot.savedAt || 'Ismeretlen időpont'}</span>
                              </>
                            ) : (
                              <span>Nincs elmentett állapot ebben a rekeszben</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleSaveToSlot(slot.slotIndex)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                          title="Aktuális szerkesztett projekt mentése ebbe a slotba"
                        >
                          <Save className="w-3.5 h-3.5 text-sky-400" />
                          <span>Mentés</span>
                        </button>

                        {hasData && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLoadFromSlot(slot)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/40 transition-colors"
                              title="Rekesz tartalmának betöltése a szerkesztőbe"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Visszatöltés</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClearSlot(slot.slotIndex)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Rekesz törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <div>
            Aktív Projekt: <span className="text-slate-200 font-semibold">{projName}</span> (v{projVersion})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
