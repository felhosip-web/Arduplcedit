import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { FBDBlock, FBDConnection, FBDDiagram, PLCVariable } from '../../types';

interface FBDCanvasProps {
  fbd?: FBDDiagram;
  variables?: PLCVariable[];
  onUpdateFBD: (fbd: FBDDiagram) => void;
}

export const FBDCanvas: React.FC<FBDCanvasProps> = ({ fbd, variables = [], onUpdateFBD }) => {
  const blocks = fbd?.blocks || [];
  const connections = fbd?.connections || [];

  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());

  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // For drawing new connections
  const [connectingFrom, setConnectingFrom] = useState<{ blockId: string, pin: string, type: 'input' | 'output' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if we are typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.size > 0 || selectedConnectionIds.size > 0) {
          const newBlocks = blocks.filter(b => !selectedBlockIds.has(b.id));
          const newConnections = connections.filter(c =>
            !selectedConnectionIds.has(c.id) &&
            !selectedBlockIds.has(c.sourceBlockId) &&
            !selectedBlockIds.has(c.targetBlockId)
          );
          onUpdateFBD({ blocks: newBlocks, connections: newConnections });
          setSelectedBlockIds(new Set());
          setSelectedConnectionIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, connections, selectedBlockIds, selectedConnectionIds, onUpdateFBD]);

  const handleBlockMouseDown = (e: MouseEvent, block: FBDBlock) => {
    e.stopPropagation();
    if (!e.shiftKey) {
      setSelectedBlockIds(new Set([block.id]));
      setSelectedConnectionIds(new Set());
    } else {
      const newSel = new Set(selectedBlockIds);
      if (newSel.has(block.id)) newSel.delete(block.id);
      else newSel.add(block.id);
      setSelectedBlockIds(newSel);
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setDragOffset({ x: clickX - block.x, y: clickY - block.y });
      setDraggingBlockId(block.id);
      setDragPos({ x: block.x, y: block.y });
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });

      if (draggingBlockId) {
        setDragPos({ x: x - dragOffset.x, y: y - dragOffset.y });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingBlockId) {
      const newBlocks = blocks.map(b =>
        b.id === draggingBlockId ? { ...b, x: dragPos.x, y: dragPos.y } : b
      );
      onUpdateFBD({ blocks: newBlocks, connections });
      setDraggingBlockId(null);
    }
  };

  const handleCanvasClick = () => {
    setSelectedBlockIds(new Set());
    setSelectedConnectionIds(new Set());
    setConnectingFrom(null);
  };

  const handlePinClick = (e: MouseEvent, blockId: string, pin: string, type: 'input' | 'output') => {
    e.stopPropagation();
    if (!connectingFrom) {
      setConnectingFrom({ blockId, pin, type });
    } else {
      // Create connection if types are different (input to output or output to input)
      if (connectingFrom.type !== type && connectingFrom.blockId !== blockId) {
        const source = connectingFrom.type === 'output' ? connectingFrom : { blockId, pin, type };
        const target = connectingFrom.type === 'input' ? connectingFrom : { blockId, pin, type };

        const newConn: FBDConnection = {
          id: `conn_${Date.now()}`,
          sourceBlockId: source.blockId,
          sourcePin: source.pin,
          targetBlockId: target.blockId,
          targetPin: target.pin
        };
        onUpdateFBD({ blocks, connections: [...connections, newConn] });
      }
      setConnectingFrom(null);
    }
  };

  const handleConnectionClick = (e: MouseEvent, connId: string) => {
    e.stopPropagation();
    setSelectedConnectionIds(new Set([connId]));
    setSelectedBlockIds(new Set());
  };

  const updateBlockVariable = (blockId: string, variableName: string) => {
    const newBlocks = blocks.map(b =>
      b.id === blockId
        ? { ...b, properties: { ...b.properties, variable: variableName } }
        : b
    );
    onUpdateFBD({ blocks: newBlocks, connections });
  };

  const getPinCoords = (blockId: string, pin: string, type: 'input' | 'output') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return { x: 0, y: 0 };

    const bx = draggingBlockId === blockId ? dragPos.x : block.x;
    const by = draggingBlockId === blockId ? dragPos.y : block.y;

    const width = 120;
    const pinYOffset = 30;

    const isInput = type === 'input';
    const x = bx + (isInput ? 0 : width);

    let y = by + pinYOffset;

    if (block.type === 'AND' || block.type === 'OR') {
       if (pin === 'in1') y = by + 20;
       if (pin === 'in2') y = by + 60;
       if (pin === 'out') y = by + 40;
    } else {
       y = by + 40;
    }

    return { x, y };
  };

  const createPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const dx = end.x - start.x;
    return `M ${start.x} ${start.y} C ${start.x + dx/2} ${start.y}, ${end.x - dx/2} ${end.y}, ${end.x} ${end.y}`;
  };

  const renderBlock = (block: FBDBlock) => {
    const isSelected = selectedBlockIds.has(block.id);
    let inputs = ['in1', 'in2'];
    let outputs = ['out'];

    if (block.type === 'NOT') {
      inputs = ['in'];
    } else if (block.type === 'INPUT') {
      inputs = [];
    } else if (block.type === 'OUTPUT') {
      outputs = [];
    }

    const isIOSupport = block.type === 'INPUT' || block.type === 'OUTPUT';
    const boundVar = block.properties?.variable;

    const bx = draggingBlockId === block.id ? dragPos.x : block.x;
    const by = draggingBlockId === block.id ? dragPos.y : block.y;

    return (
      <div
        key={block.id}
        onMouseDown={(e) => handleBlockMouseDown(e, block)}
        className={`absolute w-[120px] bg-slate-800 border rounded shadow-md select-none cursor-move
          ${isSelected ? 'border-sky-500 shadow-sky-500/20 z-20' : 'border-slate-600 z-10'}
        `}
        style={{ left: bx, top: by }}
      >
        <div className="bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300 text-center border-b border-slate-700 rounded-t flex flex-col">
          <span>{block.type}</span>
          {isIOSupport && boundVar && (
            <span className="text-[10px] text-sky-400 font-normal truncate overflow-hidden max-w-full" title={boundVar}>
              {boundVar}
            </span>
          )}
        </div>
        <div className="p-2 flex justify-between text-xs text-slate-400 min-h-[60px]">
          <div className="flex flex-col gap-2 justify-center">
            {inputs.map(pin => (
              <div key={pin} className="flex items-center gap-1 -ml-3">
                <div
                  className={`w-3 h-3 rounded-full border border-slate-500 bg-slate-900 cursor-pointer hover:bg-sky-400
                    ${connectingFrom?.blockId === block.id && connectingFrom.pin === pin ? 'bg-sky-500 scale-125' : ''}
                  `}
                  onClick={(e) => handlePinClick(e, block.id, pin, 'input')}
                />
                <span>{pin}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 justify-center">
            {outputs.map(pin => (
              <div key={pin} className="flex items-center gap-1 -mr-3">
                <span>{pin}</span>
                <div
                  className={`w-3 h-3 rounded-full border border-slate-500 bg-slate-900 cursor-pointer hover:bg-sky-400
                     ${connectingFrom?.blockId === block.id && connectingFrom.pin === pin ? 'bg-sky-500 scale-125' : ''}
                  `}
                  onClick={(e) => handlePinClick(e, block.id, pin, 'output')}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Find single selected IO block for property panel
  const singleSelectedBlockId = selectedBlockIds.size === 1 ? Array.from(selectedBlockIds)[0] : null;
  const singleSelectedBlock = singleSelectedBlockId ? blocks.find(b => b.id === singleSelectedBlockId) : null;
  const showPropertyPanel = singleSelectedBlock && (singleSelectedBlock.type === 'INPUT' || singleSelectedBlock.type === 'OUTPUT');

  return (
    <div
      className="flex-1 relative bg-slate-950 overflow-hidden"
      ref={canvasRef}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10"
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* SVG Connections Layer */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
        {connections.map(conn => {
          const start = getPinCoords(conn.sourceBlockId, conn.sourcePin, 'output');
          const end = getPinCoords(conn.targetBlockId, conn.targetPin, 'input');
          const isSelected = selectedConnectionIds.has(conn.id);
          return (
            <path
              key={conn.id}
              d={createPath(start, end)}
              fill="none"
              stroke={isSelected ? '#0ea5e9' : '#64748b'}
              strokeWidth={isSelected ? 3 : 2}
              className="pointer-events-auto cursor-pointer hover:stroke-sky-400 transition-colors"
              onClick={(e: any) => handleConnectionClick(e, conn.id)}
            />
          );
        })}
        {/* Drawing new connection */}
        {connectingFrom && (
          <path
            d={createPath(getPinCoords(connectingFrom.blockId, connectingFrom.pin, connectingFrom.type), mousePos)}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="4"
          />
        )}
      </svg>

      {/* HTML Blocks Layer */}
      {blocks.map(renderBlock)}

      {/* Property Panel for INPUT/OUTPUT */}
      {showPropertyPanel && singleSelectedBlock && (
        <div
          className="absolute right-4 top-4 bg-slate-800 border border-slate-600 rounded shadow-lg p-3 w-64 z-30"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-sm font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-1">
            {singleSelectedBlock.type} Properties
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Variable / Address</label>
            <input
              type="text"
              list="fbd-variables"
              value={singleSelectedBlock.properties?.variable || ''}
              onChange={(e) => updateBlockVariable(singleSelectedBlock.id, e.target.value)}
              placeholder="E.g. I0, Q0, MyVar"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <datalist id="fbd-variables">
              {variables.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.address})</option>
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
};
