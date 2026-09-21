import React, { useState } from 'react';
import { Rung } from '../../types';
import { X, Save, Sparkles, Layers } from 'lucide-react';

interface SaveMacroModalProps {
  isOpen: boolean;
  selectedRungs: Rung[];
  onClose: () => void;
  onSave: (name: string, category: string, description: string) => void;
}

export const SaveMacroModal: React.FC<SaveMacroModalProps> = ({
  isOpen,
  selectedRungs,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), category, description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">
                Létramakró Mentése
              </h3>
              <p className="text-xs text-slate-400">
                {selectedRungs.length} kijelölt fok mentése egyedi sablonként
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Makró Neve
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Dupla Szivattyú Váltó Készlet"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Kategória
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-sm"
            >
              <option value="custom">Egyedi (Custom)</option>
              <option value="motor">Motor & Meghajtás</option>
              <option value="safety">Biztonsági Körök</option>
              <option value="analog">Szabályzók & Analóg</option>
              <option value="sequencer">Számlálók & Ciklus</option>
              <option value="diagnostics">Ütemadók & Diagnosztika</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Leírás (Opcionális)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Rövid leírás az áramkör funkciójáról..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Rung Summary Box */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Mentendő Létrafokok ({selectedRungs.length}):</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto space-y-1">
              {selectedRungs.map((r) => (
                <div key={r.id} className="truncate">
                  #{r.number}: {r.comment || 'Nincs megjegyzés'}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Mentés Makróként
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
