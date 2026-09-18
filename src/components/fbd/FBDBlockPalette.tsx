import React from 'react';
import { Plus } from 'lucide-react';
import { FBDBlock } from '../../types';

interface FBDBlockPaletteProps {
  onAddBlock: (type: string) => void;
}

const BLOCKS = [
  { type: 'INPUT', label: 'Input Node', desc: 'Reads a variable' },
  { type: 'OUTPUT', label: 'Output Node', desc: 'Writes to a variable' },
  { type: 'AND', label: 'AND Gate', desc: 'Logical AND' },
  { type: 'OR', label: 'OR Gate', desc: 'Logical OR' },
  { type: 'XOR', label: 'XOR Gate', desc: 'Logical Exclusive OR' },
  { type: 'NOT', label: 'NOT Gate', desc: 'Logical Invert' },
  { type: 'RS', label: 'RS Latch', desc: 'Reset-Dominant Flip-Flop' },
  { type: 'SR', label: 'SR Latch', desc: 'Set-Dominant Flip-Flop' },
];

export const FBDBlockPalette: React.FC<FBDBlockPaletteProps> = ({ onAddBlock }) => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-800 font-bold text-slate-200">
        FBD Blocks
      </div>
      <div className="p-2 space-y-2">
        {BLOCKS.map(b => (
          <div
            key={b.type}
            className="p-3 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:bg-slate-700 hover:border-slate-500 transition-colors group"
            onClick={() => onAddBlock(b.type)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-300 group-hover:text-white">{b.type}</span>
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
            </div>
            <div className="text-xs text-slate-500 group-hover:text-slate-400">
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
