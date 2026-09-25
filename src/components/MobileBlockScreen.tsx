import React from 'react';
import { Monitor, Cpu, ArrowRight, Laptop } from 'lucide-react';

interface MobileBlockScreenProps {
  onBypass?: () => void;
}

export const MobileBlockScreen: React.FC<MobileBlockScreenProps> = ({ onBypass }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 text-center flex flex-col items-center">
        {/* Top Icon Badge */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-xl shadow-sky-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Monitor className="w-8 h-8 text-sky-400" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-indigo-600 border-2 border-slate-900 flex items-center justify-center shadow-md">
            <Cpu className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 tracking-tight">
          Asztali nézet szükséges
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-4">
          Arduino PLC Ladder Studio
        </p>

        {/* Body Description */}
        <div className="space-y-3 text-slate-300 text-sm leading-relaxed mb-6">
          <p>
            Az alkalmazás <strong className="text-slate-100 font-semibold">asztali böngészőre</strong> (nagyobb képernyő, egér és billentyűzet) van optimalizálva. Mobilon a létraszerkesztő és a szimulátor nem használható kényelmesen.
          </p>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2.5 justify-center">
            <Laptop className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Nyisd meg számítógépen vagy tableten fekvő, széles nézetben.</span>
          </div>
        </div>

        {/* Optional Bypass Action */}
        {onBypass && (
          <button
            type="button"
            onClick={onBypass}
            className="group w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Mégis megnyitom (kísérleti nézet)</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        )}
      </div>
    </div>
  );
};
