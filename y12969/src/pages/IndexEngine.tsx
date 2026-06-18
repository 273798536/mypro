import { useState } from 'react';
import {
  Search,
  ArrowUp,
  Gauge,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import { api, formatDate } from '@/utils/api';
import type { IndexSuggestion } from '../../shared/types';

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-rose-soft text-rose-700 border-rose/30',
  medium: 'bg-amber-soft text-amber-700 border-amber/30',
  low: 'bg-navy-50 text-navy-700 border-navy-300',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

function SuggestionCard({
  suggestion,
  onRefresh,
}: {
  suggestion: IndexSuggestion;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [workOrder, setWorkOrder] = useState(suggestion.relatedWorkOrder || '');
  const [extraReason, setExtraReason] = useState('');
  const [diffView, setDiffView] = useState<{ before: string; after: string } | null>(null);

  const handleReattribute = async () => {
    if (!workOrder.trim() && !extraReason.trim()) {
      alert('请填写工单或归因补充说明');
      return;
    }
    setBusy(true);
    try {
      const result = await api.reattribute(suggestion.id, workOrder || undefined, extraReason || undefined);
      setDiffView({ before: result.attributionBefore, after: result.attributionAfter });
      onRefresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card animate-slide-up ${!suggestion.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-slatex-400 hover:text-navy-700"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge bg-navy-50 text-navy-700 border border-navy-200 mono">
                {suggestion.tableName}
              </span>
              <span className={`badge ${PRIORITY_STYLE[suggestion.priority]}`}>
                <ArrowUp className="w-3 h-3" /> {PRIORITY_LABEL[suggestion.priority]}
              </span>
              {suggestion.relatedWorkOrder && (
                <span className="badge bg-jade-soft text-jade-700 border-jade/30">
                  <LinkIcon className="w-3 h-3" /> {suggestion.relatedWorkOrder}
                </span>
              )}
              <span className="text-[11px] muted mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                归因更新于 {formatDate(suggestion.attributionUpdatedAt)}
              </span>
            </div>
            <div className="mt-2 mono text-sm bg-slatex-900 text-navy-100 rounded-md px-3 py-2 overflow-x-auto scroll-thin">
              {suggestion.suggestedIndex}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slatex-50 rounded-lg p-3 border border-slatex-100">
          <div className="label flex items-center gap-1">
            <Search className="w-3 h-3" /> 归因分析
          </div>
          <p className="text-xs text-slatex-700 mt-1 leading-relaxed">{suggestion.reason}</p>
        </div>
        <div className="bg-jade-soft/30 rounded-lg p-3 border border-jade/20">
          <div className="label flex items-center gap-1 text-jade-700">
            <Gauge className="w-3 h-3" /> 预期收益
          </div>
          <p className="text-xs text-jade-800 mt-1 leading-relaxed">{suggestion.expectedBenefit}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slatex-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-medium text-navy-700 mb-1">关联工单编号</div>
              <input
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                placeholder="如 WO-2026-0211"
                className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-navy-700 mb-1">归因补充说明</div>
              <input
                value={extraReason}
                onChange={(e) => setExtraReason(e.target.value)}
                placeholder="补充工单信息后的慢查询归因说明..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] muted">
              提交后将触发慢查询归因重算，索引建议并非一次性判断，会随工单补录持续更新
            </div>
            <button onClick={handleReattribute} className="btn-primary" disabled={busy}>
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
              {busy ? '重算中...' : '重算归因并更新'}
            </button>
          </div>

          {diffView && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slatex-100">
              <div className="bg-slatex-50 border border-slatex-200 rounded-lg p-3">
                <div className="label mb-1">重算前归因</div>
                <p className="text-xs text-slatex-700 leading-relaxed">{diffView.before}</p>
              </div>
              <div className="bg-jade-soft/20 border border-jade/30 rounded-lg p-3">
                <div className="label text-jade-700 mb-1">重算后归因</div>
                <p className="text-xs text-jade-800 leading-relaxed">{diffView.after}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IndexEngine() {
  const { suggestions, refreshSuggestions } = useAuditStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">索引建议引擎</h1>
        <p className="muted text-sm mt-1">
          持续性索引建议，非一次性判断；业务工单补录后，慢查询归因会联动更新
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-rose-soft/50 text-rose flex items-center justify-center">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div>
            <div className="label">高优先级</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {suggestions.filter((s) => s.priority === 'high').length}
            </div>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-soft/50 text-amber flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="label">中优先级</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {suggestions.filter((s) => s.priority === 'medium').length}
            </div>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="label">关联工单</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {suggestions.filter((s) => s.relatedWorkOrder).length}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} onRefresh={refreshSuggestions} />
        ))}
        {suggestions.length === 0 && (
          <div className="card text-center py-10 muted">暂无索引建议</div>
        )}
      </div>
    </div>
  );
}
