import { useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { loadAllSnapshots, getReplayTimeline, replayGame } from '@/engine/replayEngine';
import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Clock, Zap, DollarSign, Heart } from 'lucide-react';
import StatusBar from '@/components/StatusBar';
import type { GameState, GameStateSnapshot } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  PLACE_TOWER: '放置防御塔',
  UPGRADE_TOWER: '升级防御塔',
  SELL_TOWER: '卖出防御塔',
  ADD_MARGIN: '补充保证金',
  FORCE_LIQUIDATION: '强制平仓',
};

export default function ReplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const gameStore = useGameStore();
  const [snapshots, setSnapshots] = useState<GameStateSnapshot[]>([]);
  const [timeline, setTimeline] = useState<ReturnType<typeof getReplayTimeline>>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [replayState, setReplayState] = useState<GameState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const maxRound = snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.snapshotRound)) : 0;

  useEffect(() => {
    if (!sessionId) return;
    const loaded = loadAllSnapshots(sessionId);
    setSnapshots(loaded);
    setTimeline(getReplayTimeline(loaded));
    if (loaded.length > 0) {
      setCurrentRound(0);
      setReplayState(replayGame(loaded, 0));
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) return;
    const interval = setInterval(() => {
      setCurrentRound((prev) => {
        if (prev >= maxRound) { setIsPlaying(false); return prev; }
        const next = prev + 1;
        setReplayState(replayGame(snapshots, next));
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, snapshots, maxRound]);

  const goToRound = (round: number) => {
    setCurrentRound(round);
    setReplayState(replayGame(snapshots, round));
    setIsPlaying(false);
  };

  const eventRounds = new Set(
    snapshots.filter((s) => s.volatilityEvents.some((e) => e.triggerRound === s.snapshotRound)).map((s) => s.snapshotRound)
  );
  const liquidationRounds = new Set(
    snapshots.filter((s) => s.actionLog.some((a) => a.type === 'FORCE_LIQUIDATION' && a.round === s.snapshotRound)).map((s) => s.snapshotRound)
  );
  const roundActions = replayState?.actionLog.filter((a) => a.round === currentRound) ?? [];
  const roundTimeline = timeline.find((t) => t.round === currentRound);

  if (!replayState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <p className="font-display text-xl text-[var(--color-text-secondary)]">暂无回放数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">游戏回放</h1>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[var(--color-text-muted)]">回合时间线</span>
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">{currentRound} / {maxRound}</span>
        </div>
        <input type="range" min={0} max={maxRound} value={currentRound}
          onChange={(e) => goToRound(Number(e.target.value))}
          className="w-full accent-[var(--color-accent-info)]" />
        <div className="relative h-6 mt-1">
          {Array.from({ length: maxRound + 1 }, (_, i) => (
            <div key={i} className="absolute"
              style={{ left: `${maxRound > 0 ? (i / maxRound) * 100 : 0}%`, transform: 'translateX(-50%)' }}>
              {liquidationRounds.has(i) ? <div className="timeline-dot liquidation" />
                : eventRounds.has(i) ? <div className="timeline-dot event" />
                : i === currentRound ? <div className="timeline-dot active" />
                : <div className="timeline-dot" />}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mt-1">
          <span>开始</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-accent-warning)]" />波动事件</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-accent-danger)]" />强制平仓</span>
          </div>
          <span>结束</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => goToRound(currentRound - 1)} className="btn-secondary p-2 rounded-lg" disabled={currentRound <= 0}>
          <SkipBack className="w-5 h-5" />
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)} className="btn-primary p-3 rounded-xl">
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <button onClick={() => goToRound(currentRound + 1)} className="btn-secondary p-2 rounded-lg" disabled={currentRound >= maxRound}>
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <StatusBar gameState={replayState} />

      {roundTimeline && (
        <div className="glass-card p-3 flex items-center gap-4 text-sm">
          <Clock className="w-4 h-4 text-[var(--color-accent-success)]" />
          <span className="text-[var(--color-text-secondary)]">第 {currentRound} 回合</span>
          <span className="font-mono text-[var(--color-accent-info)]">保证金 {roundTimeline.margin.toFixed(1)}</span>
          <span className="font-mono text-[var(--color-accent-warning)]">波动率 {(roundTimeline.volatility * 100).toFixed(1)}%</span>
          <span className="font-mono text-[var(--color-accent-gold)]">得分 {roundTimeline.score}</span>
          {roundTimeline.hasEvent && <Zap className="w-4 h-4 text-[var(--color-accent-warning)] animate-pulse" />}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3">防御塔布局</h3>
          <div className="relative bg-[var(--color-bg-tertiary)] rounded-lg aspect-video overflow-hidden">
            {replayState.towers.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">本回合无防御塔</div>
            ) : replayState.towers.map((tower) => (
              <div key={tower.id}
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[var(--color-accent-info)]/30 border border-[var(--color-accent-info)]/60 flex items-center justify-center"
                style={{ left: `${(tower.position.x / 10) * 100}%`, top: `${(tower.position.y / 10) * 100}%` }}>
                <span className="font-mono text-xs text-[var(--color-accent-info)]">Lv{tower.level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3">第 {currentRound} 回合操作日志</h3>
          {roundActions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-[var(--color-text-muted)]">本回合无操作</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {roundActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-bg-secondary)]">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    action.type === 'FORCE_LIQUIDATION' ? 'bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]'
                    : action.type === 'PLACE_TOWER' ? 'bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]'
                    : 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]'}`}>
                    {action.type === 'PLACE_TOWER' ? <Zap className="w-4 h-4" />
                      : action.type === 'ADD_MARGIN' ? <DollarSign className="w-4 h-4" />
                      : action.type === 'FORCE_LIQUIDATION' ? <Heart className="w-4 h-4" />
                      : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ACTION_LABELS[action.type] ?? action.type}</div>
                    {action.payload.cardName && <div className="text-xs text-[var(--color-text-muted)] truncate">{action.payload.cardName}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {eventRounds.has(currentRound) && (
        <div className="glass-card p-4 border border-[var(--color-accent-warning)]/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[var(--color-accent-warning)]" />
            <h3 className="font-display text-lg font-semibold text-[var(--color-accent-warning)]">波动事件触发</h3>
          </div>
          {replayState.volatilityEvents.filter((e) => e.triggerRound === currentRound).map((event) => (
            <p key={event.id} className="text-sm text-[var(--color-text-secondary)]">{event.name}：{event.description}</p>
          ))}
        </div>
      )}

      {liquidationRounds.has(currentRound) && (
        <div className="glass-card p-4 border border-[var(--color-accent-danger)]/30">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-[var(--color-accent-danger)]" />
            <h3 className="font-display text-lg font-semibold text-[var(--color-accent-danger)]">强制平仓发生</h3>
          </div>
          {roundActions.filter((a) => a.type === 'FORCE_LIQUIDATION').map((action) => (
            <p key={action.id} className="text-sm text-[var(--color-text-secondary)]">
              {action.payload.cardName ?? '未知'} 被强制平仓，释放保证金
              <span className="font-mono text-[var(--color-accent-danger)]"> {action.payload.marginReleased?.toFixed(2) ?? '-'}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
