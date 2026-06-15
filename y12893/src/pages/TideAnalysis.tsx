import { useEffect, useMemo, useState } from 'react';
import {
  Waves,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  Droplets,
  Info,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { calculateTideCorrelation, generateTidePrediction } from '@/utils/tideCalculator';
import { cn } from '@/lib/utils';

export default function TideAnalysis() {
  const { records, loadRecords, loadStats, stats } = useDataStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'day'>('month');
  const [predictionDays, setPredictionDays] = useState(7);

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [loadRecords, loadStats]);

  const periods = [
    { key: 'day' as const, label: '今日', days: 1 },
    { key: 'week' as const, label: '本周', days: 7 },
    { key: 'month' as const, label: '本月', days: 30 },
  ];

  const periodConfig = periods.find(p => p.key === selectedPeriod)!;
  const now = Date.now();
  const period = {
    start: now - periodConfig.days * 24 * 60 * 60 * 1000,
    end: now
  };

  const tideAnalysis = useMemo(() => {
    return calculateTideCorrelation(records, period);
  }, [records, period]);

  const tidePrediction = useMemo(() => {
    return generateTidePrediction(predictionDays);
  }, [predictionDays]);

  const getCorrelationLevel = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return { level: '强相关', color: '#2A9D8F', desc: '潮汐对负荷有显著影响' };
    if (abs >= 0.4) return { level: '中等相关', color: '#E9C46A', desc: '潮汐对负荷有一定影响' };
    return { level: '弱相关', color: '#E76F51', desc: '潮汐对负荷影响不明显' };
  };

  const correlationInfo = getCorrelationLevel(tideAnalysis.correlation);

  const maxLoad = Math.max(...tideAnalysis.hourlyCorrelation.map(h => h.avgLoad), 0);
  const maxTide = Math.max(...tideAnalysis.hourlyCorrelation.map(h => h.avgTideHeight), 0);

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">潮汐与负荷关联分析</h1>
        <p className="text-white/70">
          月底或课前检查潮汐计算是否能解释清楚岛礁供电负荷变化规律
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setSelectedPeriod(p.key)}
            className={cn(
              'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
              selectedPeriod === p.key
                ? 'bg-white text-gray-800'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            )}
          >
            <Calendar className="w-4 h-4" />
            {p.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-white/60 text-sm">预测</span>
          <select
            value={predictionDays}
            onChange={(e) => setPredictionDays(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
          >
            {[3, 7, 14, 30].map(d => (
              <option key={d} value={d} className="text-gray-800">{d} 天</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <Waves className="w-10 h-10 text-[#3E92CC]" />
            <span className="text-xs bg-[#3E92CC]/10 text-[#3E92CC] px-2 py-1 rounded-full font-medium">
              相关系数
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-1">
            {tideAnalysis.correlation.toFixed(3)}
          </p>
          <p className="text-sm" style={{ color: correlationInfo.color }}>
            {correlationInfo.level}
          </p>
          <p className="text-xs text-gray-500 mt-2">{correlationInfo.desc}</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-10 h-10 text-[#E9C46A]" />
            <span className="text-xs bg-[#E9C46A]/10 text-[#E9C46A] px-2 py-1 rounded-full font-medium">
              平均负荷
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-1">
            {stats.avgLoad.toFixed(1)}
          </p>
          <p className="text-sm text-gray-500">kW</p>
          <p className="text-xs text-gray-500 mt-2">
            基于 {stats.totalRecords} 条记录计算
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <Droplets className="w-10 h-10 text-[#2A9D8F]" />
            <span className="text-xs bg-[#2A9D8F]/10 text-[#2A9D8F] px-2 py-1 rounded-full font-medium">
              平均潮高
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-1">
            {tideAnalysis.avgTideHeight.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">米</p>
          <p className="text-xs text-gray-500 mt-2">
            波动范围: {tideAnalysis.tideRange.min.toFixed(1)} ~ {tideAnalysis.tideRange.max.toFixed(1)} m
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <RefreshCw className="w-10 h-10 text-[#0A2463]" />
            <span className="text-xs bg-[#0A2463]/10 text-[#0A2463] px-2 py-1 rounded-full font-medium">
              高潮时段
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mb-1">
            {tideAnalysis.peakTideHour}:00
          </p>
          <p className="text-sm text-gray-500">每日</p>
          <p className="text-xs text-gray-500 mt-2">
            低潮时段: {tideAnalysis.lowTideHour}:00
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3E92CC]" />
            24小时潮汐-负荷关联趋势
          </h2>
          <div className="h-64 relative">
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="loadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3E92CC" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3E92CC" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2A9D8F" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2A9D8F" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="40"
                  y1={20 + i * 40}
                  x2="580"
                  y2={20 + i * 40}
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              ))}

              {tideAnalysis.hourlyCorrelation.map((hour, idx) => (
                <text
                  key={`label-${hour.hour}`}
                  x={40 + idx * (540 / 23)}
                  y="190"
                  textAnchor="middle"
                  className="fill-gray-400 text-[10px]"
                >
                  {hour.hour}
                </text>
              ))}

              <path
                d={`M 40 ${180 - (tideAnalysis.hourlyCorrelation[0]?.avgTideHeight / maxTide) * 140 || 180}
                    ${tideAnalysis.hourlyCorrelation.map((hour, idx) =>
                      `L ${40 + idx * (540 / 23)} ${180 - (hour.avgTideHeight / maxTide) * 140}`
                    ).join(' ')}
                    L 580 180 L 40 180 Z`}
                fill="url(#tideGradient)"
              />

              <path
                d={`M 40 ${180 - (tideAnalysis.hourlyCorrelation[0]?.avgTideHeight / maxTide) * 140 || 180}
                    ${tideAnalysis.hourlyCorrelation.map((hour, idx) =>
                      `L ${40 + idx * (540 / 23)} ${180 - (hour.avgTideHeight / maxTide) * 140}`
                    ).join(' ')}`}
                fill="none"
                stroke="#2A9D8F"
                strokeWidth="2"
              />

              <path
                d={`M 40 ${180 - (tideAnalysis.hourlyCorrelation[0]?.avgLoad / maxLoad) * 140 || 180}
                    ${tideAnalysis.hourlyCorrelation.map((hour, idx) =>
                      `L ${40 + idx * (540 / 23)} ${180 - (hour.avgLoad / maxLoad) * 140}`
                    ).join(' ')}
                    L 580 180 L 40 180 Z`}
                fill="url(#loadGradient)"
              />

              <path
                d={`M 40 ${180 - (tideAnalysis.hourlyCorrelation[0]?.avgLoad / maxLoad) * 140 || 180}
                    ${tideAnalysis.hourlyCorrelation.map((hour, idx) =>
                      `L ${40 + idx * (540 / 23)} ${180 - (hour.avgLoad / maxLoad) * 140}`
                    ).join(' ')}`}
                fill="none"
                stroke="#3E92CC"
                strokeWidth="2"
                strokeDasharray="5,3"
              />

              {tideAnalysis.hourlyCorrelation.map((hour, idx) => (
                <circle
                  key={`dot-tide-${hour.hour}`}
                  cx={40 + idx * (540 / 23)}
                  cy={180 - (hour.avgTideHeight / maxTide) * 140}
                  r="3"
                  fill="#2A9D8F"
                />
              ))}

              {tideAnalysis.hourlyCorrelation.map((hour, idx) => (
                <circle
                  key={`dot-load-${hour.hour}`}
                  cx={40 + idx * (540 / 23)}
                  cy={180 - (hour.avgLoad / maxLoad) * 140}
                  r="3"
                  fill="#3E92CC"
                />
              ))}
            </svg>

            <div className="absolute top-2 right-2 flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2A9D8F]" />
                <span className="text-xs text-gray-500">潮汐高度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#3E92CC]" style={{ background: 'repeating-linear-gradient(90deg, #3E92CC, #3E92CC 4px, transparent 4px, transparent 7px)' }} />
                <span className="text-xs text-gray-500">供电负荷</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#E9C46A]" />
            未来 {predictionDays} 天潮汐与负荷预测
          </h2>
          <div className="h-64 relative">
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="predGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E9C46A" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#E9C46A" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="40"
                  y1={20 + i * 40}
                  x2="580"
                  y2={20 + i * 40}
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              ))}

              {tidePrediction.map((day, idx) => idx % Math.ceil(predictionDays / 6) === 0 && (
                <text
                  key={`label-${idx}`}
                  x={40 + idx * (540 / (predictionDays - 1))}
                  y="190"
                  textAnchor="middle"
                  className="fill-gray-400 text-[10px]"
                >
                  {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                </text>
              ))}

              <path
                d={`M 40 ${180 - (tidePrediction[0]?.predictedLoad / (maxLoad * 1.2)) * 140 || 180}
                    ${tidePrediction.map((day, idx) =>
                      `L ${40 + idx * (540 / (predictionDays - 1))} ${180 - (day.predictedLoad / (maxLoad * 1.2)) * 140}`
                    ).join(' ')}
                    L 580 180 L 40 180 Z`}
                fill="url(#predGradient)"
              />

              <path
                d={`M 40 ${180 - (tidePrediction[0]?.predictedLoad / (maxLoad * 1.2)) * 140 || 180}
                    ${tidePrediction.map((day, idx) =>
                      `L ${40 + idx * (540 / (predictionDays - 1))} ${180 - (day.predictedLoad / (maxLoad * 1.2)) * 140}`
                    ).join(' ')}`}
                fill="none"
                stroke="#E9C46A"
                strokeWidth="2"
              />

              {tidePrediction.map((day, idx) => (
                <circle
                  key={`dot-${idx}`}
                  cx={40 + idx * (540 / (predictionDays - 1))}
                  cy={180 - (day.predictedLoad / (maxLoad * 1.2)) * 140}
                  r={day.isPeak ? 5 : 3}
                  fill={day.isPeak ? '#E63946' : '#E9C46A'}
                />
              ))}

              {tidePrediction.filter(d => d.isPeak).map((day, idx) => (
                <g key={`peak-${idx}`}>
                  <line
                    x1={40 + tidePrediction.indexOf(day) * (540 / (predictionDays - 1))}
                    y1={180 - (day.predictedLoad / (maxLoad * 1.2)) * 140 - 8}
                    x2={40 + tidePrediction.indexOf(day) * (540 / (predictionDays - 1))}
                    y2={180 - (day.predictedLoad / (maxLoad * 1.2)) * 140 - 25}
                    stroke="#E63946"
                    strokeWidth="1"
                  />
                  <rect
                    x={40 + tidePrediction.indexOf(day) * (540 / (predictionDays - 1)) - 40}
                    y={180 - (day.predictedLoad / (maxLoad * 1.2)) * 140 - 40}
                    width="80"
                    height="20"
                    rx="4"
                    fill="#E63946"
                  />
                  <text
                    x={40 + tidePrediction.indexOf(day) * (540 / (predictionDays - 1))}
                    y={180 - (day.predictedLoad / (maxLoad * 1.2)) * 140 - 26}
                    textAnchor="middle"
                    className="fill-white text-[10px] font-medium"
                  >
                    峰值 {day.predictedLoad.toFixed(0)} kW
                  </text>
                </g>
              ))}
            </svg>

            <div className="absolute top-2 right-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E63946]" />
              <span className="text-xs text-gray-500">负荷峰值预警</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#0A2463]" />
            潮汐负荷分析说明
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#2A9D8F]/5 rounded-xl border border-[#2A9D8F]/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#2A9D8F] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">可用数据</p>
                  <p className="text-sm text-gray-600">
                    基于 {stats.approvedCount} 条已审核数据，潮汐与负荷相关系数为 {tideAnalysis.correlation.toFixed(3)}，
                    {correlationInfo.level}。每日 {tideAnalysis.peakTideHour}:00 为高潮时段，{tideAnalysis.lowTideHour}:00 为低潮时段。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#E9C46A]/5 rounded-xl border border-[#E9C46A]/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#E9C46A] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">暂缓数据</p>
                  <p className="text-sm text-gray-600">
                    异常天气记录 {records.filter(r => r.qualityIssues.includes('outlier')).length} 条，
                    深度为负记录 {records.filter(r => r.location.depth !== undefined && r.location.depth < 0).length} 条，
                    需人工复核后再纳入分析。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#E76F51]/5 rounded-xl border border-[#E76F51]/20">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-[#E76F51] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 mb-1">需重新采集</p>
                  <p className="text-sm text-gray-600">
                    盐度单位混用记录 {records.filter(r => r.qualityIssues.includes('unit_mismatch')).length} 条，
                    缺失关键字段记录 {records.filter(r => r.qualityIssues.includes('missing')).length} 条，
                    需修正或重新采集。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Waves className="w-5 h-5 text-[#3E92CC]" />
            预测日报
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {tidePrediction.map((day, idx) => (
              <div
                key={day.date}
                className={cn(
                  'p-3 rounded-xl border transition-all',
                  day.isPeak
                    ? 'border-[#E63946]/30 bg-[#E63946]/5'
                    : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-800">
                    {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  {day.isPeak && (
                    <span className="text-[10px] bg-[#E63946] text-white px-2 py-0.5 rounded-full font-medium">
                      峰值预警
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">预计负荷</span>
                    <p className="font-semibold text-gray-800">{day.predictedLoad.toFixed(1)} kW</p>
                  </div>
                  <div>
                    <span className="text-gray-500">预计潮高</span>
                    <p className="font-semibold text-gray-800">{day.predictedTide.toFixed(2)} m</p>
                  </div>
                  <div>
                    <span className="text-gray-500">置信度</span>
                    <p className="font-semibold" style={{ color: day.confidence > 0.8 ? '#2A9D8F' : day.confidence > 0.5 ? '#E9C46A' : '#E76F51' }}>
                      {(day.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">风险等级</span>
                    <p className={cn(
                      'font-semibold',
                      day.riskLevel === 'low' && 'text-[#2A9D8F]',
                      day.riskLevel === 'medium' && 'text-[#E9C46A]',
                      day.riskLevel === 'high' && 'text-[#E63946]'
                    )}>
                      {day.riskLevel === 'low' ? '低' : day.riskLevel === 'medium' ? '中' : '高'}
                    </p>
                  </div>
                </div>
                {day.recommendation && (
                  <p className="text-xs text-gray-500 mt-2 italic">{day.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
