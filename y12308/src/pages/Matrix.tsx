import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  User,
  Calendar,
  MessageSquare,
  Check,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { MemberStatus, TransitionCell, StatusJumpReview } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { cn } from '../lib/utils';

const STATUS_ORDER: MemberStatus[] = [
  MemberStatus.new,
  MemberStatus.active,
  MemberStatus.reactivated,
  MemberStatus.at_risk,
  MemberStatus.silent,
  MemberStatus.churned,
];

const STATUS_LABEL: Record<MemberStatus, string> = {
  [MemberStatus.new]: '新会员',
  [MemberStatus.active]: '活跃',
  [MemberStatus.reactivated]: '回流',
  [MemberStatus.at_risk]: '高危',
  [MemberStatus.silent]: '沉默',
  [MemberStatus.churned]: '流失',
};

const STATUS_COLOR: Record<MemberStatus, string> = {
  [MemberStatus.new]: '#3B82F6',
  [MemberStatus.active]: '#10B981',
  [MemberStatus.reactivated]: '#8B5CF6',
  [MemberStatus.at_risk]: '#F59E0B',
  [MemberStatus.silent]: '#64748B',
  [MemberStatus.churned]: '#EF4444',
};

interface DrawerContent {
  cell: TransitionCell;
  members: Array<{
    id: string;
    name: string;
    currentStatus: MemberStatus;
    transitionDate: string;
    reason?: string;
    isAbnormal: boolean;
  }>;
}

export default function Matrix() {
  const {
    transitionMatrix,
    jumpReviews,
    reviewJump,
    getCurrentBatch,
    getMemberById,
  } = useStore();

  const [hoveredCell, setHoveredCell] = useState<TransitionCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [selectedReview, setSelectedReview] = useState<StatusJumpReview | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [explanation, setExplanation] = useState('');
  const [showRawData, setShowRawData] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currentBatch = getCurrentBatch();

  const matrixData = useMemo(() => {
    if (!transitionMatrix) return null;

    const grid: Map<string, TransitionCell> = new Map();
    transitionMatrix.cells.forEach(cell => {
      grid.set(`${cell.fromStatus}-${cell.toStatus}`, cell);
    });

    return {
      cells: transitionMatrix.cells,
      grid,
      statusOrder: STATUS_ORDER,
      maxProbability: Math.max(...transitionMatrix.cells.map(c => c.probability)),
    };
  }, [transitionMatrix]);

  const pendingReviews = useMemo(() => {
    return jumpReviews.filter(r => r.isApproved === null);
  }, [jumpReviews]);

  const reviewedCount = useMemo(() => {
    return jumpReviews.filter(r => r.isApproved !== null).length;
  }, [jumpReviews]);

  const reviewProgress = useMemo(() => {
    if (jumpReviews.length === 0) return 0;
    return (reviewedCount / jumpReviews.length) * 100;
  }, [jumpReviews.length, reviewedCount]);

  const { missingMonthsData, avgMissingImpact } = useMemo(() => {
    if (!currentBatch?.missingMonths?.length) return { missingMonthsData: [], avgMissingImpact: 0 };

    const impact = transitionMatrix && 'interpolationImpact' in transitionMatrix
      ? (transitionMatrix as { interpolationImpact: Record<string, number> }).interpolationImpact
      : {};

    const avgImpact = Object.values(impact).reduce((sum, val) => sum + Math.abs(val), 0) / Object.values(impact).length || 0;

    const data = currentBatch.missingMonths.map(month => ({
      month,
      strategy: '线性插值',
      impact: avgImpact * 100,
    }));

    return { missingMonthsData: data, avgMissingImpact: avgImpact * 100 };
  }, [currentBatch, transitionMatrix]);

  const handleCellClick = (cell: TransitionCell) => {
    if (cell.count === 0) return;

    const transitionMembers = cell.memberIds.map(memberId => {
      const member = getMemberById(memberId);
      const history = member?.statusHistory || [];
      const transitionRecord = history.find((h, i) =>
        i > 0 && history[i - 1].status === cell.fromStatus && h.status === cell.toStatus
      );

      return {
        id: memberId,
        name: member?.name || '未知',
        currentStatus: member?.currentStatus || cell.toStatus,
        transitionDate: transitionRecord?.startDate || '-',
        reason: cell.abnormalReason,
        isAbnormal: cell.isAbnormal,
      };
    });

    setDrawerContent({ cell, members: transitionMembers });
    setDrawerOpen(true);
  };

  const handleReviewSelect = (review: StatusJumpReview) => {
    setSelectedReview(review);
    setReviewComment('');
    setExplanation(review.plainLanguageExplanation || '');
  };

  const handleReviewSubmit = (isApproved: boolean) => {
    if (!selectedReview) return;

    reviewJump(selectedReview.id, isApproved, reviewComment, explanation);

    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setSelectedReview(null);
      setReviewComment('');
      setExplanation('');
    }, 1500);
  };

  const getCellColor = (cell: TransitionCell) => {
    if (cell.count === 0) return 'rgba(241, 245, 249, 0.3)';

    const maxProb = matrixData?.maxProbability || 1;
    const intensity = cell.probability / maxProb;
    const baseColor = STATUS_COLOR[cell.toStatus];

    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.85})`;
  };

  const getTextColor = (probability: number) => {
    return probability > 0.5 ? 'text-white' : 'text-gray-700';
  };

  if (!matrixData) {
    return <div className="p-8 text-center text-gray-500">数据加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">转移矩阵分析</h1>
          <p className="text-gray-500 mt-1">分析会员状态之间的转移概率和异常跳转</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            当前批次：<span className="font-medium text-gray-700">{currentBatch?.name}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">转移热力图</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 rounded" style={{ background: 'rgba(241, 245, 249, 0.3)' }} />
            <span>低</span>
            <div className="w-16 h-4 rounded" style={{ background: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.9))' }} />
            <span>高</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[700px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${STATUS_ORDER.length}, 1fr)` }}>
              <div className="h-12" />
              {STATUS_ORDER.map(status => (
                <div
                  key={`header-${status}`}
                  className="h-12 flex items-center justify-center text-sm font-medium"
                  style={{ color: STATUS_COLOR[status] }}
                >
                  {STATUS_LABEL[status]}
                </div>
              ))}

              {STATUS_ORDER.map(fromStatus => (
                <React.Fragment key={`row-${fromStatus}`}>
                  <div
                    className="h-16 flex items-center justify-end pr-3 text-sm font-medium"
                    style={{ color: STATUS_COLOR[fromStatus] }}
                  >
                    {STATUS_LABEL[fromStatus]}
                  </div>
                  {STATUS_ORDER.map(toStatus => {
                    const cell = matrixData.grid.get(`${fromStatus}-${toStatus}`);
                    if (!cell) return <div key={`${fromStatus}-${toStatus}`} className="h-16 bg-gray-50" />;

                    return (
                      <motion.div
                        key={`${fromStatus}-${toStatus}`}
                        className={cn(
                          'h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer relative transition-all',
                          cell.isAbnormal && 'border-2 border-dashed border-red-400'
                        )}
                        style={{ backgroundColor: getCellColor(cell) }}
                        whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                        onClick={() => handleCellClick(cell)}
                        onMouseEnter={(e) => {
                          setHoveredCell(cell);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span className={cn('text-lg font-bold', getTextColor(cell.probability))}>
                          {cell.count > 0 ? cell.count : '-'}
                        </span>
                        {cell.count > 0 && (
                          <span className={cn('text-xs', getTextColor(cell.probability))}>
                            {(cell.probability * 100).toFixed(1)}%
                          </span>
                        )}
                        {cell.isAbnormal && (
                          <div className="absolute -top-1 -right-1">
                            <AlertTriangle size={14} className="text-red-500" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>← Y轴：转移前状态</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-dashed border-red-400 rounded" />
                  <span>异常跳转（跨≥2状态）</span>
                </div>
                <span>X轴：转移到状态 →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hoveredCell && hoveredCell.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-xl pointer-events-none"
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y + 15,
            }}
          >
            <div className="font-medium">
              {STATUS_LABEL[hoveredCell.fromStatus]} → {STATUS_LABEL[hoveredCell.toStatus]}
            </div>
            <div className="text-gray-300 mt-1">
              转移人数：<span className="text-white font-medium">{hoveredCell.count} 人</span>
            </div>
            <div className="text-gray-300">
              转移概率：<span className="text-white font-medium">{(hoveredCell.probability * 100).toFixed(2)}%</span>
            </div>
            {hoveredCell.isAbnormal && (
              <div className="text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {hoveredCell.abnormalReason}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && drawerContent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">转移明细</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {STATUS_LABEL[drawerContent.cell.fromStatus]} → {STATUS_LABEL[drawerContent.cell.toStatus]}
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {drawerContent.members.map((member, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User size={18} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                            {member.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={member.currentStatus} size="sm" />
                            {member.isAbnormal && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                                <Clock size={10} />
                                待审核
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={14} />
                        转移日期：{member.transitionDate}
                      </div>
                      {member.reason && (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <AlertTriangle size={14} />
                          {member.reason}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">状态跳跃审核</h2>
            <p className="text-sm text-gray-500 mt-1">审核跨2个及以上状态的异常跳转</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">审核进度</div>
              <div className="text-lg font-semibold text-gray-900">
                {reviewedCount} / {jumpReviews.length}
              </div>
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${reviewProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">待审核列表</span>
                <span className="text-sm text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  {pendingReviews.length} 条待审核
                </span>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {pendingReviews.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle size={48} className="mx-auto mb-2 text-green-400" />
                  <p>暂无待审核的异常跳转</p>
                </div>
              ) : (
                pendingReviews.map((review, idx) => {
                  const member = getMemberById(review.memberId);
                  return (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handleReviewSelect(review)}
                      className={cn(
                        'p-4 border-b border-gray-100 cursor-pointer transition-colors',
                        selectedReview?.id === review.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertTriangle size={16} className="text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-sm font-medium', {
                                'text-blue-600': review.fromStatus === MemberStatus.new,
                                'text-emerald-600': review.fromStatus === MemberStatus.active,
                                'text-violet-600': review.fromStatus === MemberStatus.reactivated,
                                'text-amber-600': review.fromStatus === MemberStatus.at_risk,
                                'text-slate-600': review.fromStatus === MemberStatus.silent,
                                'text-red-600': review.fromStatus === MemberStatus.churned,
                              })}>
                                {STATUS_LABEL[review.fromStatus]}
                              </span>
                              <ChevronRight size={14} className="text-gray-400" />
                              <span className={cn('text-sm font-medium', {
                                'text-blue-600': review.toStatus === MemberStatus.new,
                                'text-emerald-600': review.toStatus === MemberStatus.active,
                                'text-violet-600': review.toStatus === MemberStatus.reactivated,
                                'text-amber-600': review.toStatus === MemberStatus.at_risk,
                                'text-slate-600': review.toStatus === MemberStatus.silent,
                                'text-red-600': review.toStatus === MemberStatus.churned,
                              })}>
                                {STATUS_LABEL[review.toStatus]}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {member?.name || '未知会员'} · {review.jumpDate}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className={cn('transition-colors',
                          selectedReview?.id === review.id ? 'text-primary-500' : 'text-gray-300'
                        )} />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <span className="font-medium text-gray-700">审核详情</span>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {!selectedReview ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>请从左侧选择待审核项</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {submitSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="h-full flex items-center justify-center"
                    >
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', damping: 15 }}
                          className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"
                        >
                          <Check size={32} className="text-green-600" />
                        </motion.div>
                        <p className="text-green-600 font-medium">审核提交成功</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getMemberById(selectedReview.memberId)?.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={selectedReview.fromStatus} size="sm" />
                            <ChevronRight size={14} className="text-gray-400" />
                            <StatusBadge status={selectedReview.toStatus} size="sm" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          人话解释
                        </label>
                        <div className="border-l-4 border-primary-300 bg-primary-50 p-4 rounded-r-lg">
                          <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            className="w-full bg-transparent text-sm text-gray-700 resize-none focus:outline-none"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          审核意见 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="请填写审核意见..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleReviewSubmit(true)}
                          disabled={!reviewComment.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle size={18} />
                          通过
                        </button>
                        <button
                          onClick={() => handleReviewSubmit(false)}
                          disabled={!reviewComment.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle size={18} />
                          驳回
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">样本缺月处理</h2>
            <p className="text-sm text-gray-500 mt-1">缺失月份的数据补全策略及影响分析</p>
          </div>
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showRawData ? <EyeOff size={16} /> : <Eye size={16} />}
            {showRawData ? '显示补全后数据' : '显示原始数据'}
          </button>
        </div>

        {missingMonthsData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle size={48} className="mx-auto mb-2 text-green-400" />
            <p>当前批次数据完整，无缺失月份</p>
          </div>
        ) : (
          <div className="space-y-4">
            {missingMonthsData.map((item, idx) => (
              <motion.div
                key={item.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <BarChart3 size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.month}</div>
                      <div className="text-sm text-gray-500">补全策略：{item.strategy}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-amber-600">
                      ±{item.impact.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">概率影响幅度</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.impact * 10, 100)}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 + 0.2 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>低影响</span>
                    <span>高影响</span>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">数据处理说明</p>
                  <p>
                    缺失月份采用线性插值法进行补全，基于相邻月份的状态转移概率进行平滑过渡。
                    当前显示{showRawData ? '原始未补全' : '补全后'}的转移矩阵数据。
                    补全操作可能会对转移概率产生{avgMissingImpact.toFixed(2)}%左右的影响，建议在解读数据时考虑此因素。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
