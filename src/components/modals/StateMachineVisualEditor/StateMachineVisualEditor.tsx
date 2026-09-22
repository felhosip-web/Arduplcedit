import React, { useRef, useState, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { StateMachineState, StateMachineTransition, StateMachineCondition } from '../../../types';
import { Play } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface VisualEditorProps {
  states: StateMachineState[];
  transitions: StateMachineTransition[];
  onUpdateStatePosition: (id: string, x: number, y: number) => void;
  onSelectState?: (id: string) => void;
  onSelectTransition?: (id: string) => void;
  activeStateId?: string;
  isSimulating?: boolean;
}

const STATE_WIDTH = 120;
const STATE_HEIGHT = 60;
const GRID_SIZE = 20;

export const StateMachineVisualEditor: React.FC<VisualEditorProps> = ({
  states,
  transitions,
  onUpdateStatePosition,
  onSelectState,
  onSelectTransition,
  activeStateId,
  isSimulating
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingStateId, setDraggingStateId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Distribute unpositioned states on mount
  useEffect(() => {
    let changed = false;
    states.forEach((s, i) => {
      if (s.x === undefined || s.y === undefined) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        onUpdateStatePosition(
          s.id,
          50 + col * (STATE_WIDTH + 50),
          50 + row * (STATE_HEIGHT + 50)
        );
        changed = true;
      }
    });
  }, [states, onUpdateStatePosition]);

  const handleMouseDown = (e: ReactMouseEvent, id: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    onSelectState?.(id);

    if (isSimulating) return; // No drag in sim mode

    const state = states.find(s => s.id === id);
    if (state && state.x !== undefined && state.y !== undefined) {
      setDraggingStateId(id);
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setDragOffset({
          x: e.clientX - containerRect.left - state.x,
          y: e.clientY - containerRect.top - state.y
        });
      }
    }
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (draggingStateId && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - dragOffset.x;
      let newY = e.clientY - containerRect.top - dragOffset.y;

      // Snap to grid
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

      // Bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      onUpdateStatePosition(draggingStateId, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setDraggingStateId(null);
  };

  const renderTransitions = () => {
    return transitions.map(t => {
      const fromS = states.find(s => s.id === t.fromStateId);
      const toS = states.find(s => s.id === t.toStateId);

      if (!fromS || !toS || fromS.x === undefined || fromS.y === undefined || toS.x === undefined || toS.y === undefined) return null;

      // Simple straight line from center to center for now
      // A more robust implementation would calculate edge intersections
      const startX = fromS.x + STATE_WIDTH / 2;
      const startY = fromS.y + STATE_HEIGHT / 2;
      const endX = toS.x + STATE_WIDTH / 2;
      const endY = toS.y + STATE_HEIGHT / 2;

      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);

      // Normalize vector
      const nx = dx / len;
      const ny = dy / len;

      // Adjust start and end to roughly the edges of the box
      // (This is a simplistic bounding box intersection approx)
      const edgeOffset = Math.min(STATE_WIDTH, STATE_HEIGHT) / 2 + 10;

      const p1x = startX + nx * edgeOffset;
      const p1y = startY + ny * edgeOffset;

      const p2x = endX - nx * edgeOffset;
      const p2y = endY - ny * edgeOffset;

      const midX = (p1x + p2x) / 2;
      const midY = (p1y + p2y) / 2;

      const isActive = activeStateId === fromS.id;

      return (
        <g key={t.id} onClick={() => onSelectTransition?.(t.id)} className="cursor-pointer">
          <defs>
            <marker id={`arrow-${t.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={isActive ? '#10b981' : '#64748b'} />
            </marker>
          </defs>
          <line
            x1={p1x} y1={p1y}
            x2={p2x} y2={p2y}
            stroke={isActive ? '#10b981' : '#64748b'}
            strokeWidth="2"
            markerEnd={`url(#arrow-${t.id})`}
            className="transition-colors duration-300"
          />
          {t.condition.kind !== 'always' && (
             <foreignObject x={midX - 50} y={midY - 15} width={100} height={30} className="overflow-visible pointer-events-none">
                <div className="bg-slate-900/90 border border-slate-700 text-[10px] text-amber-400 font-mono px-1 py-0.5 rounded text-center whitespace-nowrap w-fit mx-auto shadow-md">
                   IF {t.condition.kind === 'comparison' ? `${t.condition.left}` : t.condition.kind}
                </div>
             </foreignObject>
          )}
        </g>
      );
    });
  };

  return (
    <div
      className="relative w-full h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-1"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {renderTransitions()}
      </svg>

      {states.map(s => {
        if (s.x === undefined || s.y === undefined) return null;
        const isActive = activeStateId === s.id;
        return (
          <div
            key={s.id}
            onMouseDown={(e) => handleMouseDown(e, s.id)}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: STATE_WIDTH,
              height: STATE_HEIGHT,
              cursor: isSimulating ? 'default' : (draggingStateId === s.id ? 'grabbing' : 'grab')
            }}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg border-2 shadow-lg transition-colors
              ${isActive
                ? 'bg-emerald-900/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] z-10'
                : s.isInitial
                  ? 'bg-indigo-900/80 border-indigo-500 z-0'
                  : 'bg-slate-800 border-slate-600 hover:border-slate-500 z-0'
              }
            `}
          >
            {s.isInitial && (
              <div className="absolute -top-3 -left-3 bg-indigo-500 p-1 rounded-full border border-slate-900">
                <Play className="w-3 h-3 text-white fill-current" />
              </div>
            )}
            <span className="font-bold text-sm text-slate-100 truncate w-full text-center">{s.name}</span>
            {isActive && <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Aktív</span>}
          </div>
        );
      })}
    </div>
  );
};
