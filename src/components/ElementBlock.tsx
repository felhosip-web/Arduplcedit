import React from 'react';
import { LadderElement } from '../types';
import { useStore } from '../store/useStore';
import { Settings2, Trash2, Cpu, Clock, Hash, Activity, Zap, Radio, HardDrive, Layers, ListOrdered, ArrowRightLeft, Calendar } from 'lucide-react';

interface ElementBlockProps {
  element: LadderElement;
  isActive?: boolean;
  isSimulating?: boolean;
  timerState?: { currentMs: number; isDone: boolean; isTiming: boolean };
  counterState?: { currentCount: number; isDone: boolean };
  onSelect: (el: LadderElement) => void;
  onDelete: (id: string) => void;
  onTunePid?: (el: LadderElement) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const ElementBlock: React.FC<ElementBlockProps> = React.memo(({
  element,
  isActive,
  isSimulating,
  timerState,
  counterState,
  onSelect,
  onDelete,
  onTunePid,
  onContextMenu
}) => {
  const isPassing = isSimulating && isActive;

  // Resolve variable reference to name if it's an ID
  const { variables, constants } = useStore(state => state.history.present);
  const resolveVariableName = (varIdOrName?: string) => {
    if (!varIdOrName) return undefined;
    if (varIdOrName.startsWith('var_')) {
       const variable = variables?.find(v => v.id === varIdOrName);
       if (variable) return variable.name;
    }
    if (varIdOrName.startsWith('const_')) {
       const constant = constants?.find(c => c.id === varIdOrName);
       if (constant) return constant.name;
    }
    return varIdOrName;
  };

  const resolvedVariable = resolveVariableName(element.variable);
  const resolvedTargetVar = resolveVariableName(element.targetVariable);

  // Render authentic PLC visual symbol based on element type
  const renderSymbol = () => {
    switch (element.type) {
      case 'NO_CONTACT':
        return (
          <div className="flex items-center justify-center font-mono text-base tracking-widest select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-1.5 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[28px] rounded-none transition-colors ${
              isPassing ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'border-slate-300 text-slate-300'
            }`}>
              {/* Gap represents open contact */}
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'NC_CONTACT':
        return (
          <div className="flex items-center justify-center font-mono text-base tracking-widest select-none relative">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-1.5 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[28px] relative transition-colors ${
              isPassing ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300' : 'border-slate-300 text-slate-300'
            }`}>
              {/* Diagonal slash for NC */}
              <div className={`absolute w-7 h-0.5 transform -rotate-45 ${isPassing ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'RISING_EDGE':
        return (
          <div className="flex items-center justify-center font-mono text-base tracking-widest select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[28px] font-bold text-xs ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-slate-300 text-amber-400'
            }`}>
              P↑
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'FALLING_EDGE':
        return (
          <div className="flex items-center justify-center font-mono text-base tracking-widest select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[28px] font-bold text-xs ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-slate-300 text-sky-400'
            }`}>
              N↓
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'ANALOG_CMP':
      case 'VAR_CMP':
        return (
          <div className="flex items-center justify-center font-mono select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-1 border border-slate-700 bg-slate-800 rounded text-xs flex flex-col items-center ${
              isPassing ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40 ring-1 ring-emerald-500' : 'text-slate-200'
            }`}>
              <div className="font-semibold">{resolvedVariable || 'A0'}</div>
              <div className="text-[11px] text-amber-400 font-mono">{element.compareOp || '>'} {element.compareValue ?? 500}</div>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'NRF24_AVAILABLE':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-1 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[36px] font-bold text-[11px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-cyan-500 text-cyan-300'
            }`}>
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>RX?</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'EEPROM_24C_CHECK':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-1 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[36px] font-bold text-[11px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-amber-500 text-amber-300'
            }`}>
              <HardDrive className="w-3 h-3 text-amber-400" />
              <span>ACK?</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'BUFFER_EMPTY':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-1 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[42px] font-bold text-[10px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-amber-500 text-amber-300'
            }`}>
              <Layers className="w-3 h-3 text-amber-400" />
              <span>EMPTY?</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'BUFFER_FULL':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-1 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[42px] font-bold text-[10px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-rose-500 text-rose-300'
            }`}>
              <Layers className="w-3 h-3 text-rose-400" />
              <span>FULL?</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'RTC_TIME_RANGE':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex flex-col items-center justify-center min-w-[55px] font-bold text-[10px] leading-tight transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'border-amber-500 text-amber-300'
            }`}>
              <div className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span>{String(element.rtcStartHour ?? 8).padStart(2, '0')}:{String(element.rtcStartMin ?? 0).padStart(2, '0')}</span>
              </div>
              <div className="text-[9px] text-amber-400/90 font-mono">
                ..{String(element.rtcEndHour ?? 16).padStart(2, '0')}:{String(element.rtcEndMin ?? 30).padStart(2, '0')}
              </div>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'RTC_TIME_CMP':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[50px] font-bold text-[10px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-amber-500 text-amber-300'
            }`}>
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{element.compareOp || '>='}{String(element.rtcCompareHour ?? 18).padStart(2, '0')}:{String(element.rtcCompareMin ?? 0).padStart(2, '0')}</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'RTC_CALENDAR_RANGE':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex flex-col items-center justify-center min-w-[60px] font-bold text-[9px] leading-tight transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'border-teal-500 text-teal-300'
            }`}>
              <div className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-teal-400" />
                <span>{String(element.rtcStartMonth ?? 5).padStart(2, '0')}.{String(element.rtcStartDay ?? 1).padStart(2, '0')}</span>
              </div>
              <div className="text-[8px] text-teal-400/90 font-mono">
                ..{String(element.rtcEndMonth ?? 9).padStart(2, '0')}.{String(element.rtcEndDay ?? 30).padStart(2, '0')}
              </div>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'RTC_PULSE_TICK':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`px-2 py-0.5 border-l-2 border-r-2 h-7 flex items-center justify-center min-w-[50px] font-bold text-[10px] gap-1 transition-colors ${
              isPassing ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'border-amber-400 text-amber-300'
            }`}>
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{element.rtcPulseInterval === 'minute' ? '1MIN ⎍' : element.rtcPulseInterval === 'hour' ? '1HR ⎍' : element.rtcPulseInterval === 'midnight' ? 'MIDNIGHT' : '1SEC ⎍'}</span>
            </div>
            <span className={`w-2 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'COIL_NORMAL':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              isPassing
                ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'border-slate-300 text-slate-300 bg-slate-800/80'
            }`}>
              <span className="text-xs">OUT</span>
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'COIL_INV':
        return (
          <div className="flex items-center justify-center font-mono text-base select-none relative">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center relative ${
              isPassing ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold' : 'border-slate-300 text-slate-300 bg-slate-800'
            }`}>
              <span className="text-[10px] font-bold">/</span>
              <div className="absolute w-7 h-0.5 bg-rose-400 transform -rotate-45"></div>
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'COIL_SET':
        return (
          <div className="flex items-center justify-center font-mono select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
              isPassing ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'border-amber-400/80 text-amber-300 bg-slate-800'
            }`}>
              S
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'COIL_RESET':
        return (
          <div className="flex items-center justify-center font-mono select-none">
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
              isPassing ? 'border-sky-400 bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.6)]' : 'border-sky-400/80 text-sky-300 bg-slate-800'
            }`}>
              R
            </div>
            <span className={`w-3 h-0.5 ${isPassing ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
          </div>
        );

      case 'TON':
      case 'TOF':
      case 'TP':
        const progress = timerState && element.presetMs ? Math.min(100, (timerState.currentMs / element.presetMs) * 100) : 0;
        return (
          <div className={`px-3 py-1.5 border rounded bg-slate-800/90 text-xs min-w-[110px] ${
            isPassing ? 'border-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'border-slate-600'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {element.type}
              </span>
              <span className="font-mono text-[11px] text-slate-300">{resolvedVariable || 'T1'}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
              <span>PT: {element.presetMs || 1000}ms</span>
              {timerState && <span className="text-emerald-400">{timerState.currentMs}ms</span>}
            </div>
            {isSimulating && (
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full transition-all duration-75" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        );

      case 'CTU':
      case 'CTD':
        return (
          <div className={`px-3 py-1.5 border rounded bg-slate-800/90 text-xs min-w-[100px] ${
            isPassing ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-slate-600'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-bold text-indigo-400 flex items-center gap-1">
                <Hash className="w-3 h-3" /> {element.type}
              </span>
              <span className="font-mono text-slate-300">{resolvedVariable || 'C1'}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300">
              <span>Cél: {element.presetCount || 5}</span>
              <span className="text-indigo-300 font-bold">
                {counterState ? counterState.currentCount : 0}
              </span>
            </div>
          </div>
        );

      case 'SERVO_WRITE':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[105px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40 text-cyan-200' : 'border-cyan-800 text-cyan-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-cyan-400" /> SERVO</span>
              <span className="text-slate-400 font-mono">{element.pin || 'D9'}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5">
              Szög: <span className="text-cyan-300 font-bold">{element.servoAngle ?? 90}°</span>
            </div>
          </div>
        );

      case 'LCD_PRINT':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[115px] ${
            isPassing ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-950/40' : 'border-emerald-800 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400"><Activity className="w-3 h-3" /> I2C LCD</span>
              <span className="text-slate-400 text-[10px]">S:{element.lcdRow ?? 0}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-200 truncate max-w-[110px] mt-0.5">
              "{element.lcdText || 'Hello'}"
            </div>
          </div>
        );

      case 'DHT_READ':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[105px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40 text-amber-200' : 'border-amber-800 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span>DHT SENSOR</span>
              <span className="text-slate-400 font-mono">{element.pin || 'D7'}</span>
            </div>
            <div className="text-[11px] font-mono text-amber-300 mt-0.5">
              → {resolvedVariable || 'DHT_TEMP'}
            </div>
          </div>
        );

      case 'NEOPIXEL_SET':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[105px] ${
            isPassing ? 'border-purple-400 ring-1 ring-purple-400 bg-purple-950/40' : 'border-purple-800 text-purple-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span>NEOPIXEL</span>
              <span className="w-3 h-3 rounded-full inline-block border border-white/20" style={{ backgroundColor: element.neoPixelColor || '#00FF00' }} />
            </div>
            <div className="text-[10px] font-mono text-slate-300 mt-0.5">
              LED #{element.neoPixelLedIndex || 0}
            </div>
          </div>
        );

      case 'NRF24_TRANSMIT':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[115px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40' : 'border-cyan-800 text-cyan-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-cyan-400">
                <Radio className="w-3 h-3" /> NRF TX
              </span>
              <span className="text-[10px] font-mono text-cyan-500">CH:{element.nrfChannel ?? 76}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-200 truncate mt-0.5">
              {resolvedVariable ? `Var: ${resolvedVariable}` : `"${element.nrfPayload || 'DATA'}"`}
            </div>
          </div>
        );

      case 'NRF24_RECEIVE':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[115px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40' : 'border-cyan-800 text-cyan-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-cyan-400">
                <Radio className="w-3 h-3" /> NRF RX
              </span>
              <span className="text-[10px] font-mono text-cyan-500">P{element.nrfPipe ?? 1}</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-200 truncate mt-0.5">
              → {resolvedTargetVar || resolvedVariable || 'V_RX'}
            </div>
          </div>
        );

      case 'NRF24_CONFIG':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[110px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40' : 'border-cyan-800 text-cyan-300'
          }`}>
            <div className="font-bold text-[11px] text-cyan-400 flex items-center gap-1">
              <Radio className="w-3 h-3" /> NRF CFG
            </div>
            <div className="text-[10px] font-mono text-slate-300 mt-0.5">
              CH: {element.nrfChannel ?? 76}
            </div>
          </div>
        );

      case 'EEPROM_24C_WRITE':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[115px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40' : 'border-amber-800 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-400">
                <HardDrive className="w-3 h-3" /> 24C WR
              </span>
              <span className="text-[10px] font-mono text-amber-500">{element.eepromAddress || '0x0010'}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-200 truncate mt-0.5">
              {resolvedVariable || element.eepromDataValue || '0'} ({element.eepromDataType || 'float'})
            </div>
          </div>
        );

      case 'EEPROM_24C_READ':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[115px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40' : 'border-amber-800 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-400">
                <HardDrive className="w-3 h-3" /> 24C RD
              </span>
              <span className="text-[10px] font-mono text-amber-500">{element.eepromAddress || '0x0010'}</span>
            </div>
            <div className="text-[10px] font-mono text-amber-200 truncate mt-0.5">
              → {resolvedTargetVar || resolvedVariable || 'VAR'}
            </div>
          </div>
        );

      case 'EEPROM_24C_SAVE_RECIPE':
      case 'EEPROM_24C_LOAD_RECIPE':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[120px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40' : 'border-amber-800 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-400">
                <HardDrive className="w-3 h-3" /> {element.type === 'EEPROM_24C_SAVE_RECIPE' ? '24C SAVE' : '24C LOAD'}
              </span>
              <span className="text-[10px] font-mono text-amber-500">{element.eepromAddress || '0x0080'}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-200 truncate mt-0.5">
              Tömb: {element.arrayName || 'ARR'}
            </div>
          </div>
        );

      case 'FIFO_PUSH':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-teal-400 ring-1 ring-teal-400 bg-teal-950/40 text-teal-200' : 'border-teal-700 text-teal-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-teal-300">
                <ListOrdered className="w-3 h-3" /> FIFO PUSH
              </span>
              <span className="text-[10px] font-mono text-teal-500">max:{element.maxSize ?? 8}</span>
            </div>
            <div className="text-[10px] font-mono text-teal-100 truncate mt-0.5">
              {resolvedVariable || element.pushValue || 'VAL'} → {element.arrayName || 'QUEUE'}
            </div>
          </div>
        );

      case 'FIFO_POP':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-teal-400 ring-1 ring-teal-400 bg-teal-950/40 text-teal-200' : 'border-teal-700 text-teal-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-teal-300">
                <ListOrdered className="w-3 h-3" /> FIFO POP
              </span>
              <span className="text-[10px] font-mono text-teal-500">oldest[0]</span>
            </div>
            <div className="text-[10px] font-mono text-teal-100 truncate mt-0.5">
              {element.arrayName || 'QUEUE'} → {resolvedTargetVar || 'VAR'}
            </div>
          </div>
        );

      case 'LIFO_PUSH':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-950/40 text-indigo-200' : 'border-indigo-700 text-indigo-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-indigo-300">
                <Layers className="w-3 h-3" /> LIFO PUSH
              </span>
              <span className="text-[10px] font-mono text-indigo-400">max:{element.maxSize ?? 8}</span>
            </div>
            <div className="text-[10px] font-mono text-indigo-100 truncate mt-0.5">
              {resolvedVariable || element.pushValue || 'VAL'} → TOP({element.arrayName || 'STACK'})
            </div>
          </div>
        );

      case 'LIFO_POP':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-950/40 text-indigo-200' : 'border-indigo-700 text-indigo-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-indigo-300">
                <Layers className="w-3 h-3" /> LIFO POP
              </span>
              <span className="text-[10px] font-mono text-indigo-400">top</span>
            </div>
            <div className="text-[10px] font-mono text-indigo-100 truncate mt-0.5">
              TOP({element.arrayName || 'STACK'}) → {resolvedTargetVar || 'VAR'}
            </div>
          </div>
        );

      case 'BLKMOV':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[130px] ${
            isPassing ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-950/40 text-blue-200' : 'border-blue-700 text-blue-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-blue-300">
                <ArrowRightLeft className="w-3 h-3" /> BLKMOV
              </span>
              <span className="text-[10px] font-mono text-blue-400">len:{element.blockLength ?? 4}</span>
            </div>
            <div className="text-[10px] font-mono text-blue-100 truncate mt-0.5">
              {element.sourceArray || 'SRC'}[{element.sourceOffset ?? 0}] → {element.destArray || 'DST'}[{element.destOffset ?? 0}]
            </div>
          </div>
        );

      case 'RTC_READ_TIME':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40 text-amber-200' : 'border-amber-700 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="w-3 h-3 text-amber-400" /> RTC READ
              </span>
              <span className="text-[10px] font-mono text-amber-400">DS3231</span>
            </div>
            <div className="text-[10px] font-mono text-slate-200 truncate mt-0.5">
              → {element.rtcVarHour || 'RTC_HOUR'}, {element.rtcVarMin || 'RTC_MIN'}...
            </div>
          </div>
        );

      case 'RTC_SET_TIME':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[125px] ${
            isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40 text-amber-200' : 'border-amber-700 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="w-3 h-3 text-amber-400" /> RTC SET
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                {String(element.rtcStartHour ?? 12).padStart(2, '0')}:{String(element.rtcStartMin ?? 0).padStart(2, '0')}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5">
              Beállítás RTC chipbe
            </div>
          </div>
        );

      case 'EXPANDER_READ_PIN':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[130px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40 text-cyan-200' : 'border-cyan-700 text-cyan-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-cyan-300">
                <Cpu className="w-3 h-3" /> EXP PIN RD
              </span>
              <span className="text-[10px] font-mono text-cyan-400">{element.expanderPin || element.pin || 'EXP_A0'}</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-100 truncate mt-0.5">
              PIN → {resolvedTargetVar || resolvedVariable || 'VAR'}
            </div>
          </div>
        );

      case 'EXPANDER_WRITE_PIN':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[130px] ${
            isPassing ? 'border-cyan-400 ring-1 ring-cyan-400 bg-cyan-950/40 text-cyan-200' : 'border-cyan-700 text-cyan-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-cyan-300">
                <Cpu className="w-3 h-3" /> EXP PIN WR
              </span>
              <span className="text-[10px] font-mono text-cyan-400">{element.expanderPin || element.pin || 'EXP_B0'}</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-100 truncate mt-0.5">
              RUNG → {element.expanderPin || 'PIN'}
            </div>
          </div>
        );

      case 'EXPANDER_READ_PORT':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[135px] ${
            isPassing ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-950/40 text-emerald-200' : 'border-emerald-700 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-emerald-300">
                <Cpu className="w-3 h-3" /> EXP PORT RD
              </span>
              <span className="text-[10px] font-mono text-emerald-400">PORT {element.expanderPort || 'A'}</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-100 truncate mt-0.5">
              PORT {element.expanderPort || 'A'} → {element.expanderTargetVar || 'VAR'}
            </div>
          </div>
        );

      case 'EXPANDER_WRITE_PORT':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[135px] ${
            isPassing ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-950/40 text-emerald-200' : 'border-emerald-700 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-emerald-300">
                <Cpu className="w-3 h-3" /> EXP PORT WR
              </span>
              <span className="text-[10px] font-mono text-emerald-400">PORT {element.expanderPort || 'B'}</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-100 truncate mt-0.5">
              {element.expanderValueVar || 'VAL'} → PORT {element.expanderPort || 'B'}
            </div>
          </div>
        );

      case 'SUBROUTINE_CALL':
        return (
          <div className={`px-3 py-1.5 border-2 rounded-lg bg-slate-900/95 text-xs min-w-[140px] transition-all ${
            isPassing
              ? 'border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-950/30 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
              : 'border-indigo-600/80 hover:border-indigo-400 text-indigo-300'
          }`}>
            <div className="flex items-center justify-between border-b border-indigo-800/60 pb-1 mb-1 font-bold text-[11px]">
              <span className="flex items-center gap-1 text-indigo-400">
                <Cpu className="w-3 h-3" /> FC BLOKK
              </span>
              <span className="font-mono text-[10px] bg-indigo-950 px-1 rounded text-indigo-300">
                SUB
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 truncate mb-1">
              {element.name}
            </div>
            {element.subroutineBindings && Object.keys(element.subroutineBindings).length > 0 ? (
              <div className="text-[10px] font-mono text-slate-300 space-y-0.5 max-h-16 overflow-y-auto">
                {Object.entries(element.subroutineBindings).slice(0, 3).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-1 text-slate-400">
                    <span className="truncate">{k}:</span>
                    <span className="text-amber-300 font-bold">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-slate-400 italic">
                (Kattints a bekötéshez)
              </div>
            )}
          </div>
        );

      case 'PID_CONTROLLER':
        return (
          <div
            onClick={(e) => {
              if (onTunePid) {
                e.stopPropagation();
                onTunePid(element);
              }
            }}
            className={`px-2.5 py-1.5 border rounded bg-slate-900 text-xs min-w-[130px] cursor-pointer hover:border-amber-500 transition-all ${
              isPassing ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/40 text-amber-200' : 'border-amber-700/80 text-amber-300'
            }`}
            title="Kattints a PID hangoló tesztpad megnyitásához"
          >
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1 text-amber-400">
                <Activity className="w-3 h-3" /> PID BLOKK
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950 px-1 py-0.2 rounded border border-amber-800">
                SP:{element.pidSetpoint ?? 60}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-300 mt-0.5 flex justify-between gap-1">
              <span className="text-sky-300">P:{element.pidKp ?? 3.2}</span>
              <span className="text-amber-300">I:{element.pidKi ?? 0.8}</span>
              <span className="text-rose-300">D:{element.pidKd ?? 0.6}</span>
            </div>
            <div className="text-[9px] font-mono text-amber-400/90 truncate mt-0.5 flex items-center justify-between">
              <span>{element.pidInputVar || element.pin || 'A0'} ➔ {element.pidOutputVar || 'D9'}</span>
              <span className="text-[8px] bg-amber-900/60 text-amber-300 px-1 rounded font-sans">HANGOLÓ</span>
            </div>
          </div>
        );

      case 'CUSTOM_MODULE':
        return (
          <div className={`px-2.5 py-1.5 border rounded bg-slate-800 text-xs min-w-[110px] ${
            isPassing ? 'border-sky-400 ring-1 ring-sky-400 bg-sky-950/40 text-sky-200' : 'border-sky-700 text-sky-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="text-sky-400">{element.name}</span>
              <span className="text-[10px] font-mono text-slate-400">{element.pin || resolvedVariable || 'CUST'}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5">
              {element.comment || 'Egyedi modul'}
            </div>
          </div>
        );

      default:
        return (
          <div className="px-2 py-1 border border-slate-600 rounded text-xs bg-slate-800">
            {element.name}
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(element)}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer select-none ${
        isPassing
          ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
          : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80'
      }`}
    >
      {/* Top Label: Tag or Pin or Variable */}
      <div className="flex items-center gap-1 text-[11px] font-mono font-medium mb-1 max-w-[130px] truncate text-center">
        {element.pin && (
          <span className="px-1 py-0.2 rounded bg-slate-800 text-sky-300 font-semibold border border-slate-700 text-[10px]">
            {element.pin}
          </span>
        )}
        <span className="text-slate-300 truncate" title={element.name}>
          {element.name}
        </span>
      </div>

      {/* Main Schematic Representation */}
      <div className="my-0.5">
        {renderSymbol()}
      </div>

      {/* Element Type Subtitle / Pin */}
      <div className="text-[10px] text-slate-400 mt-1 flex flex-col items-center gap-1 font-mono w-full">
        {resolvedVariable && resolvedVariable !== element.name && (
           <span className="text-[9px] text-slate-500 font-bold truncate max-w-full">
             Ref: {resolvedVariable}
           </span>
        )}
        {element.category === 'library_module' && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
            LIB
          </span>
        )}
        {element.comment && (
          <span className="text-slate-400 truncate max-w-full" title={element.comment}>
            {element.comment}
          </span>
        )}
      </div>

      {/* Hover action buttons (Edit & Delete & Tune) */}
      {!isSimulating && (
        <div className="absolute -top-2.5 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md shadow-lg p-0.5 z-20">
          {element.type === 'PID_CONTROLLER' && onTunePid && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTunePid(element);
              }}
              className="p-1 hover:bg-amber-950 rounded text-amber-400 hover:text-amber-300 transition-colors"
              title="PID Hangoló Tesztpad Megnyitása"
            >
              <Activity className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(element);
            }}
            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-sky-300 transition-colors"
            title="Szerkesztés"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(element.id);
            }}
            className="p-1 hover:bg-rose-950/80 rounded text-slate-300 hover:text-rose-400 transition-colors"
            title="Törlés"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});
