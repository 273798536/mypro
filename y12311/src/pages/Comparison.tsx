import React, { useState } from 'react';
import { Download, Plus, RotateCcw, FileText } from 'lucide-react';
import ComparisonPanel from '../components/features/ComparisonPanel';
import { useComparisonStore, comparisonEngine } from '../engines/ComparisonEngine';
import { SimulationConfig } from '../types';

const Comparison: React.FC = () => {
  const { plans, comparisonResult, maxPlans, addPlan, removePlan, runComparison, clearPlans, getRecommendation } = useComparisonStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanConfig, setNewPlanConfig] = useState<SimulationConfig>({
    arrivalRate: 2.5,
    avgServiceTime: 12,
    serviceTimeStd: 6,
    windowCount: 4,
    simulationDuration: 480,
    noShowRate: 0.08,
  });

  const handleAddPlan = () => {
    if (!newPlanName.trim()) return;
    addPlan(newPlanName.trim(), newPlanConfig);
    setShowAddModal(false);
    setNewPlanName('');
  };

  const handleAddQuickPlan = (type: string) => {
    const baseConfig: SimulationConfig = {
      arrivalRate: 2.5,
      avgServiceTime: 12,
      serviceTimeStd: 6,
      windowCount: 4,
      simulationDuration: 480,
      noShowRate: 0.08,
    };

    let config: SimulationConfig;
    let name: string;

    switch (type) {
      case 'more_windows':
        config = { ...baseConfig, windowCount: 6 };
        name = '增加窗口方案';
        break;
      case 'fewer_windows':
        config = { ...baseConfig, windowCount: 3 };
        name = '减少窗口方案';
        break;
      case 'faster_service':
        config = { ...baseConfig, avgServiceTime: 8, serviceTimeStd: 4 };
        name = '优化服务效率';
        break;
      case 'lower_arrival':
        config = { ...baseConfig, arrivalRate: 1.8, noShowRate: 0.05 };
        name = '预约分流方案';
        break;
      default:
        config = baseConfig;
        name = '基准方案';
    }

    addPlan(name, config);
  };

  const handleExport = () => {
    const report = comparisonEngine.exportComparisonReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `排队方案对比报告_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickPlanOptions = [
    { type: 'baseline', label: '基准方案', desc: '当前业务参数', icon: '📊' },
    { type: 'more_windows', label: '增加窗口', desc: '窗口增至6个', icon: '🪟' },
    { type: 'fewer_windows', label: '减少窗口', desc: '窗口减至3个', icon: '🚪' },
    { type: 'faster_service', label: '优化效率', desc: '服务时长降至8分钟', icon: '⚡' },
    { type: 'lower_arrival', label: '预约分流', desc: '到达率降至1.8人/分', icon: '📅' },
  ];

  const recommendation = getRecommendation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">方案对比</h1>
          <p className="text-sm text-neutral-500 mt-1">
            创建多个排队方案进行对比分析，找出最优配置
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={plans.length >= maxPlans}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            自定义方案
          </button>
          {comparisonResult && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <Download size={16} />
              导出报告
            </button>
          )}
          {plans.length > 0 && (
            <button
              onClick={clearPlans}
              className="btn-secondary flex items-center gap-2 text-danger-500 hover:bg-danger-50"
            >
              <RotateCcw size={16} />
              清空
            </button>
          )}
        </div>
      </div>

      {plans.length === 0 && (
        <div className="card border-2 border-dashed border-neutral-200 py-12">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">开始方案对比</h3>
            <p className="text-neutral-500">
              选择下方快捷方案或创建自定义方案，比较不同配置下的排队效果
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {quickPlanOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleAddQuickPlan(option.type)}
                disabled={plans.length >= maxPlans}
                className="p-4 bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <div className="font-medium text-neutral-800 group-hover:text-primary-600">
                  {option.label}
                </div>
                <div className="text-xs text-neutral-500 mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {recommendation && plans.length >= 2 && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-success-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-success-800">
                分析结论
              </div>
              <p className="text-sm text-success-700 mt-0.5">
                基于多维度综合评分，
                <span className="font-medium">「{recommendation.name}」</span>
                表现最优。该方案在等待时长、排队长度和窗口利用率之间取得了最佳平衡，
                建议优先考虑此配置。
              </p>
            </div>
          </div>
        </div>
      )}

      <ComparisonPanel
        plans={plans}
        comparisonResult={comparisonResult}
        onAddPlan={addPlan}
        onRemovePlan={removePlan}
        onRunComparison={runComparison}
        maxPlans={maxPlans}
      />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">创建自定义方案</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">方案名称</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="输入方案名称"
                  className="input-base w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'arrivalRate', label: '到达率 (人/分钟)', min: 0.5, max: 10, step: 0.1 },
                  { key: 'avgServiceTime', label: '平均服务时长 (分钟)', min: 1, max: 30, step: 1 },
                  { key: 'serviceTimeStd', label: '服务时长标准差', min: 0, max: 15, step: 0.5 },
                  { key: 'windowCount', label: '窗口数量 (个)', min: 1, max: 10, step: 1 },
                  { key: 'noShowRate', label: '爽约率 (%)', min: 0, max: 30, step: 1, isPercent: true },
                  { key: 'simulationDuration', label: '模拟时长 (分钟)', min: 60, max: 600, step: 30 },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      value={item.isPercent ? (newPlanConfig[item.key as keyof SimulationConfig] as number) * 100 : newPlanConfig[item.key as keyof SimulationConfig]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setNewPlanConfig({
                            ...newPlanConfig,
                            [item.key]: item.isPercent ? val / 100 : val,
                          });
                        }
                      }}
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      className="input-base w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleAddPlan}
                disabled={!newPlanName.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加方案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comparison;
