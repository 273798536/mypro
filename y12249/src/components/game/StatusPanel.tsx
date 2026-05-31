
import React from 'react';
import { Trophy, Clock, AlertTriangle, Award } from 'lucide-react';
import { GameSession, ERROR_TYPES } from '../../types';
import { cn } from '../../lib/utils';

interface StatusPanelProps {
  session: GameSession;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ session }) => {
  const gradeColors: Record<string, string> = {
    S: 'text-amber-400',
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-yellow-400',
    D: 'text-red-400',
  };

  const errorSummary = ERROR_TYPES.map((type) => ({
    ...type,
    count: session.errors.filter((e) => e.type === type.type).length,
  }));

  const totalErrors = session.errors.length;
  const syncDecisions = session.decisions.filter((d) => d.triggeredSync).length;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-white/60">回合</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {session.currentRound}/{session.totalRounds}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/60">得分</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {session.score.toFixed(1)}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white/60">评级</span>
          </div>
          <div className={cn('text-2xl font-bold', gradeColors[session.grade])}>
            {session.grade}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-white/60">错误</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {totalErrors}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/80">错误统计</h4>
        {errorSummary.map((error) => (
          <div key={error.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: error.color }}
              />
              <span className="text-sm text-white/70">{error.name}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {error.count} 次
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">触发声部同步</span>
          <span className="text-sm font-bold text-amber-400">
            {syncDecisions} 次 ✨
          </span>
        </div>
      </div>
    </div>
  );
};

