import React, { useState, useEffect } from 'react';
import { StateMachine, StateMachineState, StateMachineTransition, PLCVariable } from '../../types';
import { X, Plus, Trash2, Edit2, Save, Play, Tag, Network } from 'lucide-react';
import { renderVariableOptions } from '../ElementInspectorModal';

interface StateMachineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stateMachine: StateMachine | null; // null if creating a new one
  variables: PLCVariable[];
  onSave: (sm: StateMachine) => void;
}

export const StateMachineEditorModal: React.FC<StateMachineEditorModalProps> = ({
  isOpen,
  onClose,
  stateMachine,
  variables,
  onSave
}) => {
  const [smId, setSmId] = useState('');
  const [smName, setSmName] = useState('');
  const [states, setStates] = useState<StateMachineState[]>([]);
  const [transitions, setTransitions] = useState<StateMachineTransition[]>([]);

  // Local UI state for adding new items
  const [newStateName, setNewStateName] = useState('');

  const [newTransFrom, setNewTransFrom] = useState('');
  const [newTransTo, setNewTransTo] = useState('');
  const [newTransCond, setNewTransCond] = useState('');
  const [newTransLabel, setNewTransLabel] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (stateMachine) {
        setSmId(stateMachine.id);
        setSmName(stateMachine.name);
        setStates([...stateMachine.states]);
        setTransitions([...stateMachine.transitions]);
      } else {
        setSmId(`sm_${Date.now()}`);
        setSmName('New State Machine');
        setStates([{ id: `st_${Date.now()}_init`, name: 'INIT', isInitial: true }]);
        setTransitions([]);
      }
      setNewStateName('');
      setNewTransFrom('');
      setNewTransTo('');
      setNewTransCond('');
      setNewTransLabel('');
    }
  }, [isOpen, stateMachine]);

  if (!isOpen) return null;

  const handleAddState = () => {
    if (!newStateName.trim()) return;
    const isFirst = states.length === 0;
    setStates([
      ...states,
      { id: `st_${Date.now()}_${Math.random().toString(36).substring(2,6)}`, name: newStateName.trim(), isInitial: isFirst }
    ]);
    setNewStateName('');
  };

  const handleDeleteState = (id: string) => {
    setStates(states.filter(s => s.id !== id));
    // Also cleanup transitions
    setTransitions(transitions.filter(t => t.fromStateId !== id && t.toStateId !== id));
  };

  const handleSetInitialState = (id: string) => {
    setStates(states.map(s => ({ ...s, isInitial: s.id === id })));
  };

  const handleAddTransition = () => {
    if (!newTransFrom || !newTransTo) return;
    setTransitions([
      ...transitions,
      {
        id: `tr_${Date.now()}`,
        fromStateId: newTransFrom,
        toStateId: newTransTo,
        conditionVariable: newTransCond || undefined,
        label: newTransLabel || undefined
      }
    ]);
    setNewTransFrom('');
    setNewTransTo('');
    setNewTransCond('');
    setNewTransLabel('');
  };

  const handleDeleteTransition = (id: string) => {
    setTransitions(transitions.filter(t => t.id !== id));
  };

  const handleSave = () => {
    if (!smName.trim()) {
      alert('Kérjük add meg az állapotgép nevét!');
      return;
    }
    if (states.length === 0) {
      alert('Legalább egy állapot (State) kötelező!');
      return;
    }
    if (!states.some(s => s.isInitial)) {
       // Ensure at least one is initial
       states[0].isInitial = true;
    }

    onSave({
      id: smId,
      name: smName.trim(),
      states,
      transitions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">
              {stateMachine ? 'Állapotgép Szerkesztése (SFC)' : 'Új Állapotgép (SFC)'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* General Config */}
          <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Állapotgép Neve</label>
            <input
              type="text"
              value={smName}
              onChange={(e) => setSmName(e.target.value)}
              placeholder="pl. Fő Ciklus, Kemence Vezérlés"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* States List */}
            <div className="space-y-4 border-r border-slate-800 pr-0 md:pr-6">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Tag className="w-4 h-4" /> Állapotok (States)
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddState()}
                  placeholder="Új állapot neve..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
                />
                <button
                  onClick={handleAddState}
                  disabled={!newStateName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {states.map(s => (
                  <div key={s.id} className={`flex items-center justify-between p-2 rounded border ${s.isInitial ? 'bg-indigo-900/30 border-indigo-700' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSetInitialState(s.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${s.isInitial ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600 text-slate-600 hover:border-indigo-400 hover:text-indigo-400'}`}
                        title="Beállítás Kezdő Állapotnak"
                      >
                        {s.isInitial && <Play className="w-3 h-3 fill-current" />}
                      </button>
                      <span className="font-bold text-sm text-slate-200">{s.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteState(s.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {states.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Nincsenek állapotok.</p>
                )}
              </div>
            </div>

            {/* Transitions List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Network className="w-4 h-4" /> Átmenetek (Transitions)
              </h3>

              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Honnan (From)</label>
                    <select
                      value={newTransFrom}
                      onChange={(e) => setNewTransFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">-- Válassz --</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Hová (To)</label>
                    <select
                      value={newTransTo}
                      onChange={(e) => setNewTransTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">-- Válassz --</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Feltétel Változó (Condition)</label>
                  <select
                    value={newTransCond}
                    onChange={(e) => setNewTransCond(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    <option value="">(Mindig / Automatikus feltétel)</option>
                    {renderVariableOptions(variables, true)}
                  </select>
                </div>

                <button
                  onClick={handleAddTransition}
                  disabled={!newTransFrom || !newTransTo}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Átmenet Hozzáadása
                </button>
              </div>

              <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                {transitions.map(t => {
                  const fromS = states.find(s => s.id === t.fromStateId);
                  const toS = states.find(s => s.id === t.toStateId);
                  return (
                    <div key={t.id} className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                          <span className="text-indigo-300">{fromS?.name || '?'}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-indigo-300">{toS?.name || '?'}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteTransition(t.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {t.conditionVariable && (
                        <div className="text-xs font-mono text-amber-400 bg-slate-950 px-2 py-1 rounded w-fit border border-amber-900/50">
                          IF {t.conditionVariable}
                        </div>
                      )}
                    </div>
                  );
                })}
                {transitions.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Nincsenek átmenetek definiálva.</p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >
            Mégsem
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> Mentés
          </button>
        </div>
      </div>
    </div>
  );
};
