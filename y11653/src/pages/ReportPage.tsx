import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, BarChart3, Clock, AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { calculateScore, getGrade } from '@/utils/scoring';
import { CHEMICALS, INDICATOR_LABELS, INDICATOR_UNITS, INDICATOR_COLORS, STANDARD_THRESHOLDS } from '@/data/chemicals';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export function ReportPage() {
  const navigate = useNavigate();
  const { operations, currentWater, totalCost, score, historyData } = useGameStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const scoreBreakdown = useMemo(() => {
    return calculateScore(currentWater, STANDARD_THRESHOLDS, totalCost, operations);
  }, [currentWater, totalCost, operations]);

  const grade = useMemo(() => {
    return getGrade(scoreBreakdown.total, scoreBreakdown.totalMax);
  }, [scoreBreakdown]);

  const operationsData = useMemo(() => {
    return operations.map((op, idx) => ({
      name: `操作${idx + 1}`,
      成本: op.cost,
      异常次数: op.anomalies.length,
    }));
  }, [operations]);

  const exportCSV = () => {
    const headers = ['时间点', '药剂', '投药量(mg/L)', '搅拌时间(分钟)', '成本(元)', '异常', 'COD(mg/L)', '氨氮(mg/L)', '总磷(mg/L)', '浊度(NTU)'];
    const rows = operations.map((op, idx) => [
      idx * 10 + 10,
      CHEMICALS.find(c => c.id === op.chemicalId)?.name || '',
      op.dosage,
      op.mixingTime,
      op.cost.toFixed(2),
      op.anomalies.join(','),
      op.afterQuality.cod.toFixed(1),
      op.afterQuality.ammonia.toFixed(1),
      op.afterQuality.totalPhosphorus.toFixed(1),
      op.afterQuality.turbidity.toFixed(1),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `操作记录_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const exportReport = () => {
    const reportContent = `
污水厂投药模拟运行报告
生成时间: ${new Date().toLocaleString()}

=== 最终得分 ===
总分: ${scoreBreakdown.total} / ${scoreBreakdown.totalMax}
等级: ${grade.grade}
出水达标: ${scoreBreakdown.compliance} / ${scoreBreakdown.complianceMax}
成本控制: ${scoreBreakdown.cost} / ${scoreBreakdown.costMax}
操作规范: ${scoreBreakdown.operation} / ${scoreBreakdown.operationMax}
累计成本: ¥${totalCost.toFixed(2)}

=== 最终水质 ===
COD: ${currentWater.cod.toFixed(1)} mg/L (阈值: ${STANDARD_THRESHOLDS.cod})
氨氮: ${currentWater.ammonia.toFixed(1)} mg/L (阈值: ${STANDARD_THRESHOLDS.ammonia})
总磷: ${currentWater.totalPhosphorus.toFixed(1)} mg/L (阈值: ${STANDARD_THRESHOLDS.totalPhosphorus})
浊度: ${currentWater.turbidity.toFixed(1)} NTU (阈值: ${STANDARD_THRESHOLDS.turbidity})
pH: ${currentWater.ph.toFixed(1)} (范围: 6-9)

=== 扣分明细 ===
${scoreBreakdown.deductions.map(d => `${d.reason}: ${d.points}分`).join('\n')}

=== 操作记录 ===
${operations.map((op, idx) => `
操作${idx + 1}:
  药剂: ${CHEMICALS.find(c => c.id === op.chemicalId)?.name}
  投药量: ${op.dosage} mg/L
  搅拌时间: ${op.mixingTime} 分钟
  成本: ¥${op.cost.toFixed(2)}
  异常: ${op.anomalies.length > 0 ? op.anomalies.join(', ') : '无'}
`).join('')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `运行报告_${new Date().toLocaleDateString()}.txt`;
    link.click();
  };

  const getAnomalyName = (type: string) => {
    const names: Record<string, string> = {
      overdose: '投药过量',
      insufficient_mixing: '搅拌不足',
      rebound: '指标反弹',
      ph_extreme: 'pH异常',
    };
    return names[type] || type;
  };

  if (operations.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">暂无运行数据</h2>
          <p className="text-slate-400 mb-6">请先完成一次模拟运行</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            返回模拟
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回模拟
          </button>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 p-6 bg-slate-900 rounded-xl border border-slate-700 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={grade.color}
                    strokeWidth="8"
                    strokeDasharray={`${(scoreBreakdown.total / scoreBreakdown.totalMax) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: grade.color }}>
                    {grade.grade}
                  </span>
                  <span className="text-sm text-slate-400">
                    {scoreBreakdown.total}/{scoreBreakdown.totalMax}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">综合评级</h3>
              <p className="text-sm text-slate-400">
                {grade.grade === 'A' && '优秀！操作规范，水质达标，成本控制良好'}
                {grade.grade === 'B' && '良好！基本达标，还有优化空间'}
                {grade.grade === 'C' && '合格！部分指标超标，需要改进操作'}
                {grade.grade === 'D' && '待改进！多项指标超标，成本控制不佳'}
                {grade.grade === 'F' && '不合格！请重新学习操作规范'}
              </p>
            </div>

            <div className="lg:col-span-3 p-6 bg-slate-900 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                得分分析
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">出水达标率</span>
                    <span>{scoreBreakdown.compliance}/{scoreBreakdown.complianceMax}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(scoreBreakdown.compliance / scoreBreakdown.complianceMax) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">成本控制</span>
                    <span>{scoreBreakdown.cost}/{scoreBreakdown.costMax}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${(scoreBreakdown.cost / scoreBreakdown.costMax) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">操作规范性</span>
                    <span>{scoreBreakdown.operation}/{scoreBreakdown.operationMax}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${(scoreBreakdown.operation / scoreBreakdown.operationMax) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {scoreBreakdown.deductions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">扣分明细</h4>
                  <div className="space-y-1">
                    {scoreBreakdown.deductions.map((d, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-400">{d.reason}</span>
                        <span className="text-red-400">{d.points} 分</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                成本分析
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operationsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="成本" fill="#165DFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">累计运行成本</span>
                  <span className="text-2xl font-bold text-yellow-400">¥{totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
                最终水质
              </h3>
              <div className="space-y-3">
                {(['cod', 'ammonia', 'totalPhosphorus', 'turbidity'] as const).map((indicator) => {
                  const value = currentWater[indicator];
                  const threshold = STANDARD_THRESHOLDS[indicator];
                  const isPass = value <= threshold;
                  return (
                    <div key={indicator} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: INDICATOR_COLORS[indicator] }}
                        />
                        <span className="text-slate-300">{INDICATOR_LABELS[indicator]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('font-mono font-bold', isPass ? 'text-green-400' : 'text-red-400')}>
                          {value.toFixed(1)} {INDICATOR_UNITS[indicator]}
                        </span>
                        <span className="text-slate-500 text-sm">≤ {threshold}</span>
                        {isPass ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: INDICATOR_COLORS.ph }}
                    />
                    <span className="text-slate-300">pH值</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'font-mono font-bold',
                      currentWater.ph >= 6 && currentWater.ph <= 9 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {currentWater.ph.toFixed(1)}
                    </span>
                    <span className="text-slate-500 text-sm">6-9</span>
                    {currentWater.ph >= 6 && currentWater.ph <= 9 ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              操作回放
            </h3>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />
              <div className="space-y-4">
                {operations.map((op, idx) => (
                  <div key={op.id} className="relative pl-16">
                    <div className="absolute left-4 w-5 h-5 bg-blue-600 rounded-full border-4 border-slate-900" />
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">操作 {idx + 1}</span>
                        <span className="text-sm text-slate-400">第{(idx + 1) * 10}分钟</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">药剂: </span>
                          <span className="text-white">{CHEMICALS.find(c => c.id === op.chemicalId)?.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">投药量: </span>
                          <span className="text-white">{op.dosage} mg/L</span>
                        </div>
                        <div>
                          <span className="text-slate-400">搅拌时间: </span>
                          <span className="text-white">{op.mixingTime} 分钟</span>
                        </div>
                        <div>
                          <span className="text-slate-400">成本: </span>
                          <span className="text-yellow-400">¥{op.cost.toFixed(2)}</span>
                        </div>
                      </div>
                      {op.anomalies.length > 0 && (
                        <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded">
                          <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>异常: {op.anomalies.map(a => getAnomalyName(a)).join(', ')}</span>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center p-1 bg-slate-700/50 rounded">
                          <div className="text-slate-400">COD</div>
                          <div className="text-white font-mono">{op.afterQuality.cod.toFixed(0)}</div>
                        </div>
                        <div className="text-center p-1 bg-slate-700/50 rounded">
                          <div className="text-slate-400">氨氮</div>
                          <div className="text-white font-mono">{op.afterQuality.ammonia.toFixed(1)}</div>
                        </div>
                        <div className="text-center p-1 bg-slate-700/50 rounded">
                          <div className="text-slate-400">总磷</div>
                          <div className="text-white font-mono">{op.afterQuality.totalPhosphorus.toFixed(1)}</div>
                        </div>
                        <div className="text-center p-1 bg-slate-700/50 rounded">
                          <div className="text-slate-400">浊度</div>
                          <div className="text-white font-mono">{op.afterQuality.turbidity.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
