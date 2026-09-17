import React, { useState } from 'react';
import {
  Subroutine,
  SubroutineParam,
  CustomModuleTemplate,
  ArduinoLibrary,
  ElementType,
  ElementCategory,
  PLCConstant,
  PLCVariable, StateMachine,
  PLCArray,
  ProtocolConfigs,
  InterruptsConfig
} from '../types';
import {
  Layers,
  Box,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ArrowRight,
  Sliders,
  Check,
  X,
  Code,
  Sparkles,
  Cpu,
  FileCode,
  Radio,
  Zap,
  Clock,
  Variable,
  Network, Tag
} from 'lucide-react';
import { StateMachineEditorModal } from '../components/modals/StateMachineEditorModal';
import { DataManager } from '../components/management/DataManager';
import { ProtocolsManager } from '../components/management/ProtocolsManager';
import { InterruptsManager } from '../components/management/InterruptsManager';
import { TaskManager } from '../components/management/TaskManager';
import { useStore } from '../store/useStore';

interface ManagementViewProps {
  subroutines: Subroutine[];
  onAddSubroutine: (sub: Subroutine) => void;
  onUpdateSubroutine: (sub: Subroutine) => void;
  onDeleteSubroutine: (id: string) => void;
  onDuplicateSubroutine: (id: string) => void;
  onEditSubroutineInLadder: (subId: string) => void;
  onInsertSubroutineToMain: (sub: Subroutine) => void;

  customModules: CustomModuleTemplate[];
  onAddCustomModule: (mod: CustomModuleTemplate) => void;
  onUpdateCustomModule: (mod: CustomModuleTemplate) => void;
  onDeleteCustomModule: (id: string) => void;

  libraries: ArduinoLibrary[];
  onToggleLibrary: (id: string) => void;
  onAddLibrary: (lib: ArduinoLibrary) => void;
  onDeleteLibrary: (id: string) => void;

  constants: PLCConstant[];
  onAddConstant: (c: PLCConstant) => void;
  onUpdateConstant: (c: PLCConstant) => void;
  onDeleteConstant: (id: string) => void;

  variables: PLCVariable[];
  stateMachines: StateMachine[];
  onUpdateStateMachines: (sms: StateMachine[]) => void;
  onAddVariable: (v: PLCVariable) => void;
  onUpdateVariable: (v: PLCVariable) => void;
  onDeleteVariable: (id: string) => void;

  arrays: PLCArray[];
  onAddArray: (a: PLCArray) => void;
  onUpdateArray: (a: PLCArray) => void;
  onDeleteArray: (id: string) => void;

  protocols: ProtocolConfigs;
  onUpdateProtocols: (protocols: ProtocolConfigs) => void;

  interrupts: InterruptsConfig;
  onUpdateInterrupts: (config: InterruptsConfig) => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  subroutines,
  onAddSubroutine,
  onUpdateSubroutine,
  onDeleteSubroutine,
  onDuplicateSubroutine,
  onEditSubroutineInLadder,
  onInsertSubroutineToMain,

  customModules,
  onAddCustomModule,
  onUpdateCustomModule,
  onDeleteCustomModule,

  libraries,
  onToggleLibrary,
  onAddLibrary,
  onDeleteLibrary,

  constants,
  onAddConstant,
  onUpdateConstant,
  onDeleteConstant,

  variables,
  stateMachines,
  onUpdateStateMachines,
  onAddVariable,
  onUpdateVariable,
  onDeleteVariable,

  arrays,
  onAddArray,
  onUpdateArray,
  onDeleteArray,

  protocols,
  onUpdateProtocols,

  interrupts,
  onUpdateInterrupts
}) => {
  const [isSmModalOpen, setIsSmModalOpen] = useState(false);
  const handleSaveSm = (sm: StateMachine) => {
    const existing = stateMachines.find(s => s.id === sm.id);
    if (existing) {
      onUpdateStateMachines(stateMachines.map(s => s.id === sm.id ? sm : s));
    } else {
      onUpdateStateMachines([...stateMachines, sm]);
    }
  };
  const handleDeleteSm = (id: string) => {
    onUpdateStateMachines(stateMachines.filter(s => s.id !== id));
  };
  const [editingSm, setEditingSm] = useState<StateMachine | null>(null);

  const [activeTab, setActiveTab] = useState<'tasks' | 'subroutines' | 'modules' | 'data' | 'protocols' | 'interrupts' | 'libraries' | 'statemachines' | 'settings'>('tasks');

  const { actionLogs, featureFlags, toggleFeatureFlag, clearActionLogs } = useStore();

  // Subroutine Modal/Editor state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [subCodeId, setSubCodeId] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subInputs, setSubInputs] = useState<SubroutineParam[]>([
    { id: 'p_in_1', name: 'IN_START', type: 'BOOL_IN', defaultPinOrVar: 'D2', description: 'Indító bemenet' }
  ]);
  const [subOutputs, setSubOutputs] = useState<SubroutineParam[]>([
    { id: 'p_out_1', name: 'OUT_RUN', type: 'BOOL_OUT', defaultPinOrVar: 'D8', description: 'Kimeneti vezérlés' }
  ]);

  // Module Modal/Editor state
  const [modModalOpen, setModModalOpen] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [modName, setModName] = useState('');
  const [modSymbol, setModSymbol] = useState('—[ ]—');
  const [modCategory, setModCategory] = useState<ElementCategory>('contact');
  const [modType, setModType] = useState<ElementType>('NO_CONTACT');
  const [modDesc, setModDesc] = useState('');
  const [modPin, setModPin] = useState('D2');
  const [modVar, setModVar] = useState('');
  const [modCppCall, setModCppCall] = useState('');

  // Library Modal state
  const [libModalOpen, setLibModalOpen] = useState(false);
  const [libName, setLibName] = useState('');
  const [libInclude, setLibInclude] = useState('');
  const [libDesc, setLibDesc] = useState('');
  const [libSetup, setLibSetup] = useState('');

  // Open Subroutine Creator
  const handleOpenNewSubroutine = () => {
    setEditingSubId(null);
    setSubName('');
    setSubCodeId(`FC${subroutines.length + 1}_CustomBlock`);
    setSubDesc('');
    setSubInputs([
      { id: `inp_${Date.now()}_1`, name: 'IN_SIGNAL', type: 'BOOL_IN', defaultPinOrVar: 'D2', description: 'Feltétel bemenet' }
    ]);
    setSubOutputs([
      { id: `out_${Date.now()}_1`, name: 'OUT_CMD', type: 'BOOL_OUT', defaultPinOrVar: 'D8', description: 'Beavatkozó kimenet' }
    ]);
    setSubModalOpen(true);
  };

  // Open Subroutine Editor
  const handleOpenEditSubroutine = (sub: Subroutine) => {
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubCodeId(sub.codeIdentifier);
    setSubDesc(sub.description);
    setSubInputs([...sub.inputs]);
    setSubOutputs([...sub.outputs]);
    setSubModalOpen(true);
  };

  // Save Subroutine
  const handleSaveSubroutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    if (editingSubId) {
      const existing = subroutines.find((s) => s.id === editingSubId);
      if (existing) {
        onUpdateSubroutine({
          ...existing,
          name: subName,
          codeIdentifier: subCodeId.replace(/\s+/g, '_') || `FC_${Date.now()}`,
          description: subDesc,
          inputs: subInputs,
          outputs: subOutputs
        });
      }
    } else {
      const newSub: Subroutine = {
        id: `sub_${Date.now()}`,
        name: subName,
        codeIdentifier: subCodeId.replace(/\s+/g, '_') || `FC_${Date.now()}`,
        description: subDesc || 'Egyedi létradiagram alprogram',
        inputs: subInputs,
        outputs: subOutputs,
        rungs: [
          {
            id: `sub_init_r_${Date.now()}`,
            number: 0,
            comment: 'Alprogram 1. logikai lépése',
            branches: [
              {
                id: `sub_b_${Date.now()}`,
                elements: [
                  {
                    id: `sub_el_${Date.now()}`,
                    type: 'NO_CONTACT',
                    category: 'contact',
                    name: subInputs[0]?.name || 'IN_SIGNAL',
                    variable: subInputs[0]?.name || 'IN_SIGNAL'
                  }
                ]
              }
            ],
            coils: [
              {
                id: `sub_c_${Date.now()}`,
                type: 'COIL_NORMAL',
                category: 'coil',
                name: subOutputs[0]?.name || 'OUT_CMD',
                variable: subOutputs[0]?.name || 'OUT_CMD'
              }
            ]
          }
        ],
        createdAt: Date.now()
      };
      onAddSubroutine(newSub);
    }
    setSubModalOpen(false);
  };

  // Subroutine param helpers
  const handleAddInputParam = () => {
    setSubInputs([
      ...subInputs,
      {
        id: `inp_${Date.now()}_${subInputs.length + 1}`,
        name: `IN_${subInputs.length + 1}`,
        type: 'BOOL_IN',
        defaultPinOrVar: `D${subInputs.length + 2}`,
        description: 'Digitális bemenet'
      }
    ]);
  };

  const handleAddOutputParam = () => {
    setSubOutputs([
      ...subOutputs,
      {
        id: `out_${Date.now()}_${subOutputs.length + 1}`,
        name: `OUT_${subOutputs.length + 1}`,
        type: 'BOOL_OUT',
        defaultPinOrVar: `D${8 + subOutputs.length}`,
        description: 'Digitális kimenet'
      }
    ]);
  };

  // Open Module Creator
  const handleOpenNewModule = () => {
    setEditingModId(null);
    setModName('');
    setModSymbol('—[ ]—');
    setModCategory('contact');
    setModType('NO_CONTACT');
    setModDesc('');
    setModPin('D2');
    setModVar('');
    setModCppCall('');
    setModModalOpen(true);
  };

  // Open Module Editor
  const handleOpenEditModule = (mod: CustomModuleTemplate) => {
    setEditingModId(mod.id);
    setModName(mod.name);
    setModSymbol(mod.symbol);
    setModCategory(mod.category);
    setModType(mod.type);
    setModDesc(mod.description);
    setModPin(mod.defaultPin || 'D2');
    setModVar(mod.defaultVariable || '');
    setModCppCall(mod.customCppCall || '');
    setModModalOpen(true);
  };

  // Save Module
  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) return;

    if (editingModId) {
      const existing = customModules.find((m) => m.id === editingModId);
      if (existing) {
        onUpdateCustomModule({
          ...existing,
          name: modName,
          symbol: modSymbol,
          category: modCategory,
          type: modType,
          description: modDesc,
          defaultPin: modPin,
          defaultVariable: modVar,
          customCppCall: modCppCall
        });
      }
    } else {
      const newMod: CustomModuleTemplate = {
        id: `mod_cust_${Date.now()}`,
        name: modName,
        symbol: modSymbol || '[MOD]',
        category: modCategory,
        type: modType || 'CUSTOM_MODULE',
        description: modDesc || 'Egyéni felhasználói modul',
        defaultPin: modPin,
        defaultVariable: modVar,
        customCppCall: modCppCall,
        isBuiltIn: false
      };
      onAddCustomModule(newMod);
    }
    setModModalOpen(false);
  };

  // Save Custom Library
  const handleSaveLibrary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libName.trim() || !libInclude.trim()) return;

    const newLib: ArduinoLibrary = {
      id: `lib_${Date.now()}`,
      name: libName,
      header: libInclude.startsWith('#include') ? libInclude : `#include <${libInclude}>`,
      category: 'Custom',
      description: libDesc || 'Felhasználó által hozzáadott Arduino könyvtár',
      enabled: true,
      isCustom: true,
      setupCode: libSetup
    };
    onAddLibrary(newLib);
    setLibModalOpen(false);
    setLibName('');
    setLibInclude('');
    setLibDesc('');
    setLibSetup('');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Menedzsment Központ
              </h2>
              <p className="text-xs text-slate-400">
                Egyedi alprogramok (Subroutines / FC), behúzható modulok és Arduino könyvtárak teljes körű kezelése.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button for current tab */}
        <div>
          {activeTab === 'subroutines' && (
            <button
              type="button"
              onClick={handleOpenNewSubroutine}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Új Alprogram Létrehozása
            </button>
          )}

          {activeTab === 'modules' && (
            <button
              type="button"
              onClick={handleOpenNewModule}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Új Modul / Elem Hozzáadása
            </button>
          )}

          {activeTab === 'libraries' && (
            <button
              type="button"
              onClick={() => setLibModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Új C++ Könyvtár Adása
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-yellow-500 text-yellow-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Task Manager</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subroutines')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'subroutines'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Egyedi Alprogramok (Function Blocks)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
            {subroutines.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('modules')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'modules'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Modulok & Elemek ({customModules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'data'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Variable className="w-4 h-4" />
          <span>Konstansok & Változók</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-mono">
            {constants.length + variables.length + arrays.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('protocols')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'protocols'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Protokollok (Dallas, I2C, SPI, UART)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('interrupts')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'interrupts'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Megszakítások (Interrupts & HSC)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-mono">
            {(interrupts?.int0?.enabled ? 1 : 0) +
              (interrupts?.int1?.enabled ? 1 : 0) +
              (interrupts?.timer1?.enabled ? 1 : 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('libraries')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'libraries'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Arduino Könyvtárak ({libraries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('statemachines')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'statemachines'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Állapotgépek (SFC)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-fuchsia-500 text-fuchsia-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Beállítások & Napló</span>
        </button>
      </div>

      {activeTab === 'tasks' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <TaskManager />
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TAB: SUBROUTINES */}
      {/* ======================================================== */}
      {activeTab === 'subroutines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>
              Az alprogramok olyan önálló létradiagram modulok, amelyeket egyszer készítesz el ladderban, és tetszőlegesen többször meghívhatsz a főprogramból más-más bemeneti/kimeneti lábakkal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subroutines.map((sub) => (
              <div
                key={sub.id}
                className="bg-slate-900 border border-indigo-900/60 hover:border-indigo-500 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">{sub.name}</h3>
                        <span className="font-mono text-[11px] text-indigo-400 font-semibold">
                          {sub.codeIdentifier}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {sub.rungs.length} létrafok
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {sub.description}
                  </p>

                  {/* Parameters specs */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs font-mono mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        Bemenetek:
                      </div>
                      <div className="space-y-0.5 text-slate-300 text-[11px]">
                        {sub.inputs.map((inp) => (
                          <div key={inp.id} className="truncate" title={inp.description}>
                            • <strong className="text-emerald-300">{inp.name}</strong> ({inp.defaultPinOrVar})
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                        Kimenetek:
                      </div>
                      <div className="space-y-0.5 text-slate-300 text-[11px]">
                        {sub.outputs.map((outp) => (
                          <div key={outp.id} className="truncate" title={outp.description}>
                            • <strong className="text-amber-300">{outp.name}</strong> ({outp.defaultPinOrVar})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {/* Open in Ladder Editor */}
                    <button
                      type="button"
                      onClick={() => onEditSubroutineInLadder(sub.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Szerkesztés Létrában
                    </button>

                    {/* Insert into main ladder */}
                    <button
                      type="button"
                      onClick={() => onInsertSubroutineToMain(sub)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 text-xs font-bold flex items-center gap-1.5 border border-emerald-600/40 transition-all"
                      title="Beszúrja a főprogram aktív fokába"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      + Főprogramba
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit metadata */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditSubroutine(sub)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Adatok és paraméterek módosítása"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => onDuplicateSubroutine(sub.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Alprogram másolása"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDeleteSubroutine(sub.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 transition-colors"
                      title="Alprogram törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB: CUSTOM MODULES */}
      {/* ======================================================== */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>
              Itt kezelheted a létra palettán megjelenő modulokat. Bármelyik beépített vagy egyéni modult módosíthatod, új hardverelemeket vehetsz fel, és a saját igényeid szerint szabhatod a palettát.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {customModules.map((mod) => (
              <div
                key={mod.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  !mod.isBuiltIn
                    ? 'bg-sky-950/20 border-sky-800 hover:border-sky-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {mod.symbol}
                      </span>
                      <h4 className="font-bold text-slate-200 text-xs">{mod.name}</h4>
                    </div>

                    {!mod.isBuiltIn && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                        EGYEDI
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {mod.description}
                  </p>

                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 mb-3">
                    <div className="flex justify-between">
                      <span>Kategória:</span>
                      <span className="text-slate-300">{mod.category}</span>
                    </div>
                    {mod.defaultPin && (
                      <div className="flex justify-between">
                        <span>Alapértelmezett Pin:</span>
                        <span className="text-sky-400 font-bold">{mod.defaultPin}</span>
                      </div>
                    )}
                    {mod.libraryName && (
                      <div className="flex justify-between">
                        <span>Könyvtár:</span>
                        <span className="text-cyan-400 font-bold">{mod.libraryName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModule(mod)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Módosítás
                  </button>

                  {!mod.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomModule(mod.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 transition-colors"
                      title="Egyedi modul törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB: ARDUINO LIBRARIES */}
      {/* ======================================================== */}
      {activeTab === 'libraries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>
              A rendszer automatikusan észleli és integrálja a C++ könyvtárakat az Arduino vázlatba (#include, setup, deklarációk). Itt manuálisan is hozzáadhatsz külső könyvtárakat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {libraries.map((lib) => (
              <div
                key={lib.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 text-sm">{lib.name}</h3>
                    <code className="text-xs font-mono text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {lib.header}
                    </code>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">{lib.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLibrary(lib.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      lib.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {lib.enabled ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}
                  </button>

                  {lib.isCustom && (
                    <button
                      type="button"
                      onClick={() => onDeleteLibrary(lib.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Könyvtár törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB: DATA (CONSTANTS, VARIABLES, ARRAYS) */}
      {/* ======================================================== */}
      {activeTab === 'data' && (
        <DataManager
          constants={constants}
          onAddConstant={onAddConstant}
          onUpdateConstant={onUpdateConstant}
          onDeleteConstant={onDeleteConstant}
          variables={variables}
          onAddVariable={onAddVariable}
          onUpdateVariable={onUpdateVariable}
          onDeleteVariable={onDeleteVariable}
          arrays={arrays}
          onAddArray={onAddArray}
          onUpdateArray={onUpdateArray}
          onDeleteArray={onDeleteArray}
        />
      )}

      {/* ======================================================== */}
      {/* 5. TAB: PROTOCOLS (DALLAS, I2C, SPI, UART) */}
      {/* ======================================================== */}
      {activeTab === 'protocols' && (
        <ProtocolsManager
          protocols={protocols}
          onUpdateProtocols={onUpdateProtocols}
        />
      )}

      {/* ======================================================== */}
      {/* 6. TAB: INTERRUPTS (INT0, INT1, TIMER1) */}
      {/* ======================================================== */}
      {activeTab === 'interrupts' && (
        <InterruptsManager
          interrupts={interrupts}
          onUpdateInterrupts={onUpdateInterrupts}
          variables={variables}
          onUpdateVariable={onUpdateVariable}
          subroutines={subroutines}
        />
      )}

      {/* ======================================================== */}
      {/* 7. TAB: SETTINGS & ACTION LOG */}
      {/* ======================================================== */}
      {activeTab === 'statemachines' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                Állapotgépek (SFC-Lite)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Szekvenciális folyamatirányítás állapotgépekkel (State Machine).
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSm(null);
                setIsSmModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Új Állapotgép
            </button>
          </div>

          {stateMachines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateMachines.map((sm) => (
                <div key={sm.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col gap-3 group transition-colors hover:border-indigo-500/50">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-indigo-300 text-sm">{sm.name}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingSm(sm); setIsSmModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteSm(sm.id)} className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-700"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {sm.states.length} Állapot</div>
                    <div className="flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> {sm.transitions.length} Átmenet</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-sm italic text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
              Még nem hoztál létre állapotgépet (SFC).
            </div>
          )}
        </div>
      )}

      {isSmModalOpen && (
        <StateMachineEditorModal
          isOpen={isSmModalOpen}
          onClose={() => { setIsSmModalOpen(false); setEditingSm(null); }}
          stateMachine={editingSm}
          variables={variables}
          onSave={handleSaveSm}
        />
      )}

      {/* ======================================================== */}
      {/* 7. TAB: SETTINGS & ACTION LOG */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Flags */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-fuchsia-400" />
                Feature Flags (Fejlesztői beállítások)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kísérleti funkciók be- és kikapcsolása a szerkesztőben.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg cursor-pointer hover:border-fuchsia-500/50 transition-colors">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Kísérleti Blokkok Engedélyezése</span>
                  <span className="text-xs text-slate-400">Új, még tesztelés alatt álló PLC funkcióblokkok (pl. AI predikció).</span>
                </div>
                <input
                  type="checkbox"
                  checked={featureFlags.enableExperimentalBlocks}
                  onChange={() => toggleFeatureFlag('enableExperimentalBlocks')}
                  className="w-4 h-4 rounded text-fuchsia-500 accent-fuchsia-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg cursor-pointer hover:border-fuchsia-500/50 transition-colors">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Felhő Szinkronizáció</span>
                  <span className="text-xs text-slate-400">Projektek mentése külső adatbázisba (előkészületben).</span>
                </div>
                <input
                  type="checkbox"
                  checked={featureFlags.enableCloudSync}
                  onChange={() => toggleFeatureFlag('enableCloudSync')}
                  className="w-4 h-4 rounded text-fuchsia-500 accent-fuchsia-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg cursor-pointer hover:border-fuchsia-500/50 transition-colors">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Haladó Diagnosztika</span>
                  <span className="text-xs text-slate-400">Részletes profiler és oszcilloszkóp a szimulátorban.</span>
                </div>
                <input
                  type="checkbox"
                  checked={featureFlags.enableAdvancedDiagnostics}
                  onChange={() => toggleFeatureFlag('enableAdvancedDiagnostics')}
                  className="w-4 h-4 rounded text-fuchsia-500 accent-fuchsia-500"
                />
              </label>
            </div>
          </div>

          {/* Action Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  Eseménynapló (Action Log)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Fejlesztői napló: felhasználói akciók és domén műveletek listája.
                </p>
              </div>
              <button
                onClick={clearActionLogs}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ürítés
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {actionLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">A napló üres.</div>
              ) : (
                actionLogs.map(log => (
                  <div key={log.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-800/50">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono break-all">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBROUTINE CREATOR / EDITOR */}
      {/* ======================================================== */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-base">
                  {editingSubId ? 'Alprogram Módosítása' : 'Új Egyedi Alprogram (Function Block)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubroutine} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alprogram Neve</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="pl. Motor Öntartó és Retesz"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">C++ Függvény Azonosító (FC)</label>
                <input
                  type="text"
                  value={subCodeId}
                  onChange={(e) => setSubCodeId(e.target.value)}
                  placeholder="pl. FC_MotorLatch"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-indigo-300 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Leírás & Funkció</label>
                <textarea
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  rows={2}
                  placeholder="Mire szolgál ez az alprogram..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Input params */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">
                    Bemeneti Paraméterek (Inputs)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddInputParam}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Bemenet hozzáadása
                  </button>
                </div>

                {subInputs.map((inp, idx) => (
                  <div key={inp.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      value={inp.name}
                      onChange={(e) => {
                        const copy = [...subInputs];
                        copy[idx].name = e.target.value.toUpperCase();
                        setSubInputs(copy);
                      }}
                      className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-emerald-300 uppercase"
                      placeholder="IN_NAME"
                    />
                    <input
                      type="text"
                      value={inp.defaultPinOrVar || ''}
                      onChange={(e) => {
                        const copy = [...subInputs];
                        copy[idx].defaultPinOrVar = e.target.value;
                        setSubInputs(copy);
                      }}
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 text-center"
                      placeholder="D2"
                    />
                    <input
                      type="text"
                      value={inp.description || ''}
                      onChange={(e) => {
                        const copy = [...subInputs];
                        copy[idx].description = e.target.value;
                        setSubInputs(copy);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      placeholder="Leírás"
                    />
                    {subInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubInputs(subInputs.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Output params */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    Kimeneti Paraméterek (Outputs)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOutputParam}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Kimenet hozzáadása
                  </button>
                </div>

                {subOutputs.map((outp, idx) => (
                  <div key={outp.id} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      value={outp.name}
                      onChange={(e) => {
                        const copy = [...subOutputs];
                        copy[idx].name = e.target.value.toUpperCase();
                        setSubOutputs(copy);
                      }}
                      className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-amber-300 uppercase"
                      placeholder="OUT_NAME"
                    />
                    <input
                      type="text"
                      value={outp.defaultPinOrVar || ''}
                      onChange={(e) => {
                        const copy = [...subOutputs];
                        copy[idx].defaultPinOrVar = e.target.value;
                        setSubOutputs(copy);
                      }}
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 text-center"
                      placeholder="D8"
                    />
                    <input
                      type="text"
                      value={outp.description || ''}
                      onChange={(e) => {
                        const copy = [...subOutputs];
                        copy[idx].description = e.target.value;
                        setSubOutputs(copy);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      placeholder="Leírás"
                    />
                    {subOutputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubOutputs(subOutputs.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Mentés & Létra Létrehozása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CUSTOM MODULE CREATOR / EDITOR */}
      {/* ======================================================== */}
      {modModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-base">
                  {editingModId ? 'Modul Módosítása' : 'Új Modul / Elem Regisztrálása'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modul Neve</label>
                <input
                  type="text"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  placeholder="pl. Mágnesszelep Nyitó vagy Lézersorompó"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategória</label>
                  <select
                    value={modCategory}
                    onChange={(e) => setModCategory(e.target.value as ElementCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="contact">Érintkező (Contact)</option>
                    <option value="coil">Tekercs / Kimenet (Coil)</option>
                    <option value="timer">Időzítő (Timer)</option>
                    <option value="counter">Számláló (Counter)</option>
                    <option value="library_module">Könyvtári Modul</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Szimbólum</label>
                  <input
                    type="text"
                    value={modSymbol}
                    onChange={(e) => setModSymbol(e.target.value)}
                    placeholder="pl. —[ ]— vagy [VALVE]"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sky-300 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alapértelmezett Pin</label>
                  <input
                    type="text"
                    value={modPin}
                    onChange={(e) => setModPin(e.target.value)}
                    placeholder="D2 vagy D8"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Változó / Marker</label>
                  <input
                    type="text"
                    value={modVar}
                    onChange={(e) => setModVar(e.target.value)}
                    placeholder="pl. M0 vagy SENSOR"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Leírás</label>
                <textarea
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                  rows={2}
                  placeholder="A modul működésének leírása..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Egyéni C++ Hívás Minta (Opcionális)</label>
                <input
                  type="text"
                  value={modCppCall}
                  onChange={(e) => setModCppCall(e.target.value)}
                  placeholder="pl. mySensor.read() vagy customActuator.trigger()"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/30"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CUSTOM ARDUINO LIBRARY ADDER */}
      {/* ======================================================== */}
      {libModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Új Arduino Könyvtár Csatolása</h3>
              </div>
              <button
                type="button"
                onClick={() => setLibModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLibrary} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Könyvtár Neve</label>
                <input
                  type="text"
                  value={libName}
                  onChange={(e) => setLibName(e.target.value)}
                  placeholder="pl. ModbusMaster vagy FastLED"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Include Fejléc</label>
                <input
                  type="text"
                  value={libInclude}
                  onChange={(e) => setLibInclude(e.target.value)}
                  placeholder="pl. #include <ModbusMaster.h>"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Leírás</label>
                <input
                  type="text"
                  value={libDesc}
                  onChange={(e) => setLibDesc(e.target.value)}
                  placeholder="Mire szolgál a könyvtár..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">setup() Inicializáló Kód (Opcionális)</label>
                <textarea
                  value={libSetup}
                  onChange={(e) => setLibSetup(e.target.value)}
                  rows={2}
                  placeholder="pl. node.begin(1, Serial1);"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLibModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Könyvtár Hozzáadása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
