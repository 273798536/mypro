import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, Eye, MessageSquare, AlertTriangle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import RiskBadge from '../components/RiskBadge';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { REVIEW_STATUS_LABELS, RISK_LEVEL_LABELS, MATCH_STATUS_LABELS } from '../../shared/types';
import type { Review, MatchResult, Song, Copyright, RiskLevel, ReviewStatus } from '../../shared/types';
import { cn, formatDate, formatDuration } from '../lib/utils';

export default function ReviewPage() {
  const navigate = useNavigate();
  const {
    reviews,
    loading,
    error,
    pagination,
    fetchReviews,
    createReview,
    setError,
  } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedReview, setSelectedReview] = useState<(Review & { matchResult?: MatchResult & { song?: Song; copyright?: Copyright } }) | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [riskOverride, setRiskOverride] = useState<RiskLevel | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [showRiskGuide, setShowRiskGuide] = useState(false);

  useEffect(() => {
    fetchReviews({ status: statusFilter || undefined });
  }, [statusFilter]);

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
            <Clock className="w-3 h-3" />
            {REVIEW_STATUS_LABELS[status]}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
            <CheckCircle className="w-3 h-3" />
            {REVIEW_STATUS_LABELS[status]}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
            <XCircle className="w-3 h-3" />
            {REVIEW_STATUS_LABELS[status]}
          </span>
        );
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReview) return;
    setSubmitting(true);
    try {
      await createReview({
        matchResultId: selectedReview.matchResultId,
        status: reviewStatus,
        comments: reviewComments,
        riskLevelOverride: riskOverride || undefined,
      });
      setToast({ message: '审核已提交', type: 'success' });
      setShowReviewModal(false);
      setSelectedReview(null);
      setReviewComments('');
      setRiskOverride('');
    } catch (e) {
      setToast({ message: '提交失败，请重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (!search) return true;
    const matchResult = r.matchResult as MatchResult & { song?: Song; copyright?: Copyright } | undefined;
    const songName = matchResult?.song?.name?.toLowerCase() || '';
    const artist = matchResult?.song?.artist?.toLowerCase() || '';
    return songName.includes(search.toLowerCase()) || artist.includes(search.toLowerCase());
  });

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">风险分级与复核</h1>
          <p className="text-slate-500 mt-1">人工确认风险等级，审核通过或驳回</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRiskGuide(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            风险分级口径
          </button>
          <div className="text-sm text-slate-500">
            待审核: <span className="font-semibold text-amber-600">{pendingCount}</span> 条
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(['high', 'medium', 'low', 'none'] as RiskLevel[]).map((level) => (
          <div key={level} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">{RISK_LEVEL_LABELS[level]}</span>
              <RiskBadge level={level} />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {reviews.filter(r => {
                const mr = r.matchResult as MatchResult | undefined;
                return mr?.riskLevel === level;
              }).length}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索歌曲或歌手..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部状态</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
        </div>

        {loading && filteredReviews.length === 0 ? (
          <div className="p-12">
            <Loading text="加载中..." />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无审核记录</h3>
            <p className="text-slate-500">请先执行版权匹配生成审核任务</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      歌曲
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      匹配状态
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      系统风险
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      人工调整
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      审核状态
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      审核人/时间
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((review, index) => {
                    const matchResult = review.matchResult as MatchResult & { song?: Song; copyright?: Copyright } | undefined;
                    return (
                      <tr
                        key={review.id}
                        className={cn(
                          'hover:bg-slate-50 transition-colors',
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{matchResult?.song?.name || '-'}</div>
                          <div className="text-sm text-slate-500">
                            {matchResult?.song?.artist || '-'} · {formatDuration(matchResult?.song?.duration || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {matchResult?.matchStatus ? MATCH_STATUS_LABELS[matchResult.matchStatus] : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {matchResult?.riskLevel && (
                            <RiskBadge level={matchResult.riskLevel as RiskLevel} />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {review.riskLevelOverride ? (
                            <div className="flex items-center gap-1">
                              <RiskBadge level={review.riskLevelOverride as RiskLevel} />
                              <span className="text-xs text-slate-400">(调整后)</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">未调整</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(review.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-700">{review.reviewer || '-'}</div>
                          <div className="text-xs text-slate-400">{formatDate(review.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/song/${review.matchResultId}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              详情
                            </button>
                            {review.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedReview(review);
                                  if (matchResult?.riskLevel) {
                                    setRiskOverride(matchResult.riskLevel as RiskLevel);
                                  }
                                  setShowReviewModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                                审核
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                共 {pagination.reviews.total} 条记录，第 {pagination.reviews.page} /{' '}
                {pagination.reviews.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.reviews.page <= 1}
                  onClick={() =>
                    fetchReviews({
                      page: pagination.reviews.page - 1,
                      status: statusFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={pagination.reviews.page >= pagination.reviews.totalPages}
                  onClick={() =>
                    fetchReviews({
                      page: pagination.reviews.page + 1,
                      status: statusFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={() => !submitting && setShowReviewModal(false)}
        title="人工复核"
      >
        {selectedReview && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                请根据实际情况确认风险等级，可调整系统判定结果。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  审核结果
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReviewStatus('approved')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      reviewStatus === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-emerald-300'
                    )}
                  >
                    <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">通过</span>
                  </button>
                  <button
                    onClick={() => setReviewStatus('rejected')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-center transition-all',
                      reviewStatus === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:border-red-300'
                    )}
                  >
                    <XCircle className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">驳回</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  风险等级调整（可选）
                </label>
                <select
                  value={riskOverride}
                  onChange={(e) => setRiskOverride(e.target.value as RiskLevel | '')}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">不调整（沿用系统判定）</option>
                  {(['high', 'medium', 'low', 'none'] as RiskLevel[]).map((level) => (
                    <option key={level} value={level}>{RISK_LEVEL_LABELS[level]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                审核意见
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="请输入审核意见..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loading size="sm" /> : null}
                {submitting ? '提交中...' : '提交审核'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showRiskGuide}
        onClose={() => setShowRiskGuide(false)}
        title="风险分级口径说明"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-3">风险等级判定规则</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <RiskBadge level="high" />
                <div>
                  <p className="text-sm font-medium text-slate-900">高风险</p>
                  <p className="text-sm text-slate-600">
                    无版权匹配、授权已过期、授权地区完全不覆盖、存在明确冲突未处理
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RiskBadge level="medium" />
                <div>
                  <p className="text-sm font-medium text-slate-900">中风险</p>
                  <p className="text-sm text-slate-600">
                    部分匹配（歌名一致但歌手不同）、授权地区部分覆盖、翻唱版本识别
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RiskBadge level="low" />
                <div>
                  <p className="text-sm font-medium text-slate-900">低风险</p>
                  <p className="text-sm text-slate-600">
                    完全匹配但授权类型为非独家、匹配置信度在0.6-0.8之间
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RiskBadge level="none" />
                <div>
                  <p className="text-sm font-medium text-slate-900">无风险</p>
                  <p className="text-sm text-slate-600">
                    完全匹配（置信度≥0.8）、独家授权、授权地区全覆盖
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2">使用说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 系统自动判定仅为参考，最终以人工复核为准</li>
              <li>• 调整风险等级时请在审核意见中说明理由</li>
              <li>• 高风险曲目建议从直播歌单中移除</li>
              <li>• 本口径说明随PDF报告一同导出，方便转发</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowRiskGuide(false)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
