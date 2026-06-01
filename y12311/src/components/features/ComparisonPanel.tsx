import React from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, Play, Award } from 'lucide-react';
import { ComparisonPlan, ComparisonResult, SimulationConfig } from '../../types';
import { comparisonEngine } from '../../engines/ComparisonEngine';
import { cn } from '../../lib/utils';

interface ComparisonPanelProps {
  plans: ComparisonPlan[];
  comparisonResult: ComparisonResult | null;
  onAddPlan: (name: string, config: SimulationConfig) => void;
  onRemovePlan: (planId: string) => void;
  onRunComparison: () => void;
  maxPlans: number;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  plans,
  comparisonResult,
  onAddPlan,
  onRemovePlan,
  onRunComparison,
  maxPlans,
}) => {
  const metricLabels: Record<string, { label: string; unit: string; lowerIsBetter: boolean }> = {
    avgWaitTime: { label: '平均等待时长', unit: '分钟', lowerIsBetter: true },
    maxWaitTime: { label: '最大等待时长', unit: '分钟', lowerIsBetter: true },
    avgQueueLength: { label: '平均排队长度', unit: '人', lowerIsBetter: true },
    maxQueueLength: { label: '最大排队长度', unit: '人', lowerIsBetter: true },
    windowUtilization: { label: '窗口利用率', unit: '%', lowerIsBetter: false },
    timeoutRate: { label: '超时率', unit: '%', lowerIsBetter: true },
  };

  const renderMetricDiff = (metricName: string, plan: ComparisonPlan) => {
    if (!comparisonResult || plans.length < 2) return null;

    const metric = comparisonResult.keyMetrics.find((m) => m.name === metricLabels[metricName].label);
    if (!metric) return null;

    const values = metric.values.map((v) => v.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const planValue = metric.values.find((v) => v.planId === plan.id)?.value || 0;

    const isBest = metric.lowerIsBetter ? planValue === min : planValue === max;
    const isWorst = metric.lowerIsBetter ? planValue === max : planValue === min;

    if (isBest) {
      return (
        <span className="inline-flex items-center gap-1 text-success-600 text-xs">
          <TrendingDown size={12} />
          最优
        </span>
      );
    }
    if (isWorst) {
      return (
        <span className="inline-flex items-center gap-1 text-danger-600 text-xs">
          <TrendingUp size={12} />
          最差
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-neutral-400 text-xs">
        <Minus size={12} />
        中等
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800">方案对比</h3>
          <p className="text-sm text-neutral-500 mt-1">
            已添加 {plans.length}/{maxPlans} 个方案
          </p>
        </div>
        <div className="flex items-center gap-3">
          {plans.length >= 2 && (
            <button onClick={onRunComparison} className="btn-primary flex items-center gap-2">
              <Play size={16} />
              运行对比
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={cn(
              'card relative',
              comparisonResult?.bestPlanId === plan.id && 'ring-2 ring-success-500'
            )}
          >
            {comparisonResult?.bestPlanId === plan.id && (
              <div className="absolute -top-2 -right-2 bg-success-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                <Award size={12} />
                推荐
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-neutral-800">{plan.name}</div>
                  <div className="text-xs text-neutral-400">
                    {plan.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemovePlan(plan.id)}
                className="p-1.5 rounded hover:bg-danger-50 text-neutral-400 hover:text-danger-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-neutral-500 font-medium mb-2">参数配置</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">到达率</span>
                  <span className="font-medium">{plan.config.arrivalRate}/分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">服务时长</span>
                  <span className="font-medium">{plan.config.avgServiceTime}分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">窗口数</span>
                  <span className="font-medium">{plan.config.windowCount}个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">爽约率</span>
                  <span className="font-medium">{(plan.config.noShowRate * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 mt-3">
                <div className="text-xs text-neutral-500 font-medium mb-2">模拟结果</div>
                <div className="space-y-2">
                  {Object.entries(metricLabels).map(([key, info]) => (
                    <div key={key} className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500">{info.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {plan.result[key as keyof typeof plan.result] as number}
                          {info.unit}
                        </span>
                        {renderMetricDiff(key, plan)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {plans.length < maxPlans && (
          <button
            onClick={() => {
              const defaultConfig: SimulationConfig = {
                arrivalRate: 2.5,
                avgServiceTime: 12,
                serviceTimeStd: 6,
                windowCount: 4,
                simulationDuration: 480,
                noShowRate: 0.08,
              };
              onAddPlan(`方案 ${plans.length + 1}`, defaultConfig);
            }}
            className="card border-2 border-dashed border-neutral-200 hover:border-primary-400 transition-colors flex flex-col items-center justify-center min-h-[300px] group"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-100 group-hover:bg-primary-50 flex items-center justify-center mb-3 transition-colors">
              <Plus size={24} className="text-neutral-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <p className="text-neutral-500 group-hover:text-primary-600 font-medium transition-colors">
              添加对比方案
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              最多可添加 {maxPlans} 个方案
            </p>
          </button>
        )}
      </div>

      {comparisonResult && (
        <div className="card">
          <h4 className="font-semibold text-neutral-800 mb-4">指标对比分析</h4>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead>
                <tr>
                  <th>指标</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center">
                      {plan.name}
                      {comparisonResult.bestPlanId === plan.id && (
                        <span className="ml-1 text-success-600">★</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonResult.keyMetrics.map((metric) => (
                  <tr key={metric.name}>
                    <td className="font-medium">
                      {metric.name}
                      <span className="text-xs text-neutral-400 ml-1">({metric.unit})</span>
                    </td>
                    {metric.values.map((value) => {
                      const values = metric.values.map((v) => v.value);
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const isBest = metric.lowerIsBetter
                        ? value.value === min
                        : value.value === max;
                      return (
                        <td
                          key={value.planId}
                          className={cn(
                            'text-center font-medium',
                            isBest && 'text-success-600 bg-success-50'
                          )}
                        >
                          {value.value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-success-50 rounded-lg border border-success-200">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-success-600" />
              <div>
                <div className="font-semibold text-success-800">
                  推荐方案：{comparisonResult.plans.find((p) => p.id === comparisonResult.bestPlanId)?.name}
                </div>
                <p className="text-sm text-success-700 mt-1">
                  该方案在综合评分中表现最优，在等待时长、排队长度和窗口利用率之间取得了最佳平衡。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonPanel;
