import React, { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Zap } from 'lucide-react';
import SimulationVisualization from '../components/features/SimulationVisualization';
import WaitDistributionChart from '../components/charts/WaitDistributionChart';
import StatCard from '../components/ui/StatCard';
import { useSimulationStore, simulationEngine } from '../engines/SimulationEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Simulation: React.FC = () => {
  const {
    config,
    result,
    isRunning,
    currentTime,
    playbackSpeed,
    isPaused,
    setConfig,
    setIsRunning,
    setCurrentTime,
    setPlaybackSpeed,
    setIsPaused,
    resetSimulation,
  } = useSimulationStore();

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const handleRunSimulation = useCallback(() => {
    const simResult = simulationEngine.run(config);
    setIsRunning(true);
    setIsPaused(false);
    setCurrentTime(0);
    lastTimeRef.current = performance.now();
  }, [config, setIsRunning, setIsPaused, setCurrentTime]);

  useEffect(() => {
    if (!isRunning || isPaused || !result) return;

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const newTime = currentTime + delta * playbackSpeed * 60;

      if (newTime >= config.simulationDuration) {
        setCurrentTime(config.simulationDuration);
        setIsRunning(false);
        return;
      }

      setCurrentTime(newTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused, currentTime, playbackSpeed, config.simulationDuration, result, setCurrentTime, setIsRunning]);

  const handlePlayPause = () => {
    if (!result) {
      handleRunSimulation();
    } else {
      setIsPaused(!isPaused);
      if (isPaused) {
        lastTimeRef.current = performance.now();
        setIsRunning(true);
      }
    }
  };

  const handleReset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    resetSimulation();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (!result) {
      simulationEngine.run(config);
    }
  };

  const handleConfigChange = (key: keyof typeof config, value: number) => {
    setConfig({ [key]: value });
    if (result) {
      handleReset();
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const configItems = [
    { key: 'arrivalRate' as const, label: '到达率', unit: '人/分钟', min: 0.5, max: 10, step: 0.1 },
    { key: 'avgServiceTime' as const, label: '平均服务时长', unit: '分钟', min: 1, max: 30, step: 1 },
    { key: 'serviceTimeStd' as const, label: '服务时长标准差', unit: '分钟', min: 0, max: 15, step: 0.5 },
    { key: 'windowCount' as const, label: '窗口数量', unit: '个', min: 1, max: 10, step: 1 },
    { key: 'noShowRate' as const, label: '爽约率', unit: '%', min: 0, max: 30, step: 1, displayMultiplier: 100 },
    { key: 'simulationDuration' as const, label: '模拟时长', unit: '分钟', min: 60, max: 600, step: 30 },
  ];

  const speedOptions = [0.5, 1, 2, 4, 8];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">排队模拟</h1>
          <p className="text-sm text-neutral-500 mt-1">
            基于随机过程模型模拟排队过程，分析等待时长和队列长度
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Settings size={18} className="text-primary-500" />
              模拟参数
            </h3>

            <div className="space-y-5">
              {configItems.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-600">{item.label}</span>
                    <span className="font-medium text-primary-600">
                      {item.displayMultiplier
                        ? (config[item.key] * item.displayMultiplier).toFixed(0)
                        : config[item.key]}
                      {item.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={config[item.key]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleConfigChange(
                        item.key,
                        item.displayMultiplier ? val / item.displayMultiplier : val
                      );
                    }}
                    disabled={isRunning}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-xs text-neutral-400 mt-1">
                    <span>{item.min}</span>
                    <span>{item.max}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100">
              <div className="text-sm text-neutral-600 mb-2">播放速度</div>
              <div className="flex gap-1">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <SimulationVisualization
            events={result?.timeline || []}
            config={config}
            currentTime={currentTime}
            isRunning={isRunning && !isPaused}
            windowCount={config.windowCount}
          />

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-serif">
                  {formatTime(currentTime)}
                </span>
                <span className="text-neutral-400">/</span>
                <span className="text-neutral-500">{formatTime(config.simulationDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="btn-secondary flex items-center gap-2"
                  title="重置"
                >
                  <RotateCcw size={16} />
                  重置
                </button>
                <button
                  onClick={handlePlayPause}
                  className="btn-primary flex items-center gap-2"
                >
                  {!result || (!isRunning && currentTime === 0) ? (
                    <>
                      <Zap size={16} />
                      开始模拟
                    </>
                  ) : isPaused || !isRunning ? (
                    <>
                      <Play size={16} />
                      {currentTime >= config.simulationDuration ? '重新播放' : '继续'}
                    </>
                  ) : (
                    <>
                      <Pause size={16} />
                      暂停
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={config.simulationDuration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between text-xs text-neutral-400 mt-2">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i}>{formatTime((config.simulationDuration / 4) * i)}</span>
              ))}
            </div>
          </div>

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  title="平均等待"
                  value={result.avgWaitTime}
                  unit="分钟"
                  icon={<span className="text-xl">⏱️</span>}
                  color="primary"
                  delay={0}
                />
                <StatCard
                  title="最大等待"
                  value={result.maxWaitTime}
                  unit="分钟"
                  icon={<span className="text-xl">🔴</span>}
                  color="danger"
                  delay={50}
                />
                <StatCard
                  title="平均队列"
                  value={result.avgQueueLength}
                  unit="人"
                  icon={<span className="text-xl">👥</span>}
                  color="warning"
                  delay={100}
                />
                <StatCard
                  title="最大队列"
                  value={result.maxQueueLength}
                  unit="人"
                  icon={<span className="text-xl">📊</span>}
                  color="warning"
                  delay={150}
                />
                <StatCard
                  title="窗口利用"
                  value={result.windowUtilization}
                  unit="%"
                  icon={<span className="text-xl">🪟</span>}
                  color="success"
                  delay={200}
                />
                <StatCard
                  title="超时率"
                  value={result.timeoutRate}
                  unit="%"
                  icon={<span className="text-xl">⚠️</span>}
                  color="danger"
                  delay={250}
                />
              </div>

              <div className="card">
                <h3 className="font-semibold text-neutral-800 mb-4">等待时长分布</h3>
                <WaitDistributionChart simulationResult={result} height={300} />
              </div>
            </>
          )}

          {!result && (
            <div className="card border-2 border-dashed border-neutral-200 py-16 text-center">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold text-neutral-700 mb-2">准备开始模拟</h3>
              <p className="text-neutral-500 mb-4">
                调整左侧参数，然后点击"开始模拟"按钮运行排队过程模拟
              </p>
              <button onClick={handleRunSimulation} className="btn-primary inline-flex items-center gap-2">
                <Zap size={16} />
                开始模拟
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulation;
