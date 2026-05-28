import React from 'react';
import { Zap, Clock, Target, TrendingUp } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { formatNumber } from '../utils/physics';
import { AnomalyAlert } from './AnomalyAlert';

export const ResultPanel: React.FC = () => {
  const { result, isRunning } = useSimulationStore();

  if (!result && !isRunning) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="text-center py-8 text-slate-400">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>点击"开始模拟"查看计算结果</p>
        </div>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="text-center py-8">
          <div className="animate-spin w-12 h-12 mx-auto mb-3 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-slate-600">正在计算...</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    divergent: 'bg-orange-100 text-orange-700',
    running: 'bg-blue-100 text-blue-700',
  };

  const statusLabels = {
    completed: '计算完成',
    error: '计算错误',
    divergent: '结果发散',
    running: '计算中',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">模拟结果</h2>
            <p className="text-xs text-slate-500">数值积分计算结果</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[result.status]}`}>
          {statusLabels[result.status]}
        </span>
      </div>

      {result.anomalies.length > 0 && (
        <div className="mb-6">
          <AnomalyAlert anomalies={result.anomalies} />
        </div>
      )}

      {result.status !== 'error' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">终端速度</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {formatNumber(result.terminalVelocity)}
              <span className="text-sm font-normal ml-1">m/s</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">达到终端速度</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {formatNumber(result.timeToTerminal)}
              <span className="text-sm font-normal ml-1">s</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <span className="text-sm text-violet-700">落地时间</span>
            </div>
            <div className="text-2xl font-bold text-violet-800">
              {formatNumber(result.timeToGround)}
              <span className="text-sm font-normal ml-1">s</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-rose-600" />
              <span className="text-sm text-rose-700">数据点数</span>
            </div>
            <div className="text-2xl font-bold text-rose-800">
              {result.timeSeries.length}
              <span className="text-sm font-normal ml-1">点</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
