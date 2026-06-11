import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Info, TrendingUp, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { calculateMigrationKinetic, validateDataQuality } from '@/utils/calculationEngine';
import { QC_THRESHOLDS } from '@/data/formulas';
import type { MigrationDataPoint, QCResult } from '@/types';
import { AREA_QUALITY_LABELS } from '@/types';

interface MigrationChartProps {
  migrationData: MigrationDataPoint[];
  qcResult?: QCResult;
  sampleBarcode: string;
  isBarcodeDuplicate?: boolean;
  duplicateInfo?: string;
}

type ChartView = 'area' | 'rate' | 'both';

export const MigrationChart: React.FC<MigrationChartProps> = ({
  migrationData,
  qcResult,
  sampleBarcode,
  isBarcodeDuplicate = false,
  duplicateInfo
}) => {
  const [chartView, setChartView] = useState<ChartView>('both');

  const chartData = migrationData.map(d => ({
    timePoint: `${d.timePoint}h`,
    hour: d.timePoint,
    area: d.areaMm2,
    rate: d.migrationRate,
    quality: d.areaQuality
  }));

  const kinetic = calculateMigrationKinetic(migrationData);
  const qualityCheck = validateDataQuality(migrationData);

  const qualityColors: Record<string, string> = {
    good: '#10B981',
    fair: '#F59E0B',
    poor: '#EF4444'
  };

  const trendLabels: Record<string, string> = {
    accelerating: '加速迁移',
    decelerating: '减速迁移',
    linear: '线性迁移'
  };

  const explanationItems = [
    {
      icon: TrendingUp,
      label: '迁移趋势',
      value: trendLabels[kinetic.trend],
      color: kinetic.trend === 'accelerating' ? 'text-emerald-600' :
        kinetic.trend === 'decelerating' ? 'text-amber-600' : 'text-blue-600',
      detail: `R² = ${kinetic.rSquared.toFixed(4)}，拟合度${kinetic.rSquared > 0.95 ? '优秀' :
        kinetic.rSquared > 0.85 ? '良好' : kinetic.rSquared > 0.7 ? '一般' : '较差'
        }`
    },
    {
      icon: Target,
      label: '平均迁移速率',
      value: `${kinetic.averageSpeed.toFixed(2)}%/h`,
      color: 'text-indigo-600',
      detail: `最快速率: ${kinetic.maxSpeed.toFixed(2)}%/h`
    },
    {
      icon: CheckCircle,
      label: '数据质量评分',
      value: `${qualityCheck.score}/100`,
      color: qualityCheck.score >= 80 ? 'text-emerald-600' :
        qualityCheck.score >= 60 ? 'text-amber-600' : 'text-red-600',
      detail: qualityCheck.isValid ? '数据有效，可用于分析' : '数据质量不足，建议复核'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {isBarcodeDuplicate && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-700 mb-1">
                  ⚠️ 条码重复警告 - 图表数据仅供参考
                </h4>
                <p className="text-sm text-rose-600">
                  {duplicateInfo || `条码「${sampleBarcode}」已被系统拦截，此图表数据可能属于其他样本。`}
                </p>
                <p className="text-xs text-rose-500 mt-1">
                  📚 学生提示：相同条码会导致数据混淆，无法确定哪条曲线属于哪个样本。
                  就像两个人交了同一张试卷，老师不知道该给谁打分！
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">划痕分析趋势图</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartView('area')}
                className={`text-xs px-3 py-1 rounded border ${chartView === 'area'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                面积图
              </button>
              <button
                onClick={() => setChartView('rate')}
                className={`text-xs px-3 py-1 rounded border ${chartView === 'rate'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                迁移率图
              </button>
              <button
                onClick={() => setChartView('both')}
                className={`text-xs px-3 py-1 rounded border ${chartView === 'both'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                对比视图
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {(chartView === 'area' || chartView === 'both') && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                  划痕面积变化趋势（单位：mm²）
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="timePoint"
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        label={{ value: '观察时间点', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94A3B8' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        label={{ value: '面积(mm²)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border-2 border-slate-200 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-slate-800 text-sm mb-2">{label}</p>
                                <p className="text-sm text-blue-600">
                                  划痕面积: <span className="font-mono font-bold">{data.area.toFixed(4)}</span> mm²
                                </p>
                                <p className="text-sm text-slate-600 mt-1">
                                  图像质量: <span className={`font-medium ${data.quality === 'good' ? 'text-emerald-600' :
                                      data.quality === 'fair' ? 'text-amber-600' : 'text-red-600'
                                    }`}>{AREA_QUALITY_LABELS[data.quality]}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="area"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 8 }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={qualityColors[entry.quality]} stroke={qualityColors[entry.quality]} />
                        ))}
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Info size={12} />
                  图例说明：圆点颜色表示该时间点图像质量（绿=良好/黄=一般/红=较差），蓝线表示面积变化趋势
                </p>
              </div>
            )}

            {(chartView === 'rate' || chartView === 'both') && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                  细胞迁移率（单位：%）
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.filter(d => d.hour > 0)} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="timePoint"
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        label={{ value: '观察时间点', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94A3B8' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        label={{ value: '迁移率(%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }}
                        domain={[0, 100]}
                      />
                      <ReferenceLine
                        y={QC_THRESHOLDS.migrationRateCritical}
                        stroke="#F59E0B"
                        strokeDasharray="5 5"
                        label={{ value: '临界值 40%', position: 'right', fontSize: 10, fill: '#F59E0B' }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isCritical = data.rate < QC_THRESHOLDS.migrationRateCritical;
                            return (
                              <div className="bg-white border-2 border-slate-200 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-slate-800 text-sm mb-2">{label}</p>
                                <p className="text-sm text-emerald-600">
                                  迁移率: <span className="font-mono font-bold">{data.rate.toFixed(2)}</span>%
                                </p>
                                {isCritical && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ 低于临界值，迁移能力可能受损
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="rate"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      >
                        {chartData.filter(d => d.hour > 0).map((entry, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={entry.rate >= QC_THRESHOLDS.migrationRateCritical ? '#10B981' : '#F59E0B'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Info size={12} />
                  柱状图颜色说明：绿色=迁移正常(≥40%)，黄色=迁移能力偏弱(＜40%)，虚线为临界参考线
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <Info size={18} />
              数据明细解释
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {explanationItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 ${item.color.replace('text-', 'text-')}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {qcResult && (
          <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">质控指标参考</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">CV值</span>
                  <span className={`font-mono font-bold ${qcResult.cvValue > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {qcResult.cvValue.toFixed(2)}% / ≤10%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${qcResult.cvValue > 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(qcResult.cvValue * 5, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {qcResult.cvValue > 10 ? '⚠️ 超过阈值，重复性需改善' : '✅ 重复性良好'}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Z'因子</span>
                  <span className={`font-mono font-bold ${qcResult.zPrimeFactor < 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {qcResult.zPrimeFactor.toFixed(3)} / ≥0.5
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${qcResult.zPrimeFactor < 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max(qcResult.zPrimeFactor * 100, 5)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {qcResult.zPrimeFactor < 0.5 ? '⚠️ 实验体系稳定性一般' : '✅ 实验体系优良'}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">细胞存活率</span>
                  <span className={`font-mono font-bold ${qcResult.cellViability < 90 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {qcResult.cellViability.toFixed(1)}% / ≥90%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${qcResult.cellViability < 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${qcResult.cellViability}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {qcResult.cellViability < 90 ? '⚠️ 低于要求，可能影响结果' : '✅ 存活率达标'}
                </p>
              </div>
            </div>
          </div>
        )}

        {qualityCheck.issues.length > 0 && (
          <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4">
            <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              数据问题提示
            </h4>
            <ul className="space-y-1">
              {qualityCheck.issues.map((issue, idx) => (
                <li key={idx} className="text-xs text-amber-700 flex items-start gap-1.5">
                  <span>•</span>
                  {issue}
                </li>
              ))}
            </ul>
            {qualityCheck.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs font-medium text-amber-800 mb-1">改进建议：</p>
                <ul className="space-y-1">
                  {qualityCheck.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-amber-600 flex items-start gap-1.5">
                      <span>💡</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationChart;
