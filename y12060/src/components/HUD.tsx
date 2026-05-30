import { useEffect, useState } from 'react';
import { Gauge, Clock, Ruler, AlertTriangle, Eye, EyeOff, Pause } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { formatTime } from '../utils/collision';
import { getSpeedKmh } from '../utils/physics';
import { DIFFICULTY_CONFIG } from '../config/levels';

interface HUDProps {
  speed: number;
  forkHeight: number;
  steeringAngle: number;
}

export function HUD({ speed, forkHeight, steeringAngle }: HUDProps) {
  const session = useGameStore(state => state.session);
  const isInBlindZone = useGameStore(state => state.isInBlindZone);
  const showCollisionEffect = useGameStore(state => state.showCollisionEffect);
  const warningMessage = useGameStore(state => state.warningMessage);
  const pauseGame = useGameStore(state => state.pauseGame);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const speedKmh = getSpeedKmh(speed);
  const speedLimit = DIFFICULTY_CONFIG[session.difficulty].speedLimit;
  const isSpeeding = speedKmh > speedLimit;
  
  useEffect(() => {
    if (session.status !== 'playing' || !session.startTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - session.startTime! - session.totalPauseDuration;
      setElapsedTime(elapsed);
    }, 100);
    
    return () => clearInterval(interval);
  }, [session.status, session.startTime, session.totalPauseDuration]);
  
  const getScoreColor = () => {
    const percentage = (session.score.total / session.score.maxPossible) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <>
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 pointer-events-auto">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Gauge className={`w-5 h-5 ${isSpeeding ? 'text-red-500 animate-pulse' : 'text-orange-400'}`} />
                <div>
                  <div className="text-xs text-gray-400">速度</div>
                  <div className={`text-xl font-bold ${isSpeeding ? 'text-red-500' : 'text-white'}`}>
                    {speedKmh.toFixed(1)}
                    <span className="text-sm text-gray-400 ml-1">km/h</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs text-gray-400">货叉高度</div>
                  <div className="text-xl font-bold text-white">
                    {forkHeight.toFixed(2)}
                    <span className="text-sm text-gray-400 ml-1">m</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-xs text-gray-400">用时</div>
                  <div className="text-xl font-bold text-white">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 pointer-events-auto">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">得分</div>
              <div className={`text-3xl font-bold ${getScoreColor()}`}>
                {session.score.total}
              </div>
              <div className="text-xs text-gray-500">
                / {session.score.maxPossible}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 pointer-events-auto">
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Pause className="w-5 h-5" />
              <span>暂停 (P)</span>
            </button>
          </div>
        </div>
      </div>
      
      {isInBlindZone && (
        <div className="absolute inset-0 pointer-events-none bg-yellow-500/10 border-4 border-yellow-500/50 animate-pulse">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2">
            <EyeOff className="w-6 h-6" />
            <span>⚠️ 盲区警告 - 请减速并注意观察</span>
          </div>
        </div>
      )}
      
      {showCollisionEffect && (
        <div className="absolute inset-0 pointer-events-none bg-red-500/20 border-4 border-red-500 animate-pulse">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <AlertTriangle className="w-24 h-24 text-red-500 animate-bounce" />
          </div>
        </div>
      )}
      
      {warningMessage && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-red-600/90 text-white px-8 py-4 rounded-lg text-xl font-bold shadow-2xl animate-bounce">
            {warningMessage}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-gray-700">
          <div className="flex items-center gap-8 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">W</kbd>
              <span>前进</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">S</kbd>
              <span>后退</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">A/D</kbd>
              <span>转向</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Q/E</kbd>
              <span>升降货叉</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">R</kbd>
              <span>重开</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">V</kbd>
              <span>视角</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-2">转向角度</div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-100"
              style={{ 
                width: `${Math.abs(steeringAngle) / (Math.PI / 4) * 50 + 50}%`,
                transform: `translateX(${steeringAngle < 0 ? -50 : 0}%)`,
                marginLeft: steeringAngle < 0 ? '50%' : '0'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>左</span>
            <span>中</span>
            <span>右</span>
          </div>
        </div>
      </div>
    </>
  );
}
