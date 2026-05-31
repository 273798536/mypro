
import React from 'react';
import { Music, Clock, Trophy, Award, Play, Trash2 } from 'lucide-react';
import { GameSession } from '../../types';
import { cn } from '../../lib/utils';

interface SessionCardProps {
  session: GameSession;
  onViewResult: (id: string) => void;
  onReplay: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onViewResult,
  onReplay,
  onDelete,
}) => {
  const gradeColors: Record<string, string> = {
    S: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    A: 'text-green-400 border-green-400/30 bg-green-400/10',
    B: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    C: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    D: 'text-red-400 border-red-400/30 bg-red-400/10',
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{session.sceneName}</h4>
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(session.startTime)}
            </p>
          </div>
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold border',
            gradeColors[session.grade]
          )}
        >
          {session.grade}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">{session.score.toFixed(0)}</div>
          <div className="text-xs text-white/50">得分</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Award className="w-3 h-3 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white">{session.totalRounds}</div>
          <div className="text-xs text-white/50">回合</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Play className="w-3 h-3 text-green-400" />
          </div>
          <div className="text-lg font-bold text-white">{session.decisions.length}</div>
          <div className="text-xs text-white/50">决策</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewResult(session.id)}
          className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          查看报告
        </button>
        <button
          onClick={() => onReplay(session.id)}
          className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
        >
          回放
        </button>
        <button
          onClick={() => onDelete(session.id)}
          className="py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

