import { useState } from 'react';
import { X, ChevronDown, ChevronRight, GitCommit, PlusCircle, Calculator, Eye, RefreshCw, MessageSquare, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { EVENT_LABELS, STATUS_LABELS } from '../../types';
import type { TimelineEventType } from '../../types';
import { formatDateTime, versionColorDot } from '../../utils/formatters';
import { VersionTag } from '../common/VersionTag';

const EVENT_ICONS: Record<TimelineEventType, React.ReactNode> = {
  create: <PlusCircle size={14} />,
  calculate: <Calculator size={14} />,
  review: <Eye size={14} />,
  status_change: <RefreshCw size={14} />,
  note_update: <MessageSquare size={14} />,
  export: <Download size={14} />,
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  create: 'bg-mint-400 border-mint-500 text-white',
  calculate: 'bg-ink-400 border-ink-500 text-white',
  review: 'bg-ink-500 border-ink-600 text-white',
  status_change: 'bg-amber-400 border-amber-500 text-white',
  note_update: 'bg-ink-300 border-ink-400 text-ink-800',
  export: 'bg-ink-200 border-ink-300 text-ink-700',
};

export function TimelineModal() {
  const { timelineModalOpen, closeTimelineModal, getSelectedBatch } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const batch = getSelectedBatch();

  if (!timelineModalOpen || !batch) return null;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const labelOf = (val: string) => {
    if (val in STATUS_LABELS) return STATUS_LABELS[val as keyof typeof STATUS_LABELS];
    return val;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm animate-fade-in flex items-center justify-center p-6"
      onClick={closeTimelineModal}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[85vh] flex flex-col border-2 border-ink-300 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink-300 bg-ink-50">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-800">
              历史时间线
            </h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-xs text-ink-500">{batch.id}</span>
              <VersionTag version={batch.boardVersion} notation={batch.notationSystem} />
            </div>
          </div>
          <button
            onClick={closeTimelineModal}
            className="p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {batch.versions.length > 1 && (
          <div className="px-5 py-3 border-b border-ink-200 bg-amber-50/40">
            <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-ink-500">
              <GitCommit size={12} className="inline mr-1" />
              版本快照对比
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {batch.versions.map((v) => (
                <div
                  key={v.id}
                  className={`p-2.5 border-2 ${
                    v.boardVersion === batch.boardVersion
                      ? 'border-ink-500 bg-ink-50'
                      : 'border-ink-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <VersionTag version={v.boardVersion} notation={v.notationSystem} />
                    {v.boardVersion === batch.boardVersion && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-ink-700 text-white">
                        采用中
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-lg font-bold text-ink-800 tabular-nums">
                    {v.resultValue.toFixed(4)}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-500 font-mono leading-snug">
                    {v.diffNote}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-ink-200" />

            {batch.timeline
              .slice()
              .reverse()
              .map((event, idx) => {
                const isOpen = expanded.has(event.id);
                return (
                  <div key={event.id} className={idx > 0 ? 'mt-5' : ''}>
                    <button
                      onClick={() => toggle(event.id)}
                      className="group flex items-start gap-3 w-full text-left"
                    >
                      <span
                        className={`absolute left-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${EVENT_COLORS[event.eventType]}`}
                      >
                        {EVENT_ICONS[event.eventType]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-ink-700">
                            {EVENT_LABELS[event.eventType]}
                          </span>
                          <span className="text-[11px] font-mono text-ink-400">
                            {formatDateTime(event.timestamp)}
                          </span>
                          <span className="text-[11px] font-mono text-ink-500">
                            · {event.operator}
                          </span>
                          {isOpen ? (
                            <ChevronDown size={14} className="text-ink-400" />
                          ) : (
                            <ChevronRight size={14} className="text-ink-400" />
                          )}
                        </div>
                        <div className="mt-1 text-sm text-ink-700 leading-relaxed">
                          {event.description}
                        </div>

                        {isOpen && (event.beforeValue || event.afterValue) && (
                          <div className="mt-3 p-3 bg-ink-50 border-2 border-ink-200 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {event.beforeValue && (
                                <div>
                                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400 mb-1">
                                    改动前
                                  </div>
                                  <div className="font-mono text-sm text-ink-500 line-through">
                                    {labelOf(event.beforeValue)}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="text-[10px] font-mono uppercase tracking-wider text-mint-500 mb-1">
                                  改动后
                                </div>
                                <div className="font-mono text-sm font-bold text-ink-800">
                                  {labelOf(event.afterValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${versionColorDot(batch.boardVersion)}`}
                      />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
