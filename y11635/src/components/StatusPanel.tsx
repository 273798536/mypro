import React from 'react';
import { Activity, Droplets, AlertTriangle, Trophy, Shield } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { SAFE_LEVEL, WARNING_LINE, OVERFLOW_LINE } from '../data/constants';

export function StatusPanel() {
  const { round, maxRounds, totalScore, riskScore, reservoirLevel, upstreamInflow, weather } = useGameStore();

  const getLevelColor = () => {
    if (reservoirLevel >= OVERFLOW_LINE) return 'text-red-400';
    if (reservoirLevel >= WARNING_LINE) return 'text-orange-400';
    if (reservoirLevel >= SAFE_LEVEL) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getScoreColor = () => {
    if (totalScore >= 100) return 'text-green-400';
    if (totalScore >= 50) return 'text-blue-400';
    if (totalScore >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskColor = () => {
    if (riskScore <= -30) return 'text-red-400';
    if (riskScore <= -10) return 'text-orange-400';
    if (riskScore <= 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          实时状态
        </h3>
        <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
          回合 {round}/{maxRounds}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Droplets className="w-3 h-3" />
            水库水位
          </div>
          <div className={`text-2xl font-mono font-bold ${getLevelColor()}`}>
            {reservoirLevel.toFixed(1)}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity className="w-3 h-3" />
            上游来水
          </div>
          <div className="text-2xl font-mono font-bold text-cyan-400">
            {upstreamInflow}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Trophy className="w-3 h-3" />
            总得分
          </div>
          <div className={`text-2xl font-mono font-bold ${getScoreColor()}`}>
            {totalScore >= 0 ? '+' : ''}{totalScore}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Shield className="w-3 h-3" />
            风险评分
          </div>
          <div className={`text-2xl font-mono font-bold ${getRiskColor()}`}>
            {riskScore}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">天气状况</span>
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${weather.color}30`, color: weather.color }}>
            {weather.name}
          </span>
        </div>
      </div>

      {reservoirLevel >= WARNING_LINE && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-orange-900/30 rounded-lg border border-orange-700/50">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-orange-300">水位超预警线，请及时发布预警！</span>
        </div>
      )}
    </div>
  );
}
