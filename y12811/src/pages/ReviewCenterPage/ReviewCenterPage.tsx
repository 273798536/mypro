import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  Tag,
  FileText,
  MessageSquare,
  Lightbulb,
  ChevronRight,
  Send,
  FlaskConical,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/UI/StatusBadge';
import {
  reviews,
  samples,
  cultureRecords,
  getPendingReviews,
  getReviewsByStatus,
  getReviewById,
  getSampleById,
  getCultureRecordById,
  getChangeHistoryByRecord,
} from '@/data';
import type {
  Review,
  ReviewStatus,
  Sample,
  CultureRecord,
  ChangeHistory,
} from '@/types';

type TabType = 'pending' | 'approved' | 'rejected';
type IssueType = 'low-quality' | 'contamination' | 'anomaly' | 'control-abnormal' | 'other';

const reviewStatusMap: Record<ReviewStatus, { text: string; status: 'success' | 'warning' | 'error' | 'pending' }> = {
  approved: { text: '已通过', status: 'success' },
  rejected: { text: '已驳回', status: 'error' },
  pending: { text: '待复核', status: 'pending' },
};

const targetTypeMap: Record<string, string> = {
  sample: '样本',
  'culture-record': '培养记录',
  qc: '质检报告',
};

const issueTypeMap: Record<IssueType, { text: string; color: string; bgColor: string }> = {
  'low-quality': { text: '低质量读段', color: 'text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/30' },
  contamination: { text: '污染', color: 'text-red-400', bgColor: 'bg-red-500/15 border-red-500/30' },
  anomaly: { text: '异常值', color: 'text-purple-400', bgColor: 'bg-purple-500/15 border-purple-500/30' },
  'control-abnormal': { text: '阴性对照异常', color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-500/30' },
  other: { text: '其他', color: 'text-slate-400', bgColor: 'bg-slate-500/15 border-slate-500/30' },
};

function getIssueType(review: Review, sample?: Sample): IssueType {
  if (sample?.type === 'negative-control' && sample.status === 'control-abnormal') {
    return 'control-abnormal';
  }
  if (sample?.status === 'low-quality') {
    return 'low-quality';
  }
  if (sample?.status === 'contaminated') {
    return 'contamination';
  }
  if (review.issuesFound.some(i => i.includes('污染') || i.includes('contamination'))) {
    return 'contamination';
  }
  if (review.issuesFound.some(i => i.includes('低质量') || i.includes('测序深度') || i.includes('Q30'))) {
    return 'low-quality';
  }
  if (review.issuesFound.some(i => i.includes('异常') || i.includes('偏高') || i.includes('偏低'))) {
    return 'anomaly';
  }
  return 'other';
}

function getSubmitter(review: Review): string {
  const history = getChangeHistoryByRecord(review.targetId);
  if (history.length > 0) {
    const lastChange = history[history.length - 1];
    return lastChange.changedBy;
  }
  if (review.targetType === 'sample') {
    const sample = getSampleById(review.targetId);
    return sample?.collector || '系统';
  }
  if (review.targetType === 'culture-record') {
    const record = getCultureRecordById(review.targetId);
    return record?.recordedBy || '系统';
  }
  return '系统';
}

function getTargetName(review: Review): string {
  if (review.targetType === 'sample') {
    const sample = getSampleById(review.targetId);
    return sample?.name || review.targetId;
  }
  if (review.targetType === 'culture-record') {
    const record = getCultureRecordById(review.targetId);
    const sample = record ? getSampleById(record.sampleId) : undefined;
    return sample?.name || review.targetId;
  }
  return review.targetId;
}

export default function ReviewCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | 'all'>('all');
  const [reviewComments, setReviewComments] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [localReviews, setLocalReviews] = useState<Review[]>(reviews);

  const pendingCount = useMemo(() => 
    localReviews.filter(r => r.status === 'pending').length,
    [localReviews]
  );
  const approvedCount = useMemo(() => 
    localReviews.filter(r => r.status === 'approved').length,
    [localReviews]
  );
  const rejectedCount = useMemo(() => 
    localReviews.filter(r => r.status === 'rejected').length,
    [localReviews]
  );

  const filteredReviews = useMemo(() => {
    let result = localReviews.filter(r => r.status === activeTab);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => {
        const targetName = getTargetName(r).toLowerCase();
        const comments = r.comments.toLowerCase();
        const reviewer = r.reviewer.toLowerCase();
        return targetName.includes(query) || comments.includes(query) || reviewer.includes(query);
      });
    }

    if (issueTypeFilter !== 'all') {
      result = result.filter(r => {
        const sample = getSampleById(r.targetId);
        return getIssueType(r, sample) === issueTypeFilter;
      });
    }

    return result.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [localReviews, activeTab, searchQuery, issueTypeFilter]);

  const selectedReview = useMemo(() => {
    if (!selectedReviewId) return null;
    return localReviews.find(r => r.id === selectedReviewId) || null;
  }, [localReviews, selectedReviewId]);

  const selectedSample = useMemo(() => {
    if (!selectedReview || selectedReview.targetType !== 'sample') return null;
    return getSampleById(selectedReview.targetId) || null;
  }, [selectedReview]);

  const selectedCultureRecord = useMemo(() => {
    if (!selectedReview || selectedReview.targetType !== 'culture-record') return null;
    return getCultureRecordById(selectedReview.targetId) || null;
  }, [selectedReview]);

  const changeHistory = useMemo(() => {
    if (!selectedReview) return [];
    return getChangeHistoryByRecord(selectedReview.targetId);
  }, [selectedReview]);

  const targetHistoryForReview = useMemo(() => {
    if (!selectedReview) return [];
    return localReviews
      .filter(r => r.targetId === selectedReview.targetId)
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [localReviews, selectedReview]);

  const handleReviewAction = (action: 'approve' | 'reject') => {
    if (!selectedReview) return;

    const newStatus: ReviewStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    const updatedReviews = localReviews.map(r => {
      if (r.id === selectedReview.id) {
        return {
          ...r,
          status: newStatus,
          reviewer: '当前用户',
          reviewDate: now,
          comments: reviewComments || r.comments,
          recommendations: recommendations ? recommendations.split('\n').filter(Boolean) : r.recommendations,
        };
      }
      return r;
    });

    setLocalReviews(updatedReviews);
    setReviewComments('');
    setRecommendations('');
    
    const nextPending = updatedReviews.find(r => r.status === 'pending');
    if (nextPending && activeTab === 'pending') {
      setSelectedReviewId(nextPending.id);
    }
  };

  const issueType = selectedReview
    ? getIssueType(selectedReview, selectedSample || undefined)
    : 'other';

  return (
    <div className="min-h-screen bg-lab-950 bg-grid-pattern bg-grid-20">
      <div className="border-b border-white/10 bg-lab-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/20">
              <ClipboardCheck className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">复核中心</h1>
              <p className="text-sm text-lab-400">对异常样本和质检问题进行审核复核</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="glass-card p-5 transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-lab-400">待复核</p>
                <p className="mt-1 text-3xl font-semibold text-amber-400">{pendingCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-5 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-lab-400">已通过</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-400">{approvedCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-5 transition-all duration-300 hover:scale-[1.02] hover:border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-lab-400">已驳回</p>
                <p className="mt-1 text-3xl font-semibold text-red-400">{rejectedCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-6">
          <div className="col-span-3 glass-card overflow-hidden">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-lab-400" />
                <input
                  type="text"
                  placeholder="搜索复核项..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-lab-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex border-b border-white/10">
              {(['pending', 'approved', 'rejected'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedReviewId(null);
                  }}
                  className={cn(
                    'flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200',
                    activeTab === tab
                      ? 'border-b-2 border-teal-400 text-teal-400 bg-teal-400/5'
                      : 'text-lab-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab === 'pending' && `待复核 (${pendingCount})`}
                  {tab === 'approved' && `已通过 (${approvedCount})`}
                  {tab === 'rejected' && `已驳回 (${rejectedCount})`}
                </button>
              ))}
            </div>

            <div className="border-b border-white/10 p-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-lab-400" />
                <select
                  value={issueTypeFilter}
                  onChange={(e) => setIssueTypeFilter(e.target.value as IssueType | 'all')}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                >
                  <option value="all" className="bg-lab-900">全部类型</option>
                  <option value="low-quality" className="bg-lab-900">低质量读段</option>
                  <option value="contamination" className="bg-lab-900">污染</option>
                  <option value="anomaly" className="bg-lab-900">异常值</option>
                  <option value="control-abnormal" className="bg-lab-900">阴性对照异常</option>
                  <option value="other" className="bg-lab-900">其他</option>
                </select>
              </div>
            </div>

            <div className="max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
              {filteredReviews.length === 0 ? (
                <div className="py-12 text-center text-lab-400">
                  <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm">暂无{activeTab === 'pending' ? '待复核' : activeTab === 'approved' ? '已通过' : '已驳回'}项</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredReviews.map((review) => {
                    const sample = getSampleById(review.targetId);
                    const issueType = getIssueType(review, sample || undefined);
                    const submitter = getSubmitter(review);
                    const targetName = getTargetName(review);
                    const isSelected = selectedReviewId === review.id;

                    return (
                      <div
                        key={review.id}
                        onClick={() => setSelectedReviewId(review.id)}
                        className={cn(
                          'cursor-pointer p-4 transition-all duration-200',
                          isSelected
                            ? 'bg-teal-500/10 border-l-2 border-teal-400'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1 truncate">
                            <span className={cn(
                              'text-xs font-medium',
                              issueTypeMap[issueType].color
                            )}>
                              {issueTypeMap[issueType].text}
                            </span>
                          </div>
                          <StatusBadge
                            status={reviewStatusMap[review.status].status}
                            text={reviewStatusMap[review.status].text}
                            size="sm"
                            showIcon={false}
                          />
                        </div>
                        <h4 className="mb-1 truncate text-sm font-medium text-white">
                          {targetName}
                        </h4>
                        <div className="mb-2 flex items-center gap-2 text-xs text-lab-400">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {submitter}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {targetTypeMap[review.targetType]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-lab-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(review.reviewDate).toLocaleDateString('zh-CN')}
                          </span>
                          {isSelected && <ChevronRight className="h-4 w-4 text-teal-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-7 space-y-6">
            {!selectedReview ? (
              <div className="glass-card flex h-full min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-400/10">
                    <MessageSquare className="h-8 w-8 text-teal-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white">选择复核项查看详情</h3>
                  <p className="mt-1 text-sm text-lab-400">从左侧列表中选择一个复核项</p>
                </div>
              </div>
            ) : (
              <>
                <div className="glass-card p-6">
                  <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl',
                        issueTypeMap[issueType].bgColor
                      )}>
                        {issueType === 'low-quality' && <Activity className="h-6 w-6 text-amber-400" />}
                        {issueType === 'contamination' && <AlertTriangle className="h-6 w-6 text-red-400" />}
                        {issueType === 'control-abnormal' && <FlaskConical className="h-6 w-6 text-orange-400" />}
                        {(issueType === 'anomaly' || issueType === 'other') && <AlertTriangle className="h-6 w-6 text-purple-400" />}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {getTargetName(selectedReview)}
                          </h3>
                          <StatusBadge
                            status={reviewStatusMap[selectedReview.status].status}
                            text={reviewStatusMap[selectedReview.status].text}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center gap-3 text-sm text-lab-400">
                          <span className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs',
                            issueTypeMap[issueType].bgColor,
                            issueTypeMap[issueType].color
                          )}>
                            {issueTypeMap[issueType].text}
                          </span>
                          <span>{targetTypeMap[selectedReview.targetType]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-lab-400">基本信息</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-xs text-lab-400">提交人</div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-white">
                            <User className="h-3.5 w-3.5 text-lab-400" />
                            {getSubmitter(selectedReview)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-xs text-lab-400">提交时间</div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-white">
                            <Calendar className="h-3.5 w-3.5 text-lab-400" />
                            {new Date(selectedReview.reviewDate).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                        {selectedSample && (
                          <>
                            <div className="rounded-lg bg-white/5 p-3">
                              <div className="text-xs text-lab-400">样本类型</div>
                              <div className="mt-1 text-sm font-medium text-white">
                                {selectedSample.type === 'clinical' ? '临床样本' :
                                 selectedSample.type === 'environmental' ? '环境样本' :
                                 selectedSample.type === 'negative-control' ? '阴性对照' :
                                 selectedSample.type === 'positive-control' ? '阳性对照' : selectedSample.type}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                              <div className="text-xs text-lab-400">采集部位</div>
                              <div className="mt-1 text-sm font-medium text-white">
                                {selectedSample.collectionSite}
                              </div>
                            </div>
                          </>
                        )}
                        {selectedCultureRecord && (
                          <>
                            <div className="rounded-lg bg-white/5 p-3">
                              <div className="text-xs text-lab-400">培养基</div>
                              <div className="mt-1 text-sm font-medium text-white">
                                {selectedCultureRecord.medium}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white/5 p-3">
                              <div className="text-xs text-lab-400">菌落数</div>
                              <div className="mt-1 text-sm font-medium text-white">
                                {selectedCultureRecord.colonyCount} CFU
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-lab-400">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        发现问题
                      </h4>
                      {selectedReview.issuesFound.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedReview.issuesFound.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-sm text-lab-200">
                              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="rounded-lg bg-emerald-500/5 p-3 text-sm text-emerald-300">
                          <CheckCircle2 className="mr-2 inline h-4 w-4" />
                          未发现问题
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-lab-400">
                        <MessageSquare className="h-4 w-4 text-teal-400" />
                        复核意见
                      </h4>
                      <div className="rounded-lg bg-white/5 p-4 text-sm text-lab-200">
                        {selectedReview.comments || '暂无复核意见'}
                      </div>
                    </div>

                    {selectedReview.recommendations.length > 0 && (
                      <>
                        <div className="h-px bg-white/10" />
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-lab-400">
                            <Lightbulb className="h-4 w-4 text-yellow-400" />
                            建议措施
                          </h4>
                          <ul className="space-y-2">
                            {selectedReview.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 rounded-lg bg-yellow-500/5 p-3 text-sm text-lab-200">
                                <span className="text-yellow-400">{idx + 1}.</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/20">
                      <Clock className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">复核历史记录</h3>
                      <p className="text-sm text-lab-300">该目标的所有复核记录及变更历史</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {targetHistoryForReview.map((review, idx) => (
                      <div
                        key={review.id}
                        className={cn(
                          'relative pl-6',
                          idx !== targetHistoryForReview.length - 1 && 'pb-4'
                        )}
                      >
                        <div className={cn(
                          'absolute left-0 top-1 h-3 w-3 rounded-full',
                          review.status === 'approved' ? 'bg-emerald-400' :
                          review.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                        )} />
                        {idx !== targetHistoryForReview.length - 1 && (
                          <div className="absolute left-[5px] top-4 h-full w-px bg-white/10" />
                        )}
                        <div className="rounded-lg bg-white/5 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-400/20">
                                <User className="h-3.5 w-3.5 text-teal-400" />
                              </div>
                              <span className="text-sm font-medium text-white">{review.reviewer}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge
                                status={reviewStatusMap[review.status].status}
                                text={reviewStatusMap[review.status].text}
                                size="sm"
                                showIcon={false}
                              />
                              <span className="text-xs text-lab-400">
                                {new Date(review.reviewDate).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <p className="mb-3 text-sm text-lab-200">{review.comments}</p>
                          {review.recommendations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {review.recommendations.slice(0, 2).map((rec, i) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300"
                                >
                                  {rec}
                                </span>
                              ))}
                              {review.recommendations.length > 2 && (
                                <span className="rounded-md bg-lab-500/20 px-2 py-0.5 text-xs text-lab-400">
                                  +{review.recommendations.length - 2} 条建议
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {changeHistory.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <h4 className="mb-3 text-sm font-medium text-lab-400">数据变更历史</h4>
                        {changeHistory.map((history, idx) => (
                          <div
                            key={history.id}
                            className={cn(
                              'relative pl-6',
                              idx !== changeHistory.length - 1 && 'pb-3'
                            )}
                          >
                            <div className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-lab-500" />
                            {idx !== changeHistory.length - 1 && (
                              <div className="absolute left-[4px] top-3.5 h-full w-px bg-white/10" />
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-white font-medium">{history.changedBy}</span>
                                <span className="text-lab-400 ml-2">v{history.version}</span>
                              </div>
                              <span className="text-xs text-lab-500">
                                {new Date(history.changeTime).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-lab-400">
                              变更原因：{history.changeReason}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(history.changes).map(([field, change]) => (
                                <span
                                  key={field}
                                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-lab-300"
                                >
                                  {field}: {String(change.oldValue ?? '-')} → {String(change.newValue ?? '-')}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedReview.status === 'pending' && (
                  <div className="glass-card p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/20">
                        <Send className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">复核操作</h3>
                        <p className="text-sm text-lab-300">填写复核意见并执行复核操作</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm text-lab-300">复核意见</label>
                        <textarea
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          placeholder="请输入复核意见..."
                          rows={3}
                          className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-lab-500 focus:border-teal-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm text-lab-300">建议措施</label>
                        <textarea
                          value={recommendations}
                          onChange={(e) => setRecommendations(e.target.value)}
                          placeholder="每行一条建议，例如：重新采样&#10;加强质量控制"
                          rows={3}
                          className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-lab-500 focus:border-teal-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleReviewAction('reject')}
                          className="btn-danger flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-400 font-medium rounded-md hover:bg-red-500/30 transition-colors duration-200 border border-red-500/30"
                        >
                          <XCircle className="h-4 w-4" />
                          驳回
                        </button>
                        <button
                          onClick={() => handleReviewAction('approve')}
                          className="btn-primary flex items-center gap-2 px-6"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          通过
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
