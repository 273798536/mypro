import { Play, Pause, RotateCcw, FastForward, BookOpen, BarChart3, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../common/Button';
import { STRATEGY_CONFIG } from '../../utils/cacheAlgorithms';
import { SCHEDULER_CONFIG } from '../../types/queue';
import type { CacheStrategy } from '../../types/cache';
import type { QueueScheduler } from '../../types/queue';

export function ControlBar() {
  const navigate = useNavigate();
  const {
    status,
    speed,
    cacheStrategy,
    queueScheduler,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setSpeed,
    setCacheStrategy,
    setQueueScheduler,
  } = useGameStore();

  const speedOptions = [
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' },
  ];

  return (
    <div className="h-16 px-6 bg-[#1D1A17] border-b-2 border-[#5D554D] flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <h1 className="text-xl font-bold text-[#FF7A18]" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            算法缓存厨房
          </h1>
        </div>
        
        <div className="h-8 w-px bg-[#5D554D]" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">缓存策略:</label>
          <select
            value={cacheStrategy}
            onChange={(e) => setCacheStrategy(e.target.value as CacheStrategy)}
            disabled={status === 'playing'}
            className="px-2 py-1 text-sm bg-[#3D3833] border border-[#5D554D] rounded-md text-white disabled:opacity-50 focus:outline-none focus:border-[#FF7A18]"
            title={STRATEGY_CONFIG[cacheStrategy].description}
          >
            {(Object.keys(STRATEGY_CONFIG) as CacheStrategy[]).map((strategy) => (
              <option key={strategy} value={strategy}>
                {STRATEGY_CONFIG[strategy].name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">队列调度:</label>
          <select
            value={queueScheduler}
            onChange={(e) => setQueueScheduler(e.target.value as QueueScheduler)}
            disabled={status === 'playing'}
            className="px-2 py-1 text-sm bg-[#3D3833] border border-[#5D554D] rounded-md text-white disabled:opacity-50 focus:outline-none focus:border-[#FF7A18]"
            title={SCHEDULER_CONFIG[queueScheduler].description}
          >
            {(Object.keys(SCHEDULER_CONFIG) as QueueScheduler[]).map((scheduler) => (
              <option key={scheduler} value={scheduler}>
                {SCHEDULER_CONFIG[scheduler].name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          {speedOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSpeed(opt.value as 1 | 2 | 3)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                speed === opt.value
                  ? 'bg-[#FF7A18] text-white'
                  : 'bg-[#3D3833] text-gray-400 hover:bg-[#4D4843]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <FastForward className="w-4 h-4 text-gray-400 ml-1" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <Button onClick={startGame} variant="success" size="md">
            <Play className="w-4 h-4 mr-2 inline" />
            开始游戏
          </Button>
        )}
        
        {status === 'playing' && (
          <Button onClick={pauseGame} variant="warning" size="md">
            <Pause className="w-4 h-4 mr-2 inline" />
            暂停
          </Button>
        )}
        
        {status === 'paused' && (
          <Button onClick={resumeGame} variant="success" size="md">
            <Play className="w-4 h-4 mr-2 inline" />
            继续
          </Button>
        )}
        
        {(status === 'paused' || status === 'ended' || status === 'playing') && (
          <Button onClick={resetGame} variant="danger" size="md">
            <RotateCcw className="w-4 h-4 mr-2 inline" />
            重开
          </Button>
        )}

        {status === 'ended' && (
          <Button onClick={() => navigate('/settlement')} variant="primary" size="md">
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            结算
          </Button>
        )}

        {status !== 'idle' && (
          <Button onClick={() => navigate('/review')} variant="secondary" size="md">
            <History className="w-4 h-4 mr-2 inline" />
            复盘
          </Button>
        )}

        <Button onClick={() => navigate('/guide')} variant="ghost" size="md">
          <BookOpen className="w-4 h-4 mr-2 inline" />
          说明
        </Button>
      </div>
    </div>
  );
}
