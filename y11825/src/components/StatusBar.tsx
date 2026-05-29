import { Heart, Zap, DollarSign, Trophy, Clock } from 'lucide-react';
import type { GameState } from '../types';

interface StatusBarProps {
  gameState: GameState;
}

export default function StatusBar({ gameState }: StatusBarProps) {
  const marginPercentage = gameState.initialMargin > 0
    ? gameState.currentMargin / gameState.initialMargin
    : 0;
  const volatilityPercentage = gameState.initialVolatility > 0
    ? gameState.currentVolatility / gameState.initialVolatility
    : 1;
  const getMarginStatus =
    marginPercentage > 0.8 ? 'good' : marginPercentage > 0.5 ? 'warning' : 'danger';

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-info)]/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--color-accent-info)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">保证金</div>
              <div className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                {gameState.currentMargin.toFixed(2)}
                <span className="text-sm text-[var(--color-text-muted)]">
                  /{gameState.initialMargin}
                </span>
              </div>
            </div>
          </div>

          <div className="w-32">
            <div className="health-bar">
              <div
                className={`health-bar-fill ${getMarginStatus}`}
                style={{ width: `${Math.min(marginPercentage * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-warning)]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[var(--color-accent-warning)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">波动率</div>
              <div
                className={`font-mono text-lg font-bold ${
                  volatilityPercentage > 1.5 ? 'volatility-spike' : 'text-[var(--color-text-primary)]'
                }`}
              >
                {(gameState.currentVolatility * 100).toFixed(1)}%
              </div>
            </div>
            {volatilityPercentage > 1.5 && (
              <span className="text-xs text-[var(--color-accent-danger)] animate-pulse">
                ↑{((volatilityPercentage - 1) * 100).toFixed(0)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-success)]/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--color-accent-success)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">回合</div>
              <div className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                {gameState.currentRound}/{gameState.totalRounds}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-danger)]/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-[var(--color-accent-danger)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">生命</div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-5 h-5 ${
                      i < gameState.lives
                        ? 'text-[var(--color-accent-danger)] fill-[var(--color-accent-danger)]'
                        : 'text-[var(--color-bg-tertiary)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-gold)]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[var(--color-accent-gold)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">得分</div>
              <div className="font-mono text-lg font-bold text-[var(--color-text-primary)]">
                {gameState.score}
              </div>
            </div>
          </div>
        </div>
      </div>

      {gameState.lives <= 1 && gameState.status === 'PLAYING' && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/30 text-sm text-[var(--color-accent-danger)] animate-pulse">
          ⚠️ 警告：生命值不足！请立即补充保证金或降低仓位！
        </div>
      )}

      {marginPercentage < 0.3 && gameState.status === 'PLAYING' && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/30 text-sm text-[var(--color-accent-danger)] animate-pulse">
          🔴 保证金严重不足，即将触发强制平仓！
        </div>
      )}
    </div>
  );
}
