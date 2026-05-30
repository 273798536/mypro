import React from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronUp, Trophy, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ResultPanel: React.FC = () => {
  const {
    calculationResults,
    consistencyResults,
    sensitivityResults,
    suppliers,
    categories,
    judges,
    expandedResult,
    setExpandedResult,
  } = useStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'fail':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'fail':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-slate-600" />;
    }
  };

  const chartData = calculationResults.map((result) => {
    const supplier = suppliers.find((s) => s.id === result.supplierId);
    return {
      name: supplier?.name?.slice(0, 6) || result.supplierId,
      score: result.totalScore,
      rank: result.rank,
    };
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {calculationResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <TrendingUp size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无计算结果</p>
            <p className="text-sm">请点击"运行计算"按钮生成评分结果</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Trophy size={18} className="text-yellow-500" />
                  评分排名
                </h3>
              </div>
              <div className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} 分`, '最终得分']}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.rank === 1
                              ? '#fbbf24'
                              : entry.rank === 2
                              ? '#9ca3af'
                              : entry.rank === 3
                              ? '#d97706'
                              : '#3b82f6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">详细结果（点击展开追溯）</h3>
              {calculationResults.map((result) => {
                const supplier = suppliers.find((s) => s.id === result.supplierId);
                const isExpanded = expandedResult === result.supplierId;
                const medalColor =
                  result.rank === 1
                    ? 'bg-yellow-500'
                    : result.rank === 2
                    ? 'bg-slate-400'
                    : result.rank === 3
                    ? 'bg-amber-600'
                    : 'bg-blue-500';

                return (
                  <div
                    key={result.supplierId}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() =>
                        setExpandedResult(isExpanded ? null : result.supplierId)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`${medalColor} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}
                        >
                          {result.rank}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{supplier?.name || result.supplierId}</p>
                          <p className="text-sm text-slate-500">{supplier?.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {result.totalScore.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">单位：分</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {result.weightedScores.map((ws) => {
                            const category = categories.find((c) => c.id === ws.categoryId);
                            return (
                              <div key={ws.categoryId} className="bg-white rounded-lg p-3 border border-slate-200">
                                <p className="font-medium text-slate-700">{category?.name}</p>
                                <div className="mt-2 space-y-1 text-sm">
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">评委平均分：</span>
                                    <span className="font-medium">{ws.score.toFixed(2)} 分</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">原始权重：</span>
                                    <span className="font-medium">{ws.weight}</span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">归一化权重：</span>
                                    <span className="font-medium">{ws.normalizedWeight.toFixed(4)}</span>
                                  </p>
                                  <p className="flex justify-between text-blue-600 font-semibold">
                                    <span>加权得分：</span>
                                    <span>{(ws.score * ws.normalizedWeight).toFixed(4)}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                          {result.calculationTrace.map((line, idx) => (
                            <div key={idx}>{line || '\u00A0'}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {consistencyResults && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                一致性检验
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className={`p-4 rounded-lg border ${getStatusColor(consistencyResults.weightNormalization.isNormalized ? 'pass' : 'warning')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consistencyResults.weightNormalization.isNormalized ? 'pass' : 'warning')}
                      <span className="font-semibold">权重归一化检查</span>
                    </div>
                    <span className="text-2xl font-bold">{consistencyResults.weightNormalization.originalSum.toFixed(2)}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">单位：</span>-</p>
                    <p><span className="font-medium">适用范围：</span>{consistencyResults.weightNormalization.scope}</p>
                    <p><span className="font-medium">检验说明：</span>{consistencyResults.weightNormalization.reason}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${getStatusColor(consistencyResults.missingScores.count === 0 ? 'pass' : 'warning')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consistencyResults.missingScores.count === 0 ? 'pass' : 'warning')}
                      <span className="font-semibold">打分缺项检查</span>
                    </div>
                    <span className="text-2xl font-bold">{consistencyResults.missingScores.count} 项</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">单位：</span>项</p>
                    <p><span className="font-medium">适用范围：</span>{consistencyResults.missingScores.scope}</p>
                    <p><span className="font-medium">检验说明：</span>{consistencyResults.missingScores.reason}</p>
                    {consistencyResults.missingScores.details.length > 0 && (
                      <div className="mt-2 p-2 bg-white/50 rounded">
                        <p className="font-medium mb-1">缺项详情：</p>
                        <ul className="list-disc list-inside">
                          {consistencyResults.missingScores.details.map((detail, idx) => {
                            const judge = judges.find((j) => j.id === detail.judgeId);
                            const supplier = suppliers.find((s) => s.id === detail.supplierId);
                            const category = categories.find((c) => c.id === detail.categoryId);
                            return (
                              <li key={idx}>
                                {judge?.name} - {supplier?.name} - {category?.name}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${getStatusColor(consistencyResults.cronbachAlphaStatus)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consistencyResults.cronbachAlphaStatus)}
                      <span className="font-semibold">Cronbach's α 系数</span>
                    </div>
                    <span className="text-2xl font-bold">{consistencyResults.cronbachAlpha.toFixed(4)}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">单位：</span>-</p>
                    <p><span className="font-medium">适用范围：</span>{consistencyResults.cronbachAlphaScope}</p>
                    <p><span className="font-medium">检验说明：</span>{consistencyResults.cronbachAlphaReason}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>0</span>
                        <span>0.7</span>
                        <span>0.8</span>
                        <span>1.0</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                          style={{ width: `${consistencyResults.cronbachAlpha * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${getStatusColor(consistencyResults.kendallStatus)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consistencyResults.kendallStatus)}
                      <span className="font-semibold">Kendall 协同系数 W</span>
                    </div>
                    <span className="text-2xl font-bold">{consistencyResults.kendallCoefficient.toFixed(4)}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">单位：</span>-</p>
                    <p><span className="font-medium">适用范围：</span>{consistencyResults.kendallScope}</p>
                    <p><span className="font-medium">检验说明：</span>{consistencyResults.kendallReason}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>0</span>
                        <span>0.4</span>
                        <span>0.7</span>
                        <span>1.0</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                          style={{ width: `${consistencyResults.kendallCoefficient * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${getStatusColor(consistencyResults.extremeJudges.length === 0 ? 'pass' : 'warning')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(consistencyResults.extremeJudges.length === 0 ? 'pass' : 'warning')}
                      <span className="font-semibold">极端评委检测</span>
                    </div>
                    <span className="text-2xl font-bold">{consistencyResults.extremeJudges.length} 人</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">单位：</span>人</p>
                    <p><span className="font-medium">适用范围：</span>基于Z-score检测偏离均值超过2.5σ的评委，用于发现评分标准明显不同的评委</p>
                    <p><span className="font-medium">检验说明：</span>
                      {consistencyResults.extremeJudges.length === 0
                        ? '未发现极端评委'
                        : `检测到 ${consistencyResults.extremeJudges.length} 名评委存在明显偏离`}
                    </p>
                    {consistencyResults.extremeJudges.length > 0 && (
                      <div className="mt-2 p-3 bg-white/50 rounded space-y-2">
                        {consistencyResults.extremeJudges.map((judgeId) => {
                          const judge = judges.find((j) => j.id === judgeId);
                          return (
                            <div key={judgeId} className="p-2 bg-red-50 rounded border border-red-200">
                              <p className="font-semibold text-red-700">{judge?.name || judgeId}</p>
                              <p className="text-xs text-red-600 mt-1">
                                {consistencyResults.extremeReasons[judgeId]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {sensitivityResults && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                敏感性分析
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium text-slate-700 mb-3">权重敏感度（权重+10%对总分影响）</h4>
                <div className="space-y-2">
                  {sensitivityResults.weightImpact.map((item) => (
                    <div key={item.categoryId} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-slate-600">{item.categoryName}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(item.impact * 50, 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-sm font-medium text-right">{item.impact.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  影响程度越大表示该维度权重变化对最终排名影响越大，需谨慎设置
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 mb-3">评分波动性</h4>
                <div className="grid grid-cols-2 gap-3">
                  {sensitivityResults.scoreVolatility.map((item) => (
                    <div key={item.supplierId} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-700 text-sm">{item.supplierName}</p>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-slate-500">标准差：{item.standardDeviation.toFixed(2)}</span>
                        <span className={`font-medium ${item.volatility > 0.1 ? 'text-orange-600' : 'text-green-600'}`}>
                          变异系数：{item.volatility.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {sensitivityResults.rankSensitivity.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-3">排名稳定性（±4%打分变动影响）</h4>
                  <div className="space-y-2">
                    {sensitivityResults.rankSensitivity.map((item) => (
                      <div key={item.supplierId} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {item.originalRank}
                        </span>
                        <span className="flex-1 text-sm font-medium">{item.supplierName}</span>
                        <div className="flex gap-1">
                          {item.rankChangeWith10PercentShift.map((rank, idx) => (
                            <span
                              key={idx}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                rank === item.originalRank
                                  ? 'bg-green-100 text-green-700'
                                  : rank < item.originalRank
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {rank}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    从左到右：-4%、-2%、原排名、+2%、+4% 打分变动后的排名变化
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
