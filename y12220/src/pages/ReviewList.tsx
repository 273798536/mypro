import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/calculator';
import dayjs from 'dayjs';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  User,
  Plane,
  RefreshCw,
  Filter,
} from 'lucide-react';
import Loading, { TableLoadingSkeleton } from '@/components/Loading';
import Empty from '@/components/Empty';
import { cn } from '@/lib/utils';
import type { RebookRecord } from '@/types';
import { getCabinName } from '@/utils/mockData';

export default function ReviewList() {
  const {
    rebookRecords,
    isLoading,
    initialize,
    loadRebookRecords,
    reviewRebook,
    currentUser,
  } = useStore();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [batchComment, setBatchComment] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(null);
  const [filter, setFilter] = useState<'all' | 'hasAnomaly' | 'noAnomaly'>('all');

  useEffect(() => {
    const init = async () => {
      await initialize();
      await loadRebookRecords();
      setTimeout(() => setIsPageLoading(false), 500);
    };
    init();
  }, [initialize, loadRebookRecords]);

  const pendingReviews = useMemo(() => {
    let records = rebookRecords.filter((r) => r.status === 'pending');

    if (filter === 'hasAnomaly') {
      records = records.filter((r) => r.anomalies.length > 0);
    } else if (filter === 'noAnomaly') {
      records = records.filter((r) => r.anomalies.length === 0);
    }

    return records;
  }, [rebookRecords, filter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingReviews.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
    }
  };

  const handleQuickReview = async (
    id: string,
    approved: boolean,
    comment: string
  ) => {
    if (!currentUser) return;

    try {
      await reviewRebook(id, approved, comment, currentUser.name);
      setReviewComment('');
      setExpandedId(null);
    } catch (error) {
      console.error('Failed to review:', error);
    }
  };

  const handleBatchAction = async () => {
    if (!batchAction || !currentUser || selectedIds.length === 0) return;

    try {
      for (const id of selectedIds) {
        await reviewRebook(id, batchAction === 'approve', batchComment, currentUser.name);
      }
      setSelectedIds([]);
      setBatchComment('');
      setBatchAction(null);
      setShowBatchModal(false);
    } catch (error) {
      console.error('Failed to batch review:', error);
    }
  };

  const openBatchModal = (action: 'approve' | 'reject') => {
    setBatchAction(action);
    setShowBatchModal(true);
  };

  if (isPageLoading || isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-800 mb-6">待我复核</h1>
        <TableLoadingSkeleton rows={6} columns={5} />
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    return severity === 'error'
      ? 'bg-accent-red-100 text-accent-red-700 border-accent-red-200'
      : 'bg-accent-amber-100 text-accent-amber-700 border-accent-amber-200';
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">待我复核</h1>
          <p className="text-sm text-primary-500 mt-1">
            审核改签申请，共 {pendingReviews.length} 条待处理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-primary-200 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                filter === 'all'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('hasAnomaly')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
                filter === 'hasAnomaly'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              有异常
            </button>
            <button
              onClick={() => setFilter('noAnomaly')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                filter === 'noAnomaly'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-primary-600 hover:bg-primary-50'
              )}
            >
              无异常
            </button>
          </div>
          <button
            onClick={() => loadRebookRecords()}
            className="p-2.5 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm text-primary-700">
            已选择 <span className="font-semibold">{selectedIds.length}</span> 项待审核记录
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-primary-600 hover:bg-white rounded-md transition-colors"
            >
              取消选择
            </button>
            <button
              onClick={() => openBatchModal('reject')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-accent-red-600 hover:bg-accent-red-50 rounded-md transition-colors border border-accent-red-200"
            >
              <XCircle className="w-4 h-4" />
              批量驳回
            </button>
            <button
              onClick={() => openBatchModal('approve')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-accent-green-600 hover:bg-accent-green-50 rounded-md transition-colors border border-accent-green-200"
            >
              <CheckCircle className="w-4 h-4" />
              批量通过
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {pendingReviews.length === 0 ? (
          <Empty
            title="暂无待复核记录"
            description="当前没有需要您审核的改签申请"
            icon={<CheckCircle className="w-12 h-12" />}
          />
        ) : (
          <div className="divide-y divide-primary-100">
            <div className="px-5 py-3 bg-primary-50 flex items-center gap-4">
              <button
                onClick={() =>
                  handleSelectAll(
                    selectedIds.length === pendingReviews.length &&
                      pendingReviews.length > 0
                      ? false
                      : true
                  )
                }
                className="text-primary-600 hover:text-primary-800"
              >
                {selectedIds.length === pendingReviews.length &&
                pendingReviews.length > 0 ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider flex-1">
                订单信息
              </span>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider w-28">
                差价
              </span>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider w-28">
                状态
              </span>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider w-28">
                操作
              </span>
            </div>

            {pendingReviews.map((record) => (
              <div key={record.id}>
                <div
                  className={cn(
                    'px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-primary-50 transition-colors cursor-pointer',
                    selectedIds.includes(record.id) && 'bg-primary-50',
                    expandedId === record.id && 'bg-primary-50'
                  )}
                  onClick={() =>
                    setExpandedId(expandedId === record.id ? null : record.id)
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(
                        record.id,
                        !selectedIds.includes(record.id)
                      );
                    }}
                    className="text-primary-600 hover:text-primary-800 flex-shrink-0"
                  >
                    {selectedIds.includes(record.id) ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-primary-800">
                        {record.orderNo}
                      </span>
                      {record.anomalies.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-amber-100 text-accent-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          {record.anomalies.length} 项异常
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-primary-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {record.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {dayjs(record.submittedAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5" />
                        {record.newSegments.length} 航段
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:w-28">
                    <p
                      className={cn(
                        'font-semibold',
                        record.totalDifference >= 0
                          ? 'text-accent-red-600'
                          : 'text-accent-green-600'
                      )}
                    >
                      {record.totalDifference >= 0 ? '+' : ''}
                      {formatCurrency(record.totalDifference)}
                    </p>
                  </div>

                  <div className="sm:w-28">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-amber-100 text-accent-amber-700">
                      <Clock className="w-3 h-3" />
                      待复核
                    </span>
                  </div>

                  <div className="sm:w-28 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickReview(record.id, false, '');
                      }}
                      className="p-2 text-accent-red-500 hover:text-accent-red-700 hover:bg-accent-red-50 rounded-lg transition-colors"
                      title="驳回"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickReview(record.id, true, '');
                      }}
                      className="p-2 text-accent-green-500 hover:text-accent-green-700 hover:bg-accent-green-50 rounded-lg transition-colors"
                      title="通过"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    {expandedId === record.id ? (
                      <ChevronUp className="w-5 h-5 text-primary-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-primary-400" />
                    )}
                  </div>
                </div>

                {expandedId === record.id && (
                  <div className="px-5 pb-5 border-t border-primary-100 bg-primary-50/50">
                    <div className="pt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-primary-100">
                          <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            航段变更详情
                          </h4>
                          <div className="space-y-3">
                            {record.originalSegments.map((seg, idx) => {
                              const newSeg = record.newSegments[idx];
                              const hasChange =
                                seg.cabinClass !== newSeg?.cabinClass ||
                                seg.departureAirport !==
                                  newSeg?.departureAirport ||
                                seg.arrivalAirport !== newSeg?.arrivalAirport ||
                                seg.country !== newSeg?.country;

                              return (
                                <div
                                  key={idx}
                                  className={cn(
                                    'p-3 rounded-lg border',
                                    hasChange
                                      ? 'bg-accent-amber-50 border-accent-amber-200'
                                      : 'bg-primary-50 border-primary-100'
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-primary-600">
                                      第 {idx + 1} 航段 {seg.flightNo}
                                    </span>
                                    {hasChange && (
                                      <span className="text-xs text-accent-amber-600">
                                        已变更
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-primary-500">
                                        原舱位:{' '}
                                      </span>
                                      <span className="text-primary-700">
                                        {getCabinName(seg.cabinClass)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-primary-500">
                                        新舱位:{' '}
                                      </span>
                                      <span
                                        className={cn(
                                          seg.cabinClass !==
                                            newSeg?.cabinClass &&
                                            'text-accent-amber-700 font-medium'
                                        )}
                                      >
                                        {newSeg
                                          ? getCabinName(newSeg.cabinClass)
                                          : '-'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-primary-500">
                                        原航线:{' '}
                                      </span>
                                      <span className="text-primary-700">
                                        {seg.departureAirport}-
                                        {seg.arrivalAirport}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-primary-500">
                                        新航线:{' '}
                                      </span>
                                      <span
                                        className={cn(
                                          (seg.departureAirport !==
                                            newSeg?.departureAirport ||
                                            seg.arrivalAirport !==
                                              newSeg?.arrivalAirport) &&
                                            'text-accent-amber-700 font-medium'
                                        )}
                                      >
                                        {newSeg
                                          ? `${newSeg.departureAirport}-${newSeg.arrivalAirport}`
                                          : '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {record.anomalies.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-primary-100">
                            <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-accent-amber-500" />
                              异常项 ({record.anomalies.length})
                            </h4>
                            <div className="space-y-2">
                              {record.anomalies.map((anomaly) => {
                                const hasExplanation =
                                  record.explanations.some(
                                    (e) => e.anomalyId === anomaly.id
                                  );
                                return (
                                  <div
                                    key={anomaly.id}
                                    className={cn(
                                      'p-3 rounded-lg border',
                                      getSeverityBadge(anomaly.severity)
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium">
                                          {anomaly.description}
                                        </p>
                                        <p className="text-xs mt-1 opacity-80">
                                          规则依据: {anomaly.ruleBasis}
                                        </p>
                                        {anomaly.amountImpact !== 0 && (
                                          <p className="text-xs mt-1 font-medium">
                                            金额影响:{' '}
                                            {anomaly.amountImpact >= 0
                                              ? '+'
                                              : ''}
                                            {formatCurrency(
                                              anomaly.amountImpact
                                            )}
                                          </p>
                                        )}
                                      </div>
                                      {hasExplanation && (
                                        <span className="flex-shrink-0 text-xs bg-white/50 px-2 py-0.5 rounded">
                                          已解释
                                        </span>
                                      )}
                                    </div>
                                    {hasExplanation && (
                                      <div className="mt-2 pt-2 border-t border-current/20">
                                        {record.explanations
                                          .filter(
                                            (e) => e.anomalyId === anomaly.id
                                          )
                                          .map((exp) => (
                                            <div
                                              key={exp.id}
                                              className="text-xs"
                                            >
                                              <p className="opacity-80">
                                                {exp.explainedBy} 解释:
                                              </p>
                                              <p className="mt-0.5">
                                                {exp.content}
                                              </p>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-primary-100">
                        <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          审核意见
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="请输入审核意见（选填）"
                            className="flex-1 px-3 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickReview(
                                  record.id,
                                  false,
                                  reviewComment
                                );
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-red-600 text-white text-sm font-medium rounded-lg hover:bg-accent-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              驳回
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickReview(
                                  record.id,
                                  true,
                                  reviewComment
                                );
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-green-600 text-white text-sm font-medium rounded-lg hover:bg-accent-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              通过
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-primary-100">
              <h2 className="text-xl font-semibold text-primary-800">
                批量{batchAction === 'approve' ? '通过' : '驳回'}
              </h2>
              <p className="text-sm text-primary-500 mt-1">
                确定要{batchAction === 'approve' ? '通过' : '驳回'}选中的{' '}
                {selectedIds.length} 条记录吗？
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-primary-700 mb-1.5">
                审核意见（选填）
              </label>
              <textarea
                value={batchComment}
                onChange={(e) => setBatchComment(e.target.value)}
                placeholder={`请输入批量${batchAction === 'approve' ? '通过' : '驳回'}的意见...`}
                rows={4}
                className="w-full px-3 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50">
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchAction(null);
                  setBatchComment('');
                }}
                className="px-5 py-2.5 text-sm font-medium text-primary-600 hover:bg-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchAction}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors',
                  batchAction === 'approve'
                    ? 'bg-accent-green-600 hover:bg-accent-green-700'
                    : 'bg-accent-red-600 hover:bg-accent-red-700'
                )}
              >
                {batchAction === 'approve' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                确认{batchAction === 'approve' ? '通过' : '驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
