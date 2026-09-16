import React, { useState } from 'react';
import { PLCConstant, PLCVariable, PLCArray } from '../../types';
import {
  Variable,
  Hash,
  Database,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  Layers,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface DataManagerProps {
  constants: PLCConstant[];
  onAddConstant: (c: PLCConstant) => void;
  onUpdateConstant: (c: PLCConstant) => void;
  onDeleteConstant: (id: string) => void;

  variables: PLCVariable[];
  onAddVariable: (v: PLCVariable) => void;
  onUpdateVariable: (v: PLCVariable) => void;
  onDeleteVariable: (id: string) => void;

  arrays: PLCArray[];
  onAddArray: (a: PLCArray) => void;
  onUpdateArray: (a: PLCArray) => void;
  onDeleteArray: (id: string) => void;
}

export const DataManager: React.FC<DataManagerProps> = ({
  constants,
  onAddConstant,
  onUpdateConstant,
  onDeleteConstant,

  variables,
  onAddVariable,
  onUpdateVariable,
  onDeleteVariable,

  arrays,
  onAddArray,
  onUpdateArray,
  onDeleteArray
}) => {
  const [subTab, setSubTab] = useState<'all' | 'constants' | 'variables' | 'arrays'>('all');

  // Modal State for Constant
  const [constModalOpen, setConstModalOpen] = useState(false);
  const [editingConstId, setEditingConstId] = useState<string | null>(null);
  const [constName, setConstName] = useState('');
  const [constType, setConstType] = useState<PLCConstant['type']>('int');
  const [constValue, setConstValue] = useState<string>('0');
  const [constDesc, setConstDesc] = useState('');

  // Modal State for Variable
  const [varModalOpen, setVarModalOpen] = useState(false);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [varName, setVarName] = useState('');
  const [varType, setVarType] = useState<PLCVariable['type']>('int');
  const [varInitialVal, setVarInitialVal] = useState<string>('0');
  const [varIsRetentive, setVarIsRetentive] = useState(false);
  const [varDesc, setVarDesc] = useState('');

  // Modal State for Array
  const [arrModalOpen, setArrModalOpen] = useState(false);
  const [editingArrId, setEditingArrId] = useState<string | null>(null);
  const [arrName, setArrName] = useState('');
  const [arrElementType, setArrElementType] = useState<'int' | 'float' | 'bool' | 'uint16_t'>('int');
  const [arrSize, setArrSize] = useState<number>(4);
  const [arrValuesStr, setArrValuesStr] = useState<string>('0, 0, 0, 0');
  const [arrDesc, setArrDesc] = useState('');

  // --- Handlers: Constant ---
  const handleOpenNewConst = () => {
    setEditingConstId(null);
    setConstName('MAX_LIMIT');
    setConstType('int');
    setConstValue('100');
    setConstDesc('Új PLC konstans határérték');
    setConstModalOpen(true);
  };

  const handleOpenEditConst = (c: PLCConstant) => {
    setEditingConstId(c.id);
    setConstName(c.name);
    setConstType(c.type);
    setConstValue(String(c.value));
    setConstDesc(c.description || '');
    setConstModalOpen(true);
  };

  const handleSaveConst = (e: React.FormEvent) => {
    e.preventDefault();
    if (!constName.trim()) return;

    let parsedVal: number | boolean | string = constValue;
    if (constType === 'int' || constType === 'uint16_t' || constType === 'unsigned long') {
      parsedVal = parseInt(constValue, 10) || 0;
    } else if (constType === 'float') {
      parsedVal = parseFloat(constValue) || 0.0;
    } else if (constType === 'bool') {
      parsedVal = constValue.toLowerCase() === 'true' || constValue === '1';
    }

    if (editingConstId) {
      onUpdateConstant({
        id: editingConstId,
        name: constName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        type: constType,
        value: parsedVal,
        description: constDesc
      });
    } else {
      onAddConstant({
        id: `const_${Date.now()}`,
        name: constName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        type: constType,
        value: parsedVal,
        description: constDesc
      });
    }
    setConstModalOpen(false);
  };

  // --- Handlers: Variable ---
  const handleOpenNewVar = () => {
    setEditingVarId(null);

    // Auto-increment logic for 'M' variables (Memory flags)
    let nextIndex = 0;
    variables.forEach(v => {
      const match = v.name.match(/^M(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx >= nextIndex) {
          nextIndex = idx + 1;
        }
      }
    });

    setVarName(`M${nextIndex}`);
    setVarType('bool');
    setVarInitialVal('false');
    setVarIsRetentive(false);
    setVarDesc('Új folyamatváltozó / Belső jelző (Flag)');
    setVarModalOpen(true);
  };

  const handleOpenEditVar = (v: PLCVariable) => {
    setEditingVarId(v.id);
    setVarName(v.name);
    setVarType(v.type);
    setVarInitialVal(String(v.initialValue));
    setVarIsRetentive(!!v.isRetentive);
    setVarDesc(v.description || '');
    setVarModalOpen(true);
  };

  const handleSaveVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim()) return;

    let parsedVal: number | boolean | string = varInitialVal;
    if (varType === 'int' || varType === 'uint16_t' || varType === 'int32_t') {
      parsedVal = parseInt(varInitialVal, 10) || 0;
    } else if (varType === 'float') {
      parsedVal = parseFloat(varInitialVal) || 0.0;
    } else if (varType === 'bool') {
      parsedVal = varInitialVal.toLowerCase() === 'true' || varInitialVal === '1';
    }

    const formattedName = varName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Collision check: prevent duplicate variable or constant names
    const isDuplicate = variables.some(v => v.name === formattedName && v.id !== editingVarId) ||
                        constants.some(c => c.name === formattedName);

    if (isDuplicate) {
      alert(`Hiba: A(z) ${formattedName} név már foglalt egy másik változó vagy konstans által! Kérjük, válasszon egyedit.`);
      return;
    }

    if (editingVarId) {
      onUpdateVariable({
        id: editingVarId,
        name: formattedName,
        type: varType,
        initialValue: parsedVal,
        isRetentive: varIsRetentive,
        description: varDesc
      });
    } else {
      onAddVariable({
        id: `var_${Date.now()}`,
        name: formattedName,
        type: varType,
        initialValue: parsedVal,
        isRetentive: varIsRetentive,
        description: varDesc
      });
    }
    setVarModalOpen(false);
  };

  // --- Handlers: Array ---
  const handleOpenNewArr = () => {
    setEditingArrId(null);
    setArrName('RECIPE_BUFF');
    setArrElementType('int');
    setArrSize(4);
    setArrValuesStr('10, 20, 30, 40');
    setArrDesc('Adatsorozat vagy tárolt profil pontok');
    setArrModalOpen(true);
  };

  const handleOpenEditArr = (a: PLCArray) => {
    setEditingArrId(a.id);
    setArrName(a.name);
    setArrElementType(a.elementType);
    setArrSize(a.size);
    setArrValuesStr(a.values.join(', '));
    setArrDesc(a.description || '');
    setArrModalOpen(true);
  };

  const handleSaveArr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrName.trim()) return;

    const rawTokens = arrValuesStr.split(',').map((t) => t.trim());
    const parsedValues: (number | boolean | string)[] = [];

    for (let i = 0; i < arrSize; i++) {
      const tok = rawTokens[i] || '0';
      if (arrElementType === 'float') {
        parsedValues.push(parseFloat(tok) || 0.0);
      } else if (arrElementType === 'bool') {
        parsedValues.push(tok.toLowerCase() === 'true' || tok === '1');
      } else {
        parsedValues.push(parseInt(tok, 10) || 0);
      }
    }

    if (editingArrId) {
      onUpdateArray({
        id: editingArrId,
        name: arrName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        elementType: arrElementType,
        size: arrSize,
        values: parsedValues,
        description: arrDesc
      });
    } else {
      onAddArray({
        id: `arr_${Date.now()}`,
        name: arrName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        elementType: arrElementType,
        size: arrSize,
        values: parsedValues,
        description: arrDesc
      });
    }
    setArrModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top filter tabs & Add buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSubTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              subTab === 'all' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minden Adattípus ({constants.length + variables.length + arrays.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('constants')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold ${
              subTab === 'constants' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Konstansok ({constants.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('variables')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold ${
              subTab === 'variables' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Variable className="w-3.5 h-3.5" /> Változók ({variables.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('arrays')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold ${
              subTab === 'arrays' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Tömbök ({arrays.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewConst}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1 border border-slate-700 hover:border-sky-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Új Konstans
          </button>
          <button
            type="button"
            onClick={handleOpenNewVar}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700 hover:border-amber-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Új Változó
          </button>
          <button
            type="button"
            onClick={handleOpenNewArr}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold flex items-center gap-1 border border-slate-700 hover:border-purple-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Új Tömb
          </button>
        </div>
      </div>

      {/* 1. CONSTANTS SECTION */}
      {(subTab === 'all' || subTab === 'constants') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  PLC Konstansok (Fixed Definitions & Limits)
                </h3>
                <p className="text-xs text-slate-400">
                  Fordítási időben meghatározott fix határértékek és paraméterek (C++ const / #define).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenNewConst}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Hozzáadás
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Konstans Név</th>
                  <th className="py-2.5 px-3">Típus</th>
                  <th className="py-2.5 px-3">Érték</th>
                  <th className="py-2.5 px-3">Leírás</th>
                  <th className="py-2.5 px-3 text-right">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {constants.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 group transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-300">{c.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{c.type}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{String(c.value)}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">{c.description || '—'}</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditConst(c)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded transition-colors"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteConstant(c.id)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {constants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      Nincsenek definiált konstansok. Kattints az 'Új Konstans' gombra!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. VARIABLES SECTION */}
      {(subTab === 'all' || subTab === 'variables') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Variable className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  PLC Folyamat Változók (Process Variables & Registers)
                </h3>
                <p className="text-xs text-slate-400">
                  Dinamikus változók, számlálók és állapotregiszterek. Az EEPROM védelemmel ellátott változók áramkimaradáskor sem vesznek el!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenNewVar}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Hozzáadás
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Változó Név</th>
                  <th className="py-2.5 px-3">Adattípus</th>
                  <th className="py-2.5 px-3">Kezdőérték</th>
                  <th className="py-2.5 px-3">Perzisztencia (EEPROM)</th>
                  <th className="py-2.5 px-3">Leírás</th>
                  <th className="py-2.5 px-3 text-right">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {variables.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 group transition-colors">
                    <td className="py-2.5 px-3 font-bold text-amber-300 flex items-center gap-2">
                      {v.name}
                      {v.isSystem && (
                        <span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/30 flex items-center gap-1" title="Rendszerváltozó (írásvédett)">
                          <Shield className="w-3 h-3" /> SM
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{v.type}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{String(v.initialValue)}</td>
                    <td className="py-2.5 px-3">
                      {v.isRetentive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-sans font-semibold">
                          <Shield className="w-3 h-3" /> EEPROM Retentive
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-sans">RAM Csak</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">{v.description || '—'}</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditVar(v)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!v.isSystem && (
                        <button
                          type="button"
                          onClick={() => onDeleteVariable(v.id)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {variables.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      Nincsenek definiált változók. Kattints az 'Új Változó' gombra!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ARRAYS SECTION */}
      {(subTab === 'all' || subTab === 'arrays') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  PLC Tömbök & Puffer Rekordok (Array Buffers & Recipes)
                </h3>
                <p className="text-xs text-slate-400">
                  Indexelt tömbök többállomásos receptek, időzítési sorozatok és zónastátuszok tárolására.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenNewArr}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Hozzáadás
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {arrays.map((a) => (
              <div
                key={a.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-purple-500/60 rounded-xl p-4 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-300 text-sm">{a.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-400 border border-slate-800">
                      [{a.size}] {a.elementType}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditArr(a)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-400 rounded"
                      title="Szerkesztés"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteArray(a.id)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded"
                      title="Törlés"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3 font-sans leading-relaxed">
                  {a.description || 'PLC indexelt adatmező'}
                </p>

                {/* Values Badges */}
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {a.values.map((v, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 rounded flex items-center gap-1.5"
                    >
                      <span className="text-slate-500 text-[10px]">[{idx}]</span>
                      <span className="text-emerald-400 font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {arrays.length === 0 && (
              <div className="col-span-2 py-6 text-center text-slate-500 font-sans">
                Nincsenek definiált tömbök. Kattints az 'Új Tömb' gombra!
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: Add/Edit Constant --- */}
      {constModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-sky-400" />
                <span>{editingConstId ? 'Konstans Módosítása' : 'Új PLC Konstans Hozzáadása'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setConstModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveConst} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Konstans Név (Azonosító)</label>
                <input
                  type="text"
                  required
                  value={constName}
                  onChange={(e) => setConstName(e.target.value)}
                  placeholder="pl. MAX_TEMP vagy TANK_CAPACITY"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sky-300 font-mono text-xs uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Adattípus</label>
                  <select
                    value={constType}
                    onChange={(e) => setConstType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  >
                    <option value="int">int (16-bit)</option>
                    <option value="float">float (Lebegőpontos)</option>
                    <option value="bool">bool (Logikai)</option>
                    <option value="unsigned long">unsigned long (Időhöz)</option>
                    <option value="uint16_t">uint16_t</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Érték</label>
                  <input
                    type="text"
                    required
                    value={constValue}
                    onChange={(e) => setConstValue(e.target.value)}
                    placeholder="pl. 65 vagy 115200"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Rendeltetés / Leírás</label>
                <input
                  type="text"
                  value={constDesc}
                  onChange={(e) => setConstDesc(e.target.value)}
                  placeholder="pl. Túlmelegedési lekapcsolás küszöbértéke"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConstModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add/Edit Variable --- */}
      {varModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Variable className="w-4 h-4 text-amber-400" />
                <span>{editingVarId ? 'Változó Módosítása' : 'Új Folyamatváltozó Létrehozása'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setVarModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVar} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Változó Név (Identifier)</label>
                <input
                  type="text"
                  required
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  placeholder="pl. V_BATCH_COUNT vagy V_TEMP_C"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono text-xs uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Adattípus</label>
                  <select
                    value={varType}
                    onChange={(e) => setVarType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  >
                    <option value="int">int (Egész szám)</option>
                    <option value="float">float (Lebegőpontos)</option>
                    <option value="bool">bool (Logikai)</option>
                    <option value="uint16_t">uint16_t (Pozitív)</option>
                    <option value="int32_t">int32_t (Nagy egész)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Kezdőérték</label>
                  <input
                    type="text"
                    required
                    value={varInitialVal}
                    onChange={(e) => setVarInitialVal(e.target.value)}
                    placeholder="pl. 0 vagy 24.5 vagy true"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono text-xs"
                  />
                </div>
              </div>

              {/* EEPROM Retentive Checkbox */}
              <label className="flex items-center gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg cursor-pointer hover:border-amber-500/50">
                <input
                  type="checkbox"
                  checked={varIsRetentive}
                  onChange={(e) => setVarIsRetentive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    EEPROM Mentés (Retentive változó, Maradó D-regiszter)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Áramszünet esetén a legutóbbi érték elmentődik az Arduino belső EEPROM-jába, és újrainduláskor visszatöltődik.
                  </p>
                </div>
              </label>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Leírás</label>
                <input
                  type="text"
                  value={varDesc}
                  onChange={(e) => setVarDesc(e.target.value)}
                  placeholder="pl. Munkadarab számláló vagy mért hőszenzor"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setVarModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add/Edit Array --- */}
      {arrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>{editingArrId ? 'Tömb Módosítása' : 'Új PLC Adattömb Létrehozása'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setArrModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveArr} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Tömb Név (Azonosító)</label>
                <input
                  type="text"
                  required
                  value={arrName}
                  onChange={(e) => setArrName(e.target.value)}
                  placeholder="pl. RECIPE_STEPS vagy SETPOINTS"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-purple-300 font-mono text-xs uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Elem Típus</label>
                  <select
                    value={arrElementType}
                    onChange={(e) => setArrElementType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  >
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="bool">bool</option>
                    <option value="uint16_t">uint16_t</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Elemek Száma (Méret)</label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    required
                    value={arrSize}
                    onChange={(e) => setArrSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Kezdő Értékek (Vesszővel elválasztva)</label>
                <input
                  type="text"
                  required
                  value={arrValuesStr}
                  onChange={(e) => setArrValuesStr(e.target.value)}
                  placeholder="pl. 10, 20, 30, 40"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Leírás</label>
                <input
                  type="text"
                  value={arrDesc}
                  onChange={(e) => setArrDesc(e.target.value)}
                  placeholder="pl. Adagolási szintek recept értékei"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setArrModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold"
                >
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
