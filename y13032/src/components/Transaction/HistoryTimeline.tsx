import { useState } from 'react';
import {
  History,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  FileSearch,
  MessageSquare,
  GitBranch,
  Paperclip,
} from 'lucide-react';
import type { HistoryRecord } from '@/types';

interface HistoryTimelineProps {
  histories: HistoryRecord[];
  transactionId: string;
}

export default function HistoryTimeline({ histories }: HistoryTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    histories[0]?.id ?? null
  );

  const sorted = [...histories].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="card p-6 animate-fade-up opacity-0" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-navy-600" strokeWidth={2} />
          <h3 className="section-title">历史变更记录</h3>
        </div>
        <span className="text-xs text-navy-500">
          保留：旧材料 · 新备注 · 改判原因
        </span>
      </div>
      <div className="divider-pattern mb-5" />

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-navy-400">
          暂无历史变更记录
        </div>
      ) : (
        <ol className="relative border-l-2 border-navy-100 ml-2 space-y-5">
          {sorted.map((record, idx) => {
            const isExpanded = expandedId === record.id;
            return (
              <li key={record.id} className="ml-5 relative">
                <span
                  className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    idx === 0 ? 'bg-amber' : 'bg-navy-300'
                  }`}
                >
                  <span
                    className={`block w-1.5 h-1.5 rounded-full ${
                      idx === 0 ? 'bg-white' : 'bg-white'
                    }`}
                  />
                </span>

                <button
                  onClick={() => toggle(record.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-3 p-3 rounded-sm hover:bg-navy-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <GitBranch className="w-4 h-4 text-navy-500 shrink-0" strokeWidth={1.8} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-navy-700 truncate">
                            {record.newRemark.length > 40
                              ? record.newRemark.slice(0, 40) + '…'
                              : record.newRemark}
                          </span>
                          {idx === 0 && (
                            <span className="chip bg-amber/15 text-amber-dark text-[10px]">
                              最新
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-navy-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" strokeWidth={1.8} />
                            {record.changedAt}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" strokeWidth={1.8} />
                            {record.changedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-navy-400 shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-navy-400 shrink-0" strokeWidth={2} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2 ml-7 mr-2 p-4 bg-cream/50 border border-navy-100 rounded-sm space-y-3 animate-fade-up">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy-500 tracking-wide mb-1.5">
                        <FileSearch className="w-3 h-3" strokeWidth={1.8} />
                        旧结论
                      </div>
                      <div className="text-sm text-navy-600 bg-white/70 px-3 py-2 border border-navy-100 rounded-sm line-through decoration-navy-300">
                        {record.oldConclusion}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-dark tracking-wide mb-1.5">
                        <MessageSquare className="w-3 h-3" strokeWidth={1.8} />
                        新备注
                      </div>
                      <div className="text-sm text-navy-700 bg-amber/8 px-3 py-2 border border-amber/20 rounded-sm">
                        {record.newRemark}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy-600 tracking-wide mb-1.5">
                        <GitBranch className="w-3 h-3" strokeWidth={1.8} />
                        改判原因
                      </div>
                      <div className="text-sm text-navy-700 bg-white px-3 py-2 border border-navy-100 rounded-sm">
                        {record.changeReason}
                      </div>
                    </div>

                    {record.oldMaterials && record.oldMaterials.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy-500 tracking-wide mb-1.5">
                          <Paperclip className="w-3 h-3" strokeWidth={1.8} />
                          旧材料引用
                        </div>
                        <ul className="text-xs text-navy-600 space-y-1 bg-white/60 px-3 py-2 border border-navy-100 rounded-sm">
                          {record.oldMaterials.map((m, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-navy-400 mt-0.5">·</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
