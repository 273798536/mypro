import React, { useEffect, useState } from 'react';
import { GitBranch, Clock, ChevronRight, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useOptimizerStore } from '../../store/optimizerStore';
import { useDishStore } from '../../store/dishStore';
import { ConflictBadge } from '../../components/ConflictBadge';
import { TraceTimeline } from '../../components/TraceTimeline';
import { CONFLICT_TYPE_LABELS, ConflictType, ConflictSeverity } from '../../types';
import { cn } from '@/lib/utils';

type FilterType = 'all' | ConflictType;
type FilterSeverity = 'all' | ConflictSeverity;

export const TraceCenter: React.FC = () => {
  const { loadDishes, dishes } = useDishStore();
  const { history, currentResult, isLoaded, loadHistory } = useOptimizerStore();

  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');

  useEffect(() => {
    if (dishes.length === 0) {
      loadDishes();
    }
    if (!isLoaded) {
      loadHistory();
    }
  }, [loadDishes, loadHistory, isLoaded, dishes.length]);

  const activeResult = selectedResult
    ? history.find((r) => r.id === selectedResult)
    : currentResult;

  const filteredConflicts = activeResult?.conflicts.filter((c) => {
    const matchType = filterType === 'all' || c.type === filterType;
    const matchSeverity = filterSeverity === 'all' || c.severity === filterSeverity;
    return matchType && matchSeverity;
  }) || [];

  const conflictStats = {
    total: activeResult?.conflicts.length || 0,
    high: activeResult?.conflicts.filter((c) => c.severity === 'high').length || 0,
    medium: activeResult?.conflicts.filter((c) => c.severity === 'medium').length || 0,
    low: activeResult?.conflicts.filter((c) => c.severity === 'low').length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">冲突追溯中心</h1>
        <p className="text-slate-500 mt-1">查看约束冲突、判定逻辑和解决路径</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">冲突总数</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{conflictStats.total}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">严重冲突</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{conflictStats.high}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">中等冲突</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{conflictStats.medium}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">轻微冲突</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{conflictStats.low}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Info className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">历史方案</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {history.length > 0 ? (
              history.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResult(result.id)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-slate-50 transition-colors',
                    selectedResult === result.id && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800">{result.configName}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(result.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span>¥{result.totalCost.toFixed(2)}</span>
                    {result.conflicts.length > 0 && (
                      <span className="text-amber-600">
                        {result.conflicts.length} 个冲突
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                暂无历史方案，请先运行配餐优化
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          {activeResult ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800">冲突列表</h2>
                  <div className="flex gap-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as FilterType)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">全部类型</option>
                      {Object.entries(CONFLICT_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">全部严重程度</option>
                      <option value="high">严重</option>
                      <option value="medium">中等</option>
                      <option value="low">轻微</option>
                    </select>
                  </div>
                </div>

                {filteredConflicts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ConflictBadge
                              type={conflict.type}
                              severity={conflict.severity}
                            />
                            <span className="text-xs text-slate-400">
                              优先级 {conflict.priority}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-700 mb-2">{conflict.description}</p>
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">涉及约束：</span>
                          {conflict.involvedConstraints.join('、')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    没有匹配的冲突记录
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-800">求解追溯链路</h2>
                </div>
                {activeResult.traceLogs && activeResult.traceLogs.length > 0 ? (
                  <TraceTimeline logs={activeResult.traceLogs} />
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无追溯日志
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h2 className="font-semibold text-slate-800 mb-4">整数规划约束说明</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">目标函数</h3>
                    <p className="text-sm text-blue-700">
                      最大化营养综合评分 = 0.7 × 营养达标率 + 0.3 × 成本效率
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">硬约束</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• 过敏食材必须排除（不可松弛）</li>
                      <li>• 菜品选择数量为非负整数</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <h3 className="font-medium text-amber-800 mb-2">软约束</h3>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• 预算上限（优先级2，可轻微松弛）</li>
                      <li>• 营养下限（优先级3，关键营养不可松弛）</li>
                      <li>• 品类数量限制（优先级4，可灵活调整）</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-purple-800 mb-2">求解算法</h3>
                    <p className="text-sm text-purple-700">
                      分支定界算法（Branch and Bound）+ 贪心启发式初始解
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">选择方案查看</h3>
              <p className="text-slate-500">
                从左侧历史方案列表中选择一个方案查看冲突和追溯信息
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
