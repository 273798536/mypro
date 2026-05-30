import { useState, useCallback } from 'react';
import { Play, RotateCcw, Edit3, Check, X, Activity } from 'lucide-react';
import { DataInput } from '@/components/DataInput';
import { ConfigPanel } from '@/components/ConfigPanel';
import { TransitionMatrix } from '@/components/TransitionMatrix';
import { ChurnProbability } from '@/components/ChurnProbability';
import { RecallPriorityList } from '@/components/RecallPriorityList';
import { ResultDetailPanel } from '@/components/ResultDetailPanel';
import { VersionCompare } from '@/components/VersionCompare';
import { CalculationService } from '@/engine/CalculationService';
import type {
  MemberBehavior,
  CalculationConfig,
  CalculationResult,
  VersionSnapshot,
  MemberState,
} from '@/types';
import { DEFAULT_CONFIG, MEMBER_STATE_LABELS, MEMBER_STATE_COLORS } from '@/types';

export default function Home() {
  const [behaviors, setBehaviors] = useState<MemberBehavior[]>([]);
  const [config, setConfig] = useState<CalculationConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [compareResult, setCompareResult] = useState<CalculationResult | null>(null);
  const [modifiedMemberId, setModifiedMemberId] = useState<string | undefined>();
  const [modifiedFrom, setModifiedFrom] = useState<MemberState | undefined>();
  const [modifiedTo, setModifiedTo] = useState<MemberState | undefined>();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<MemberState>('active');

  const handleDataLoaded = useCallback((data: MemberBehavior[]) => {
    setBehaviors(data);
    setResult(null);
    setCompareResult(null);
    setModifiedMemberId(undefined);
    setModifiedFrom(undefined);
    setModifiedTo(undefined);
  }, []);

  const handleCalculate = useCallback(() => {
    if (behaviors.length === 0) {
      alert('请先上传数据');
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      try {
        const service = new CalculationService(config);
        const calcResult = service.calculate(behaviors);
        setResult(calcResult);
      } catch (error) {
        console.error('Calculation error:', error);
        alert(`计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setIsCalculating(false);
      }
    }, 500);
  }, [behaviors, config]);

  const handleReset = useCallback(() => {
    setBehaviors([]);
    setConfig(DEFAULT_CONFIG);
    setResult(null);
    setCompareResult(null);
    setModifiedMemberId(undefined);
    setModifiedFrom(undefined);
    setModifiedTo(undefined);
    setEditingMemberId(null);
  }, []);

  const handleLoadVersion = useCallback((version: VersionSnapshot) => {
    setCompareResult(version.result);
  }, []);

  const handleStartEdit = useCallback((memberId: string, currentState: MemberState) => {
    setEditingMemberId(memberId);
    setEditingState(currentState);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingMemberId) return;

    const memberBehavior = behaviors.find(b => b.memberId === editingMemberId);
    if (!memberBehavior) return;

    const oldState = memberBehavior.state;
    if (oldState === editingState) {
      setEditingMemberId(null);
      return;
    }

    const updatedBehaviors = behaviors.map(b => {
      if (b.memberId === editingMemberId) {
        return {
          ...b,
          state: editingState,
          remark: b.remark ? `${b.remark}；手动修改状态` : '手动修改状态',
        };
      }
      return b;
    });

    setBehaviors(updatedBehaviors);
    setModifiedMemberId(editingMemberId);
    setModifiedFrom(oldState);
    setModifiedTo(editingState);

    if (result) {
      setTimeout(() => {
        const service = new CalculationService(config);
        const newResult = service.calculate(updatedBehaviors);
        setCompareResult(result);
        setResult(newResult);
      }, 300);
    }

    setEditingMemberId(null);
  }, [editingMemberId, editingState, behaviors, result, config]);

  const handleCancelEdit = useCallback(() => {
    setEditingMemberId(null);
  }, []);

  const handleClearCompare = useCallback(() => {
    setCompareResult(null);
  }, []);

  const memberIds = Array.from(new Set(behaviors.map(b => b.memberId))).filter(id => !id.startsWith('synth_'));
  const memberStates: Record<string, MemberState> = {};
  behaviors.forEach(b => {
    if (!b.memberId.startsWith('synth_')) {
      if (!memberStates[b.memberId] || new Date(b.timestamp) > new Date(memberStates[b.memberId] ? behaviors.find(bb => bb.memberId === b.memberId && bb.state === memberStates[b.memberId])?.timestamp || 0 : 0)) {
        const latest = behaviors
          .filter(bb => bb.memberId === b.memberId)
          .sort((a, bb) => new Date(bb.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (latest) {
          memberStates[b.memberId] = latest.state;
        }
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Markov 客户流失预警</h1>
                <p className="text-xs text-slate-300 mt-0.5">基于马尔可夫链的会员状态转移分析与召回优先级排序</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {behaviors.length > 0 && (
                <>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                  <button
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
                    {isCalculating ? '计算中...' : '运行计算'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {(modifiedMemberId || compareResult) && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {modifiedMemberId
                    ? `已修改会员 ${modifiedMemberId} 的状态：${modifiedFrom ? MEMBER_STATE_LABELS[modifiedFrom] : ''} → ${modifiedTo ? MEMBER_STATE_LABELS[modifiedTo] : ''}`
                    : '正在对比历史版本'}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {compareResult ? '下方列表中显示变化对比，差异项已高亮标记' : '请重新运行计算以查看更新后的结果'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClearCompare}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition-colors"
            >
              清除对比
            </button>
          </div>
        )}

        {memberIds.length > 0 && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-gray-700">快速修改会员状态（验收测试用）</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={editingMemberId || ''}
                onChange={(e) => {
                  const memberId = e.target.value;
                  if (memberId) {
                    handleStartEdit(memberId, memberStates[memberId] || 'active');
                  } else {
                    setEditingMemberId(null);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[150px]"
              >
                <option value="">选择会员</option>
                {memberIds.slice(0, 20).map(id => (
                  <option key={id} value={id}>
                    {id} ({MEMBER_STATE_LABELS[memberStates[id] || 'active']})
                  </option>
                ))}
              </select>

              {editingMemberId && (
                <>
                  <span className="text-sm text-gray-500">→</span>
                  <select
                    value={editingState}
                    onChange={(e) => setEditingState(e.target.value as MemberState)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {(['active', 'inactive', 'dormant', 'churned', 'recalled'] as MemberState[]).map(state => (
                      <option key={state} value={state}>
                        {MEMBER_STATE_LABELS[state]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    确认修改
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                </>
              )}
            </div>
            {memberIds.length > 20 && (
              <p className="text-xs text-gray-500 mt-2">仅显示前20个会员，完整列表请查看召回优先级</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <DataInput onDataLoaded={handleDataLoaded} currentData={behaviors} />
            <ConfigPanel config={config} onConfigChange={setConfig} />
          </div>

          <div className="col-span-9 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <TransitionMatrix matrix={result?.transitionMatrix || []} />
              <ChurnProbability
                probabilities={result?.churnProbabilities || {}}
                stateDistribution={result?.stateDistribution || { active: 0, inactive: 0, dormant: 0, churned: 0, recalled: 0 }}
                threshold={config.churnThreshold}
              />
            </div>

            <RecallPriorityList
              items={result?.recallPriorities || []}
              threshold={config.churnThreshold}
              compareItems={compareResult?.recallPriorities}
            />

            <div className="grid grid-cols-2 gap-6">
              <ResultDetailPanel result={result} />
              <VersionCompare
                currentResult={result}
                currentConfig={config}
                onLoadVersion={handleLoadVersion}
                modifiedMemberId={modifiedMemberId}
                modifiedFrom={modifiedFrom}
                modifiedTo={modifiedTo}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>Markov 客户流失预警工具 · 基于马尔可夫链模型的会员状态转移分析</p>
          <p className="mt-1 text-xs text-gray-400">
            单位说明：流失概率为0-1之间的数值，表示未来30天内流失的可能性；优先级分数为0-100分，分数越高召回优先级越高
          </p>
        </div>
      </footer>
    </div>
  );
}
