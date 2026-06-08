import { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { detectCollisions } from '../../utils/dataProcessing';

export default function TimeControl() {
  const { 
    timeState, 
    play, 
    pause, 
    reset, 
    setTime, 
    setTimeState,
    pointCloudData,
    collisions,
    addCollision,
    clearCollisions,
    getDefectsAtTime
  } = useAppStore();
  
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastDetectedTimeRef = useRef<number>(-1);
  const detectedCollisionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!timeState.isPlaying || !pointCloudData) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const newTime = timeState.currentTime + deltaTime * timeState.playbackSpeed * 10;

      if (newTime >= timeState.totalDuration) {
        pause();
        setTime(timeState.totalDuration);
      } else {
        setTime(newTime);
      }

      const currentSecond = Math.floor(newTime);
      if (currentSecond !== lastDetectedTimeRef.current) {
        lastDetectedTimeRef.current = currentSecond;
        const currentDefects = getDefectsAtTime(newTime);
        const newCollisions = detectCollisions(currentDefects, 0.5);
        
        newCollisions.forEach(collision => {
          if (!detectedCollisionIdsRef.current.has(collision.id)) {
            detectedCollisionIdsRef.current.add(collision.id);
            addCollision(collision);
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeState.isPlaying, timeState.playbackSpeed, pointCloudData]);

  useEffect(() => {
    if (!timeState.isPlaying) {
      lastDetectedTimeRef.current = -1;
    }
  }, [timeState.isPlaying]);

  useEffect(() => {
    if (timeState.currentTime === 0 && collisions.length > 0) {
      detectedCollisionIdsRef.current.clear();
      clearCollisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeState.currentTime]);

  const handleSpeedChange = (speed: number) => {
    setTimeState({ playbackSpeed: speed });
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * timeState.totalDuration;
    setTime(newTime);
  };

  const progress = (timeState.currentTime / timeState.totalDuration) * 100;

  const currentCollisions = collisions.filter(
    c => Math.abs(c.time - timeState.currentTime) < 2
  );

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-cyan-900">
      <div className="flex items-center justify-between mb-3">
        <div className="text-cyan-400 text-sm font-medium">时间控制</div>
        <div className="text-cyan-400 text-xs font-mono">
          {timeState.currentTime.toFixed(1)} / {timeState.totalDuration.toFixed(1)} s
        </div>
      </div>

      {currentCollisions.length > 0 && (
        <div className="mb-3 p-2 bg-red-900 bg-opacity-30 rounded border border-red-800 animate-pulse">
          <div className="flex items-center space-x-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4" />
            <span>检测到 {currentCollisions.length} 个碰撞事件</span>
          </div>
        </div>
      )}

      <div 
        className="h-2 bg-gray-800 rounded-full cursor-pointer mb-4 relative overflow-hidden"
        onClick={handleTimelineClick}
      >
        <div 
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-0 w-1 h-full bg-white rounded-full shadow-lg"
          style={{ left: `${progress}%` }}
        />
        {collisions.map((c) => (
          <div
            key={c.id}
            className={`absolute top-0 w-1 h-full ${
              c.severity === 'high' ? 'bg-red-500' :
              c.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
            }`}
            style={{ left: `${(c.time / timeState.totalDuration) * 100}%` }}
            title={`碰撞 t=${c.time.toFixed(1)}s - ${c.severity}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-center space-x-2 mb-4">
        <button
          onClick={() => setTime(Math.max(0, timeState.currentTime - 5))}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="后退5秒"
        >
          <Rewind className="w-5 h-5 text-cyan-400" />
        </button>

        {timeState.isPlaying ? (
          <button
            onClick={pause}
            className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full transition-colors shadow-lg shadow-cyan-600/30"
            title="暂停"
          >
            <Pause className="w-6 h-6 text-white" />
          </button>
        ) : (
          <button
            onClick={play}
            className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full transition-colors shadow-lg shadow-cyan-600/30"
            title="开始"
            disabled={!pointCloudData}
          >
            <Play className="w-6 h-6 text-white" />
          </button>
        )}

        <button
          onClick={() => setTime(Math.min(timeState.totalDuration, timeState.currentTime + 5))}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="前进5秒"
        >
          <FastForward className="w-5 h-5 text-cyan-400" />
        </button>

        <button
          onClick={reset}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="重置"
        >
          <RotateCcw className="w-5 h-5 text-cyan-400" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">播放速度</div>
        <div className="flex space-x-1">
          {[0.5, 1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeState.playbackSpeed === speed
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
