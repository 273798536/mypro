import React, { useEffect, useState } from 'react';
import {
  Play,
  RotateCcw,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { useOptimizerStore } from '../../store/optimizerStore';
import { useDishStore } from '../../store/dishStore';
import { ProgressRing } from '../../components/ProgressRing';
import { NutritionRadar } from '../../components/NutritionRadar';
import { ConflictBadge } from '../../components/ConflictBadge';
import { TraceTimeline } from '../../components/TraceTimeline';
import { ALLERGENS, NUTRITION_LABELS, CATEGORY_COLORS, DishCategory } from '../../types';
import { cn } from '@/lib/utils';

export const Optimizer: React.FC = () => {
  const { loadDishes, dishes } = useDishStore();
  const {
    config,
    currentResult,
    solverState,
    setConfigName,
    setBudget,
    setPortionCount,
    updateNutritionTarget,
    updateCategoryLimit,
    setExcludedAllergens,
    resetConfig,
    runOptimization,
  } = useOptimizerStore();

  const [activeTab, setActiveTab] = useState<'config' | 'result' | 'trace'>('config');

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const handleRun = async () => {
    setActiveTab('result');
    await runOptimization();
  };

  const getDishById = (id: string) => dishes.find((d) => d.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">配餐优化</h1>
          <p className="text-slate-500 mt-1">配置约束条件，运行整数规划求解最优方案</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetConfig}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置配置
          </button>
          <button
            onClick={handleRun}
            disabled={solverState.isRunning}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
              solverState.isRunning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
            )}
          >
            <Play className="w-4 h-4" />
            {solverState.isRunning ? '求解中...' : '开始优化'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'config', label: '约束配置' },
          { key: 'result', label: '优化结果' },
          { key: 'trace', label: '追溯日志' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">基本配置</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    方案名称
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      预算上限（元）
                    </label>
                    <input
                      type="number"
                      value={config.budget}
                      onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <Users className="w-4 h-4 inline mr-1" />
                      配餐份数
                    </label>
                    <input
                      type="number"
                      value={config.portionCount}
                      onChange={(e) => setPortionCount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">品类数量限制</h2>
              <div className="space-y-3">
                {config.categoryLimits.map((limit, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span
                      className="w-16 px-2 py-1 rounded text-xs font-medium text-white text-center"
                      style={{ backgroundColor: CATEGORY_COLORS[limit.category as DishCategory] }}
                    >
                      {limit.category}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-slate-500">最少</span>
                      <input
                        type="number"
                        min="0"
                        value={limit.min ?? 0}
                        onChange={(e) =>
                          updateCategoryLimit(index, {
                            ...limit,
                            min: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                      />
                      <span className="text-sm text-slate-500">份</span>
                      <span className="text-slate-300 mx-2">~</span>
                      <span className="text-sm text-slate-500">最多</span>
                      <input
                        type="number"
                        min="0"
                        value={limit.max ?? 0}
                        onChange={(e) =>
                          updateCategoryLimit(index, {
                            ...limit,
                            max: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                      />
                      <span className="text-sm text-slate-500">份</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">排除过敏原</h2>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((allergen) => (
                  <label
                    key={allergen}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors border',
                      config.excludedAllergens.includes(allergen)
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={config.excludedAllergens.includes(allergen)}
                      onChange={(e) => {
                        const current = config.excludedAllergens;
                        setExcludedAllergens(
                          e.target.checked
                            ? [...current, allergen]
                            : current.filter((a) => a !== allergen)
                        );
                      }}
                    />
                    {allergen}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">营养目标</h2>
              <div className="space-y-3">
                {config.nutritionTargets.map((target, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-600">
                      {NUTRITION_LABELS[target.nutrient]}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-slate-400">≥</span>
                      <input
                        type="number"
                        value={target.min ?? 0}
                        onChange={(e) =>
                          updateNutritionTarget(index, {
                            ...target,
                            min: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                      <span className="text-sm text-slate-400">权重</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={target.weight}
                        onChange={(e) =>
                          updateNutritionTarget(index, {
                            ...target,
                            weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">约束优先级</h2>
              <div className="space-y-2">
                {config.priorityRules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {rule.priority}
                    </span>
                    <span className="font-medium text-slate-700">{rule.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2">整数规划说明</h3>
              <p className="text-sm text-blue-600 mb-3">
                系统将使用分支定界算法，在满足所有约束条件的前提下，寻找营养评分最高的配餐方案。
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-blue-700">菜品数量：{dishes.length}道</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-blue-700">约束数量：{config.nutritionTargets.length + config.categoryLimits.length + 2}个</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'result' && (
        <div>
          {solverState.isRunning ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
              <ProgressRing
                progress={solverState.progress}
                size={120}
                strokeWidth={8}
                className="mb-6"
              />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {solverState.currentStep}
              </h3>
              <p className="text-slate-500">正在执行整数规划求解...</p>
              <div className="mt-6 max-w-md mx-auto">
                <div className="bg-slate-50 rounded-lg p-4 text-left max-h-40 overflow-y-auto">
                  {solverState.logs.slice(-5).map((log, i) => (
                    <div key={i} className="text-sm text-slate-600 py-1">
                      <span className="text-slate-400 mr-2">›</span>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : currentResult ? (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {currentResult.configName}
                    </h2>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        currentResult.status === 'optimal'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {currentResult.status === 'optimal' ? '最优解' : '次优解'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-600">总成本</p>
                      <p className="text-2xl font-bold text-slate-800">
                        ¥{currentResult.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-green-600">选菜数量</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {currentResult.selectedDishes.length}道
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-sm text-purple-600">综合评分</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {(currentResult.score * 100).toFixed(0)}分
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                      <p className="text-sm text-amber-600">冲突数</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {currentResult.conflicts.length}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="font-medium text-slate-700 mb-3">已选菜品</h3>
                    <div className="space-y-2">
                      {currentResult.selectedDishes.map((sd) => {
                        const dish = getDishById(sd.dishId);
                        if (!dish) return null;
                        return (
                          <div
                            key={sd.dishId}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-2 h-8 rounded"
                                style={{ backgroundColor: CATEGORY_COLORS[dish.category] }}
                              />
                              <div>
                                <p className="font-medium text-slate-800">{dish.name}</p>
                                <p className="text-xs text-slate-500">{dish.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-slate-600">×{sd.quantity}份</span>
                              <span className="font-medium text-slate-800">
                                ¥{(dish.cost * sd.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {currentResult.conflicts.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-slate-800">约束冲突</h2>
                    </div>
                    <div className="space-y-3">
                      {currentResult.conflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg"
                        >
                          <ConflictBadge
                            type={conflict.type}
                            severity={conflict.severity}
                          />
                          <div className="flex-1">
                            <p className="text-slate-700">{conflict.description}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              涉及约束：{conflict.involvedConstraints.join('、')}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            优先级 {conflict.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.alternativePlans.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">备选方案</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {currentResult.alternativePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">{plan.name}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-2xl font-bold text-slate-800 mb-2">
                            ¥{plan.totalCost.toFixed(2)}
                          </p>
                          <div className="text-xs text-slate-500 space-y-1">
                            {plan.tradeoffs.map((t, i) => (
                              <p key={i}>• {t}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">营养分析</h2>
                  <NutritionRadar
                    actual={currentResult.totalNutrition}
                    target={Object.fromEntries(
                      config.nutritionTargets.map((t) => [t.nutrient, t.min || 0])
                    )}
                    height={280}
                  />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">营养详情</h2>
                  <div className="space-y-3">
                    {Object.entries(currentResult.totalNutrition).map(([key, value]) => {
                      const target = config.nutritionTargets.find(
                        (t) => t.nutrient === key
                      )?.min;
                      const isMet = target ? value >= target : true;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-slate-600">{NUTRITION_LABELS[key as keyof typeof NUTRITION_LABELS]}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-800">
                              {typeof value === 'number' ? value.toFixed(1) : value}
                            </span>
                            {target && (
                              <span
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded',
                                  isMet
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                )}
                              >
                                {isMet ? '达标' : '不足'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">尚未运行优化</h3>
              <p className="text-slate-500 mb-6">
                配置约束条件后，点击"开始优化"按钮运行整数规划求解
              </p>
              <button
                onClick={handleRun}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                开始优化
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trace' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">求解追溯日志</h2>
          {currentResult?.traceLogs && currentResult.traceLogs.length > 0 ? (
            <TraceTimeline logs={currentResult.traceLogs} />
          ) : (
            <div className="text-center py-12 text-slate-500">
              暂无追溯日志，请先运行配餐优化
            </div>
          )}
        </div>
      )}
    </div>
  );
};
