import { useState } from 'react';
import { AlertTriangle, MapPin, Merge, ChevronDown, ChevronRight } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';
import type { OperatorType, HistoryEntry } from '@/shared/types';

const OPERATOR_COLORS: Record<OperatorType, string> = {
  老曹: 'bg-amber-warn text-space-deep',
  系统: 'bg-white/30 text-white/70',
  项目经理: 'bg-cyan-glow text-space-deep',
};

const OPERATOR_DOT: Record<OperatorType, string> = {
  老曹: 'bg-amber-warn',
  系统: 'bg-white/40',
  项目经理: 'bg-cyan-glow',
};

export default function ComplaintDetail() {
  const {
    complaints,
    selectedId,
    mergeSuggestions,
    setShowMergeModal,
    setShowCoordIssuePanel,
  } = useBusinessStore();
  const [expandedHistId, setExpandedHistId] = useState<number | null>(null);

  const selected = complaints.find((c) => c.id === selectedId);

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center bg-panel-blue border border-white/10 rounded-sm shadow-panel">
        <span className="text-white/30 text-sm">请选择一条投诉记录</span>
      </div>
    );
  }

  const mergeGroup = mergeSuggestions.find(
    (m) => m.groupId === selected.mergeGroupId || m.complaintIds.includes(selected.id)
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso.replace(' ', 'T'));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}`;
  };

  const Field = ({ label, value }: { label: string; value: string | number }) => (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-sm text-white/80 font-mono">{value}</div>
    </div>
  );

  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="h-full flex flex-col bg-panel-blue border border-white/10 rounded-sm shadow-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-cyan-glow" />
          <span className="text-lg text-white font-mono">{selected.intersection}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="时间" value={formatTime(selected.occurredAt)} />
          <Field label="来源" value={selected.source} />
          <Field label="经度" value={selected.lng.toFixed(6)} />
          <Field label="纬度" value={selected.lat.toFixed(6)} />
          <div className="col-span-2">
            <div className="text-xs text-white/40 mb-1">投诉内容</div>
            <div className="text-sm text-white/80 leading-relaxed">{selected.content}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {selected.coordIssue && (
          <div className="border border-red-reject/30 bg-red-reject/10 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-reject" />
              <span className="text-sm text-red-reject font-medium">坐标异常</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <span className="text-white/40">偏移距离：</span>
                <span className="text-red-reject font-mono">{selected.coordIssue.offsetMeters}m</span>
              </div>
              <div>
                <span className="text-white/40">疑似街口：</span>
                <span className="text-white/80">{selected.coordIssue.suspectedIntersection}</span>
              </div>
              <div className="col-span-2">
                <span className="text-white/40">原因：</span>
                <span className="text-white/80">{selected.coordIssue.reason}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCoordIssuePanel(true)}
              className="w-full py-2 text-sm text-white bg-red-reject hover:bg-red-reject/80 rounded-sm transition-colors"
            >
              修正坐标
            </button>
          </div>
        )}

        {mergeGroup && (
          <div className="border border-purple-merge/30 bg-purple-merge/10 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Merge size={16} className="text-purple-merge" />
              <span className="text-sm text-purple-merge font-medium">归并建议</span>
            </div>
            <div className="space-y-2 mb-3">
              {mergeGroup.differences.map((d) => (
                <div key={d.complaintId} className="text-xs bg-space-deep/50 p-2 rounded-sm">
                  <div className="text-white/60 font-mono">{formatTime(d.occurredAt)}</div>
                  <div className="text-white/40 mt-0.5">来源: {d.source} | 状态: {d.status}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowMergeModal(mergeGroup.groupId)}
              className="w-full py-2 text-sm text-white bg-purple-merge hover:bg-purple-merge/80 rounded-sm transition-colors"
            >
              确认归并
            </button>
          </div>
        )}

        <div>
          <div className="text-sm text-white/60 mb-3">处理链</div>
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" />
            {selected.history.map((h: HistoryEntry, idx: number) => {
              const isFirst = idx === 0;
              const isExpanded = expandedHistId === idx;
              return (
                <div key={idx} className="relative pl-10 pb-4 last:pb-0">
                  <div
                    className={`absolute left-1.5 top-0.5 w-4 h-4 rounded-full border-2 border-panel-blue ${
                      OPERATOR_DOT[h.operator]
                    } ${isFirst ? 'ring-2 ring-cyan-glow/30' : ''}`}
                  />
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedHistId(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                            OPERATOR_COLORS[h.operator]
                          }`}
                        >
                          {h.operator}
                        </span>
                        <span className="text-xs text-white/80">{h.field}</span>
                        {isFirst && (
                          <span className="text-[10px] text-cyan-glow border border-cyan-glow/30 px-1.5 py-0.5 rounded-sm">
                            系统入库
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-white/40" />
                      ) : (
                        <ChevronRight size={14} className="text-white/40" />
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 mt-1 font-mono">{formatTime(h.ts)}</div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 bg-space-deep/60 rounded-sm p-3 border border-white/5">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-white/40 mb-1">旧值</div>
                          <div className="text-red-reject/80 font-mono break-all">
                            {formatValue(h.oldValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/40 mb-1">新值</div>
                          <div className="text-green-ok/80 font-mono break-all">
                            {formatValue(h.newValue)}
                          </div>
                        </div>
                      </div>
                      {h.note && (
                        <div className="mt-2 pt-2 border-t border-white/5 text-xs text-white/50">
                          备注：{h.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
