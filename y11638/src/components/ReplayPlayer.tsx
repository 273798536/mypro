import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, Pause, SkipBack, SkipForward, X, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReplayPlayer() {
  const navigate = useNavigate();
  const {
    currentSession,
    replayFrames,
    isReplaying,
    replayIndex,
    setReplayIndex,
    stopReplay,
    levels,
    materials,
    currentLevel
  } = useGameStore();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const currentFrame = replayFrames[replayIndex];
  
  const getStressColor = useCallback((stress: number, maxStress: number) => {
    const ratio = Math.min(Math.abs(stress) / Math.max(maxStress, 1), 1);
    if (ratio < 0.5) {
      const t = ratio / 0.5;
      return `rgb(${Math.round(34 + t * 220)}, ${Math.round(197 + t * 100)}, 94)`;
    } else if (ratio < 0.8) {
      const t = (ratio - 0.5) / 0.3;
      return `rgb(${Math.round(234 + t * 21)}, ${Math.round(179 + t * -81)}, ${Math.round(8 + t * 78)})`;
    } else {
      const t = (ratio - 0.8) / 0.2;
      return `rgb(239, ${Math.round(68 + t * -4)}, ${Math.round(68 + t * -4)})`;
    }
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame || !currentSession || !currentLevel) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const gradient = ctx.createLinearGradient(0, currentLevel.groundY, 0, height);
    gradient.addColorStop(0, '#475569');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, currentLevel.groundY, currentLevel.anchors[0].x, height - currentLevel.groundY);
    ctx.fillRect(
      currentLevel.anchors[currentLevel.anchors.length - 1].x,
      currentLevel.groundY,
      width - currentLevel.anchors[currentLevel.anchors.length - 1].x,
      height - currentLevel.groundY
    );
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(
      currentLevel.anchors[0].x,
      currentLevel.groundY,
      currentLevel.anchors[currentLevel.anchors.length - 1].x - currentLevel.anchors[0].x,
      height - currentLevel.groundY
    );
    
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.beginPath();
    ctx.moveTo(currentLevel.anchors[0].x, currentLevel.groundY + 50);
    for (let x = currentLevel.anchors[0].x; x <= currentLevel.anchors[currentLevel.anchors.length - 1].x; x += 20) {
      const y = currentLevel.groundY + 50 + Math.sin(x * 0.02 + currentFrame.timestamp * 3) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(currentLevel.anchors[currentLevel.anchors.length - 1].x, height);
    ctx.lineTo(currentLevel.anchors[0].x, height);
    ctx.closePath();
    ctx.fill();
    
    currentSession.members.forEach(member => {
      const startPos = currentFrame.nodePositions[member.startNodeId];
      const endPos = currentFrame.nodePositions[member.endNodeId];
      const stress = currentFrame.memberStresses[member.id] || 0;
      
      if (!startPos || !endPos) return;
      
      const mat = materials.find(m => m.id === member.materialId);
      const color = getStressColor(stress, member.maxStress);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(endPos.x, endPos.y);
      ctx.stroke();
    });
    
    Object.values(currentFrame.nodePositions).forEach((pos, i) => {
      const nodeId = Object.keys(currentFrame.nodePositions)[i];
      const node = currentSession.nodes.find(n => n.id === nodeId);
      
      const radius = node?.isAnchor ? 12 : 8;
      
      ctx.fillStyle = node?.isAnchor ? '#fb923c' : '#60a5fa';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      if (node?.isAnchor) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚓', pos.x, pos.y);
      }
    });
    
    if (currentFrame.vehiclePosition > 0) {
      const vehicleX = currentFrame.vehiclePosition;
      const deckY = currentLevel.anchors[0].y - 15;
      
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(vehicleX - 30, deckY - 15, 60, 25);
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(vehicleX - 18, deckY + 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(vehicleX + 18, deckY + 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [currentFrame, currentSession, currentLevel, materials, getStressColor]);
  
  useEffect(() => {
    if (!isPlaying || !isReplaying) return;
    
    const play = () => {
      if (replayIndex < replayFrames.length - 1) {
        setReplayIndex(replayIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };
    
    const interval = setInterval(play, 50 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, isReplaying, replayIndex, replayFrames.length, playbackSpeed, setReplayIndex]);
  
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
  const handleClose = () => {
    stopReplay();
    navigate('/');
  };
  
  if (!isReplaying || !currentSession || !currentLevel) return null;
  
  const level = levels.find(l => l.id === currentSession.levelId);
  const progress = replayFrames.length > 0 ? (replayIndex / (replayFrames.length - 1)) * 100 : 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">回放: {level?.name}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentSession.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {currentSession.success ? '通过' : '失败'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
          >
            <Home size={18} />
          </button>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={1000}
            height={550}
            className="rounded-xl border-2 border-slate-700"
          />
          
          {currentFrame && (
            <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 space-y-1 text-sm">
              <div className="text-slate-400">时间: <span className="text-white">{currentFrame.timestamp.toFixed(1)}s</span></div>
              <div className="text-slate-400">花费: <span className="text-yellow-400">{currentFrame.budgetUsed}</span></div>
            </div>
          )}
          
          {currentFrame?.warnings && currentFrame.warnings.length > 0 && (
            <div className="absolute top-4 left-4 bg-yellow-500/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
              {currentFrame.warnings.slice(-1).map((w, i) => (
                <div key={i} className="text-xs text-yellow-900 font-medium">⚠ {w}</div>
              ))}
            </div>
          )}
          
          {!currentSession.success && replayIndex === replayFrames.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="bg-red-500/90 text-white px-6 py-3 rounded-xl font-bold text-xl animate-pulse">
                失败: {currentSession.failureMessage}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => setReplayIndex(0)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-white"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-colors text-white"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={() => setReplayIndex(replayFrames.length - 1)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-white"
            >
              <SkipForward size={20} />
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={replayFrames.length - 1}
                value={replayIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setReplayIndex(parseInt(e.target.value));
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="flex gap-1">
              {[0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>帧: {replayIndex + 1} / {replayFrames.length}</span>
            <span>进度: {progress.toFixed(1)}%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
