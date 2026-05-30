import { useEffect } from 'react';
import { Canvas } from '@/components/game/Canvas';
import { useReplay } from '@/hooks/useReplay';
import { useCollisionHistory } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, History, Clock } from 'lucide-react';

export function ReplayPage() {
  const navigate = useNavigate();
  const replay = useReplay();
  const collisionHistory = useCollisionHistory();
  
  useEffect(() => {
    if (!replay.hasFrames) {
      navigate('/');
      return;
    }
    replay.startReplay();
    
    return () => {
      replay.stopReplay();
    };
  }, [replay, navigate]);
  
  const collisionFrames = collisionHistory.map(c => c.frameIndex);
  
  const handleBack = () => {
    replay.stopReplay();
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-lab-bg text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 bg-lab-panel border-2 border-lab-border rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-neon-blue/20 rounded-xl">
                  <History size={28} className="text-neon-blue" />
                </div>
                <div>
                  <h1 className="font-pixel text-xl text-neon-blue">
                    碰撞复盘
                  </h1>
                  <p className="font-mono text-sm text-gray-400 mt-1">
                    逐帧回顾碰撞过程，分析物理定律
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-lab-panel border-2 border-lab-border rounded-lg px-4 py-2">
              <Clock size={18} className="text-neon-orange" />
              <div className="font-mono text-sm">
                <span className="text-neon-green font-bold">{replay.replayFrameIndex + 1}</span>
                <span className="text-gray-500"> / {replay.totalFrames} 帧</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="mb-6">
          <div className="relative">
            <Canvas />
            
            <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-3 py-2 font-mono text-xs">
              <div className="text-neon-blue mb-1">🎬 复盘模式</div>
              {collisionFrames.includes(replay.replayFrameIndex) && (
                <div className="text-neon-orange animate-pulse">
                  ⚡ 碰撞发生帧
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-lab-panel border-2 border-lab-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={replay.goToStart}
                className="p-3 bg-lab-bg border border-lab-border rounded-lg text-gray-400 hover:text-white hover:border-neon-green transition-all"
                title="回到开始"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={replay.stepBackward}
                className="p-3 bg-lab-bg border border-lab-border rounded-lg text-gray-400 hover:text-white hover:border-neon-green transition-all"
                title="后退一帧"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={replay.isPlaying ? replay.pauseReplay : replay.playReplay}
                className="p-4 bg-neon-green text-lab-bg rounded-lg hover:bg-neon-green/80 transition-all"
              >
                {replay.isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={replay.stepForward}
                className="p-3 bg-lab-bg border border-lab-border rounded-lg text-gray-400 hover:text-white hover:border-neon-green transition-all"
                title="前进一帧"
              >
                <SkipForward size={20} />
              </button>
              <button
                onClick={replay.goToEnd}
                className="p-3 bg-lab-bg border border-lab-border rounded-lg text-gray-400 hover:text-white hover:border-neon-green transition-all"
                title="到结束"
              >
                <SkipForward size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500">速度:</span>
              <select
                value={replay.replaySpeed}
                onChange={(e) => replay.setReplaySpeed(Number(e.target.value))}
                className="bg-lab-bg border border-lab-border rounded-lg px-3 py-2 font-mono text-sm text-white"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min={0}
              max={Math.max(0, replay.totalFrames - 1)}
              value={replay.replayFrameIndex}
              onChange={(e) => replay.goToFrame(Number(e.target.value))}
              className="w-full h-3 bg-lab-bg rounded-lg appearance-none cursor-pointer accent-neon-blue"
            />
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {collisionFrames.map((frame, idx) => {
                const left = (frame / Math.max(1, replay.totalFrames - 1)) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-neon-orange rounded-full"
                    style={{ left: `${left}%` }}
                    title={`碰撞 #${idx + 1} - 帧 ${frame}`}
                  />
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between mt-2 font-mono text-xs text-gray-500">
            <span>第 1 帧</span>
            <span>碰撞标记点</span>
            <span>第 {replay.totalFrames} 帧</span>
          </div>
        </div>
        
        <div className="bg-lab-panel border-2 border-lab-border rounded-lg p-4">
          <h3 className="font-pixel text-sm text-neon-green mb-4">碰撞时间轴</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {collisionHistory.length === 0 ? (
              <p className="font-mono text-sm text-gray-500 text-center py-4">
                暂无碰撞记录
              </p>
            ) : (
              collisionHistory.map((record, idx) => (
                <button
                  key={record.id}
                  onClick={() => replay.goToFrame(record.frameIndex)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all
                    ${replay.replayFrameIndex === record.frameIndex
                      ? 'border-neon-blue bg-neon-blue/10'
                      : 'border-lab-border bg-lab-bg hover:border-neon-green/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">帧 {record.frameIndex}</span>
                      <span className="font-mono text-sm text-white">碰撞 #{idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${record.oreCollected ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'}`}>
                        {record.oreCollected ? '成功' : '失败'}
                      </span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${record.scoreChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {record.scoreChange > 0 ? '+' : ''}{record.scoreChange}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-400">
                    {record.oreName} · {record.beforeCollision.particleEnergy.toFixed(1)}J → {record.afterCollision.particleEnergy.toFixed(1)}J
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4 text-center font-mono text-xs text-gray-500">
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-green font-bold mb-1">操作提示</div>
            <div>点击时间轴标记点快速跳转到碰撞帧</div>
          </div>
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-orange font-bold mb-1">物理学习</div>
            <div>逐帧观察动量和能量的变化</div>
          </div>
          <div className="bg-lab-panel/50 border border-lab-border rounded-lg p-3">
            <div className="text-neon-blue font-bold mb-1">数据分析</div>
            <div>对比不同参数的碰撞效果差异</div>
          </div>
        </div>
      </div>
    </div>
  );
}
