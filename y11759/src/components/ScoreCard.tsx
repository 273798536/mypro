import React from 'react';
import { Trophy, Zap, Rocket, Clock, AlertTriangle } from 'lucide-react';
import type { ScoreBreakdown } from '../game/types';

interface ScoreCardProps {
  score: ScoreBreakdown;
  result: string;
  failureReason?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, result, failureReason }) => {
  const isSuccess = result === 'success';

  return (
    <div className="bg-slate-900/90 backdrop-blur rounded-2xl p-6 shadow-2xl border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isSuccess ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {isSuccess ? (
            <Trophy className="w-6 h-6 text-white" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-white" />
          )}
        </div>
        <div>
          <div className="text-white font-bold text-lg">
            {isSuccess ? '任务完成' : '任务失败'}
          </div>
          <div className="text-slate-400 text-sm">
            {isSuccess ? '成功进入目标轨道' : failureReason}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-4xl font-bold text-white">{score.total}</div>
          <div className="text-slate-400 text-xs">总分</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 text-sm flex-1">基础分</span>
          <span className="text-white font-mono text-sm">+{score.base}</span>
        </div>
        <div className="flex items-center gap-3">
          <Rocket className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-sm flex-1">燃料加分</span>
          <span className="text-emerald-400 font-mono text-sm">+{score.fuelBonus}</span>
        </div>
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="text-slate-300 text-sm flex-1">引力弹弓加分</span>
          <span className="text-violet-400 font-mono text-sm">+{score.slingshotBonus}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 text-sm flex-1">时间加分</span>
          <span className="text-cyan-400 font-mono text-sm">+{score.timeBonus}</span>
        </div>
        {score.penalties.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-slate-300 text-sm flex-1">{p.label}</span>
            <span className="text-red-400 font-mono text-sm">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreCard;
