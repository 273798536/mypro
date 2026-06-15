import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ReviewItem } from '../components/ReviewItem';
import { StatusBadge } from '../components/StatusBadge';
import { useReviewStore } from '../store/useReviewStore';
import { DataStatus, ReviewEntryType } from '../types/common';
import { FileCheck, ChevronRight, Filter, CheckCircle2, AlertCircle, Clock, Play, RefreshCw } from 'lucide-react';
import { formatNumber } from '../utils/format';

export const ReviewWorkspacePage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const {
    reviewBatch,
    consistencyReport,
    isLoading,
    loadReviewBatch,
    updateEntryStatus,
    completeReview,
    runConsistencyCheck,
    resolveConsistencyIssue,
  } = useReviewStore();

  const [typeFilter, setTypeFilter] = useState<ReviewEntryType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DataStatus | 'all'>('all');

  useEffect(() => {
    if (taskId) {
      loadReviewBatch(taskId);
    }
  }, [taskId, loadReviewBatch]);

  const handleRunConsistency = () => {
    if (taskId) {
      runConsistencyCheck(taskId);
    }
  };

  const handleCompleteReview = () => {
    if (taskId) {
      completeReview(taskId);
    }
  };

  const filteredEntries = reviewBatch?.entries?.filter(entry => {
    const typeMatch = typeFilter === 'all' || entry.type === typeFilter;
    const statusMatch = statusFilter === 'all' || entry.status === statusFilter;
    return typeMatch && statusMatch;
  }) || [];

  const reviewedCount = reviewBatch?.entries?.filter(e => e.reviewedAt).length || 0;
  const totalCount = reviewBatch?.entries?.length || 0;
  const reviewProgress = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const typeCounts = reviewBatch?.entries?.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <AppLayout
      title="复核工作台"
      subtitle="明珠海珍品 · 2026年6月巡检 · 同轮复核处理"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/tasks/${taskId}/risk`)}
            className="text-slate-500 hover:text-ocean-600 transition-colors text-sm flex items-center gap-1"
          >
            ← 返回风险评估
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm">复核工作台</span>
        </div>

        <div className="bg-gradient-to-r from-ocean-900 to-ocean-800 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-6 h-6 text-tide-400" />
                <span className="text-tide-400 text-sm font-medium">同轮复核</span>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                风险通报、水质记录、重复上报同轮处理
              </h2>
              <p className="text-ocean-200 max-w-3xl leading-relaxed">
                本批次共 <span className="text-tide-400 font-bold">{totalCount}</span> 条待复核记录，
                包含 <span className="text-status-review font-bold">{typeCounts[ReviewEntryType.RISK_ALERT] || 0}</span> 条风险通报、
                <span className="text-ocean-400 font-bold"> {typeCounts[ReviewEntryType.WATER_RECORD] || 0}</span> 条水质记录、
                <span className="text-status-pending font-bold"> {typeCounts[ReviewEntryType.DUPLICATE] || 0}</span> 条重复上报。
                请按顺序复核，标记每条记录的最终状态。
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-tide-400">
                {reviewProgress}%
              </div>
              <div className="text-sm text-ocean-300">复核进度</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ocean-300">已完成 {reviewedCount}/{totalCount} 条</span>
              <span className="text-ocean-300">{reviewProgress}%</span>
            </div>
            <div className="w-full bg-ocean-800 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-tide-400 to-ocean-500 transition-all duration-500"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleRunConsistency}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {consistencyReport ? '重新校验一致性' : '运行一致性校验'}
          </button>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReviewEntryType | 'all')}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              <option value="all">全部类型</option>
              <option value={ReviewEntryType.RISK_ALERT}>风险通报</option>
              <option value={ReviewEntryType.WATER_RECORD}>水质记录</option>
              <option value={ReviewEntryType.DUPLICATE}>重复上报</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DataStatus | 'all')}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              <option value="all">全部状态</option>
              <option value={DataStatus.AVAILABLE}>可用</option>
              <option value={DataStatus.PENDING}>暂缓</option>
              <option value={DataStatus.NEED_REVIEW}>需复核</option>
              <option value={DataStatus.RECOLLECT}>需重采</option>
            </select>
          </div>

          <div className="flex items-center gap-4 ml-auto text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-available" />
              <span className="text-slate-500">已复核 {reviewedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">待处理 {totalCount - reviewedCount}</span>
            </div>
          </div>
        </div>

        {consistencyReport && (
          <div className={`rounded-lg p-5 border ${
            consistencyReport.isConsistent
              ? 'bg-status-available/10 border-status-available/30'
              : 'bg-status-review/10 border-status-review/30'
          }`}>
            <div className="flex items-start gap-3">
              {consistencyReport.isConsistent ? (
                <CheckCircle2 className="w-5 h-5 text-status-available flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-status-review flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  consistencyReport.isConsistent ? 'text-status-available' : 'text-status-review'
                }`}>
                  {consistencyReport.isConsistent
                    ? '✅ 数据一致性校验通过'
                    : `⚠️ 发现 ${consistencyReport.issues.length} 处不一致`}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {consistencyReport.explanation}
                </p>

                {!consistencyReport.isConsistent && consistencyReport.issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {consistencyReport.issues.map((issue, index) => (
                      <div key={issue.id} className="bg-white rounded p-3 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">{issue.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span className="text-slate-500">
                                页面显示：<span className="font-mono text-status-review">{issue.displayValue}</span>
                              </span>
                              <span className="text-slate-500">
                                计算值：<span className="font-mono text-ocean-600">{issue.calculatedValue}</span>
                              </span>
                              <span className="text-slate-500">
                                差值：<span className="font-mono text-status-recollect">{formatNumber(issue.difference, 3)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => resolveConsistencyIssue(issue.id, 'use_display')}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                issue.resolved
                                  ? 'bg-status-available/10 text-status-available'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {issue.resolved && issue.resolution === 'use_display' ? '✓ ' : ''}以页面为准
                            </button>
                            <button
                              onClick={() => resolveConsistencyIssue(issue.id, 'use_calculated')}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                issue.resolved
                                  ? 'bg-status-available/10 text-status-available'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {issue.resolved && issue.resolution === 'use_calculated' ? '✓ ' : ''}以计算为准
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredEntries.map((entry, index) => (
            <ReviewItem
              key={entry.id}
              entry={entry}
              onStatusChange={(status, note) => updateEntryStatus(entry.id, status, note)}
              delay={index * 50}
            />
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无符合筛选条件的复核记录</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-slate-500">
            {reviewedCount === totalCount && totalCount > 0
              ? '✅ 所有记录已复核完成，可以进入下一步'
              : `还有 ${totalCount - reviewedCount} 条记录待复核`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/tasks/${taskId}/map`)}
              className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              查看地图联动
            </button>
            <button
              onClick={handleCompleteReview}
              disabled={reviewedCount !== totalCount || totalCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              完成复核，进入导出
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
