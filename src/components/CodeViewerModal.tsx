import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, Info, ExternalLink } from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  projectName?: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  isOpen,
  onClose,
  code,
  projectName = 'arduino_plc_sketch'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const codeLines = code.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Generált Arduino C++ Vázlat (.ino)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {codeLines.length} sor | Nem blokkoló 50 Hz PLC scan ciklus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                copied
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Másolva!' : 'Kód Másolása'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Letöltés (.ino)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              A bemenetek belső <code>INPUT_PULLUP</code> ellenállással működnek (gomb lenyomva = GND, aktív logika). Nyisd meg Arduino IDE-ben és töltsd fel az Uno/Nano kártyára!
            </span>
          </div>
          <a
            href="https://www.arduino.cc/en/software"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:underline flex items-center gap-1 shrink-0 ml-4"
          >
            Arduino IDE letöltése <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="p-4 bg-slate-950 overflow-auto flex-1 font-mono text-xs leading-relaxed text-slate-200">
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isComment = line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*');
                const isInclude = line.trim().startsWith('#include');
                const isDefine = line.trim().startsWith('#define');

                let lineClass = 'text-slate-300';
                if (isComment) lineClass = 'text-slate-500 italic';
                else if (isInclude) lineClass = 'text-purple-400 font-semibold';
                else if (isDefine) lineClass = 'text-amber-400';
                else if (line.includes('void setup()') || line.includes('void loop()')) lineClass = 'text-emerald-400 font-bold';

                return (
                  <tr key={lineNum} className="hover:bg-slate-900/60">
                    <td className="pr-4 text-right text-slate-600 select-none w-10 text-[11px] font-mono align-top">
                      {lineNum}
                    </td>
                    <td className={`pl-2 font-mono whitespace-pre ${lineClass}`}>
                      {line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            Kompatibilitás: <strong>Arduino Uno, Nano, Mega, ESP32, ESP8266, STM32 BluePill</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
