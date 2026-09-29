import React, { useState, useRef, useEffect } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  className?: string;
  disabled?: boolean;
}

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

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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
      onMouseDown={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-[110] pointer-events-none ${getPositionClasses()} ${className}`}
        >
          <div className="bg-slate-900 border border-slate-700/90 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl max-w-xs whitespace-normal leading-relaxed select-none animate-in fade-in duration-150">
            {content}
            <div className={`absolute w-0 h-0 border-solid ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
};
