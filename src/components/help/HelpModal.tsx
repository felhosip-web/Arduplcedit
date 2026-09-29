import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Cpu,
  Activity,
  Terminal,
  Sliders,
  BookOpen,
  Info,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Hash,
  ArrowRight
} from 'lucide-react';
import {
  HELP_CATEGORIES,
  HELP_TOPICS,
  HelpTopic,
  HelpCategory,
  HelpSection
} from '../../data/helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: string;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4 text-amber-400" />,
  Layers: <Layers className="w-4 h-4 text-sky-400" />,
  Cpu: <Cpu className="w-4 h-4 text-emerald-400" />,
  Activity: <Activity className="w-4 h-4 text-rose-400" />,
  Terminal: <Terminal className="w-4 h-4 text-teal-400" />,
  Sliders: <Sliders className="w-4 h-4 text-indigo-400" />
};

const LOCAL_STORAGE_LAST_TOPIC_KEY = 'arduplc_help_last_topic';

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  initialTopicId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    if (initialTopicId) return initialTopicId;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LAST_TOPIC_KEY);
      if (saved && HELP_TOPICS.some((t) => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      // ignore storage error
    }
    return HELP_TOPICS[0].id;
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const contentPanelRef = useRef<HTMLDivElement>(null);

  // Update selected topic if initialTopicId prop changes when opening
  useEffect(() => {
    if (initialTopicId && HELP_TOPICS.some((t) => t.id === initialTopicId)) {
      setSelectedTopicId(initialTopicId);
      setActiveSectionIndex(0);
    }
  }, [initialTopicId]);

  // Save last selected topic to localStorage
  useEffect(() => {
    if (selectedTopicId) {
      try {
        localStorage.setItem(LOCAL_STORAGE_LAST_TOPIC_KEY, selectedTopicId);
      } catch (e) {
        // ignore
      }
    }
  }, [selectedTopicId]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Active topic resolution
  const activeTopic = useMemo(() => {
    return HELP_TOPICS.find((t) => t.id === selectedTopicId) || HELP_TOPICS[0];
  }, [selectedTopicId]);

  // Reset active section index when switching topics
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveSectionIndex(0);
    if (contentPanelRef.current) {
      contentPanelRef.current.scrollTop = 0;
    }
  };

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return HELP_TOPICS;

    return HELP_TOPICS.filter((topic) => {
      const matchTitle = topic.title.toLowerCase().includes(q);
      const matchSummary = topic.summary.toLowerCase().includes(q);
      const matchKeywords = topic.keywords.some((k) => k.toLowerCase().includes(q));
      const matchSections = topic.sections.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.paragraphs.some((p) => p.toLowerCase().includes(q))
      );
      return matchTitle || matchSummary || matchKeywords || matchSections;
    });
  }, [searchQuery]);

  // Group filtered topics by category
  const groupedTopics = useMemo(() => {
    const groups: { category: HelpCategory; topics: HelpTopic[] }[] = [];

    HELP_CATEGORIES.forEach((cat) => {
      const catTopics = filteredTopics.filter((t) => t.categoryId === cat.id);
      if (catTopics.length > 0) {
        groups.push({ category: cat, topics: catTopics });
      }
    });

    return groups;
  }, [filteredTopics]);

  if (!isOpen) return null;

  const activeSection: HelpSection | undefined = activeTopic.sections[activeSectionIndex];
  const hasMultipleSections = activeTopic.sections.length > 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[850px] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Súgó & Dokumentáció</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80 text-[10px] font-mono font-semibold">
                  ArduPLC Studio v2.1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Létraszerkesztő, szimuláció, kódgenerálás és ipari modulok útmutatója
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Bezárás (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body: Left Sidebar + Right Article Panel */}
        <div className="flex-1 flex min-h-0 divide-x divide-slate-800/80">
          {/* Left Sidebar: Search & Navigation Topics */}
          <div className="w-72 sm:w-80 bg-slate-950/60 flex flex-col shrink-0 select-none">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés témákban, kifejezésekben..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category & Topic List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
              {groupedTopics.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  Nincs találat a megadott keresési kifejezésre.
                </div>
              ) : (
                groupedTopics.map(({ category, topics }) => (
                  <div key={category.id} className="space-y-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      {CATEGORY_ICON_MAP[category.iconName] || <Hash className="w-3.5 h-3.5 text-sky-400" />}
                      <span>{category.title}</span>
                    </div>

                    <div className="space-y-0.5">
                      {topics.map((topic) => {
                        const isSelected = topic.id === selectedTopicId;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleSelectTopic(topic.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                              isSelected
                                ? 'bg-sky-500/15 border border-sky-500/40 text-sky-300 font-semibold shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                            }`}
                          >
                            <span className="line-clamp-1">{topic.title}</span>
                            {isSelected && <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Content Panel: Active Article */}
          <div
            ref={contentPanelRef}
            className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 space-y-6 bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700"
          >
            {/* Topic Header & Category Badge */}
            <div className="border-b border-slate-800 pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5">
                  {CATEGORY_ICON_MAP[HELP_CATEGORIES.find((c) => c.id === activeTopic.categoryId)?.iconName || ''] || null}
                  {HELP_CATEGORIES.find((c) => c.id === activeTopic.categoryId)?.title}
                </span>
                {hasMultipleSections && (
                  <span className="text-[11px] text-sky-400 font-mono">
                    {activeSectionIndex + 1} / {activeTopic.sections.length} Fejezet
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-white tracking-wide">{activeTopic.title}</h1>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                {activeTopic.summary}
              </p>
            </div>

            {/* Pagination Controls (Top) — Lapozás */}
            {hasMultipleSections && (
              <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold mr-1">Lapozás:</span>
                  {activeTopic.sections.map((sec, idx) => (
                    <button
                      key={sec.title}
                      type="button"
                      onClick={() => {
                        setActiveSectionIndex(idx);
                        if (contentPanelRef.current) contentPanelRef.current.scrollTop = 0;
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all ${
                        idx === activeSectionIndex
                          ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSectionIndex > 0) {
                        setActiveSectionIndex(activeSectionIndex - 1);
                        if (contentPanelRef.current) contentPanelRef.current.scrollTop = 0;
                      }
                    }}
                    disabled={activeSectionIndex === 0}
                    className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all ${
                      activeSectionIndex === 0
                        ? 'opacity-40 cursor-not-allowed text-slate-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" /> Előző fejezet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeSectionIndex < activeTopic.sections.length - 1) {
                        setActiveSectionIndex(activeSectionIndex + 1);
                        if (contentPanelRef.current) contentPanelRef.current.scrollTop = 0;
                      }
                    }}
                    disabled={activeSectionIndex === activeTopic.sections.length - 1}
                    className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all ${
                      activeSectionIndex === activeTopic.sections.length - 1
                        ? 'opacity-40 cursor-not-allowed text-slate-500'
                        : 'bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm'
                    }`}
                  >
                    Következő fejezet <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Active Section Article Content */}
            {activeSection && (
              <div className="space-y-4 flex-1">
                <h2 className="text-base font-bold text-sky-300 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <span>{activeSection.title}</span>
                </h2>

                {/* Paragraphs */}
                <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {activeSection.paragraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Bullet List */}
                {activeSection.bullets && activeSection.bullets.length > 0 && (
                  <ul className="space-y-2 my-3 pl-2">
                    {activeSection.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Code Snippet / ASCII Diagram */}
                {activeSection.codeSnippet && (
                  <div className="my-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto shadow-inner">
                    <pre>{activeSection.codeSnippet}</pre>
                  </div>
                )}

                {/* Callout Box */}
                {activeSection.callout && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-3 my-4 ${
                      activeSection.callout.type === 'warning'
                        ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                        : activeSection.callout.type === 'tip'
                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                        : 'bg-sky-950/40 border-sky-600/50 text-sky-200'
                    }`}
                  >
                    {activeSection.callout.type === 'warning' && (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    {activeSection.callout.type === 'tip' && (
                      <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {activeSection.callout.type === 'info' && (
                      <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 leading-relaxed">{activeSection.callout.text}</div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls (Bottom) — Lapozás */}
            {hasMultipleSections && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSectionIndex > 0) {
                      setActiveSectionIndex(activeSectionIndex - 1);
                      if (contentPanelRef.current) contentPanelRef.current.scrollTop = 0;
                    }
                  }}
                  disabled={activeSectionIndex === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSectionIndex === 0
                      ? 'opacity-30 cursor-not-allowed text-slate-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Előző fejezet
                </button>

                <div className="text-xs text-slate-400 font-mono">
                  {activeSectionIndex + 1} / {activeTopic.sections.length} fejezet
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (activeSectionIndex < activeTopic.sections.length - 1) {
                      setActiveSectionIndex(activeSectionIndex + 1);
                      if (contentPanelRef.current) contentPanelRef.current.scrollTop = 0;
                    }
                  }}
                  disabled={activeSectionIndex === activeTopic.sections.length - 1}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeSectionIndex === activeTopic.sections.length - 1
                      ? 'opacity-30 cursor-not-allowed text-slate-500'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  Következő fejezet <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">Tipp: Nyomj <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-sky-400 text-[10px]">?</kbd> gombot bárhonnan a Súgó megnyitásához</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors font-medium text-xs"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
