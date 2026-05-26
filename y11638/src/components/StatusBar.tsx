import { useGameStore } from '../store/useGameStore';
import { Coins, Wind, Gauge, AlertTriangle, CheckCircle } from 'lucide-react';

export default function StatusBar() {
  const {
    currentLevel,
    totalCost,
    windSetting,
    setWindSetting,
    maxStressThisSim,
    simWarnings,
    isSimulating,
    members,
    nodes
  } = useGameStore();
  
  if (!currentLevel) return null;
  
  const budgetPercent = (totalCost / currentLevel.budget) * 100;
  const isOverBudget = totalCost > currentLevel.budget;
  const isNearBudget = budgetPercent > 80 && !isOverBudget;
  
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-4">状态监控</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-2 text-slate-300">
              <Coins size={16} className="text-yellow-400" />
              预算使用
            </span>
            <span className={`font-bold ${isOverBudget ? 'text-red-400' : isNearBudget ? 'text-yellow-400' : 'text-green-400'}`}>
              {totalCost} / {currentLevel.budget}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
              <AlertTriangle size={12} />
              预算超支！请删除部分杆件
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-slate-300">
              <Wind size={16} className="text-cyan-400" />
              风载等级
            </span>
            <span className="text-cyan-400 font-bold">{windSetting}</span>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(level => (
              <button
                key={level}
                onClick={() => !isSimulating && setWindSetting(level)}
                disabled={isSimulating}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  windSetting === level
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {level === 0 ? '无' : level === 1 ? '弱' : level === 2 ? '中' : '强'}
              </button>
            ))}
          </div>
        </div>
        
        {isSimulating && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2 text-slate-300">
                <Gauge size={16} className="text-orange-400" />
                最大应力
              </span>
              <span className="text-orange-400 font-bold">{maxStressThisSim.toFixed(1)}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                style={{ width: `${Math.min((maxStressThisSim / 500) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{nodes.length}</div>
            <div className="text-xs text-slate-400">节点数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{members.length}</div>
            <div className="text-xs text-slate-400">杆件数</div>
          </div>
        </div>
        
        {simWarnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
              <AlertTriangle size={14} />
              警告 ({simWarnings.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {simWarnings.slice(-3).map((warning, i) => (
                <div key={i} className="text-xs text-yellow-300/80">• {warning}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
