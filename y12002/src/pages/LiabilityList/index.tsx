import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { StatusTag } from '@/components/ui/StatusTag';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatMiles } from '@/utils/number';
import { formatDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { LiabilityRecord } from '@/types';

export const LiabilityListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    recordId: string | null;
    isBatch: boolean;
  }>({ isOpen: false, recordId: null, isBatch: false });
  const [reviewComment, setReviewComment] = useState('');

  const getFilteredRecords = useAppStore((state) => state.getFilteredRecords);
  const selectedRecords = useAppStore((state) => state.selectedRecords);
  const toggleSelected = useAppStore((state) => state.toggleSelected);
  const clearSelected = useAppStore((state) => state.clearSelected);
  const selectAll = useAppStore((state) => state.selectAll);
  const markReviewed = useAppStore((state) => state.markReviewed);
  const markBatchReviewed = useAppStore((state) => state.markBatchReviewed);
  const loading = useAppStore((state) => state.loading);
  const filters = useAppStore((state) => state.filters);

  const records = useMemo(() => {
    return getFilteredRecords(filters.includeExpired);
  }, [getFilteredRecords, filters.includeExpired]);

  const totalPages = Math.ceil(records.length / pageSize);
  const paginatedRecords = records.slice((page - 1) * pageSize, page * pageSize);
  const allSelectedOnPage = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRecords.includes(r.id));

  const handleReviewSubmit = () => {
    if (!reviewComment.trim()) {
      alert('请填写复核意见');
      return;
    }

    if (reviewModal.isBatch) {
      markBatchReviewed(selectedRecords, reviewComment);
    } else if (reviewModal.recordId) {
      markReviewed(reviewModal.recordId, reviewComment);
    }

    setReviewModal({ isOpen: false, recordId: null, isBatch: false });
    setReviewComment('');
  };

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      clearSelected();
    } else {
      selectAll(paginatedRecords.map(r => r.id));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">
            里程兑付负债主表
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {records.length} 条记录，当前显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, records.length)} 条
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedRecords.length > 0 && (
            <>
              <span className="text-sm text-gray-500">
                已选择 {selectedRecords.length} 条
              </span>
              <button
                onClick={() => setReviewModal({ isOpen: true, recordId: null, isBatch: true })}
                className="btn btn-success gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                批量复核
              </button>
              <button
                onClick={clearSelected}
                className="btn btn-ghost"
              >
                取消选择
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/export')}
            className="btn btn-primary gap-2"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>
      </div>

      <FilterPanel />

      {filters.includeExpired && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">包含过期里程记录</p>
            <p className="text-xs text-red-600 mt-1">
              当前显示包含过期里程记录。这些记录默认不参与正常兑付计算，仅供查看和处理。
              过期记录仅在"特殊业务复核-里程过期专区"进行处理。
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1400px]">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="table-header w-12">
                  <button onClick={handleSelectAll} className="p-1">
                    {allSelectedOnPage ? (
                      <CheckSquare className="w-4 h-4 text-[#1E3A5F]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="table-header">会员号</th>
                <th className="table-header">会员姓名</th>
                <th className="table-header">账户类型</th>
                <th className="table-header text-right">剩余里程</th>
                <th className="table-header text-right">估算负债</th>
                <th className="table-header">业务类型</th>
                <th className="table-header">复核状态</th>
                <th className="table-header">过期日期</th>
                <th className="table-header">最近交易</th>
                <th className="table-header">复核人</th>
                <th className="table-header text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="table-cell text-center py-12 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin-slow" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="table-cell text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="w-12 h-12 text-gray-300" />
                      <p>暂无符合条件的数据</p>
                      <p className="text-sm">请尝试调整筛选条件</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    isSelected={selectedRecords.includes(record.id)}
                    onToggleSelect={() => toggleSelected(record.id)}
                    onView={() => navigate(`/liability/${record.id}`)}
                    onTrace={() => navigate(`/trace/${record.id}`)}
                    onReview={() => {
                      setReviewModal({ isOpen: true, recordId: record.id, isBatch: false });
                      setReviewComment('');
                    }}
                    stagger={index % 4}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            显示 {paginatedRecords.length} 条 / 共 {records.length} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-ghost gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-9 h-9 rounded-md text-sm font-medium transition-colors',
                      page === pageNum
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-ghost gap-1"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false, recordId: null, isBatch: false })}
        title={reviewModal.isBatch ? '批量复核' : '复核确认'}
        size="md"
        footer={
          <>
            <button
              onClick={() => setReviewModal({ isOpen: false, recordId: null, isBatch: false })}
              className="btn btn-ghost"
            >
              取消
            </button>
            <button
              onClick={handleReviewSubmit}
              className="btn btn-success"
            >
              确认复核
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              {reviewModal.isBatch
                ? `即将对 ${selectedRecords.length} 条记录进行复核标记`
                : '即将对该条记录进行复核标记'}
            </p>
          </div>
          <div>
            <label className="label">复核意见</label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入复核意见，例如：数据一致，复核通过"
              className="input min-h-[120px] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              复核完成后，系统将自动记录复核人和复核时间
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const RecordRow: React.FC<{
  record: LiabilityRecord;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onTrace: () => void;
  onReview: () => void;
  stagger: number;
}> = ({ record, isSelected, onToggleSelect, onView, onTrace, onReview, stagger }) => {
  const isTestAccount = record.memberNo === 'TEST-2024-EXPIRE';

  return (
    <tr
      className={cn(
        'table-row',
        record.reviewStatus === '已复核' && 'table-row-reviewed',
        record.isExpired && 'bg-red-50/30',
        isTestAccount && 'bg-yellow-50/50',
        `animate-fade-in stagger-${stagger + 1}`
      )}
    >
      <td className="table-cell">
        <button onClick={onToggleSelect} className="p-1">
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-[#1E3A5F]" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </td>
      <td className="table-cell font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className={cn(isTestAccount && 'text-yellow-700 font-semibold')}>
            {record.memberNo}
          </span>
          {isTestAccount && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded">
              测试账户
            </span>
          )}
          {record.isExpired && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded">
              已过期
            </span>
          )}
        </div>
      </td>
      <td className="table-cell">{record.memberName}</td>
      <td className="table-cell">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          record.accountType === '白金卡' && 'bg-gray-100 text-gray-700',
          record.accountType === '金卡' && 'bg-amber-100 text-amber-700',
          record.accountType === '银卡' && 'bg-slate-100 text-slate-600',
          record.accountType === '普通' && 'bg-blue-50 text-blue-700',
        )}>
          {record.accountType}
        </span>
      </td>
      <td className="table-cell text-right font-mono">
        {formatMiles(record.remainingMiles)}
      </td>
      <td className="table-cell text-right font-semibold text-[#1E3A5F]">
        {formatCurrency(record.estimatedLiability)}
      </td>
      <td className="table-cell">
        <StatusTag status={record.businessCategory} type="business" />
      </td>
      <td className="table-cell">
        <StatusTag status={record.reviewStatus} type="review" />
      </td>
      <td className="table-cell">
        <span className={cn(
          record.isExpired && 'text-red-600 font-medium'
        )}>
          {formatDate(record.expireDate)}
        </span>
      </td>
      <td className="table-cell max-w-[150px] truncate" title={record.latestTransaction?.description}>
        {record.latestTransaction ? (
          <div>
            <p className="text-xs text-gray-500">
              {formatDate(record.latestTransaction.transactionDate)}
            </p>
            <p className="text-xs truncate">
              {record.latestTransaction.description}
            </p>
          </div>
        ) : '-'}
      </td>
      <td className="table-cell text-gray-500 text-sm">
        {record.reviewer || '-'}
      </td>
      <td className="table-cell">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onView}
            className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 rounded transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onTrace}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="追溯链路"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          {record.reviewStatus !== '已复核' && (
            <button
              onClick={onReview}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="标记复核"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
