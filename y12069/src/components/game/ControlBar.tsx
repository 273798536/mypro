import { useGameStore } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { useReplay } from '@/hooks/useReplay';
import { Play, Pause, RotateCcw, History, SkipBack, SkipForward, FastForward } from 'lucide-react';

export function ControlBar() {
  const status = useGameStore((state) => state.status);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const setShowResultModal = useUIStore((state) => state.setShowResultModal);
  
  const replay = useReplay();
  const isReplaying = useUIStore((state) => state.isReplaying);
  
  const canPause = status === 'playing' && !isReplaying;
  const canResume = status === 'paused' && !isReplaying;
  
  const handleReset = () => {
    if (confirm('确定要重新开始吗？当前进度将丢失。')) {
      resetGame();
      useUIStore.getState().resetUI();
    }
  };
  
  const handleFinish = () => {
    setShowResultModal(true);
  };
  
  return (
    <div className="bg-lab-panel border-2 border-lab-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {canPause && (
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-4 py-2 bg-neon-orange text-lab-bg rounded-lg font-mono text-sm hover:bg-neon-orange/80 transition-all"
            >
              <Pause size={16} />
              暂停
            </button>
          )}
          
          {canResume && (
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-4 py-2 bg-neon-green text-lab-bg rounded-lg font-mono text-sm hover:bg-neon-green/80 transition-all"
            >
              <Play size={16} />
              继续
            </button>
          )}
          
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-lab-border text-gray-300 rounded-lg font-mono text-sm hover:bg-lab-border/80 transition-all border border-gray-600"
          >
            <RotateCcw size={16} />
            重新开始
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {replay.hasFrames && !isReplaying && (
            <button
              onClick={replay.startReplay}
              className="flex items-center gap-2 px-4 py-2 bg-neon-blue text-lab-bg rounded-lg font-mono text-sm hover:bg-neon-blue/80 transition-all"
            >
              <History size={16} />
              复盘
            </button>
          )}
          
          {isReplaying && (
            <div className="flex items-center gap-2 bg-lab-bg rounded-lg p-2">
              <button
                onClick={replay.goToStart}
                className="p-2 text-gray-400 hover:text-neon-green transition-colors"
                title="回到开始"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={replay.stepBackward}
                className="p-2 text-gray-400 hover:text-neon-green transition-colors"
                title="后退一帧"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={replay.isPlaying ? replay.pauseReplay : replay.playReplay}
                className="p-2 text-neon-green hover:text-neon-green/80 transition-colors"
              >
                {replay.isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={replay.stepForward}
                className="p-2 text-gray-400 hover:text-neon-green transition-colors"
                title="前进一帧"
              >
                <SkipForward size={16} />
              </button>
              <button
                onClick={replay.goToEnd}
                className="p-2 text-gray-400 hover:text-neon-green transition-colors"
                title="到结束"
              >
                <SkipForward size={16} />
              </button>
              
              <div className="flex items-center gap-1 ml-2">
                <FastForward size={12} className="text-gray-500" />
                <select
                  value={replay.replaySpeed}
                  onChange={(e) => replay.setReplaySpeed(Number(e.target.value))}
                  className="bg-lab-bg border border-lab-border rounded px-2 py-1 font-mono text-xs text-gray-300"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
              
              <span className="font-mono text-xs text-gray-500 ml-2">
                {replay.replayFrameIndex + 1} / {replay.totalFrames}
              </span>
              
              <button
                onClick={replay.stopReplay}
                className="ml-2 px-3 py-1 bg-neon-red text-white rounded font-mono text-xs hover:bg-neon-red/80 transition-colors"
              >
                退出复盘
              </button>
            </div>
          )}
          
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-4 py-2 bg-ore-gold text-lab-bg rounded-lg font-mono text-sm hover:bg-ore-gold/80 transition-all"
          >
            结算
          </button>
        </div>
      </div>
      
      {isReplaying && (
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={replay.totalFrames - 1}
            value={replay.replayFrameIndex}
            onChange={(e) => replay.goToFrame(Number(e.target.value))}
            className="w-full h-2 bg-lab-bg rounded-lg appearance-none cursor-pointer accent-neon-blue"
          />
        </div>
      )}
    </div>
  );
}
