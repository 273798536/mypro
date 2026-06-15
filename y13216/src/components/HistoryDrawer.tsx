import { X, Clock, ArrowRight, User, CheckCircle2, AlertTriangle, AlertOctagon, PencilLine, FilePlus, ShieldAlert, Play, CheckCheck } from 'lucide-react';
import type { ConflictRecord, HistoryAction } from '@/types';
import { HISTORY_ACTION_LABEL, STATUS_LABEL } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  record: ConflictRecord | null;
  onClose: () => void;
}

const actionIcon = (action: HistoryAction) => {
  switch (action) {
    case 'create':
      return <Play className="w-3.5 h-3.5" />;
    case 'status_change':
      return <ArrowRight className="w-3.5 h-3.5" />;
    case 'remark_edit':
      return <PencilLine className="w-3.5 h-3.5" />;
    case 'annotation_override':
      return <ShieldAlert className="w-3.5 h-3.5" />;
    case 'append_note':
      return <FilePlus className="w-3.5 h-3.5" />;
    case 'add_evidence':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'confirm_pending':
      return <CheckCheck className="w-3.5 h-3.5" />;
  }
};

const actionColor = (action: HistoryAction) => {
  switch (action) {
    case 'create':
      return { dotBg: '#4f46e5', dot: 'bg-brand-600', line: 'bg-brand-200', chip: 'bg-brand-50 text-brand-700 border-brand-100' };
    case 'status_change':
      return { dotBg: '#0ea5e9', dot: 'bg-sky-500', line: 'bg-sky-200', chip: 'bg-sky-50 text-sky-700 border-sky-100' };
    case 'remark_edit':
      return { dotBg: '#8b5cf6', dot: 'bg-violet-500', line: 'bg-violet-200', chip: 'bg-violet-50 text-violet-700 border-violet-100' };
    case 'annotation_override':
      return { dotBg: '#dc2626', dot: 'bg-status-confirm', line: 'bg-status-confirm/30', chip: 'bg-status-confirmBg text-status-confirm border-status-confirm/30' };
    case 'append_note':
      return { dotBg: '#f59e0b', dot: 'bg-amber-500', line: 'bg-amber-200', chip: 'bg-status-evidenceBg text-status-evidence border-status-evidence/30' };
    case 'add_evidence':
      return { dotBg: '#059669', dot: 'bg-status-resolved', line: 'bg-status-resolved/30', chip: 'bg-status-resolvedBg text-status-resolved border-status-resolved/30' };
    case 'confirm_pending':
      return { dotBg: '#059669', dot: 'bg-emerald-600', line: 'bg-emerald-200', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  }
};

const statusIcon = (status: string) => {
  if (status === 'resolved') return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'pending_evidence') return <AlertTriangle className="w-3 h-3" />;
  if (status === 'pending_confirm') return <AlertOctagon className="w-3 h-3" />;
  return null;
};

export default function HistoryDrawer({ record, onClose }: Props) {
  if (!record) return null;

  const sortedHistory = [...record.history].reverse();

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-paper-50 shadow-2xl border-l border-paper-200 flex flex-col animate-slide-in">
        <div className="px-6 py-5 bg-white border-b border-paper-200 sticky top-0 z-10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 text-brand-700 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 leading-tight">{record.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                变更历史 · 共 {record.history.length} 条 · 不可删除
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="relative">
            {sortedHistory.map((h, idx) => {
              const colors = actionColor(h.action);
              const isLast = idx === sortedHistory.length - 1;
              return (
                <div key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute left-[14px] top-8 bottom-0 w-0.5',
                        colors.line
                      )}
                    />
                  )}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white z-10 ring-4 ring-paper-50 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${colors.dotBg} 0%, ${colors.dotBg}dd 100%)`,
                    }}
                  >
                    {actionIcon(h.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2',
                        colors.chip
                      )}
                    >
                      {actionIcon(h.action)}
                      {HISTORY_ACTION_LABEL[h.action]}
                    </div>

                    {h.action === 'status_change' && h.fromValue && h.toValue && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-600 font-mono">
                          {statusIcon(h.fromValue)}
                          {STATUS_LABEL[h.fromValue as keyof typeof STATUS_LABEL] || h.fromValue}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-brand-100 text-brand-700 font-bold font-mono">
                          {statusIcon(h.toValue)}
                          {STATUS_LABEL[h.toValue as keyof typeof STATUS_LABEL] || h.toValue}
                        </span>
                      </div>
                    )}

                    {(h.action === 'remark_edit' || h.action === 'annotation_override') && (
                      <div className="space-y-1.5 mb-2">
                        {h.fromValue && (
                          <div className="text-[11px] text-gray-500 line-through decoration-status-confirm/50 italic bg-gray-50 rounded px-2.5 py-1.5 border border-gray-100">
                            <span className="font-semibold not-italic line-through-none text-gray-600 mr-1">旧：</span>
                            {h.fromValue}
                          </div>
                        )}
                        {h.toValue && (
                          <div className="text-[11px] text-gray-700 bg-brand-50/60 rounded px-2.5 py-1.5 border border-brand-100/60">
                            <span className="font-bold text-brand-700 mr-1">新：</span>
                            {h.toValue}
                          </div>
                        )}
                      </div>
                    )}

                    {(h.action === 'append_note' || h.action === 'add_evidence' || h.action === 'create') && h.toValue && (
                      <div className="text-[11px] text-gray-700 bg-white rounded px-2.5 py-1.5 border border-gray-100 mb-2 leading-relaxed">
                        {h.toValue}
                      </div>
                    )}

                    {h.action === 'confirm_pending' && (
                      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-confirmBg text-status-confirm font-mono font-bold">
                          {statusIcon('pending_confirm')}挂起
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-evidenceBg text-status-evidence font-mono font-bold">
                          {statusIcon('pending_evidence')}需补证据
                        </span>
                      </div>
                    )}

                    {h.reason && (
                      <div className="text-[11px] text-status-confirm/90 bg-status-confirmBg/60 rounded px-2.5 py-1.5 border-l-2 border-status-confirm mb-2 leading-relaxed">
                        <span className="font-bold">原因：</span>
                        {h.reason}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2 font-mono">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {h.operator}
                      </span>
                      <span>{h.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-paper-200 text-[11px] text-gray-500 leading-relaxed">
          <div className="flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-status-confirm mt-0.5" />
            <div>
              <span className="font-semibold text-gray-700">保守判断机制：</span>
              所有历史为 append-only 结构，永不修改或删除。凡批注覆盖旧判断，系统自动挂起待确认，避免假稳定结论。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
