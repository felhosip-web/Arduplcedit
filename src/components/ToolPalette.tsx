import React, { useState } from 'react';
import { ElementType, ElementCategory, LadderElement, CustomModuleTemplate, Subroutine } from '../types';
import { Radio, Zap, Clock, Cpu, Plus, HelpCircle, Layers, Sliders, Box, Network, Variable, Calendar } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

// Helper component for draggables
const DraggableItem = ({ id, data, children, className, onClick }: any) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`${className} ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
};

interface ToolPaletteProps {
  onAddElement: (template: Partial<LadderElement>) => void;
  selectedRungIndex: number;
  customModules: CustomModuleTemplate[];
  subroutines: Subroutine[];
  onOpenManagement?: () => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  onAddElement,
  selectedRungIndex,
  customModules,
  subroutines,
  onOpenManagement
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'contact' | 'coil' | 'timer' | 'rtc' | 'subroutine' | 'protocol' | 'variable_op' | 'library_module' | 'custom'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combine standard customModules + subroutines
  const filteredModules = customModules.filter((item) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'custom'
        ? !item.isBuiltIn
        : activeTab === 'timer'
        ? item.category === 'timer' || item.category === 'counter'
        : item.category === activeTab;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.libraryName && item.libraryName.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });

  const filteredSubroutines = subroutines.filter((sub) => {
    if (activeTab !== 'all' && activeTab !== 'subroutine') return false;
    const query = searchQuery.toLowerCase();
    return sub.name.toLowerCase().includes(query) || sub.description.toLowerCase().includes(query);
  });

  const buildElementData = (item: CustomModuleTemplate): Partial<LadderElement> => {
    return {
      type: item.type,
      category: item.category,
      name: item.name.split(' (')[0],
      pin: item.defaultPin,
      variable: item.defaultVariable,
      libraryId: item.libraryId,
      presetMs: item.presetMs,
      presetCount: item.presetCount,
      servoAngle: item.servoAngle,
      lcdText: item.lcdText,
      customCppCall: item.customCppCall,
      // Protocol and Variable operations defaults
      dallasTargetVar: item.dallasTargetVar,
      dallasPin: item.dallasPin,
      i2cAddress: item.i2cAddress,
      i2cRegister: item.i2cRegister,
      i2cData: item.i2cData,
      spiCsPin: item.spiCsPin,
      spiDataToSend: item.spiDataToSend,
      uartMessage: item.uartMessage,
      targetVariable: item.targetVariable,
      assignExpression: item.assignExpression,
      sourceVariable: item.sourceVariable,
      operandB: item.operandB,
      shiftCount: item.shiftCount,
      labelName: item.labelName,
      compareOp: item.compareOp,
      compareValue: item.compareValue,
      arrayName: item.arrayName,
      arrayIndex: item.arrayIndex,
      // NRF24 & 24Cxxx defaults
      nrfPayload: item.nrfPayload,
      nrfChannel: item.nrfChannel,
      nrfPipe: item.nrfPipe,
      eepromAddress: item.eepromAddress,
      eepromDataType: item.eepromDataType,
      eepromDataValue: item.eepromDataValue,
      // Buffer & BLKMOV properties
      sourceArray: item.sourceArray,
      sourceOffset: item.sourceOffset,
      destArray: item.destArray,
      destOffset: item.destOffset,
      blockLength: item.blockLength,
      pointerVar: item.pointerVar,
      maxSize: item.maxSize,
      pushValue: item.pushValue,
      // RTC Timer & Calendar properties
      rtcStartHour: item.rtcStartHour,
      rtcStartMin: item.rtcStartMin,
      rtcEndHour: item.rtcEndHour,
      rtcEndMin: item.rtcEndMin,
      rtcDaysOfWeek: item.rtcDaysOfWeek,
      rtcScheduleMode: item.rtcScheduleMode,
      rtcCompareHour: item.rtcCompareHour,
      rtcCompareMin: item.rtcCompareMin,
      rtcCompareSec: item.rtcCompareSec,
      rtcStartMonth: item.rtcStartMonth,
      rtcStartDay: item.rtcStartDay,
      rtcEndMonth: item.rtcEndMonth,
      rtcEndDay: item.rtcEndDay,
      rtcYearSpecific: item.rtcYearSpecific,
      rtcPulseInterval: item.rtcPulseInterval,
      rtcVarYear: item.rtcVarYear,
      rtcVarMonth: item.rtcVarMonth,
      rtcVarDay: item.rtcVarDay,
      rtcVarHour: item.rtcVarHour,
      rtcVarMin: item.rtcVarMin,
      rtcVarSec: item.rtcVarSec,
      rtcVarDOW: item.rtcVarDOW,
      // I/O Expander properties
      expanderDeviceId: item.expanderDeviceId,
      expanderPin: item.expanderPin,
      expanderPort: item.expanderPort,
      expanderTargetVar: item.expanderTargetVar,
      expanderValueVar: item.expanderValueVar,
      // PID Controller properties
      pidKp: item.pidKp,
      pidKi: item.pidKi,
      pidKd: item.pidKd,
      pidSetpoint: item.pidSetpoint,
      pidSetpointVar: item.pidSetpointVar,
      pidInputVar: item.pidInputVar,
      pidOutputVar: item.pidOutputVar,
      pidMinOutput: item.pidMinOutput,
      pidMaxOutput: item.pidMaxOutput,
      pidSampleTimeMs: item.pidSampleTimeMs,
      pidReverseAction: item.pidReverseAction
    };
  };

  const buildSubroutineData = (sub: Subroutine): Partial<LadderElement> => {
    const defaultBindings: Record<string, string> = {};
    sub.inputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D2';
    });
    sub.outputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D8';
    });

    return {
      type: 'SUBROUTINE_CALL',
      category: 'subroutine',
      name: sub.name,
      subroutineId: sub.id,
      subroutineBindings: defaultBindings,
      comment: sub.codeIdentifier
    };
  };

  const handleAddSubroutineDirect = (sub: Subroutine) => {
    const defaultBindings: Record<string, string> = {};
    sub.inputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D2';
    });
    sub.outputs.forEach((p) => {
      defaultBindings[p.name] = p.defaultPinOrVar || 'D8';
    });

    onAddElement({
      type: 'SUBROUTINE_CALL',
      category: 'subroutine',
      name: sub.name,
      subroutineId: sub.id,
      subroutineBindings: defaultBindings,
      comment: sub.codeIdentifier
    });
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Box className="w-4 h-4 text-sky-400" />
            <span>Elemek & Modulok</span>
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
            Fok #{selectedRungIndex}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Húzd át (Drag & Drop) a kívánt létrafokra vagy kattints a hozzáadáshoz.
        </p>

        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Keresés modul, protokoll, változó szerint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1 text-[11px] overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'all' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Összes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'contact' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3 h-3" /> Érintkező
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coil')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'coil' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3 h-3" /> Tekercs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('protocol')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'protocol' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:text-emerald-200'
          }`}
        >
          <Network className="w-3 h-3" /> Protokollok
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variable_op')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'variable_op' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:text-amber-200'
          }`}
        >
          <Variable className="w-3 h-3" /> Változók
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'timer' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3 h-3" /> Időzítő
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rtc')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'rtc' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:text-amber-200'
          }`}
        >
          <Calendar className="w-3 h-3" /> RTC / Naptár
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subroutine')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'subroutine' ? 'bg-indigo-500 text-white font-bold' : 'text-indigo-300 hover:text-indigo-100'
          }`}
        >
          <Layers className="w-3 h-3" /> Alprogramok ({subroutines.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('library_module')}
          className={`px-2 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'library_module' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3 h-3" /> Könyvtárak
        </button>
      </div>

      {/* Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Subroutines Section */}
        {filteredSubroutines.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 mb-2 px-1 flex items-center justify-between">
              <span>Alprogramok (Function Blocks)</span>
              <span className="text-slate-400">{filteredSubroutines.length} db</span>
            </div>

            <div className="space-y-2">
              {filteredSubroutines.map((sub) => (
                <DraggableItem
                  key={sub.id}
                  id={`subroutine_${sub.id}`}
                  data={buildSubroutineData(sub)}
                  onClick={() => handleAddSubroutineDirect(sub)}
                  className="group p-2.5 bg-indigo-950/30 hover:bg-indigo-950/60 border border-indigo-800/60 hover:border-indigo-400 rounded-xl transition-all cursor-grab active:cursor-grabbing relative"
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-300 text-xs px-2 py-0.5 rounded bg-indigo-900/80 border border-indigo-700 shrink-0">
                        FC
                      </span>
                      <span className="text-xs font-semibold text-indigo-100 group-hover:text-white transition-colors">
                        {sub.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-500 text-slate-950 rounded hover:bg-indigo-400 transition-all text-[11px]"
                      title="Hozzáadás az aktív fokhoz"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-indigo-900/60 flex items-center justify-between text-[10px] font-mono pointer-events-none">
                    <span className="text-emerald-400">
                      Be: {sub.inputs.map((i) => i.name).join(', ') || 'Nincs'}
                    </span>
                    <span className="text-amber-400">
                      Ki: {sub.outputs.map((o) => o.name).join(', ') || 'Nincs'}
                    </span>
                  </div>
                </DraggableItem>
              ))}
            </div>
          </div>
        )}

        {/* Regular Modules Section */}
        {filteredModules.map((item) => (
          <DraggableItem
            key={item.id}
            id={`module_${item.id}`}
            data={buildElementData(item)}
            onClick={() => onAddElement(buildElementData(item))}
            className={`group p-2.5 rounded-xl transition-all cursor-grab active:cursor-grabbing relative border ${
              item.category === 'protocol'
                ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-800/60 hover:border-emerald-400'
                : item.category === 'variable_op'
                ? 'bg-amber-950/20 hover:bg-amber-950/40 border-amber-800/60 hover:border-amber-400'
                : !item.isBuiltIn
                ? 'bg-sky-950/30 hover:bg-sky-950/50 border-sky-800/80 hover:border-sky-400'
                : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800/90 hover:border-sky-500/60'
            }`}
          >
            <div className="flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border shrink-0 ${
                  item.category === 'protocol'
                    ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                    : item.category === 'variable_op'
                    ? 'text-amber-400 bg-amber-950 border-amber-800'
                    : 'text-sky-400 bg-slate-900 border-slate-800'
                }`}>
                  {item.symbol}
                </span>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                  {item.name}
                </span>
              </div>

              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 p-1 bg-sky-500/20 text-sky-300 rounded hover:bg-sky-500 hover:text-slate-950 transition-all text-[11px]"
                title="Hozzáadás az aktív fokhoz"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>

            {item.libraryName && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-cyan-400 pointer-events-none">
                <Cpu className="w-3 h-3" />
                <span className="bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                  Lib: {item.libraryName}
                </span>
              </div>
            )}
          </DraggableItem>
        ))}

        {filteredModules.length === 0 && filteredSubroutines.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            Nincs találat a megadott keresési kifejezésre.
          </div>
        )}
      </div>

      {/* Footer Info & Quick Link to Management */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Húzd a kívánt létrafokra!</span>
        </div>

        {onOpenManagement && (
          <button
            type="button"
            onClick={onOpenManagement}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium hover:underline"
          >
            <Sliders className="w-3 h-3" /> Modul Menedzser
          </button>
        )}
      </div>
    </aside>
  );
};
