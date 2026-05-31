
import React from 'react';
import { Trophy, Award, Music, Clock, Sparkles } from 'lucide-react';
import { GameSession } from '../../types';
import { cn } from '../../lib/utils';

interface ScoreOverviewProps {
  session: GameSession;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ session }) => {
  const gradeConfig: Record<string, { color: string; bg: string; description: string }> = {
    S: {
      color: 'text-amber-400',
      bg: 'from-amber-500/20 to-amber-600/10',
      description: '完美指挥！声部高度协调',
    },
    A: {
      color: 'text-green-400',
      bg: 'from-green-500/20 to-green-600/10',
      description: '优秀表现！整体配合良好',
    },
    B: {
      color: 'text-blue-400',
      bg: 'from-blue-500/20 to-blue-600/10',
      description: '良好表现，还有提升空间',
    },
    C: {
      color: 'text-yellow-400',
      bg: 'from-yellow-500/20 to-yellow-600/10',
      description: '及格表现，需要多加练习',
    },
    D: {
      color: 'text-red-400',
      bg: 'from-red-500/20 to-red-600/10',
      description: '需要加强训练哦',
    },
  };

  const config = gradeConfig[session.grade];

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Music className="w-6 h-6 text-amber-400" />
          训练完成 - {session.sceneName}
        </h2>
        <p className="text-white/60 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          {new Date(session.startTime).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className={cn('rounded-2xl p-6 bg-gradient-to-br', config.bg)}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-white/60 text-sm">最终得分</span>
            </div>
            <div className="text-5xl font-bold text-amber-400 mb-2">
              {session.score.toFixed(1)}
            </div>
          </div>
        </div>

        <div className={cn('rounded-2xl p-6 bg-gradient-to-br', config.bg)}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-white/60 text-sm">评级</span>
            </div>
            <div className={cn('text-6xl font-bold', config.color)}>
              {session.grade}
            </div>
            <p className="text-white/60 text-sm mt-2">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{session.totalRounds}</div>
          <div className="text-xs text-white/60">总回合数</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{session.errors.length}</div>
          <div className="text-xs text-white/60">错误总数</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
            {session.decisions.filter((d) => d.triggeredSync).length}
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs text-white/60">声部同步</div>
        </div>
      </div>
    </div>
  );
};

