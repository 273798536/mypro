import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Factory, Award, AlertTriangle, FileText } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { StatusPanel } from '@/components/StatusPanel';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { StepTimeline } from '@/components/StepTimeline';
import { PlaybackControls } from '@/components/PlaybackControls';
import { ImpactAnalysis } from '@/components/ImpactAnalysis';
import { SolidOfRevolution } from '@/components/SolidOfRevolution';
import { FunctionCanvas } from '@/components/FunctionCanvas';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSession, resetGame, startNewGame } = useGameStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedStepId, setHighlightedStepId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'overview' | 'replay' | 'analysis'>('overview');

  useEffect(() => {
    if (!currentSession || currentSession.status !== 'completed') {
      navigate('/');
    }
  }, [currentSession, navigate]);

  useEffect(() => {
    if (currentSession?.steps && currentSession.steps.length > 0) {
      setCurrentStepIndex(currentSession.steps.length - 1);
    }
  }, [currentSession]);

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-factory-bg flex items-center justify-center">
        <p className="text-factory-muted">加载中...</p>
      </div>
    );
  }

  const handlePlayAgain = () => {
    resetGame();
    startNewGame();
    navigate('/');
  };

  const handleBackToHome = () => {
    resetGame();
    navigate('/');
  };

  const handleStepClick = (stepId: string) => {
    setHighlightedStepId(stepId);
    const index = currentSession.steps.findIndex((s) => s.id === stepId);
    if (index >= 0) {
      setCurrentStepIndex(index);
      setIsPlaying(false);
    }
  };

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-primary-500';
      case 'C': return 'bg-warning-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-danger-500';
    }
  };

  const formatDuration = (start: number, end?: number) => {
    if (!end) return '-';
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  const hasAnomalies = currentSession.anomalies.length > 0;
  const normalSteps = currentSession.steps.filter(
    (s) => !currentSession.anomalies.some((a) => a.stepId === s.id)
  );

  return (
    <div className="min-h-screen bg-factory-bg">
      <header className="border-b border-factory-border bg-factory-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToHome}
                className="factory-btn p-2 flex items-center gap-2 text-sm"
              >
                <ArrowLeft size={16} />
                返回
              </button>
              <div className="h-6 w-px bg-factory-border mx-2" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Factory className="text-primary-400" size={24} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-factory-text font-mono">
                    结算报告
                  </h1>
                  <p className="text-xs text-factory-muted">
                    {currentSession.gameFunction.displayName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <div className="text-xs text-factory-muted">用时</div>
                <div className="font-mono text-sm text-factory-text">
                  {formatDuration(currentSession.startTime, currentSession.endTime)}
                </div>
              </div>
              <div className={`w-16 h-16 rounded-xl ${getGradeBadgeColor(currentSession.result?.grade || 'F')} flex items-center justify-center`}>
                <span className="text-3xl font-bold text-white font-mono">
                  {currentSession.result?.grade || '-'}
                </span>
              </div>
              <button
                onClick={handlePlayAgain}
                className="factory-btn-primary flex items-center gap-2"
              >
                <RefreshCw size={16} />
                再来一局
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-factory-border bg-factory-panel/30">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '成绩总览', icon: FileText },
              { id: 'replay', label: '步骤回放', icon: Award },
              { id: 'analysis', label: '影响分析', icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary-400 border-primary-500 bg-primary-500/10'
                    : 'text-factory-muted border-transparent hover:text-factory-text hover:bg-factory-border/20'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {hasAnomalies && (
              <div className="anomaly-alert">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="text-danger-400" size={20} />
                  <h4 className="font-bold text-danger-200">
                    检测到 {currentSession.anomalies.length} 项异常操作
                  </h4>
                </div>
                <p className="text-sm text-danger-200">
                  这些异常已被记入异常清单，影响了你的最终得分。请查看下方详细分析了解错误原因。
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="factory-panel p-5">
                  <h3 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
                    <Award size={16} className="text-primary-400" />
                    最终成果展示
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-factory-muted mb-2 text-center">2D 曲线与切片</p>
                      <FunctionCanvas
                        expr={currentSession.gameFunction.expr}
                        interval={currentSession.playerInput.interval!}
                        selectedAxis={currentSession.playerInput.selectedAxis!}
                        showAxis={true}
                        showErrorBars={true}
                        sliceCount={currentSession.playerInput.sliceCount!}
                        width={380}
                        height={280}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-factory-muted mb-2 text-center">3D 旋转体</p>
                      <SolidOfRevolution
                        expr={currentSession.gameFunction.expr}
                        interval={currentSession.playerInput.interval!}
                        axis={currentSession.playerInput.selectedAxis!}
                        sliceCount={currentSession.playerInput.sliceCount!}
                        showSlices={true}
                        showSolid={true}
                        width={380}
                        height={280}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hasAnomalies && (
                    <div className="factory-panel p-5 border-danger-500/50">
                      <h4 className="text-sm font-bold text-danger-400 mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        异常清单
                        <span className="ml-auto text-xs bg-danger-500/20 px-2 py-0.5 rounded">
                          {currentSession.anomalies.length} 项
                        </span>
                      </h4>
                      <AnomalyAlert anomalies={currentSession.anomalies} />
                    </div>
                  )}

                  <div className="factory-panel p-5">
                    <h4 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-green-400" />
                      正常操作明细
                      <span className="ml-auto text-xs bg-green-500/20 px-2 py-0.5 rounded text-green-300">
                        {normalSteps.length} 步
                      </span>
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {normalSteps.map((step, index) => (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 bg-factory-bg rounded-lg border border-factory-border"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-factory-text">{step.description}</p>
                            <span className="text-xs font-mono text-green-400 font-bold">
                              +{step.scoreImpact}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <StatusPanel
                  result={currentSession.result}
                  correctVolume={currentSession.gameFunction.correctVolume}
                />

                <div className="factory-panel p-5">
                  <h4 className="text-sm font-bold text-factory-text mb-4">操作概览</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-factory-muted">旋转轴</span>
                      <span className={`font-mono font-bold ${
                        currentSession.anomalies.some((a) => a.type === 'axis_confusion')
                          ? 'text-danger-400 line-through'
                          : 'text-green-400'
                      }`}>
                        {currentSession.playerInput.selectedAxis?.toUpperCase()}轴
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-factory-muted">积分区间</span>
                      <span className={`font-mono font-bold ${
                        currentSession.anomalies.some((a) => a.type === 'interval_reverse')
                          ? 'text-danger-400 line-through'
                          : 'text-green-400'
                      }`}>
                        [{currentSession.playerInput.interval?.[0]}, {currentSession.playerInput.interval?.[1]}]
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-factory-muted">切片数量</span>
                      <span className={`font-mono font-bold ${
                        currentSession.anomalies.some((a) => a.type === 'insufficient_slices')
                          ? 'text-danger-400 line-through'
                          : 'text-green-400'
                      }`}>
                        {currentSession.playerInput.sliceCount} 片
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'replay' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <PlaybackControls
                  session={currentSession}
                  currentStepIndex={currentStepIndex}
                  onStepChange={setCurrentStepIndex}
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                />

                <StepTimeline
                  steps={currentSession.steps}
                  anomalies={currentSession.anomalies}
                  highlightStepId={highlightedStepId}
                  onStepClick={handleStepClick}
                />
              </div>

              <div className="space-y-6">
                <div className="factory-panel p-5">
                  <h4 className="text-sm font-bold text-factory-text mb-4">回放提示</h4>
                  <div className="space-y-3 text-sm text-factory-muted">
                    <p>• 点击播放按钮自动回放所有步骤</p>
                    <p>• 拖动进度条或点击步骤点快速跳转</p>
                    <p>• 橙色标记表示触发模拟的关键节点</p>
                    <p>• 红色标记表示存在异常的操作</p>
                    <p>• 调整播放速度可加快或放慢回放</p>
                  </div>
                </div>

                <div className="factory-panel p-5">
                  <h4 className="text-sm font-bold text-factory-text mb-4">关键节点</h4>
                  <div className="space-y-2">
                    {currentSession.steps
                      .filter((s) => s.isSimulationTrigger)
                      .map((step) => (
                        <div
                          key={step.id}
                          className="p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg cursor-pointer hover:bg-warning-500/20 transition-colors"
                          onClick={() => handleStepClick(step.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-warning-500" />
                            <span className="text-sm text-warning-200">{step.description}</span>
                          </div>
                        </div>
                      ))}
                    {currentSession.anomalies.map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg cursor-pointer hover:bg-danger-500/20 transition-colors"
                        onClick={() => handleStepClick(anomaly.stepId)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-danger-500" />
                          <span className="text-sm text-danger-200">{anomaly.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <ImpactAnalysis session={currentSession} />
            
            <div className="space-y-6">
              <StatusPanel
                result={currentSession.result}
                correctVolume={currentSession.gameFunction.correctVolume}
              />
              
              <div className="factory-panel p-5">
                <h4 className="text-sm font-bold text-factory-text mb-4">知识点总结</h4>
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <h5 className="font-bold text-primary-300 mb-1">旋转体体积公式</h5>
                    <p className="text-factory-text font-mono text-xs">
                      绕X轴 (圆盘法): V = π∫[a,b] f(x)² dx
                    </p>
                    <p className="text-factory-text font-mono text-xs mt-1">
                      绕Y轴 (圆柱壳法): V = 2π∫[a,b] x·f(x) dx
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h5 className="font-bold text-green-300 mb-1">数值积分原理</h5>
                    <p className="text-factory-text text-xs">
                      Riemann和将积分区间分割为n个薄片，
                      每个薄片近似为圆柱体，体积之和逼近真实值。
                      切片数越多，误差越小。
                    </p>
                  </div>

                  <div className="p-3 bg-factory-bg border border-factory-border rounded-lg">
                    <h5 className="font-bold text-factory-text mb-1">常见错误</h5>
                    <ul className="text-xs text-factory-muted space-y-1">
                      <li>• 混淆旋转轴导致使用错误的积分公式</li>
                      <li>• 积分上下限顺序颠倒</li>
                      <li>• 切片数量不足导致计算精度不够</li>
                      <li>• 忘记乘以π或2π</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
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
