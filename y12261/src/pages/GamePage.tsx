import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Factory } from 'lucide-react';
import { useGameStore, useAnomalies, useSteps } from '@/store/gameStore';
import { StepIndicator } from '@/components/StepIndicator';
import { FunctionCanvas } from '@/components/FunctionCanvas';
import { SolidOfRevolution } from '@/components/SolidOfRevolution';
import { ControlPanel } from '@/components/ControlPanel';
import { StatusPanel } from '@/components/StatusPanel';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { StepTimeline } from '@/components/StepTimeline';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const currentSession = useGameStore((state) => state.currentSession);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const currentPhase = currentSession?.currentPhase || 'function';
  const anomalies = useAnomalies();
  const steps = useSteps();

  useEffect(() => {
    if (currentSession?.status === 'completed') {
      navigate('/result');
    }
  }, [currentSession?.status, navigate]);

  const handleStartGame = () => {
    startNewGame();
  };

  const hasSession = currentSession !== null;
  const showAxis = currentPhase !== 'function' && currentPhase !== 'axis';
  const showErrorBars = currentPhase !== 'function' && currentPhase !== 'axis' && currentPhase !== 'interval';

  const displayInterval = currentSession?.playerInput.interval || currentSession?.gameFunction.correctInterval || [0, 2];

  return (
    <div className="min-h-screen bg-factory-bg">
      <header className="border-b border-factory-border bg-factory-panel/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Factory className="text-primary-400" size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-factory-text font-mono">
                  微积分切片工厂
                </h1>
                <p className="text-xs text-factory-muted">
                  旋转体体积交互式学习工具
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {hasSession && (
                <div className="text-right">
                  <div className="text-xs text-factory-muted">当前函数</div>
                  <div className="font-mono text-sm text-primary-400">
                    {currentSession?.gameFunction.displayName}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {hasSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <StepIndicator currentPhase={currentPhase} />
          </motion.div>
        )}

        <AnimatePresence>
          {anomalies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mb-6"
            >
              <AnomalyAlert anomalies={anomalies} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {hasSession && currentSession && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="factory-panel p-5"
                >
                  <h3 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-primary-400" />
                    函数曲线可视化
                  </h3>
                  <div className="flex justify-center">
                    <FunctionCanvas
                      expr={currentSession.gameFunction.expr}
                      interval={displayInterval}
                      selectedAxis={currentSession.playerInput.selectedAxis}
                      showAxis={showAxis}
                      showErrorBars={showErrorBars}
                      sliceCount={currentSession.playerInput.sliceCount}
                      width={600}
                      height={380}
                    />
                  </div>
                </motion.div>

                {currentPhase === 'simulation' || currentPhase === 'result' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="factory-panel p-5"
                  >
                    <h3 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
                      <Layers size={16} className="text-warning-500" />
                      旋转体 3D 可视化
                    </h3>
                    <div className="flex justify-center">
                      <SolidOfRevolution
                        expr={currentSession.gameFunction.expr}
                        interval={currentSession.playerInput.interval!}
                        axis={currentSession.playerInput.selectedAxis!}
                        sliceCount={currentSession.playerInput.sliceCount!}
                        showSlices={true}
                        showSolid={true}
                        width={600}
                        height={380}
                      />
                    </div>
                    <p className="text-xs text-factory-muted text-center mt-3">
                      拖拽旋转查看三维模型 · 滚轮缩放
                    </p>
                  </motion.div>
                ) : null}

                {steps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <StepTimeline steps={steps} anomalies={anomalies} />
                  </motion.div>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <ControlPanel
              currentPhase={currentPhase}
              onStartGame={handleStartGame}
              hasSession={hasSession}
            />

            {hasSession && currentSession && (
              <StatusPanel
                result={currentSession.result}
                correctVolume={currentSession.gameFunction.correctVolume}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-factory-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-factory-muted">
            微积分切片工厂 · 让旋转体体积学习更直观
          </p>
        </div>
      </footer>
    </div>
  );
};
