import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Download, AlertTriangle } from 'lucide-react';
import { useVestingStore } from '../../store/useVestingStore';
import {
  formatNumber,
  getStatusText,
  getExceptionTypeText,
  getExceptionBadgeClass,
} from '../../utils/format';
import { StatusBadge } from '../common/StatusBadge';
import type { VestingSummary } from '../../../shared/types';

export function VestingList() {
  const navigate = useNavigate();
  const {
    summaries,
    summariesLoading,
    searchQuery,
    filterStatus,
    filterException,
    setSearchQuery,
    setFilterStatus,
    setFilterException,
  } = useVestingStore();

  const filteredSummaries = summaries.filter((s) => {
    const matchSearch =
      s.employeeName.includes(searchQuery) ||
      s.employeeNo.includes(searchQuery) ||
      s.department.includes(searchQuery);
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchException =
      !filterException ||
      (filterException === 'has' && s.hasException) ||
      (filterException === 'none' && !s.hasException);
    return matchSearch && matchStatus && matchException;
  });

  if (summariesLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="搜索员工姓名、工号、部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">全部状态</option>
                <option value="active">在职</option>
                <option value="terminated">已离职</option>
              </select>
              <select
                value={filterException}
                onChange={(e) => setFilterException(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">全部异常</option>
                <option value="has">有异常</option>
                <option value="none">无异常</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            共 <span className="font-mono font-semibold text-slate-700">{filteredSummaries.length}</span> 条记录
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>员工信息</th>
              <th>部门</th>
              <th>状态</th>
              <th className="text-right">授予总数</th>
              <th className="text-right">已归属</th>
              <th className="text-right">待归属</th>
              <th className="text-right">已作废</th>
              <th className="text-right">已行权</th>
              <th className="text-right">可行权</th>
              <th>异常</th>
              <th className="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSummaries.map((summary) => (
              <TableRow key={summary.employeeId} summary={summary} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableRow({ summary }: { summary: VestingSummary }) {
  const navigate = useNavigate();

  const getRowClass = () => {
    if (summary.status === 'terminated') return 'bg-slate-50/50';
    if (summary.hasException) return 'bg-warning-50/30';
    return '';
  };

  return (
    <tr className={getRowClass()}>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium text-sm">
            {summary.employeeName.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-slate-900">
              {summary.employeeName}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {summary.employeeNo}
            </div>
          </div>
        </div>
      </td>
      <td className="text-slate-600">{summary.department}</td>
      <td>
        <StatusBadge
          status={summary.status}
          text={getStatusText(summary.status)}
        />
      </td>
      <td className="text-right font-mono text-slate-700">
        {formatNumber(summary.totalGranted)}
      </td>
      <td className="text-right font-mono text-success-700 font-medium">
        {formatNumber(summary.totalVested)}
      </td>
      <td className="text-right font-mono text-slate-500">
        {formatNumber(summary.totalPending)}
      </td>
      <td className="text-right font-mono text-slate-400 line-through">
        {formatNumber(summary.totalForfeited)}
      </td>
      <td className="text-right font-mono text-primary-700">
        {formatNumber(summary.totalExercised)}
      </td>
      <td className="text-right font-mono font-semibold text-slate-900">
        {formatNumber(summary.totalAvailable)}
      </td>
      <td>
        {summary.hasException ? (
          <span
            className={`status-badge ${getExceptionBadgeClass(
              summary.exceptionType || '',
            )} gap-1`}
          >
            <AlertTriangle size={12} />
            {getExceptionTypeText(summary.exceptionType || '')}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
      <td>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => navigate(`/vesting/${summary.employeeId}`)}
            className="p-2 text-slate-500 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => {
              const { downloadEmployeeCSV } = require('../../utils/api').api;
              downloadEmployeeCSV(summary.employeeId);
            }}
            className="p-2 text-slate-500 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
            title="导出明细"
          >
            <Download size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
