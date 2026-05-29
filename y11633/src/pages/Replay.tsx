import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  FastForward,
  Home,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { GameMap } from '../components/game/GameMap';
import { getGameReplay } from '../store/gameStore';
import { LEVEL_CONFIGS } from '../data/levels';
import type { ReplayFrame, Robot, Order, Shelf, Charger, Obstacle } from '../types';

export default function Replay() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [replayFrames, setReplayFrames] = useState<ReplayFrame[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gridSize, setGridSize] = useState(10);
  const [level, setLevel] = useState<string>('easy');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const data = getGameReplay(gameId);
    if (!data) return;
    setReplayFrames(data.replayData || []);
    setShelves(data.state.shelves);
    setChargers(data.state.chargers);
    setObstacles(data.state.obstacles);
    setGridSize(data.state.gridSize);
    setLevel(data.state.level);
    setLoaded(true);
  }, [gameId]);

  const currentRobots: Robot[] = replayFrames[currentFrame]?.robots || [];
  const currentOrders: Order[] = replayFrames[currentFrame]?.orders || [];

  const stepForward = useCallback(() => {
    setCurrentFrame(prev => Math.min(prev + 1, replayFrames.length - 1));
  }, [replayFrames.length]);

  useEffect(() => {
    if (isPlaying) {
      const interval = Math.max(16, 200 / speed);
      timerRef.current = setInterval(stepForward, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, stepForward]);

  useEffect(() => {
    if (isPlaying && currentFrame >= replayFrames.length - 1) {
      setIsPlaying(false);
    }
  }, [currentFrame, isPlaying, replayFrames.length]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">未找到回放数据</h1>
          <button
            onClick={() => navigate('/history')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  const config = LEVEL_CONFIGS[level as keyof typeof LEVEL_CONFIGS];
  const completedCount = currentOrders.filter(o => o.status === 'completed').length;
  const timeoutCount = currentOrders.filter(o => o.status === 'timeout').length;
  const frameProgress = replayFrames.length > 1
    ? (currentFrame / (replayFrames.length - 1)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/history')}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-white font-bold">游戏回放</h2>
                <p className="text-slate-400 text-sm">{config?.name || level}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-green-400">完成: {completedCount}</div>
              <div className="text-red-400">超时: {timeoutCount}</div>
              <div className="text-slate-400">
                帧: {currentFrame + 1}/{replayFrames.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GameMap
              gridSize={gridSize}
              robots={currentRobots}
              shelves={shelves}
              chargers={chargers}
              obstacles={obstacles}
              selectedRobotId={null}
            />
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3">回放控制</h3>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setCurrentFrame(0); setIsPlaying(false); }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  title="回到开始"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 px-4"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <FastForward className="w-4 h-4 text-slate-400" />
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        speed === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, replayFrames.length - 1)}
                  value={currentFrame}
                  onChange={e => {
                    setCurrentFrame(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>开始</span>
                <span>{frameProgress.toFixed(0)}%</span>
                <span>结束</span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 shadow-xl max-h-80 overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-3">机器人状态</h3>
              {currentRobots.map(robot => {
                const batteryColor =
                  robot.battery > 50 ? 'text-green-400'
                    : robot.battery > 20 ? 'text-yellow-400'
                      : 'text-red-400';
                return (
                  <div key={robot.id} className="p-2 bg-slate-700 rounded-lg mb-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">{robot.name}</span>
                      <span className={`font-mono text-xs ${batteryColor}`}>
                        {robot.battery.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                      <span>状态: {robot.status}</span>
                      <span>({robot.position.x}, {robot.position.y})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
