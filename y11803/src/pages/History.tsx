import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { HistoryTimeline } from '@/components/history/HistoryTimeline';
import { ExportButton } from '@/components/common/ExportButton';
import { useAppStore } from '@/store/useAppStore';
import { getHistoryExportMapping, formatHistoryForExport } from '@/utils/exportUtils';
import { Search, Filter, X } from 'lucide-react';
import { useMemo } from 'react';
import { getActionLabel } from '@/utils/formatters';
import type { HistoryAction } from '@/types';

const actionOptions: (HistoryAction | '')[] = ['', 'create', 'status_update', 'amount_correction', 'note_add', 'duplicate_mark', 'cross_batch_freeze', 'overdraft_warning', 'unfreeze', 'export'];

export default function History() {
  const historyRecords = useAppStore(state => state.historyRecords);
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<HistoryAction | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredRecords = useMemo(() => {
    let result = [...historyRecords];

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(r =>
        r.id.toLowerCase().includes(kw) ||
        r.refundOrderId.toLowerCase().includes(kw) ||
        r.operatorOriginalName.toLowerCase().includes(kw) ||
        r.reason.toLowerCase().includes(kw)
      );
    }

    if (actionFilter) {
      result = result.filter(r => r.action === actionFilter);
    }

    return result;
  }, [historyRecords, keyword, actionFilter]);

  const hasFilters = keyword || actionFilter;

  const handleReset = () => {
    setKeyword('');
    setActionFilter('');
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black font-mono text-slate-800">
          操作历史
        </h2>
        <ExportButton
          data={formatHistoryForExport(filteredRecords)}
          filename="操作历史"
          fieldMapping={getHistoryExportMapping()}
          label="导出历史"
        />
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-amber-600" />
            <span className="font-mono font-semibold text-slate-700">筛选条件</span>
            {hasFilters && (
              <span className="px-2 py-0.5 text-xs font-mono bg-amber-500 text-white rounded">
                已筛选
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm font-mono text-slate-500 hover:text-amber-600 transition-colors"
            >
              {showFilters ? '收起' : '展开'}
            </button>
            {hasFilters && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-mono text-slate-500 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <X size={14} />
                重置
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">关键词搜索</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="搜索记录ID、退款单号、操作人、原因..."
                  className="w-full pl-9 pr-4 py-2 text-sm font-mono border-2 border-slate-300 rounded focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">操作类型</label>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value as HistoryAction | '')}
                className="w-full px-3 py-2 text-sm font-mono border-2 border-slate-300 rounded focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value="">全部操作</option>
                {actionOptions.filter(a => a).map(action => (
                  <option key={action} value={action}>{getActionLabel(action)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 text-sm font-mono text-slate-500">
          共 {filteredRecords.length} 条记录
          {hasFilters && ` (已筛选，原始 ${historyRecords.length} 条)`}
        </div>
      </div>

      <HistoryTimeline />
    </PageContainer>
  );
}
