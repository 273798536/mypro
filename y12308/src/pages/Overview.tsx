import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Tag,
  Calendar,
  Users,
  TrendingDown,
  TrendingUp,
  Minus,
  Diamond,
  Megaphone,
  Fingerprint,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { HistoricalTrendItem } from '../store/useStore';
import { DataCard } from '../components/DataCard';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: '#3B82F6',
  at_risk: '#EF4444',
  silent: '#F59E0B',
  churned: '#6B7280',
};

const STATUS_TITLES: Record<string, string> = {
  active: '活跃会员',
  at_risk: '高危会员',
  silent: '沉默会员',
  churned: '流失会员',
};

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const {
    members,
    jumpReviews,
    predictions,
    dataHash,
    getCurrentBatch,
    getHistoricalTrends,
    dataSourceValidated,
  } = useStore();

  const currentBatch = getCurrentBatch();
  const historicalTrends = getHistoricalTrends();

  const statusStats = useMemo(() => {
    const total = members.length;
    const statuses = ['active', 'at_risk', 'silent', 'churned'] as const;

    return statuses.map((status) => {
      const count = members.filter((m) => m.currentStatus === status).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      const prediction = predictions.find((p) => p.horizonMonths === 1);
      let trend = 0;
      if (prediction) {
        const currentRatio = percentage / 100;
        const predictedRatio = prediction.predictions[0]?.distribution[status] || 0;
        trend = ((predictedRatio - currentRatio) / currentRatio) * 100;
      }

      return {
        status,
        count,
        percentage,
        trend,
      };
    });
  }, [members, predictions]);

  const churnTrendData = useMemo((): HistoricalTrendItem[] => {
    return historicalTrends;
  }, [historicalTrends]);

  const pendingReviews = useMemo(
    () => jumpReviews.filter((r) => r.isApproved === null).length,
    [jumpReviews]
  );

  const tagConflictCount = useMemo(
    () => members.filter((m) => m.tagConflict).length,
    [members]
  );

  const missingMonths = currentBatch?.missingMonths || [];

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year.slice(2)}/${month}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(
      date.getHours()
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = churnTrendData.find((d) => d.month === label);
      if (!data) return null;

      return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
            {label}
            {data.isMissing && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                样本缺月
              </span>
            )}
          </p>
          {data.isMissing ? (
            <p className="text-sm text-amber-600 mt-1">
              该月数据缺失，已使用线性插值补全
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">
              流失率：<span className="font-semibold text-red-600">{data.churnRate.toFixed(2)}%</span>
            </p>
          )}
          {data.hasActivity && data.activityName && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Megaphone size={12} />
              {data.activityName}
            </p>
          )}
          {data.hasVersionUpdate && data.version && (
            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
              <Diamond size={12} />
              {data.version} 更新
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderActivityMarkers = () => {
    return churnTrendData
      .filter((d) => d.hasActivity)
      .map((data, index) => (
        <ReferenceLine
          key={`activity-${index}`}
          x={data.month}
          stroke="#F59E0B"
          strokeDasharray="3 3"
          strokeWidth={1.5}
          label={{
            value: data.activityName,
            position: 'top',
            fill: '#F59E0B',
            fontSize: 11,
          }}
        />
      ));
  };

  const renderVersionMarkers = () => {
    const nonMissingData = churnTrendData.filter(d => !d.isMissing && d.churnRate > 0);
    const maxRate = Math.max(...nonMissingData.map(d => d.churnRate), 10);
    
    const versionData = churnTrendData
      .filter((d) => d.hasVersionUpdate && !d.isMissing)
      .map((d) => ({
        x: d.month,
        y: d.churnRate + maxRate * 0.08,
        z: 100,
        version: d.version,
      }));

    return (
      <Scatter
        data={versionData}
        fill="#8B5CF6"
        shape="diamond"
        dataKey="z"
        isAnimationActive={false}
      />
    );
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 rounded-full p-2">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-800 font-semibold">数据已同源校验</span>
                {dataSourceValidated ? (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                    正常
                  </span>
                ) : (
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    异常
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-600 mt-0.5">
                批次号：{currentBatch?.id || '-'} · {currentBatch?.name || ''}
              </p>
              <p className="text-xs text-emerald-500 mt-0.5 flex items-center gap-1">
                <Fingerprint size={12} />
                数据指纹：{dataHash || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Calendar size={16} />
            <span>数据更新时间：{formatDate(currentBatch?.createdAt || new Date().toISOString())}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusStats.map((stat, index) => (
          <motion.div
            key={stat.status}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <DataCard
              title={STATUS_TITLES[stat.status]}
              value={stat.count.toLocaleString()}
              trend={stat.trend}
              subtitle={`占比 ${stat.percentage.toFixed(1)}%`}
              color={STATUS_COLORS[stat.status]}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${STATUS_COLORS[stat.status]}20` }}
              >
                <Users size={20} style={{ color: STATUS_COLORS[stat.status] }} />
              </div>
            </DataCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">流失趋势</h2>
            <p className="text-sm text-gray-500 mt-1">近6个月会员流失率变化</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-600">活动重叠期</span>
            </div>
            <div className="flex items-center gap-2">
              <Diamond size={12} className="text-purple-500" />
              <span className="text-gray-600">版本更新</span>
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={churnTrendData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorChurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <ZAxis dataKey="z" range={[40, 40]} />
              <Tooltip content={<CustomTooltip />} />
              {renderActivityMarkers()}
              <Area
                type="monotone"
                dataKey="churnRate"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorChurn)"
                connectNulls
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload?.isMissing) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#FFF"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                      />
                    );
                  }
                  return <circle cx={cx} cy={cy} r={4} fill="#EF4444" />;
                }}
                activeDot={{ r: 6, fill: '#EF4444' }}
              />
              {renderVersionMarkers()}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.4, ease: 'easeOut' }}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">异常告警</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
              'rounded-2xl border p-5 cursor-pointer transition-all duration-300',
              missingMonths.length > 0
                ? 'bg-amber-50 border-amber-200 hover:shadow-lg hover:shadow-amber-100'
                : 'bg-gray-50 border-gray-200 hover:shadow-md'
            )}
            onClick={() => navigate('/transition')}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    size={20}
                    className={missingMonths.length > 0 ? 'text-amber-500' : 'text-gray-400'}
                  />
                  <span className="font-medium text-gray-800">样本缺月告警</span>
                </div>
                {missingMonths.length > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-amber-700 mb-1">
                      {missingMonths.length} 个月
                    </p>
                    <p className="text-sm text-amber-600">
                      缺失月份：{missingMonths.join('、')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400 mb-1">0</p>
                    <p className="text-sm text-gray-500">数据完整，无缺失月份</p>
                  </>
                )}
              </div>
              <Minus
                size={20}
                className={missingMonths.length > 0 ? 'text-amber-400' : 'text-gray-300'}
              />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
              'rounded-2xl border p-5 cursor-pointer transition-all duration-300',
              pendingReviews > 0
                ? 'bg-red-50 border-red-200 hover:shadow-lg hover:shadow-red-100'
                : 'bg-gray-50 border-gray-200 hover:shadow-md'
            )}
            onClick={() => navigate('/transition#reviews')}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle
                    size={20}
                    className={pendingReviews > 0 ? 'text-red-500' : 'text-gray-400'}
                  />
                  <span className="font-medium text-gray-800">状态跳跃告警</span>
                </div>
                {pendingReviews > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-red-700 mb-1">
                      {pendingReviews} 条待审核
                    </p>
                    <p className="text-sm text-red-600">点击跳转审核面板处理</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400 mb-1">0</p>
                    <p className="text-sm text-gray-500">暂无待审核跳转</p>
                  </>
                )}
              </div>
              {pendingReviews > 0 ? (
                <TrendingUp size={20} className="text-red-400" />
              ) : (
                <Minus size={20} className="text-gray-300" />
              )}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
              'rounded-2xl border p-5 cursor-pointer transition-all duration-300',
              tagConflictCount > 0
                ? 'bg-yellow-50 border-yellow-200 hover:shadow-lg hover:shadow-yellow-100'
                : 'bg-gray-50 border-gray-200 hover:shadow-md'
            )}
            onClick={() => navigate('/members')}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag
                    size={20}
                    className={tagConflictCount > 0 ? 'text-yellow-600' : 'text-gray-400'}
                  />
                  <span className="font-medium text-gray-800">行为标签不一致</span>
                </div>
                {tagConflictCount > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-yellow-700 mb-1">
                      {tagConflictCount} 人
                    </p>
                    <p className="text-sm text-yellow-600">行为标签与系统标签冲突</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400 mb-1">0</p>
                    <p className="text-sm text-gray-500">标签一致，无冲突</p>
                  </>
                )}
              </div>
              {tagConflictCount > 0 ? (
                <TrendingDown size={20} className="text-yellow-500" />
              ) : (
                <Minus size={20} className="text-gray-300" />
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Overview;
