import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { formatTime } from '../../utils/judgeUtils';

export function TimelinePlayer() {
  const { gameResult, currentTrack, setCurrentTime, status } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [reviewTime, setReviewTime] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying) {
      const loop = (timestamp: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp;
        }
        
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;
        
        setReviewTime(prev => {
          const next = prev + delta;
          if (next >= currentTrack.totalDuration) {
            setIsPlaying(false);
            return currentTrack.totalDuration;
          }
          return next;
        });
        
        animationRef.current = requestAnimationFrame(loop);
      };
      
      animationRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = 0;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrack.totalDuration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReviewTime(parseInt(e.target.value));
  };

  const handleReset = () => {
    setReviewTime(0);
    setIsPlaying(false);
  };

  if (!gameResult) return null;

  const problemMarkers = gameResult.judgeRecords
    .filter(r => r.result !== 'perfect')
    .map(r => ({
      time: r.expectedTime,
      type: r.result,
      color: r.result === 'early' ? '#f87171' : r.result === 'late' ? '#fbbf24' : '#6b7280',
    }));

  return (
    <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-4">时间轴复盘</h3>
      
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/30"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        
        <button
          onClick={handleReset}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <div className="font-mono text-lg text-cyan-400">
          {formatTime(reviewTime)}
        </div>
      </div>
      
      <div className="relative w-full h-12 bg-slate-700/50 rounded-xl overflow-hidden">
        {problemMarkers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-1"
            style={{
              left: `${(marker.time / currentTrack.totalDuration) * 100}%`,
              backgroundColor: marker.color,
              boxShadow: `0 0 10px ${marker.color}`,
            }}
          />
        ))}
        
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20"
          style={{ width: `${(reviewTime / currentTrack.totalDuration) * 100}%` }}
        />
        
        <input
          type="range"
          min="0"
          max={currentTrack.totalDuration}
          value={reviewTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>00:00</span>
        <span>{formatTime(currentTrack.totalDuration)}</span>
      </div>
      
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-sm text-slate-400">抢拍</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-sm text-slate-400">延迟</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-sm text-slate-400">错过</span>
        </div>
      </div>
    </div>
  );
}
