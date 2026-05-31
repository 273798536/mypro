import { useMemo } from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  Fuel,
  Database,
  Tag,
  Clock,
} from 'lucide-react';
import type { GameState, Level } from '../../engine/types';
import { checkLiquidation } from '../../engine/rules';
import { formatValue, formatRatio } from '../../engine/calculator';
import MetricCard from '../common/MetricCard';

interface StatusPanelProps {
  game: GameState;
  level: Level;
  elapsedTime: number;
}

export default function StatusPanel({ game, level, elapsedTime }: StatusPanelProps) {
  const liquidationStatus = useMemo(() => {
    return checkLiquidation(
      game.collateralRatio,
      level.liquidationRatio,
      level.safetyRatio
    );
  }, [game.collateralRatio, level]);

  const priceTrend = useMemo(() => {
    if (game.priceHistory.length < 2) return { trend: 'neutral' as const, value: '—' };
    const recent = game.priceHistory.slice(-2);
    const diff = recent[1].price - recent[0].price;
    const percent = (diff / recent[0].price) * 100;
    const trend: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
    return {
      trend,
      value: `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`,
    };
  }, [game.priceHistory]);

  const ratioTrend = useMemo(() => {
    if (game.nodeHistory.length === 0) return null;
    const lastNode = game.nodeHistory[game.nodeHistory.length - 1];
    const diff = game.collateralRatio - lastNode.collateralRatio;
    return {
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`,
    };
  }, [game.nodeHistory, game.collateralRatio]);

  const gasPercentage = (game.gasRemaining / level.initialGas) * 100;
  const gasStatus =
    gasPercentage > 50
      ? 'safe'
      : gasPercentage > 20
      ? 'warning'
      : 'danger';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-br from-defi-card to-defi-bg-light">
        <div className="text-center">
          <div className="text-sm text-defi-text-muted mb-2">当前抵押率</div>
          <div
            className={`text-5xl font-mono font-bold mb-2 transition-colors duration-500 ${
              liquidationStatus.status === 'safe'
                ? 'text-defi-success'
                : liquidationStatus.status === 'warning'
                ? 'text-defi-warning'
                : 'text-defi-danger'
            }`}
          >
            {formatRatio(game.collateralRatio)}
          </div>
          {ratioTrend && (
            <div
              className={`text-sm ${
                ratioTrend.trend === 'up'
                  ? 'text-defi-success'
                  : ratioTrend.trend === 'down'
                  ? 'text-defi-danger'
                  : 'text-defi-text-muted'
              }`}
            >
              {ratioTrend.value} 较上一步
            </div>
          )}
          <div className="mt-4 h-2 bg-defi-bg rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 relative"
              style={{
                width: `${Math.min(100, (game.collateralRatio / 250) * 100)}%`,
                backgroundColor:
                  liquidationStatus.status === 'safe'
                    ? '#2EC4B6'
                    : liquidationStatus.status === 'warning'
                    ? '#FF9F1C'
                    : '#E63946',
              }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-defi-warning"
              style={{ left: `${(level.safetyRatio / 250) * 100}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-defi-danger"
              style={{ left: `${(level.liquidationRatio / 250) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-defi-text-muted">
            <span>0%</span>
            <span className="text-defi-warning">安全线 {level.safetyRatio}%</span>
            <span className="text-defi-danger">清算线 {level.liquidationRatio}%</span>
            <span>250%+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="抵押物价值"
          value={formatValue(game.collateralValue)}
          unit="USD"
          icon={<Wallet size={16} />}
          status={liquidationStatus.status}
        />
        <MetricCard
          label="债务价值"
          value={formatValue(game.debtValue)}
          unit="USD"
          icon={<Coins size={16} />}
          status="safe"
        />
        <MetricCard
          label="预言机价格"
          value={formatValue(game.currentPrice)}
          unit="USD"
          icon={<TrendingUp size={16} />}
          trend={priceTrend.trend}
          trendValue={priceTrend.value}
          status={
            priceTrend.trend === 'down' && priceTrend.value !== '—'
              ? 'warning'
              : 'safe'
          }
        />
        <MetricCard
          label="Gas剩余"
          value={game.gasRemaining}
          unit="单位"
          icon={<Fuel size={16} />}
          status={gasStatus}
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-defi-text-muted" />
          <span className="text-sm text-defi-text-muted">游戏信息</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-defi-text-muted text-xs">关卡</div>
            <div className="font-medium">{level.name}</div>
          </div>
          <div>
            <div className="text-defi-text-muted text-xs">用时</div>
            <div className="font-mono font-medium">{formatTime(elapsedTime)}</div>
          </div>
          <div>
            <div className="text-defi-text-muted text-xs">已走步数</div>
            <div className="font-mono font-medium">{game.nodeHistory.length}</div>
          </div>
          <div>
            <div className="text-defi-text-muted text-xs">路径节点</div>
            <div className="font-mono font-medium">{game.path.length}</div>
          </div>
        </div>
      </div>

      <div className="card border-defi-purple/30">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-defi-purple" />
          <span className="text-sm text-defi-purple">数据来源信息</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-defi-text-muted">仓位来源</span>
            <span className="font-mono">{game.position.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-defi-text-muted">仓位版本</span>
            <span className="font-mono">{game.position.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-defi-text-muted">预言机来源</span>
            <span className="font-mono">{game.position.oracle.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-defi-text-muted">预言机版本</span>
            <span className="font-mono">{game.position.oracle.version}</span>
          </div>
          {game.position.collaterals.map((col, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="text-defi-text-muted">
                <Tag size={10} className="inline mr-1" />
                抵押物 {idx + 1}
              </span>
              <span className="font-mono">
                {col.amount} {col.asset} ({col.source} {col.version})
              </span>
            </div>
          ))}
        </div>
      </div>

      {game.nodeHistory.length > 0 && (
        <div className="card max-h-48 overflow-auto scrollbar-thin">
          <div className="text-sm text-defi-text-muted mb-2">最新规则反馈</div>
          <div className="text-sm text-defi-text">
            {game.nodeHistory[game.nodeHistory.length - 1].ruleFeedback}
          </div>
        </div>
      )}
    </div>
  );
}
