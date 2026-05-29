import React from 'react';
import { Clock, Users, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getLevel } from '../../data/levels';

export const StatusBar: React.FC = () => {
  const currentTime = useGameStore((state) => state.currentTime);
  const totalDuration = useGameStore((state) => state.totalDuration);
  const score = useGameStore((state) => state.score);
  const passengers = useGameStore((state) => state.passengers);
  const levelId = useGameStore((state) => state.levelId);
  const status = useGameStore((state) => state.status);
  const penalties = useGameStore((state) => state.penalties);

  const level = getLevel(levelId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = totalDuration - currentTime;
  const timePercentage = (currentTime / totalDuration) * 100;
  const isLowTime = remainingTime < 30;

  const activePassengers = passengers.filter((p) => p.status !== 'exited').length;
  const evacuatedPassengers = passengers.filter((p) => p.status === 'exited').length;
  const totalPassengers = passengers.length;
  const evacuationRate = totalPassengers > 0 ? (evacuatedPassengers / totalPassengers) * 100 : 0;

  const totalPenaltyPoints = penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  const getScoreColor = () => {
    if (score >= 800) return 'text-metro-green';
    if (score >= 600) return 'text-metro-yellow';
    if (score >= 400) return 'text-metro-orange';
    return 'text-metro-red';
  };

  return (
    <div className="metro-panel">
      <div className="grid grid-cols-5 gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${isLowTime ? 'bg-metro-red/20' : 'bg-metro-blue/20'}`}>
            <Clock className={isLowTime ? 'text-metro-red animate-pulse' : 'text-metro-blue'} size={20} />
          </div>
          <div>
            <div className="text-xs text-metro-textMuted">剩余时间</div>
            <div className={`font-mono font-bold text-lg ${isLowTime ? 'text-metro-red' : 'text-metro-text'}`}>
              {formatTime(Math.max(0, remainingTime))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-metro-green/20">
            <Award className="text-metro-green" size={20} />
          </div>
          <div>
            <div className="text-xs text-metro-textMuted">当前得分</div>
            <div className={`font-mono font-bold text-lg ${getScoreColor()}`}>
              {score}
              <span className="text-xs text-metro-textMuted">/1000</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-metro-yellow/20">
            <Users className="text-metro-yellow" size={20} />
          </div>
          <div>
            <div className="text-xs text-metro-textMuted">在厅乘客</div>
            <div className="font-mono font-bold text-lg text-metro-text">
              {activePassengers}
              <span className="text-xs text-metro-textMuted">/{level?.targetPassengers}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-metro-blue/20">
            <TrendingUp className="text-metro-blue" size={20} />
          </div>
          <div>
            <div className="text-xs text-metro-textMuted">已疏散</div>
            <div className="font-mono font-bold text-lg text-metro-blue">
              {evacuatedPassengers}
              <span className="text-xs text-metro-textMuted">({evacuationRate.toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-metro-red/20">
            <TrendingDown className="text-metro-red" size={20} />
          </div>
          <div>
            <div className="text-xs text-metro-textMuted">累计扣分</div>
            <div className="font-mono font-bold text-lg text-metro-red">
              -{totalPenaltyPoints}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 bg-metro-bg rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isLowTime ? 'bg-metro-red' : 'bg-metro-blue'
          }`}
          style={{ width: `${100 - timePercentage}%` }}
        />
      </div>

      {status === 'idle' && (
        <div className="mt-3 p-2 bg-metro-yellow/10 border border-metro-yellow/30 rounded text-center text-metro-yellow text-sm">
          点击"开始游戏"按钮开始训练
        </div>
      )}
      {status === 'finished' && (
        <div className="mt-3 p-2 bg-metro-green/10 border border-metro-green/30 rounded text-center text-metro-green text-sm">
          训练完成！点击查看详细报告
        </div>
      )}
    </div>
  );
};
