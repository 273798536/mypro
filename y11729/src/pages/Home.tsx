import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target } from 'lucide-react';
import {
  DEFAULT_PARAMS,
  runSimulation,
  validateParams,
  type SimulationParams,
  type TrajectoryPoint,
  type SimulationMetrics,
  type Warning,
  type IntegrationStep,
} from '../physics';
import { saveToHistory, type HistoryItem } from '../utils/storage';
import { ParamControlPanel } from '../components/ParamControlPanel';
import { TrajectoryCanvas } from '../components/TrajectoryCanvas';
import { AnimationControl } from '../components/AnimationControl';
import { ReportPanel } from '../components/ReportPanel';
import { ProcessPanel } from '../components/ProcessPanel';
import { HistoryPanel } from '../components/HistoryPanel';

const Home: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

  const [noDragTrajectory, setNoDragTrajectory] = useState<TrajectoryPoint[]>([]);
  const [withDragTrajectory, setWithDragTrajectory] = useState<TrajectoryPoint[]>([]);
  const [integrationSteps, setIntegrationSteps] = useState<IntegrationStep[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [simulationWarnings, setSimulationWarnings] = useState<Warning[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [showNoDrag, setShowNoDrag] = useState(true);
  const [showWithDrag, setShowWithDrag] = useState(true);

  const validation = validateParams(params);

  const handleRunSimulation = useCallback(() => {
    if (!validation.isValid) return;

    const result = runSimulation(params);

    setNoDragTrajectory(result.noDragTrajectory);
    setWithDragTrajectory(result.withDragTrajectory);
    setIntegrationSteps(result.integrationSteps);
    setMetrics(result.metrics);
    setSimulationWarnings(result.warnings);
    setAnimationProgress(0);
    setIsPlaying(false);

    saveToHistory({
      params,
      metrics: result.metrics,
      warnings: result.warnings,
    });
  }, [params, validation.isValid]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const maxTrajectoryLength = Math.max(noDragTrajectory.length, withDragTrajectory.length);
    if (maxTrajectoryLength === 0) {
      setIsPlaying(false);
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const baseDuration = 3000;
      const duration = baseDuration / animationSpeed;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      setAnimationProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    startTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animationSpeed, noDragTrajectory.length, withDragTrajectory.length]);

  const handlePlayPause = () => {
    if (metrics) {
      if (animationProgress >= 1) {
        setAnimationProgress(0);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetAnimation = () => {
    setIsPlaying(false);
    setAnimationProgress(0);
    startTimeRef.current = 0;
  };

  const handleProgressChange = (progress: number) => {
    setIsPlaying(false);
    setAnimationProgress(progress);
  };

  const getCurrentTime = () => {
    const maxLen = Math.max(noDragTrajectory.length, withDragTrajectory.length);
    if (maxLen === 0) return 0;
    const idx = Math.floor(animationProgress * (maxLen - 1));
    const traj = noDragTrajectory.length > 0 ? noDragTrajectory : withDragTrajectory;
    return traj[Math.min(idx, traj.length - 1)]?.time || 0;
  };

  const getTotalTime = () => {
    if (!metrics) return 0;
    return Math.max(metrics.timeOfFlight.noDrag, metrics.timeOfFlight.withDrag);
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setParams(item.params);
    handleRunSimulation();
  };

  const allWarnings = [...validation.warnings, ...simulationWarnings];
  const hasErrors = validation.errors.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <HistoryPanel onLoadSimulation={handleLoadHistory} />

      <header className="py-4 px-6 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">射箭弹道空气阻力对比</h1>
              <p className="text-xs text-gray-400">可视化物理模拟工具</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-400">无空气阻力</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-400">有空气阻力</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div className="h-[calc(100vh-140px)]">
                <ParamControlPanel
                  params={params}
                  onChange={setParams}
                  onRunSimulation={handleRunSimulation}
                  validationWarnings={[...validation.errors, ...validation.warnings]}
                  hasErrors={hasErrors}
                />
              </div>
            </div>

            <div className="col-span-6 flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <div className="h-[calc(100vh-280px)]">
                  <TrajectoryCanvas
                    noDragTrajectory={noDragTrajectory}
                    withDragTrajectory={withDragTrajectory}
                    metrics={metrics}
                    targetDistance={params.targetDistance}
                    animationProgress={animationProgress}
                    showNoDrag={showNoDrag}
                    showWithDrag={showWithDrag}
                    isExtrapolated={metrics?.isExtrapolated || false}
                  />
                </div>
              </div>

              {metrics && (
                <AnimationControl
                  isPlaying={isPlaying}
                  animationProgress={animationProgress}
                  currentTime={getCurrentTime()}
                  totalTime={getTotalTime()}
                  speed={animationSpeed}
                  onPlayPause={handlePlayPause}
                  onReset={handleResetAnimation}
                  onProgressChange={handleProgressChange}
                  onSpeedChange={setAnimationSpeed}
                />
              )}

              <ProcessPanel integrationSteps={integrationSteps} />
            </div>

            <div className="col-span-3">
              <div className="h-[calc(100vh-140px)]">
                <ReportPanel
                  params={params}
                  metrics={metrics}
                  noDragTrajectory={noDragTrajectory}
                  withDragTrajectory={withDragTrajectory}
                  warnings={allWarnings}
                  showNoDrag={showNoDrag}
                  showWithDrag={showWithDrag}
                  onToggleNoDrag={() => setShowNoDrag(!showNoDrag)}
                  onToggleWithDrag={() => setShowWithDrag(!showWithDrag)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
