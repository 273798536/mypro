import { Play, Pause, RotateCcw, Clock, Trophy, Gauge } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { QueueStrategy, CacheStrategy, PathStrategy } from '../types/game';

export function ControlBar() {
  const {
    status,
    score,
    currentTime,
    speed,
    algorithms,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setQueueStrategy,
    setCacheStrategy,
    setPathStrategy,
    setSpeed,
  } = useGameStore();

  return (
    <div className="bg-gradient-to-r from-amber-900 to-amber-800 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-amber-100">🍽️ 算法面试餐厅</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-amber-950/50 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-amber-300" />
              <span className="font-mono text-lg">{currentTime}</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-950/50 px-3 py-1.5 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-mono text-lg text-yellow-300">{score}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="bg-amber-950/50 text-white px-2 py-1.5 rounded text-sm border border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={status === 'running'}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>

            <div className="flex gap-2">
              {status === 'idle' && (
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
                >
                  <Play className="w-4 h-4" />
                  开始
                </button>
              )}
              {status === 'running' && (
                <button
                  onClick={pauseGame}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
                >
                  <Pause className="w-4 h-4" />
                  暂停
                </button>
              )}
              {status === 'paused' && (
                <button
                  onClick={resumeGame}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
                >
                  <Play className="w-4 h-4" />
                  继续
                </button>
              )}
              <button
                onClick={restartGame}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                重开
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-200 text-sm">队列策略:</span>
            <select
              value={algorithms.queue}
              onChange={(e) => setQueueStrategy(e.target.value as QueueStrategy)}
              className="bg-amber-950/50 text-white px-3 py-1.5 rounded text-sm border border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={status === 'running'}
            >
              <option value="FIFO">FIFO (先到先服务)</option>
              <option value="SJF">SJF (短作业优先)</option>
              <option value="PRIORITY">优先级队列</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-200 text-sm">缓存策略:</span>
            <select
              value={algorithms.cache}
              onChange={(e) => setCacheStrategy(e.target.value as CacheStrategy)}
              className="bg-amber-950/50 text-white px-3 py-1.5 rounded text-sm border border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={status === 'running'}
            >
              <option value="LRU">LRU (最近最少使用)</option>
              <option value="LFU">LFU (最不经常使用)</option>
              <option value="FIFO">FIFO (先进先出)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-200 text-sm">路径算法:</span>
            <select
              value={algorithms.path}
              onChange={(e) => setPathStrategy(e.target.value as PathStrategy)}
              className="bg-amber-950/50 text-white px-3 py-1.5 rounded text-sm border border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={status === 'running'}
            >
              <option value="DIJKSTRA">Dijkstra (最短路径)</option>
              <option value="A_STAR">A* (启发式搜索)</option>
              <option value="GREEDY">贪心算法</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
