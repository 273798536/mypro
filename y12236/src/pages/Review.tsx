import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, Play, Pause, RotateCcw, SkipBack, SkipForward, FastForward, BarChart2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import StarField from '../components/StarField';
import { useGameStore } from '../store/gameStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Review() {
  const navigate = useNavigate();
  const { replayData, greeks, timeline, events, conflicts } = useGameStore();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const hasReplayData = replayData.length > 0;

  useEffect(() => {
    if (!hasReplayData) return;

    const animate = (timestamp: number) => {
      if (!isPlaying) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setCurrentFrame((prev) => {
        const next = prev + delta * 10 * playbackSpeed;
        if (next >= replayData.length - 1) {
          setIsPlaying(false);
          return replayData.length - 1;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, replayData.length, hasReplayData]);

  useEffect(() => {
    lastTimeRef.current = 0;
  }, [isPlaying]);

  const frame = hasReplayData ? replayData[Math.floor(currentFrame)] : null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getChartData = (historyKey: 'deltaHistory' | 'gammaHistory' | 'vegaHistory' | 'thetaHistory', label: string, color: string) => {
    const history = greeks[historyKey];
    return {
      labels: history.map((d) => formatTime(d.time)),
      datasets: [
        {
          label,
          data: history.map((d) => d.value),
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(10, 22, 40, 0.9)',
        titleColor: '#00f5ff',
        bodyColor: '#ffffff',
        borderColor: '#00f5ff',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(42, 61, 102, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: 'rgba(42, 61, 102, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  const keyEvents = timeline.filter(
    (t) => t.type !== 'system' || t.label.includes('结算') || t.label.includes('开始')
  );

  const jumpToEvent = (index: number) => {
    const eventTime = keyEvents[index].timestamp;
    const frameIndex = replayData.findIndex((f) => f.time >= eventTime);
    if (frameIndex >= 0) {
      setCurrentFrame(frameIndex);
    }
  };

  if (!hasReplayData) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <StarField />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="font-orbitron text-2xl text-white mb-2">暂无复盘数据</h2>
            <p className="text-gray-400 mb-6">请先完成一局游戏</p>
            <button
              onClick={() => navigate('/')}
              className="btn-neon px-6 py-2"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = replayData[replayData.length - 1]?.time || 0;
  const progress = (currentFrame / (replayData.length - 1)) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 flex items-center justify-between bg-space-900/80 backdrop-blur-sm border-b border-neon-purple/20"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="font-orbitron text-xl text-neon-purple flex items-center gap-2">
                <BarChart2 size={24} />
                复盘分析
              </h1>
              <p className="text-xs text-gray-400">Review & Analysis</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/settlement')}
              className="px-4 py-2 rounded-lg border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            >
              返回结算
            </button>
          </div>
        </motion.header>

        <main className="container px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-glass p-4 mb-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentFrame(0)}
                className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={() => setCurrentFrame(Math.max(0, currentFrame - 30))}
                className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-neon-purple/20 border-2 border-neon-purple flex items-center justify-center text-neon-purple hover:bg-neon-purple/30 transition-colors"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button
                onClick={() => setCurrentFrame(Math.min(replayData.length - 1, currentFrame + 30))}
                className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
              >
                <SkipForward size={20} />
              </button>
              <button
                onClick={() => setCurrentFrame(replayData.length - 1)}
                className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
              >
                <SkipForward size={20} />
              </button>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-400">速度:</span>
                {[0.5, 1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-neon-purple/30 border border-neon-purple text-neon-purple'
                        : 'border border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <div className="ml-auto font-mono text-neon-cyan">
                {formatTime(frame?.time || 0)} / {formatTime(totalTime)}
              </div>
            </div>

            <div className="relative">
              <input
                type="range"
                min={0}
                max={replayData.length - 1}
                value={currentFrame}
                onChange={(e) => setCurrentFrame(Number(e.target.value))}
                className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-neon-purple"
              />
              <div
                className="absolute top-0 h-2 bg-neon-purple/30 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>

            {keyEvents.length > 0 && (
              <div className="relative h-6 mt-1">
                {keyEvents.map((event, idx) => {
                  const eventProgress = (event.timestamp / totalTime) * 100;
                  return (
                    <button
                      key={event.id}
                      onClick={() => jumpToEvent(idx)}
                      className={`absolute top-2 w-3 h-3 rounded-full transform -translate-x-1/2 transition-transform hover:scale-150 ${
                        event.color.includes('red') ? 'bg-neon-red' :
                        event.color.includes('yellow') ? 'bg-neon-yellow' :
                        event.color.includes('green') ? 'bg-neon-green' : 'bg-neon-cyan'
                      }`}
                      style={{ left: `${eventProgress}%` }}
                      title={`${formatTime(event.timestamp)}: ${event.label}`}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-3">当前帧状态</h3>
              {frame && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-space-700/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Delta</div>
                      <div className="font-mono text-neon-cyan">{frame.greeks.delta.toFixed(4)}</div>
                    </div>
                    <div className="bg-space-700/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Gamma</div>
                      <div className="font-mono text-neon-purple">{frame.greeks.gamma.toFixed(6)}</div>
                    </div>
                    <div className="bg-space-700/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Vega</div>
                      <div className="font-mono text-neon-yellow">{frame.greeks.vega.toFixed(4)}</div>
                    </div>
                    <div className="bg-space-700/50 p-2 rounded">
                      <div className="text-gray-400 text-xs">Theta</div>
                      <div className="font-mono text-neon-red">{frame.greeks.theta.toFixed(4)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">标的价格</span>
                    <span className="font-mono text-neon-green">${frame.position.underlying.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">保证金比率</span>
                    <span className={`font-mono ${
                      frame.margin.ratio < 1.2 ? 'text-neon-red' :
                      frame.margin.ratio < 1.5 ? 'text-neon-yellow' : 'text-neon-green'
                    }`}>
                      {frame.margin.ratio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">飞船位置</span>
                    <span className="font-mono text-neon-cyan">{frame.ship.x.toFixed(1)}, {frame.ship.y.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="panel-glass p-4 lg:col-span-2"
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-3">关键事件时间线</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {keyEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      frame && frame.time >= event.timestamp
                        ? 'bg-space-700/50'
                        : 'opacity-50'
                    } hover:bg-space-700/30`}
                    onClick={() => jumpToEvent(index)}
                  >
                    <span className="font-mono text-xs text-gray-400 w-16">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className={event.color}>{event.label}</span>
                    {event.delayed && (
                      <span className="text-xs text-neon-purple bg-neon-purple/20 px-2 py-0.5 rounded">
                        延迟
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-3">Delta 变化曲线</h3>
              <div className="h-48">
                <Line
                  data={getChartData('deltaHistory', 'Delta', '#00f5ff')}
                  options={chartOptions}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-purple mb-3">Gamma 变化曲线</h3>
              <div className="h-48">
                <Line
                  data={getChartData('gammaHistory', 'Gamma', '#aa66ff')}
                  options={chartOptions}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-yellow mb-3">Vega 变化曲线</h3>
              <div className="h-48">
                <Line
                  data={getChartData('vegaHistory', 'Vega', '#ffaa00')}
                  options={chartOptions}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-red mb-3">Theta 变化曲线</h3>
              <div className="h-48">
                <Line
                  data={getChartData('thetaHistory', 'Theta', '#ff3366')}
                  options={chartOptions}
                />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-3">事件处理统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">事件总数</span>
                  <span className="font-mono text-white text-xl">{events.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">已处理</span>
                  <span className="font-mono text-neon-green text-xl">
                    {events.filter(e => e.handled).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">未处理</span>
                  <span className="font-mono text-neon-red text-xl">
                    {events.filter(e => !e.handled).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">信息冲突次数</span>
                  <span className="font-mono text-neon-yellow text-xl">{conflicts.length}</span>
                </div>
                <div className="w-full bg-space-700 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-green to-neon-cyan transition-all"
                    style={{
                      width: `${events.length > 0 ? (events.filter(e => e.handled).length / events.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="panel-glass p-4"
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-3">决策分析</h3>
              <div className="space-y-3">
                {events.filter(e => e.handled && e.correctResponse !== undefined).map((event) => {
                  const correct = event.playerResponse === event.correctResponse;
                  const responseTime = event.handledAt ? event.handledAt - event.timestamp : 0;
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border ${correct ? 'border-neon-green/30 bg-neon-green/5' : 'border-neon-red/30 bg-neon-red/5'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">
                          {correct ? '✅' : '❌'} {event.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        响应时间: {responseTime.toFixed(1)}秒 | 
                        你的选择: {event.playerResponse} | 
                        正确: {event.correctResponse}
                      </div>
                    </div>
                  );
                })}
                {events.filter(e => e.handled && e.correctResponse !== undefined).length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    暂无决策分析数据
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
