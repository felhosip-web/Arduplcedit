import React, { useState, useRef, useEffect } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  className?: string;
  disabled?: boolean;
}

// Global flag and cooldown timer for dnd-kit drag operations
let isGlobalDragActive = false;
let globalDragCooldownTimer: NodeJS.Timeout | null = null;

export const setGlobalDragActive = (active: boolean) => {
  if (active) {
    if (globalDragCooldownTimer) {
      clearTimeout(globalDragCooldownTimer);
      globalDragCooldownTimer = null;
    }
    isGlobalDragActive = true;
    document.documentElement.dataset.dragging = '1';
    window.dispatchEvent(new CustomEvent('arduplc:drag-start'));
  } else {
    isGlobalDragActive = true; // keep suppressed during cooldown
    document.documentElement.dataset.dragging = '1';
    if (globalDragCooldownTimer) clearTimeout(globalDragCooldownTimer);
    globalDragCooldownTimer = setTimeout(() => {
      isGlobalDragActive = false;
      delete document.documentElement.dataset.dragging;
      window.dispatchEvent(new CustomEvent('arduplc:drag-end'));
    }, 250);
  }
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delayMs = 400,
  className = '',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideTooltip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  const handleMouseEnter = () => {
    if (disabled || !content || isGlobalDragActive) return;
    if (document.documentElement.dataset.dragging === '1') return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isGlobalDragActive && document.documentElement.dataset.dragging !== '1') {
        setIsVisible(true);
      }
    }, delayMs);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  useEffect(() => {
    const handleDragStart = () => hideTooltip();
    const handleDragEnd = () => hideTooltip();
    const handleScroll = () => hideTooltip();
    const handlePointerDown = () => {
      if (isGlobalDragActive || document.documentElement.dataset.dragging === '1') {
        hideTooltip();
      }
    };

    window.addEventListener('arduplc:drag-start', handleDragStart);
    window.addEventListener('arduplc:drag-end', handleDragEnd);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('arduplc:drag-start', handleDragStart);
      window.removeEventListener('arduplc:drag-end', handleDragEnd);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

  if (disabled || !content) {
    return children;
  }

  const getPositionClasses = () => {
    switch (side) {
      case 'bottom':
        return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
      case 'top':
      default:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (side) {
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px]';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent border-l-[5px] border-y-[5px]';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent border-r-[5px] border-y-[5px]';
      case 'top':
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px]';
    }
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={hideTooltip}
    >
      {children}
      {isVisible && !isGlobalDragActive && (
        <div
          className={`absolute z-[110] pointer-events-none ${getPositionClasses()} ${className}`}
        >
          <div className="bg-slate-900 border border-slate-700/90 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl max-w-xs whitespace-normal leading-relaxed select-none animate-in fade-in duration-150 pointer-events-none">
            {content}
            <div className={`absolute w-0 h-0 border-solid pointer-events-none ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
};
