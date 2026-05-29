import { useParams, Link } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useDataStore } from '@/store/dataStore';
import {
  Trophy,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateSettlement, locateErrorSource } from '@/engine/settlementEngine';
import { loadSettlementResult, exportSettlementReport } from '@/engine/replayEngine';
import type { SettlementResult, SettlementDetail } from '@/types';

const EVENT_STYLE: Record<string, { color: string }> = {
  VOLATILITY_SHOCK: { color: 'text-orange-400' },
  MARGIN_CALL: { color: 'text-red-400' },
  FORCE_LIQUIDATION: { color: 'text-red-600' },
  TOWER_ACTION: { color: 'text-blue-400' },
  PENALTY: { color: 'text-yellow-400' },
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'VOLATILITY_SHOCK':
      return <TrendingDown className="w-4 h-4" />;
    case 'MARGIN_CALL':
      return <AlertTriangle className="w-4 h-4" />;
    case 'FORCE_LIQUIDATION':
      return <AlertTriangle className="w-4 h-4" />;
    case 'TOWER_ACTION':
      return <Eye className="w-4 h-4" />;
    case 'PENALTY':
      return <TrendingDown className="w-4 h-4" />;
    default:
      return <ArrowRight className="w-4 h-4" />;
  }
};

export default function SettlementPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const gameState = useGameStore((s) => s.state);
  const roundDetails = useGameStore((s) => s.roundDetails);
  const settleGame = useGameStore((s) => s.actions.settleGame);
  const restartGame = useGameStore((s) => s.actions.restartGame);
  const getLevelById = useDataStore((s) => s.actions.getLevelById);
  const level = getLevelById(levelId || '');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);

  useEffect(() => {
    if (gameState?.status === 'SETTLED') {
      settleGame();
      const result = generateSettlement(
        gameState,
        roundDetails,
        gameState.availableCards,
        gameState.volatilityEvents,
      );
      setSettlement(result);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    if (!settlement) return;
    const saved = loadSettlementResult(settlement.id);
    const report = exportSettlementReport(saved || settlement);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlement-${settlement.sessionId.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleErrorLocate = (detail: SettlementDetail) => {
    if (!gameState) return;
    const error = locateErrorSource(detail, gameState.availableCards, gameState.volatilityEvents);
    if (error) {
      const path =
        error.type === 'OPTION_CARD'
          ? `/admin/cards/${error.id}`
          : `/admin/events/${error.id}`;
      window.open(path, '_blank');
    }
  };

  if (!settlement) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--color-text-muted)]">暂无结算数据</p>
      </div>
    );
  }

  const rounds = [...new Set(settlement.roundDetails.map((d) => d.round))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="glass-card p-8 text-center">
        <Trophy className="w-8 h-8 mx-auto mb-3 text-[var(--color-accent-gold)]" />
        <div
          className={`score-badge grade-${settlement.grade} w-24 h-24 text-4xl mx-auto mb-4`}
        >
          {settlement.grade}
        </div>
        <div className="font-mono text-3xl font-bold mb-2">{settlement.finalScore}</div>
        {level && (
          <p className="text-[var(--color-text-muted)] text-sm mb-2">{level.name}</p>
        )}
        <p className="text-[var(--color-text-secondary)] leading-relaxed">
          {settlement.summary}
        </p>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold mb-4">回合详情</h2>
        <div className="space-y-4">
          {rounds.map((round) => (
            <div key={round}>
              <h3 className="font-display text-sm text-[var(--color-text-muted)] mb-2">
                第 {round} 回合
              </h3>
              <div className="space-y-2">
                {settlement.roundDetails
                  .filter((d) => d.round === round)
                  .map((detail) => {
                    const style = EVENT_STYLE[detail.eventType] || EVENT_STYLE.PENALTY;
                    const isExpanded = expandedIds.has(detail.id);
                    const hasRelated = !!(detail.relatedCardId || detail.relatedEventId);
                    return (
                      <div
                        key={detail.id}
                        className={`rounded-lg p-3 ${
                          detail.scoreChange < 0
                            ? 'diff-removed'
                            : detail.scoreChange > 0
                              ? 'diff-modified'
                              : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={style.color}>
                            {getEventIcon(detail.eventType)}
                          </span>
                          <span className="flex-1 text-sm">{detail.description}</span>
                          <span
                            className={`font-mono text-sm font-semibold ${
                              detail.scoreChange >= 0
                                ? 'text-[var(--color-accent-success)]'
                                : 'text-[var(--color-accent-danger)]'
                            }`}
                          >
                            {detail.scoreChange >= 0 ? '+' : ''}
                            {detail.scoreChange}
                          </span>
                          <button
                            onClick={() => toggleExpand(detail.id)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 pl-6 text-xs text-[var(--color-text-secondary)] space-y-1">
                            <p>{detail.humanReadableReason}</p>
                            {hasRelated && (
                              <button
                                onClick={() => handleErrorLocate(detail)}
                                className="flex items-center gap-1 text-[var(--color-accent-info)] hover:underline mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                查看数据来源
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {settlement.towerActions.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-semibold mb-4">防御塔操作</h2>
          <div className="space-y-2">
            {settlement.towerActions.map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg p-3 bg-[var(--color-bg-secondary)]"
              >
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    action.action === 'LIQUIDATED'
                      ? 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]'
                      : action.action === 'SELL'
                        ? 'bg-[var(--color-accent-warning)]/20 text-[var(--color-accent-warning)]'
                        : 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]'
                  }`}
                >
                  {action.action}
                </span>
                <span className="flex-1 text-sm">
                  <span className="font-medium">{action.cardName}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">
                    第{action.round}回合
                  </span>
                </span>
                <span
                  className={`font-mono text-xs ${
                    action.scoreChange < 0
                      ? 'text-[var(--color-accent-danger)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {action.scoreChange >= 0 ? '+' : ''}
                  {action.scoreChange}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlement.penaltyDetails.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--color-accent-danger)]" />
            扣分明细
          </h2>
          <div className="space-y-2">
            {settlement.penaltyDetails.map((penalty) => (
              <div key={penalty.id} className="diff-removed rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{penalty.description}</span>
                  <span className="font-mono text-sm font-semibold text-[var(--color-accent-danger)]">
                    {penalty.scoreChange}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {penalty.humanReadableReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 justify-center pb-8">
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出报告
        </button>
        <Link
          to={`/game/${levelId}/replay`}
          className="btn-primary flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          复盘回放
        </Link>
        <Link
          to={`/game/${levelId}`}
          onClick={() => restartGame()}
          className="btn-danger flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重新开始
        </Link>
      </div>
    </div>
  );
}
