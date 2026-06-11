import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, User, ArrowRight, Plus, RotateCcw, AlertTriangle, FilePlus, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore.js';
import { formatDate } from '@/lib/api.js';
import { StatusBadge } from '@/components/StatusBadge.js';
import { ACTION_LABEL } from '../../shared/types.js';
import type { HistoryAction } from '../../shared/types.js';

const actionIcon: Record<HistoryAction, LucideIcon> = {
  create: Plus,
  review: ArrowRight,
  rejudge: RotateCcw,
  mark_abnormal: AlertTriangle,
  supplement: FilePlus,
};

const actionBg: Record<HistoryAction, string> = {
  create: 'bg-slate-100 text-slate-600 border-slate-300',
  review: 'bg-sky-50 text-sky-700 border-sky-200',
  rejudge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  mark_abnormal: 'bg-amber-50 text-amber-700 border-amber-200',
  supplement: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history, loadHistory, loading } = useAppStore();
  const [filterAction, setFilterAction] = useState<HistoryAction | ''>('');
  const [filterCase, setFilterCase] = useState('');
  const [filterOperator, setFilterOperator] = useState('');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const list = history.filter((h) => {
    if (filterAction && h.action !== filterAction) return false;
    if (filterCase && !h.caseNumber.includes(filterCase)) return false;
    if (filterOperator && !h.operator.includes(filterOperator)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-marine-800 font-mono flex items-center gap-2">
          <History className="w-5 h-5" />
          操作历史
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">全量操作流水，含改判、补录、异常标记，均写回后端持久化</p>
      </div>

      <div className="eng-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">操作类型</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as HistoryAction | '')}
            className="eng-input !py-1.5 text-xs !w-auto"
          >
            <option value="">全部</option>
            {(Object.keys(ACTION_LABEL) as HistoryAction[]).map((a) => (
              <option key={a} value={a}>{ACTION_LABEL[a]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">案件编号</span>
          <input
            value={filterCase}
            onChange={(e) => setFilterCase(e.target.value)}
            placeholder="如 BH-2024-001"
            className="eng-input !py-1.5 text-xs !w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">操作人</span>
          <input
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            placeholder="如 老何"
            className="eng-input !py-1.5 text-xs !w-36"
          />
        </div>
        {(filterAction || filterCase || filterOperator) && (
          <button
            className="eng-btn !px-2.5 !py-1.5 text-xs"
            onClick={() => {
              setFilterAction('');
              setFilterCase('');
              setFilterOperator('');
            }}
          >
            清除
          </button>
        )}
      </div>

      <div className="space-y-3 relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-marine-600 via-marine-300 to-slate-200" />

        {loading && <div className="text-center py-12 text-slate-400">加载中…</div>}
        {!loading && list.length === 0 && (
          <div className="text-center py-12 text-slate-400">暂无操作记录</div>
        )}

        {list.map((h, idx) => {
          const Icon = actionIcon[h.action];
          return (
            <div
              key={h.id}
              className="relative animate-stagger-fade"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className={`absolute left-0 top-3 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                h.action === 'rejudge' ? 'border-indigo-500' :
                h.action === 'mark_abnormal' ? 'border-amber-500' :
                h.action === 'supplement' ? 'border-purple-500' :
                h.action === 'review' ? 'border-sky-500' : 'border-slate-400'
              }`}>
                <Icon className={`w-2.5 h-2.5 ${
                  h.action === 'rejudge' ? 'text-indigo-500' :
                  h.action === 'mark_abnormal' ? 'text-amber-500' :
                  h.action === 'supplement' ? 'text-purple-500' :
                  h.action === 'review' ? 'text-sky-500' : 'text-slate-500'
                }`} />
              </div>

              <div className="eng-card p-3 ml-6 hover:shadow-engineering-hover transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`eng-chip ${actionBg[h.action]} text-xs`}>
                        <Icon className="w-3 h-3" />
                        {ACTION_LABEL[h.action]}
                      </span>
                      {h.isSupplement && (
                        <span className="eng-chip bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          <FilePlus className="w-3 h-3" />
                          补录记录
                        </span>
                      )}
                      <span
                        className="font-mono text-sm font-bold text-marine-700 cursor-pointer hover:underline"
                        onClick={() => navigate(`/cases/${h.caseId}`)}
                      >
                        {h.caseNumber}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{h.reason}</p>
                    )}
                    {(h.fromStatus || h.toStatus) && (
                      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                        {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        {h.toStatus && <StatusBadge status={h.toStatus} />}
                      </div>
                    )}
                    {h.abnormalNote && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-800">
                        <span className="font-semibold">异常说明：</span>{h.abnormalNote}
                      </div>
                    )}
                    {(h.linkedPhotoIds && h.linkedPhotoIds.length > 0) || (h.linkedAttachmentIds && h.linkedAttachmentIds.length > 0) ? (
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] font-mono">
                        {h.linkedPhotoIds && h.linkedPhotoIds.length > 0 && (
                          <span className="eng-chip bg-sky-50 text-sky-700 border-sky-200">
                            📷 关联证据照片 {h.linkedPhotoIds.length} 张
                          </span>
                        )}
                        {h.linkedObjectIds && h.linkedObjectIds.length > 0 && (
                          <span className="eng-chip bg-indigo-50 text-indigo-700 border-indigo-200">
                            📍 关联碰撞对象 {h.linkedObjectIds.length} 个
                          </span>
                        )}
                        {h.linkedAttachmentIds && h.linkedAttachmentIds.length > 0 && (
                          <span className="eng-chip bg-emerald-50 text-emerald-700 border-emerald-200">
                            📎 关联晚到附件 {h.linkedAttachmentIds.length} 个
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      <span className="font-medium text-slate-700">{h.operator}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{formatDate(h.operatedAt)}</p>
                    <button
                      onClick={() => navigate(`/cases/${h.caseId}`)}
                      className="eng-btn !px-2 !py-1 text-[11px] mt-2"
                    >
                      查看案件
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
