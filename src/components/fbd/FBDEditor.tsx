import React from 'react';
import { FBDDiagram, FBDBlock, PLCVariable, SimulationState } from '../../types';
import { FBDBlockPalette } from './FBDBlockPalette';
import { FBDCanvas } from './FBDCanvas';

interface FBDEditorProps {
  variables?: PLCVariable[];
  fbd?: FBDDiagram;
  simulationState?: SimulationState;
  onUpdateFBD: (fbd: FBDDiagram) => void;
}

export const FBDEditor: React.FC<FBDEditorProps> = ({ fbd, variables, simulationState, onUpdateFBD }) => {
  const handleAddBlock = (type: string) => {
    const currentFbd = fbd || { blocks: [], connections: [] };

    // Simple staggering for new blocks
    const count = currentFbd.blocks.length;
    const x = 50 + (count % 5) * 20;
    const y = 50 + (count % 5) * 20;

    const newBlock: FBDBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
      type,
      x,
      y
    };

    onUpdateFBD({
      ...currentFbd,
      blocks: [...currentFbd.blocks, newBlock]
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <FBDBlockPalette onAddBlock={handleAddBlock} />
      <FBDCanvas fbd={fbd} variables={variables} simulationState={simulationState} onUpdateFBD={onUpdateFBD} />
    </div>
  );
};
