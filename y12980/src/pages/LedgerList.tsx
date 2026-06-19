import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  X
} from 'lucide-react';
import { useLedgerStore } from '../stores/ledgerStore.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { AnomalyBadge } from '../components/AnomalyBadge.js';
import type { RecordStatus, AnomalyType } from '../../shared/types.js';
import { STATUS_LABELS, ANOMALY_LABELS } from '../../shared/types.js';

export default function LedgerList() {
  const navigate = useNavigate();
  const { records, total, page, pageSize, loading, error, filters, statusCounts, fetchRecords, fetchStatusCounts, setFilters, clearFilters } = useLedgerStore();

  useEffect(() => {
    fetchRecords();
    fetchStatusCounts();
  }, [fetchRecords, fetchStatusCounts]);

  useEffect(() => {
    fetchRecords();
  }, [filters, page, pageSize, fetchRecords]);

  const totalPages = Math.ceil(total / pageSize);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  }, [page, totalPages]);

  const handleStatusFilter = (status?: RecordStatus) => {
    setFilters({ status });
  };

  const handleAnomalyFilter = (anomalyType?: AnomalyType) => {
    setFilters({ anomalyType });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">台账记录</h2>
          <p className="text-sm text-slate-400 mt-1">共 {total} 条记录，支持多维度筛选和状态追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { clearFilters(); fetchRecords(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={() => navigate('/export')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            导出报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => handleStatusFilter(filters.status === 'AVAILABLE' ? undefined : 'AVAILABLE')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            filters.status === 'AVAILABLE' 
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
              : 'bg-slate-800/50 border-slate-700 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-3xl font-bold text-emerald-400">{statusCounts.AVAILABLE}</span>
          </div>
          <p className="mt-3 text-sm text-slate-300 font-medium">可用记录</p>
        </div>

        <div 
          onClick={() => handleStatusFilter(filters.status === 'NEEDS_REVIEW' ? undefined : 'NEEDS_REVIEW')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            filters.status === 'NEEDS_REVIEW' 
              ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10' 
              : 'bg-slate-800/50 border-slate-700 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <span className={`text-3xl font-bold text-amber-400 ${statusCounts.NEEDS_REVIEW > 0 ? 'animate-pulse-slow' : ''}`}>
              {statusCounts.NEEDS_REVIEW}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300 font-medium">需DBA复核</p>
        </div>

        <div 
          onClick={() => handleStatusFilter(filters.status === 'UNAVAILABLE' ? undefined : 'UNAVAILABLE')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            filters.status === 'UNAVAILABLE' 
              ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10' 
              : 'bg-slate-800/50 border-slate-700 hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-3xl font-bold text-red-400">{statusCounts.UNAVAILABLE}</span>
          </div>
          <p className="mt-3 text-sm text-slate-300 font-medium">不可用记录</p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="搜索来源文件名..."
              value={filters.sourceFile || ''}
              onChange={(e) => setFilters({ sourceFile: e.target.value || undefined })}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filters.anomalyType || ''}
                onChange={(e) => handleAnomalyFilter(e.target.value as AnomalyType || undefined)}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">全部异常类型</option>
                {Object.entries(ANOMALY_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-slate-800">{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500">至</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ endDate: e.target.value || undefined })}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {(filters.status || filters.anomalyType || filters.sourceFile || filters.startDate || filters.endDate) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/30 text-sm hover:bg-red-500/20 transition-colors"
              >
                <X className="w-4 h-4" />
                清除筛选
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">记录编号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">异常类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">来源文件</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">原始行号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">创建时间</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    加载中...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    暂无符合条件的记录
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr 
                    key={record.id} 
                    className={`hover:bg-slate-700/30 transition-colors ${
                      record.status === 'UNAVAILABLE' ? 'bg-red-500/5' : 
                      record.status === 'NEEDS_REVIEW' ? 'bg-amber-500/5' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-mono text-sm text-slate-200">{record.recordNo}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <AnomalyBadge type={record.anomalyType} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-sm text-slate-300" title={record.sourceFile}>
                        {record.sourceFile}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-400">{record.originalLineNo}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/ledger/${record.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchRecords({ page: page - 1 })}
                disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {pageNumbers.map((num, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof num === 'number' && fetchRecords({ page: num })}
                  disabled={typeof num !== 'number'}
                  className={`min-w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    num === page 
                      ? 'bg-indigo-600 text-white' 
                      : typeof num === 'number'
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                        : 'text-slate-600 cursor-default'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => fetchRecords({ page: page + 1 })}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
