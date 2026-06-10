import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Eye,
  ChevronDown,
  FlaskConical,
} from 'lucide-react';
import type { BatchReport, BatchStatus } from '../types';
import { useReportStore } from '../store/useReportStore';
import { getStatusText } from '../utils/validation';
import { SupplementModal } from './SupplementModal';

const STATUS_ICONS: Record<BatchStatus, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  pending: AlertTriangle,
  failed: XCircle,
};

const StatusTag: React.FC<{ status: BatchStatus }> = ({ status }) => {
  const Icon = STATUS_ICONS[status];
  const cls = {
    success: 'tag-success',
    pending: 'tag-pending',
    failed: 'tag-failed',
  }[status];
  return (
    <span className={cls}>
      <Icon className="w-3 h-3" />
      {getStatusText(status)}
    </span>
  );
};

export const BatchTable: React.FC = () => {
  const filterStatus = useReportStore((s) => s.filterStatus);
  const setFilterStatus = useReportStore((s) => s.setFilterStatus);
  const searchKeyword = useReportStore((s) => s.searchKeyword);
  const setSearchKeyword = useReportStore((s) => s.setSearchKeyword);
  const getFilteredBatches = useReportStore((s) => s.getFilteredBatches);
  const setSelectedBatchId = useReportStore((s) => s.setSelectedBatchId);
  const batches = getFilteredBatches();
  const [supplementFor, setSupplementFor] = useState<BatchReport | null>(null);

  const filters: { key: BatchStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'success', label: '放行' },
    { key: 'pending', label: '待确认' },
    { key: 'failed', label: '异常' },
  ];

  return (
    <div className="card-paper overflow-hidden">
      <div className="p-5 border-b border-paper-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-brand-700" />
            <h3 className="font-serif text-lg font-semibold text-brand-800">
              批次报告明细
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              共 {batches.length} 条
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索批次号 / 研究员 / 备注"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="input-field pl-9 w-64"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-paper-200 bg-white overflow-hidden">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterStatus === f.key
                      ? 'bg-brand-800 text-white'
                      : 'text-gray-600 hover:bg-paper-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="px-2 py-1.5 bg-paper-100 border-l border-paper-200">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
              </span>
            </div>
          </div>
        </div>
        {batches.some((b) => !b.hasBlankControl) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-status-failed bg-status-failed/10 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">存在空白对照缺失的批次，已自动标红拦截，请优先处理</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
            <th>批次号</th>
            <th>日期</th>
            <th>研究员</th>
            <th>目标化合物</th>
            <th className="text-right">选择性</th>
            <th>空白对照</th>
            <th>状态</th>
            <th className="min-w-[280px">人工备注</th>
            <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
              <td colSpan={9} className="text-center py-10 text-gray-400">
                暂无匹配数据
              </td>
            </tr>
            ) : (
              batches.map((b) => (
                <tr
                  key={b.id}
                  className={!b.hasBlankControl ? 'row-failed' : undefined}
                >
                <td className="font-mono text-brand-800 font-semibold">
                  {b.batchNo}
                </td>
                <td className="font-mono text-gray-600">{b.date}</td>
                <td className="text-gray-700">{b.researcher}</td>
                <td className="text-gray-700">{b.targetCompound}</td>
                <td className="text-right font-mono">
                  <span
                    className={`font-bold ${
                      b.selectivity >= b.selectivityThreshold
                        ? 'text-status-success'
                        : b.selectivity >= b.selectivityThreshold - 5
                        ? 'text-amber-600'
                        : 'text-status-failed'
                    }`}
                  >
                    {b.selectivity}%
                  </span>
                  <span className="text-xs text-gray-400"> / {b.selectivityThreshold}%</span>
                </td>
                <td>
                  {b.hasBlankControl ? (
                    <span className="tag-success">
                      <CheckCircle2 className="w-3 h-3" />完整
                    </span>
                  ) : (
                    <span className="tag-failed animate-pulse-soft">
                      <XCircle className="w-3 h-3" />缺失
                    </span>
                  )}
                </td>
                <td>
                  <StatusTag status={b.status} />
                </td>
                <td>
                  {b.manualNote ? (
                    <div className="note-cell max-w-xs">{b.manualNote}</div>
                  ) : (
                    <span className="text-gray-300 text-xs italic">无备注</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedBatchId(b.id)}
                      className="btn-ghost"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </button>
                    <button
                      onClick={() => setSupplementFor(b)}
                      className="btn-ghost"
                      title="补录数据"
                    >
                      <Edit3 className="w-4 h-4" />
                      补录
                    </button>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {supplementFor && (
        <SupplementModal
          batch={supplementFor}
          onClose={() => setSupplementFor(null)}
        />
      )}
    </div>
  );
};
