import { Battery, Timer, Zap, Activity, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../game/engine';
import { getEnergyBarColor } from '../game/config';
import { formatTime } from '../utils/math';
import type { Level } from '../game/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../game/config';

interface StatusPanelProps {
  level: Level;
}

export const StatusPanel = ({ level }: StatusPanelProps) => {
  const { energy, initialEnergy, elapsedTime, charges, gameState, previewWarnings, ball } =
    useGameStore();

  const energyRatio = energy / initialEnergy;
  const timeRatio = elapsedTime / level.timeLimit;
  const hasFieldWarning = previewWarnings.some((w) => w.type === 'field_too_strong');
  const hasPathWarning = previewWarnings.some((w) => w.type === 'path_wall');

  const difficulty = level.difficulty;
  const difficultyColor = DIFFICULTY_COLORS[difficulty];

  const gameStateLabels: Record<string, { text: string; color: string }> = {
    idle: { text: '待机', color: 'text-gray-400' },
    placing: { text: '放置电荷', color: 'text-neon-cyan' },
    previewing: { text: '路径预览', color: 'text-neon-yellow' },
    running: { text: '运行中', color: 'text-neon-green' },
    paused: { text: '已暂停', color: 'text-neon-yellow' },
    success: { text: '成功!', color: 'text-success-green' },
    failed: { text: '失败', color: 'text-neon-pink' },
  };

  const stateInfo = gameStateLabels[gameState] || gameStateLabels.idle;

  return (
    <div className="panel-glass p-4 space-y-4">
      <h3 className="font-display text-neon-cyan text-lg font-bold glow-text-cyan">
        📊 游戏状态
      </h3>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400 font-mono">关卡</span>
          <span className="text-white font-display font-bold">{level.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400 font-mono">难度</span>
          <span
            className="font-mono font-bold text-sm px-2 py-0.5 rounded"
            style={{ color: difficultyColor, backgroundColor: `${difficultyColor}20` }}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400 font-mono">状态</span>
          <span className={`font-mono font-bold ${stateInfo.color}`}>
            {stateInfo.text}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-neon-yellow" />
            <span className="text-sm text-gray-400 font-mono">能量</span>
          </div>
          <span
            className={`font-mono font-bold ${
              energyRatio > 0.6
                ? 'text-success-green'
                : energyRatio > 0.3
                ? 'text-neon-yellow'
                : 'text-neon-pink'
            }`}
          >
            {Math.round(energy)} / {initialEnergy}
          </span>
        </div>
        <div className="w-full h-3 bg-space-900 rounded-full overflow-hidden border border-gray-700">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.max(0, energyRatio * 100)}%`,
              backgroundColor: getEnergyBarColor(energyRatio),
              boxShadow: `0 0 10px ${getEnergyBarColor(energyRatio)}`,
            }}
          />
        </div>
        {energyRatio <= 0.1 && (
          <div className="flex items-center gap-2 text-xs text-neon-pink font-mono">
            <AlertTriangle className="w-3 h-3" />
            能量即将耗尽!
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-neon-purple" />
            <span className="text-sm text-gray-400 font-mono">用时</span>
          </div>
          <span
            className={`font-mono font-bold ${
              timeRatio > 0.8 ? 'text-neon-pink' : 'text-neon-purple'
            }`}
          >
            {formatTime(elapsedTime)} / {formatTime(level.timeLimit)}
          </span>
        </div>
        <div className="w-full h-3 bg-space-900 rounded-full overflow-hidden border border-gray-700">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.min(100, timeRatio * 100)}%`,
              backgroundColor: timeRatio > 0.8 ? '#ff006e' : '#7b2cbf',
              boxShadow: `0 0 10px ${timeRatio > 0.8 ? '#ff006e' : '#7b2cbf'}`,
            }}
          />
        </div>
        {timeRatio > 0.8 && (
          <div className="flex items-center gap-2 text-xs text-neon-pink font-mono">
            <AlertTriangle className="w-3 h-3" />
            时间即将耗尽!
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-space-900/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-4 h-4 text-neon-pink" />
            <span className="text-xs text-gray-400 font-mono">电荷数</span>
          </div>
          <span className="text-2xl font-display font-bold text-neon-pink">
            {charges.length}
          </span>
        </div>
        <div className="bg-space-900/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-gray-400 font-mono">小球电荷</span>
          </div>
          <span className="text-2xl font-display font-bold text-neon-cyan">
            {level.ballCharge > 0 ? '+' : ''}
            {level.ballCharge}
          </span>
        </div>
      </div>

      {ball && gameState === 'running' && (
        <div className="bg-space-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 font-mono mb-2">实时速度</div>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono">
            <div>
              <span className="text-gray-500">Vx:</span>{' '}
              <span className="text-neon-cyan">{ball.velocity.x.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-500">Vy:</span>{' '}
              <span className="text-neon-cyan">{ball.velocity.y.toFixed(1)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">速度:</span>{' '}
              <span className="text-neon-yellow">
                {Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {(hasFieldWarning || hasPathWarning) && gameState === 'placing' && (
        <div className="space-y-2">
          {hasPathWarning && (
            <div className="flex items-start gap-2 p-3 bg-neon-pink/10 border border-neon-pink/50 rounded-lg warning-pulse">
              <AlertTriangle className="w-4 h-4 text-neon-pink flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-neon-pink font-mono font-bold">路径警告</p>
                <p className="text-xs text-gray-400 font-mono">预测路径将穿过墙壁</p>
              </div>
            </div>
          )}
          {hasFieldWarning && (
            <div className="flex items-start gap-2 p-3 bg-neon-yellow/10 border border-neon-yellow/50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-neon-yellow flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-neon-yellow font-mono font-bold">电场警告</p>
                <p className="text-xs text-gray-400 font-mono">电场强度过高可能失控</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
