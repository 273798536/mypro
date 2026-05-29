import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useDataStore } from '@/store/dataStore';
import StatusBar from '@/components/StatusBar';
import {
  Play, Pause, RotateCcw, FastForward, Plus, ArrowUp, Trash2,
  ChevronRight, Zap, Shield, DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_COLS = 8;
const GRID_ROWS = 6;
const TYPE_COLORS: Record<string, string> = {
  CALL: 'bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]',
  PUT: 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]',
  STRADDLE: 'bg-[var(--color-accent-warning)]/20 text-[var(--color-accent-warning)]',
  STRANGLE: 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]',
  BUTTERFLY: 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]',
};

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { state: gameState, actions: gameActions } = useGameStore();
  const { actions: dataActions } = useDataStore();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);

  useEffect(() => {
    if (!levelId) return;
    const level = dataActions.getLevelById(levelId);
    if (level) gameActions.initGame(level);
  }, [levelId]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!gameState) return;
    const existingTower = gameState.towers.find(
      (t) => t.position.x === x && t.position.y === y
    );
    if (existingTower) {
      setSelectedTowerId(existingTower.id);
      setSelectedCardId(null);
      return;
    }
    if (selectedCardId) {
      gameActions.placeTower(selectedCardId, { x, y });
      setSelectedCardId(null);
    }
  }, [gameState, selectedCardId]);

  const handleNextRound = useCallback(() => {
    if (!gameState || gameState.status !== 'PLAYING') return;
    gameActions.nextRound();
  }, [gameState]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[var(--color-text-muted)]">加载中...</div>
      </div>
    );
  }

  const selectedTower = gameState.towers.find((t) => t.id === selectedTowerId);

  return (
    <div className="space-y-4">
      <StatusBar gameState={gameState} />

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">战场</h2>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <span>标的价</span>
                <span className="font-mono font-bold text-[var(--color-accent-info)]">
                  {gameState.spotPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
            >
              {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, idx) => {
                const x = idx % GRID_COLS;
                const y = Math.floor(idx / GRID_COLS);
                const tower = gameState.towers.find(
                  (t) => t.position.x === x && t.position.y === y
                );
                const isSelected = tower?.id === selectedTowerId;
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCellClick(x, y)}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors
                      ${tower
                        ? isSelected
                          ? 'bg-[var(--color-accent-info)]/30 border-2 border-[var(--color-accent-info)]'
                          : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'
                        : selectedCardId
                          ? 'bg-[var(--color-bg-secondary)]/50 border border-dashed border-[var(--color-accent-info)]/40 hover:bg-[var(--color-accent-info)]/10'
                          : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]/50'
                      }`}
                  >
                    {tower && (
                      <>
                        <Shield className={`w-4 h-4 ${isSelected ? 'text-[var(--color-accent-info)]' : 'text-[var(--color-accent-warning)]'}`} />
                        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                          Lv.{tower.level}
                        </span>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-72 space-y-4">
          <div className="glass-card p-4 max-h-[460px] overflow-y-auto">
            <h3 className="font-display text-sm font-semibold mb-3">期权卡牌</h3>
            <AnimatePresence>
              {gameState.availableCards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => {
                    setSelectedCardId(selectedCardId === card.id ? null : card.id);
                    setSelectedTowerId(null);
                  }}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all
                    ${selectedCardId === card.id
                      ? 'bg-[var(--color-accent-info)]/20 border-2 border-[var(--color-accent-info)]'
                      : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent-info)]/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{card.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${TYPE_COLORS[card.type] || ''}`}>
                      {card.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--color-text-muted)]">
                    <span>保证金 <span className="font-mono text-[var(--color-accent-info)]">{card.marginRequirement}</span></span>
                    <span>Vega <span className="font-mono text-[var(--color-accent-warning)]">{card.vega}</span></span>
                    <span>Delta <span className="font-mono">{card.delta}</span></span>
                    <span>防御 <span className="font-mono text-[var(--color-accent-success)]">{card.defensePower}</span></span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {selectedTower && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <h3 className="font-display text-sm font-semibold mb-2">防御塔操作</h3>
              <div className="text-xs space-y-1 mb-3 text-[var(--color-text-secondary)]">
                <div>等级: <span className="font-mono">Lv.{selectedTower.level}</span></div>
                <div>占用保证金: <span className="font-mono text-[var(--color-accent-info)]">{selectedTower.marginUsed.toFixed(2)}</span></div>
                <div>当前价值: <span className="font-mono text-[var(--color-accent-success)]">{selectedTower.currentValue.toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2">
                {selectedTower.level < 3 && (
                  <button
                    onClick={() => gameActions.upgradeTower(selectedTower.id)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <ArrowUp className="w-3 h-3" />升级
                  </button>
                )}
                <button
                  onClick={() => {
                    gameActions.sellTower(selectedTower.id);
                    setSelectedTowerId(null);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />卖出
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {gameState.status === 'IDLE' && (
              <button onClick={() => gameActions.startGame()} className="btn-primary flex items-center gap-1.5">
                <Play className="w-4 h-4" />开始
              </button>
            )}
            {gameState.status === 'PLAYING' && (
              <button onClick={() => gameActions.pauseGame()} className="btn-secondary flex items-center gap-1.5">
                <Pause className="w-4 h-4" />暂停
              </button>
            )}
            {gameState.status === 'PAUSED' && (
              <button onClick={() => gameActions.resumeGame()} className="btn-primary flex items-center gap-1.5">
                <Play className="w-4 h-4" />继续
              </button>
            )}
            <button onClick={() => gameActions.restartGame()} className="btn-secondary flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />重来
            </button>
            {gameState.status === 'PLAYING' && (
              <button onClick={handleNextRound} className="btn-primary flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4" />下一回合
              </button>
            )}
            <button
              onClick={() => gameActions.addMargin(20)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)] text-sm"
            >
              <Plus className="w-4 h-4" />加保证金
            </button>
          </div>

          <div className="flex items-center gap-2">
            <FastForward className="w-4 h-4 text-[var(--color-text-muted)]" />
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => gameActions.setSpeed(spd)}
                className={`px-3 py-1 rounded text-sm font-mono
                  ${gameState.speed === spd
                    ? 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {gameState.status === 'SETTLED' && (
            <Link
              to={`/settlement/${gameState.sessionId}`}
              className="btn-primary flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />查看结算
            </Link>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-display text-sm font-semibold mb-3">波动事件时间线</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {gameState.volatilityEvents.map((evt) => {
            const triggered = gameState.triggeredEvents.includes(evt.id);
            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex-shrink-0 p-3 rounded-lg min-w-[160px] border
                  ${triggered
                    ? 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30'
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
                  }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className={`w-3 h-3 ${triggered ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-text-muted)]'}`} />
                  <span className="text-xs font-semibold truncate">{evt.name}</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)]">
                  <div>回合 {evt.triggerRound}</div>
                  <div>冲击 <span className="font-mono text-[var(--color-accent-warning)]">+{(evt.volatilityJump * 100).toFixed(0)}%</span></div>
                </div>
                {triggered && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]">
                    已触发
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
