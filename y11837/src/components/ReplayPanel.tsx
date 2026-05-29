import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';

export default function ReplayPanel() {
  const isReplaying = useGameStore(s => s.isReplaying);
  const replayFrame = useGameStore(s => s.replayFrame);
  const replayLog = useGameStore(s => s.state.replayLog);
  const setReplayFrame = useGameStore(s => s.setReplayFrame);
  const stopReplay = useGameStore(s => s.stopReplay);
  const restart = useGameStore(s => s.restart);
  const speed = useGameStore(s => s.speed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(true);

  const maxFrame = replayLog.length - 1;

  useEffect(() => {
    if (!isReplaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    isPlayingRef.current = true;
    intervalRef.current = setInterval(() => {
      if (!isPlayingRef.current) return;
      const currentFrame = useGameStore.getState().replayFrame;
      if (currentFrame >= maxFrame) {
        isPlayingRef.current = false;
        return;
      }
      setReplayFrame(currentFrame + 1);
    }, 500 / speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isReplaying, maxFrame, speed, setReplayFrame]);

  const togglePlay = useCallback(() => {
    isPlayingRef.current = !isPlayingRef.current;
    if (isPlayingRef.current && replayFrame >= maxFrame) {
      setReplayFrame(0);
    }
  }, [replayFrame, maxFrame, setReplayFrame]);

  const goToStart = useCallback(() => {
    setReplayFrame(0);
  }, [setReplayFrame]);

  const goToEnd = useCallback(() => {
    setReplayFrame(maxFrame);
  }, [maxFrame, setReplayFrame]);

  if (!isReplaying) return null;

  const frame = replayLog[replayFrame];
  const frameEvents = frame?.events || [];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#12121f] border-t border-zinc-700 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs">
              回合 {frame?.tick ?? 0} / {replayLog[maxFrame]?.tick ?? 0}
            </span>
            <span className="text-orange-400 text-xs font-mono">
              得分 {frame?.score ?? 0}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { stopReplay(); restart(); }}
              className="flex items-center gap-1 px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs transition-colors"
            >
              再来一局
            </button>
            <button
              onClick={stopReplay}
              className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <button onClick={goToStart} className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition-colors">
            <SkipBack size={14} />
          </button>
          <button onClick={togglePlay} className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition-colors">
            {isPlayingRef.current ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={goToEnd} className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition-colors">
            <SkipForward size={14} />
          </button>
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={replayFrame}
            onChange={e => setReplayFrame(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
        </div>

        {frameEvents.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {frameEvents.map((evt, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded ${
                  evt.type === 'collision' ? 'bg-red-500/20 text-red-400' :
                  evt.type === 'timeout' ? 'bg-yellow-500/20 text-yellow-400' :
                  evt.type === 'order_complete' ? 'bg-green-500/20 text-green-400' :
                  evt.type === 'charging' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-zinc-700 text-zinc-300'
                }`}
              >
                {evt.type === 'collision' && '💥 碰撞'}
                {evt.type === 'timeout' && '⏰ 超时'}
                {evt.type === 'order_complete' && '✅ 完成'}
                {evt.type === 'charging' && '⚡ 充电'}
                {evt.type === 'low_battery_warning' && '🔋 低电'}
                {evt.type === 'order_assigned' && '📋 派单'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
