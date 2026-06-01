import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  Target,
  Save,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { MemberStatus, Member } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<MemberStatus, string> = {
  [MemberStatus.active]: '#10B981',
  [MemberStatus.at_risk]: '#F59E0B',
  [MemberStatus.silent]: '#64748B',
  [MemberStatus.churned]: '#EF4444',
  [MemberStatus.new]: '#3B82F6',
  [MemberStatus.reactivated]: '#8B5CF6',
};

const STATUS_TITLES: Record<MemberStatus, string> = {
  [MemberStatus.active]: '活跃会员',
  [MemberStatus.at_risk]: '高危会员',
  [MemberStatus.silent]: '沉默会员',
  [MemberStatus.churned]: '流失会员',
  [MemberStatus.new]: '新会员',
  [MemberStatus.reactivated]: '回流会员',
};

const COST_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '低成本' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: '中成本' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: '高成本' },
};

const INTERVENTION_TAGS = [
  '专属优惠券',
  '个性化推荐',
  '积分激励',
  'VIP客服',
  '召回邮件',
  '活动邀请',
];

const Predict: React.FC = () => {
  const { predictions, suggestions, members, getMemberById } = useStore();

  const [displayMode, setDisplayMode] = useState<'absolute' | 'percentage'>('absolute');
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [interventionCoverage, setInterventionCoverage] = useState(50);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>(suggestions[0]?.id || '');
  const [intervenedMembers, setIntervenedMembers] = useState<Set<string>>(new Set());

  const totalMembers = members.length;

  const predictionData = useMemo(() => {
    const horizon3 = predictions.find((p) => p.horizonMonths === 3);
    if (!horizon3) return [];

    const allMonths = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
    const historyCount = 3;

    type ChartDataItem = {
      month: string;
      isPrediction: boolean;
      [key: string]: string | boolean | number | null;
    };

    const result: ChartDataItem[] = [];

    const statuses = [
      MemberStatus.active,
      MemberStatus.at_risk,
      MemberStatus.silent,
      MemberStatus.churned,
    ];

    allMonths.forEach((month, idx) => {
      const isPrediction = idx >= historyCount;
      const item: ChartDataItem = { month, isPrediction };

      if (!isPrediction) {
        statuses.forEach((status) => {
          const variance = 0.02 + Math.random() * 0.03;
          const baseDist = horizon3.initialDistribution[status] || 0;
          const variation = (Math.random() - 0.5) * variance;
          const ratio = Math.max(0, Math.min(1, baseDist + variation * (idx - 1)));
          const value = displayMode === 'absolute' ? Math.round(ratio * totalMembers) : ratio * 100;
          item[`${status}_history`] = value;
          item[status] = null;
        });
      } else {
        const predIdx = idx - historyCount;
        const pred = horizon3.predictions[predIdx];
        statuses.forEach((status) => {
          const dist = pred.distribution[status] || 0;
          const value = displayMode === 'absolute' ? Math.round(dist * totalMembers) : dist * 100;
          item[status] = value;
          item[`${status}_history`] = null;
          item[`${status}_lower`] =
            displayMode === 'absolute'
              ? Math.round(pred.confidenceInterval.lower[status] * totalMembers)
              : pred.confidenceInterval.lower[status] * 100;
          item[`${status}_upper`] =
            displayMode === 'absolute'
              ? Math.round(pred.confidenceInterval.upper[status] * totalMembers)
              : pred.confidenceInterval.upper[status] * 100;
        });
      }
      result.push(item);
    });

    return result;
  }, [predictions, displayMode, totalMembers]);

  const highRiskMembers = useMemo(() => {
    return members
      .filter((m) => m.churnProbability > 0.6)
      .sort((a, b) => b.churnProbability - a.churnProbability)
      .slice(0, 20);
  }, [members]);

  const getDaysSinceLastStatusChange = (member: Member): number => {
    if (member.statusHistory.length === 0) return 0;
    const lastRecord = member.statusHistory[member.statusHistory.length - 1];
    const changeDate = new Date(lastRecord.startDate);
    const today = new Date();
    const diffTime = today.getTime() - changeDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getInterventionTags = (member: Member): string[] => {
    const tags: string[] = [];
    if (member.currentStatus === MemberStatus.at_risk) {
      tags.push('专属优惠券', '个性化推荐');
    } else if (member.currentStatus === MemberStatus.silent) {
      tags.push('积分激励', '召回邮件');
    } else if (member.currentStatus === MemberStatus.churned) {
      tags.push('VIP客服', '活动邀请');
    } else {
      tags.push('个性化推荐', '活动邀请');
    }
    return tags.slice(0, 2);
  };

  const handleMarkIntervened = (memberId: string) => {
    setIntervenedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const currentSuggestion = suggestions.find((s) => s.id === selectedSuggestion);

  const simulationData = useMemo(() => {
    const horizon3 = predictions.find((p) => p.horizonMonths === 3);
    if (!horizon3 || !currentSuggestion) return [];

    const months = ['2026-05', '2026-06', '2026-07', '2026-08'];
    const originalChurnRate = horizon3.initialDistribution[MemberStatus.churned] || 0.15;
    const effectiveness = currentSuggestion.expectedChurnReduction;
    const coverage = interventionCoverage / 100;

    const adjustedChurnRate = originalChurnRate * (1 - coverage * effectiveness);

    const result = months.map((month, idx) => {
      if (idx === 0) {
        return {
          month,
          original: Math.round(originalChurnRate * 100 * 100) / 100,
          adjusted: Math.round(originalChurnRate * 100 * 100) / 100,
        };
      }
      const monthFactor = 1 + idx * 0.1;
      return {
        month,
        original: Math.round(originalChurnRate * monthFactor * 100 * 100) / 100,
        adjusted: Math.round(adjustedChurnRate * monthFactor * 100 * 100) / 100,
      };
    });

    return result;
  }, [predictions, currentSuggestion, interventionCoverage]);

  const simulationMetrics = useMemo(() => {
    if (!currentSuggestion || simulationData.length < 2) return null;

    const originalLast = simulationData[simulationData.length - 1].original;
    const adjustedLast = simulationData[simulationData.length - 1].adjusted;

    const churnReduction = originalLast - adjustedLast;
    const savedMembers = Math.round((churnReduction / 100) * totalMembers);

    return {
      savedMembers,
      churnReduction: Math.round(churnReduction * 100) / 100,
      originalChurnRate: originalLast,
      adjustedChurnRate: adjustedLast,
    };
  }, [currentSuggestion, simulationData, totalMembers]);

  const handleApplyIntervention = () => {
    if (currentSuggestion) {
      alert(`已应用干预：${currentSuggestion.name}，覆盖率：${interventionCoverage}%`);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.06,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year.slice(2)}/${month}`;
  };

  const renderPredictionArea = (status: MemberStatus) => {
    const color = STATUS_COLORS[status];
    return (
      <React.Fragment key={`area-${status}`}>
        <defs>
          <linearGradient id={`fill-${status}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={`${status}_upper`}
          stroke="none"
          fill={`url(#fill-${status})`}
          connectNulls
        />
        <Area
          type="monotone"
          dataKey={`${status}_lower`}
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          connectNulls
        />
      </React.Fragment>
    );
  };

  const renderPredictionLine = (status: MemberStatus) => {
    const color = STATUS_COLORS[status];
    return (
      <React.Fragment key={`line-${status}`}>
        <Line
          type="monotone"
          dataKey={`${status}_history`}
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6, fill: color }}
          name={STATUS_TITLES[status]}
          connectNulls
          strokeDasharray="0"
        />
        <Line
          type="monotone"
          dataKey={status}
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6, fill: color }}
          name={`${STATUS_TITLES[status]} (预测)`}
          connectNulls
          strokeDasharray="5 5"
          legendType="none"
        />
      </React.Fragment>
    );
  };

  const statusesForChart = [
    MemberStatus.active,
    MemberStatus.at_risk,
    MemberStatus.silent,
    MemberStatus.churned,
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              马尔可夫状态预测
            </h2>
            <p className="text-sm text-gray-500 mt-1">未来3个月各状态会员数预测及95%置信区间</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('absolute')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                displayMode === 'absolute'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              绝对数量
            </button>
            <button
              onClick={() => setDisplayMode('percentage')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                displayMode === 'percentage'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              百分比占比
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400" />
            <span className="text-sm text-gray-600">历史数据</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400 border-dashed" />
            <span className="text-sm text-gray-600">预测数据</span>
          </div>
          {statusesForChart.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-sm text-gray-600">{STATUS_TITLES[status]}</span>
            </div>
          ))}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictionData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              {statusesForChart.map((status) => renderPredictionArea(status))}
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tickFormatter={(value) =>
                  displayMode === 'percentage' ? `${value.toFixed(0)}%` : value.toLocaleString()
                }
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={{ stroke: '#E5E7EB' }}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number, name: string) => [
                  displayMode === 'percentage'
                    ? `${value.toFixed(1)}%`
                    : value.toLocaleString(),
                  name,
                ]}
                labelFormatter={(label) => `月份：${label}`}
              />
              {statusesForChart.map((status) => renderPredictionLine(status))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target size={20} className="text-red-600" />
              高风险会员列表
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              流失概率 &gt; 60% 的会员，共 {highRiskMembers.length} 人
            </p>
          </div>
          <span className="text-sm text-gray-500">Top 20</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:pb-0">
          <AnimatePresence>
            {highRiskMembers.map((member, index) => (
              <motion.div
                key={member.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className={cn(
                  'flex-shrink-0 w-72 md:w-auto rounded-xl border p-4 transition-all duration-300',
                  intervenedMembers.has(member.id)
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-gray-200 hover:shadow-lg hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <div className="mt-1">
                      <StatusBadge status={member.currentStatus} size="sm" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-2xl font-bold',
                        member.churnProbability > 0.8
                          ? 'text-red-600'
                          : member.churnProbability > 0.7
                          ? 'text-orange-500'
                          : 'text-amber-500'
                      )}
                    >
                      {Math.round(member.churnProbability * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">流失概率</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">可干预节点</span>
                    <span className="font-medium text-gray-700">
                      {getDaysSinceLastStatusChange(member)} 天前
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {getInterventionTags(member).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
                    <Eye size={14} />
                    查看详情
                  </button>
                  <button
                    onClick={() => handleMarkIntervened(member.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors',
                      intervenedMembers.has(member.id)
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    )}
                  >
                    <CheckCircle size={14} />
                    {intervenedMembers.has(member.id) ? '已干预' : '标记干预'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            干预建议匹配
          </h2>
          <p className="text-sm text-gray-500 mt-1">基于马尔可夫模型的智能干预推荐</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div
                className="p-5 cursor-pointer"
                onClick={() =>
                  setExpandedSuggestion(
                    expandedSuggestion === suggestion.id ? null : suggestion.id
                  )
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{suggestion.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggestion.targetStatuses.map((status) => (
                        <StatusBadge key={status} status={status} size="sm" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        COST_COLORS[suggestion.cost].bg,
                        COST_COLORS[suggestion.cost].text
                      )}
                    >
                      {COST_COLORS[suggestion.cost].label}
                    </span>
                    {expandedSuggestion === suggestion.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-emerald-600">
                      {(suggestion.expectedChurnReduction * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-500">预计降低流失率</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {suggestion.applicableMemberIds.length}
                    </div>
                    <div className="text-sm text-gray-500">适用会员数</div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedSuggestion === suggestion.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 overflow-hidden"
                  >
                    <div className="p-5 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-4">{suggestion.description}</p>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Users size={14} />
                          适用会员列表
                        </h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {suggestion.applicableMemberIds.slice(0, 10).map((memberId) => {
                            const member = getMemberById(memberId);
                            if (!member) return null;
                            return (
                              <div
                                key={memberId}
                                className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm"
                              >
                                <span className="text-gray-700">{member.name}</span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={member.currentStatus} size="sm" />
                                  <span
                                    className={cn(
                                      'text-xs font-medium',
                                      member.churnProbability > 0.6
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                    )}
                                  >
                                    {Math.round(member.churnProbability * 100)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {suggestion.applicableMemberIds.length > 10 && (
                            <div className="text-center text-sm text-gray-500 py-2">
                              还有 {suggestion.applicableMemberIds.length - 10} 名会员...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown size={20} className="text-purple-600" />
            干预效果模拟器
          </h2>
          <p className="text-sm text-gray-500 mt-1">调整干预覆盖率，实时预测干预效果</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择干预方案</label>
              <select
                value={selectedSuggestion}
                onChange={(e) => setSelectedSuggestion(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                {suggestions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                干预覆盖率: {interventionCoverage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={interventionCoverage}
                onChange={(e) => setInterventionCoverage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {currentSuggestion && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-blue-600 mb-1">方案有效性</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {(currentSuggestion.expectedChurnReduction * 100).toFixed(0)}% 流失降低
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl">
                  <div className="text-sm text-amber-600 mb-1">成本等级</div>
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      COST_COLORS[currentSuggestion.cost].text
                    )}
                  >
                    {COST_COLORS[currentSuggestion.cost].label}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleApplyIntervention}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Save size={18} />
              应用干预
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}%`,
                      name === 'original' ? '原始预测' : '干预后预测',
                    ]}
                    labelFormatter={(label) => `月份：${label}`}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'original' ? '原始预测流失率' : '干预后预测流失率'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="original"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    dot={{ fill: '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="original"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="adjusted"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="adjusted"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {simulationMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-sm text-gray-500 mb-1">原始流失率</div>
                  <div className="text-2xl font-bold text-red-600">
                    {simulationMetrics.originalChurnRate.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-sm text-gray-500 mb-1">干预后流失率</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {simulationMetrics.adjustedChurnRate.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <div className="text-sm text-emerald-600 mb-1 flex items-center justify-center gap-1">
                    <TrendingDown size={14} />
                    降低流失率
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {simulationMetrics.churnReduction.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <div className="text-sm text-blue-600 mb-1 flex items-center justify-center gap-1">
                    <Users size={14} />
                    预计挽回
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {simulationMetrics.savedMembers} 人
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Predict;
