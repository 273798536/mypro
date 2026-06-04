import { useEffect, useState } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { RecordCard } from '../components/RecordCard';
import { ImportModal } from '../components/ImportModal';
import type { RecordStatus } from '../../shared/types';
import { STATUS_LABELS } from '../../shared/types';

export default function Home() {
  const { records, filters, loading, stats, setFilters, fetchRecords, fetchStats, error, clearError } = useStore();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RecordStatus | 'all'>('all');

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, []);

  const handleFilterClick = (filter: RecordStatus | 'all') => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setFilters({ status: undefined });
    } else {
      setFilters({ status: filter });
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleRefresh = () => {
    fetchRecords();
    fetchStats();
  };

  const filterOptions: { key: RecordStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.pending + stats.approved + stats.rejected + stats.anomaly },
    { key: 'pending', label: STATUS_LABELS.pending, count: stats.pending },
    { key: 'approved', label: STATUS_LABELS.approved, count: stats.approved },
    { key: 'rejected', label: STATUS_LABELS.rejected, count: stats.rejected },
    { key: 'anomaly', label: STATUS_LABELS.anomaly, count: stats.anomaly },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-slate-900">网格吸附</h1>
          <p className="text-sm text-slate-500 mt-1">日常入口 · 管理所有装载草图记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn btn-sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button onClick={() => setImportModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            导入草稿
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索批次号、月台号、车牌号..."
            className="input pl-10"
            value={filters.search}
            onChange={handleSearch}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleFilterClick(opt.key)}
              className={`btn btn-sm whitespace-nowrap ${
                activeFilter === opt.key ? 'btn-primary' : ''
              }`}
            >
              {opt.label}
              {opt.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  activeFilter === opt.key ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading && records.length === 0 ? (
        <div className="grid-container">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : records.length > 0 ? (
        <div className="grid-container">
          {records.map((record, index) => (
            <RecordCard key={record.id} record={record} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无记录</h3>
          <p className="text-slate-500 mb-4">点击"导入草稿"开始添加装载草图记录</p>
          <button onClick={() => setImportModalOpen(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            导入草稿
          </button>
        </div>
      )}

      <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
}
