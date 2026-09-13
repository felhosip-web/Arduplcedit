import React, { useState } from 'react';
import { ArduinoLibrary, Rung } from '../types';
import { X, BookOpen, Plus, ExternalLink, Check, AlertCircle, Trash2, Cpu, Wrench } from 'lucide-react';

interface LibraryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraries: ArduinoLibrary[];
  onToggleLibrary: (id: string) => void;
  onAddCustomLibrary: (lib: ArduinoLibrary) => void;
  onDeleteCustomLibrary: (id: string) => void;
  rungs: Rung[];
}

export const LibraryManagerModal: React.FC<LibraryManagerModalProps> = ({
  isOpen,
  onClose,
  libraries,
  onToggleLibrary,
  onAddCustomLibrary,
  onDeleteCustomLibrary,
  rungs
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [customName, setCustomName] = useState('');
  const [customHeader, setCustomHeader] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<ArduinoLibrary['category']>('Custom');
  const [customGlobalCode, setCustomGlobalCode] = useState('');
  const [customSetupCode, setCustomSetupCode] = useState('');

  if (!isOpen) return null;

  // Calculate which modules are currently used in the ladder logic
  const usedModuleTypes = new Set<string>();
  rungs.forEach(r => {
    r.branches.forEach(b => b.elements.forEach(e => usedModuleTypes.add(e.type)));
    r.coils.forEach(e => usedModuleTypes.add(e.type));
  });

  // Check missing libraries required by active modules
  const missingLibraries: ArduinoLibrary[] = [];
  libraries.forEach(lib => {
    if (!lib.enabled && lib.requiredByModules) {
      const isNeeded = lib.requiredByModules.some(m => usedModuleTypes.has(m));
      if (isNeeded) missingLibraries.push(lib);
    }
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customHeader) return;

    const newLib: ArduinoLibrary = {
      id: `custom_${Date.now()}`,
      name: customName,
      header: customHeader.startsWith('#include') ? customHeader : `#include <${customHeader}>`,
      description: customDesc || 'Egyéni felhasználói Arduino könyvtár.',
      category: customCategory,
      enabled: true,
      isCustom: true,
      globalCode: customGlobalCode,
      setupCode: customSetupCode
    };

    onAddCustomLibrary(newLib);
    setCustomName('');
    setCustomHeader('');
    setCustomDesc('');
    setCustomGlobalCode('');
    setCustomSetupCode('');
    setShowAddForm(false);
  };

  const categories = ['all', 'Actuators', 'Displays', 'Sensors', 'Lighting', 'Motors', 'Communication', 'Custom'];

  const filteredLibs = libraries.filter(l => filterCategory === 'all' || l.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Arduino Könyvtárkezelő (Library Manager)
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700 font-mono">
                  {libraries.filter(l => l.enabled).length} aktív
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kezeld az Arduino C++ könyvtárakat, kapcsold be a hardver modulok függőségeit, vagy adj hozzá egyénit.
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

        {/* Warning if ladder logic uses modules without enabled libraries */}
        {missingLibraries.length > 0 && (
          <div className="px-6 py-3 bg-amber-950/40 border-b border-amber-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Figyelem: A létradiagram olyan modulokat tartalmaz, amelyekhez szükséges könyvtár még nincs bekapcsolva:
                <strong className="ml-1 text-amber-200">{missingLibraries.map(l => l.name).join(', ')}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => missingLibraries.forEach(l => onToggleLibrary(l.id))}
              className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md shadow transition-colors shrink-0"
            >
              Bekapcsolás most
            </button>
          </div>
        )}

        {/* Categories Bar & Add Button */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                  filterCategory === cat
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'Összes' : cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Mégse' : 'Új Könyvtár'}
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Add Custom Library Form */}
          {showAddForm && (
            <form onSubmit={handleCreateCustom} className="p-4 bg-slate-950 border border-sky-500/40 rounded-xl space-y-3 mb-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Egyéni Arduino Könyvtár Regisztrálása
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Könyvtár Megnevezése</label>
                  <input
                    type="text"
                    required
                    placeholder="pl. MyCustomSensor"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Include Fejléc (C++)</label>
                  <input
                    type="text"
                    required
                    placeholder="pl. #include <MyCustomSensor.h>"
                    value={customHeader}
                    onChange={(e) => setCustomHeader(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Kategória</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ArduinoLibrary['category'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="Custom">Custom / Egyéni</option>
                    <option value="Sensors">Sensors / Érzékelők</option>
                    <option value="Actuators">Actuators / Aktuátorok</option>
                    <option value="Displays">Displays / Kijelzők</option>
                    <option value="Lighting">Lighting / Világítás</option>
                    <option value="Motors">Motors / Motorok</option>
                    <option value="Communication">Communication / Kommunikáció</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Rövid Leírás</label>
                  <input
                    type="text"
                    placeholder="pl. Saját I2C szenzor illesztőkönyvtár"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Globális Definíciók / Objektumpéldány</label>
                  <textarea
                    rows={2}
                    placeholder="pl. MySensor sensor(0x42);"
                    value={customGlobalCode}
                    onChange={(e) => setCustomGlobalCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Setup() Inicializálás Kód</label>
                  <textarea
                    rows={2}
                    placeholder="pl. sensor.begin();"
                    value={customSetupCode}
                    onChange={(e) => setCustomSetupCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow"
                >
                  Hozzáadás & Aktiválás
                </button>
              </div>
            </form>
          )}

          {/* Library Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLibs.map((lib) => {
              const isRequiredByLadder = lib.requiredByModules?.some(m => usedModuleTypes.has(m));

              return (
                <div
                  key={lib.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    lib.enabled
                      ? 'bg-slate-800/80 border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.1)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg text-xs font-mono font-bold ${
                          lib.enabled ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100 text-sm">{lib.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                            {lib.category}
                          </span>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleLibrary(lib.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          lib.enabled ? 'bg-sky-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            lib.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {lib.description}
                    </p>

                    {/* Header code block */}
                    <div className="mt-2.5 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] text-sky-300">
                      {lib.header}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      {isRequiredByLadder && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Használatban a létrában
                        </span>
                      )}
                      {lib.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Egyéni könyvtár
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {lib.officialUrl && (
                        <a
                          href={lib.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-sky-400 flex items-center gap-1 text-[11px] transition-colors"
                        >
                          Dokumentáció <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {lib.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomLibrary(lib.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-xs text-slate-400">
          <div>
            Az aktív könyvtárak automatikusan bekerülnek a generált <code>.ino</code> kód <code>#include</code> soraiba és inicializáló függvényeibe.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Kész
          </button>
        </div>
      </div>
    </div>
  );
};
