import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Task, Program, ProgramType } from '../../types';
import { Plus, Trash2, Edit2, Play, Circle, Zap } from 'lucide-react';

export function TaskManager() {
  const { history, setTasks, activeProgramId, setActiveProgramId } = useStore();
  const tasks = history.present.tasks || [];

  const [editingTask, setEditingTask] = useState<string | null>(null);

  const handleAddTask = () => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      name: `Új feladat ${tasks.length + 1}`,
      type: 'cyclic',
      intervalMs: 100,
      priority: 10,
      programs: []
    };
    setTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleAddProgram = (taskId: string, type: ProgramType) => {
    const newProg: Program = {
      id: `prog_${Date.now()}`,
      name: `Új ${type === 'ladder' ? 'Létra' : 'FBD'} program`,
      type,
      rungs: type === 'ladder' ? [] : undefined,
      fbd: type === 'fbd' ? { blocks: [], connections: [] } : undefined
    };

    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, programs: [...t.programs, newProg] };
      }
      return t;
    }));
  };

  const handleDeleteProgram = (taskId: string, progId: string) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, programs: t.programs.filter(p => p.id !== progId) };
      }
      return t;
    }));
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          Feladat- és Programkezelő
        </h2>
        <button
          onClick={handleAddTask}
          className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Új Feladat
        </button>
      </div>

      <div className="p-4 space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="border border-slate-600 rounded-md bg-slate-800/50">
            <div className="flex justify-between items-center p-3 border-b border-slate-600 bg-slate-700/50">
              {editingTask === task.id ? (
                <div className="flex space-x-2 flex-1 mr-4">
                  <input
                    type="text"
                    value={task.name}
                    onChange={e => handleUpdateTask(task.id, { name: e.target.value })}
                    className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-600 flex-1"
                  />
                  <select
                    value={task.type}
                    onChange={e => handleUpdateTask(task.id, { type: e.target.value as any })}
                    className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-600"
                  >
                    <option value="cyclic">Ciklikus</option>
                    <option value="continuous">Folyamatos</option>
                  </select>
                  {task.type === 'cyclic' && (
                    <input
                      type="number"
                      value={task.intervalMs}
                      onChange={e => handleUpdateTask(task.id, { intervalMs: Number(e.target.value) })}
                      className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-600 w-24"
                    />
                  )}
                  <button onClick={() => setEditingTask(null)} className="px-3 py-1 bg-green-600 rounded text-white text-sm">Mentés</button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-white">{task.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-600 text-slate-200">
                    {task.type === 'cyclic' ? 'Ciklikus' : 'Folyamatos'} {task.type === 'cyclic' ? `(${task.intervalMs}ms)` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button onClick={() => setEditingTask(task.id)} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-slate-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <div className="space-y-2 mb-3">
                {task.programs.map(prog => (
                  <div
                    key={prog.id}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer border ${activeProgramId === prog.id ? 'border-blue-500 bg-blue-900/30' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
                    onClick={() => setActiveProgramId(prog.id)}
                  >
                    <div className="flex items-center">
                      <span className="text-slate-300 mr-2">{prog.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                        {prog.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProgram(task.id, prog.id); }}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <button onClick={() => handleAddProgram(task.id, 'ladder')} className="text-xs flex items-center px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded">
                  <Plus className="w-3 h-3 mr-1" /> Új Létra
                </button>
                <button onClick={() => handleAddProgram(task.id, 'fbd')} className="text-xs flex items-center px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded">
                  <Plus className="w-3 h-3 mr-1" /> Új FBD
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
