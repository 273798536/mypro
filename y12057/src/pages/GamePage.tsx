import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Database } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameMap } from '../components/game/GameMap';
import { MonitorPanel } from '../components/game/MonitorPanel';
import { DeploymentPanel } from '../components/game/DeploymentPanel';
import { ControlBar } from '../components/game/ControlBar';
import { EventNotification } from '../components/game/EventNotification';
import { DataSourcePanel } from '../components/common/DataSourcePanel';
import type { Deployment, GameEvent, SecurityUnitType } from '../engine/types';

export default function GamePage() {
  const navigate = useNavigate();
  const { mapId } = useParams();
  
  const { state, initializeGame, addDeployment, removeDeployment, resolveEvent, availableDataSources, getDataSourceById } = useGameStore();
  const { isRunning } = useGameLoop();
  
  const [selectedUnitType, setSelectedUnitType] = useState<SecurityUnitType>('fixed_post');
  const [selectedCount, setSelectedCount] = useState(1);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [dataSourcePanelOpen, setDataSourcePanelOpen] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<ReturnType<typeof getDataSourceById> | null>(null);

  useEffect(() => {
    initializeGame(mapId);
  }, [initializeGame, mapId]);

  const handleMapClick = useCallback((x: number, y: number) => {
    if (!state || state.status === 'finished') return;
    addDeployment(selectedUnitType, x, y, selectedCount);
  }, [state, selectedUnitType, selectedCount, addDeployment]);

  const handleDeploymentClick = useCallback((deployment: Deployment) => {
    setSelectedDeploymentId(deployment.id === selectedDeploymentId ? null : deployment.id);
    setSelectedEventId(null);
  }, [selectedDeploymentId]);

  const handleEventClick = useCallback((event: GameEvent) => {
    setSelectedEventId(event.id === selectedEventId ? null : event.id);
    setSelectedDeploymentId(null);
  }, [selectedEventId]);

  const handleRemoveDeployment = useCallback(() => {
    if (selectedDeploymentId) {
      removeDeployment(selectedDeploymentId);
      setSelectedDeploymentId(null);
    }
  }, [selectedDeploymentId, removeDeployment]);

  const handleResolveEvent = useCallback((eventId: string, action: string) => {
    resolveEvent(eventId, action);
    setSelectedEventId(null);
  }, [resolveEvent]);

  const handleViewDataSource = useCallback((dataSourceId: string) => {
    const ds = getDataSourceById(dataSourceId);
    setCurrentDataSource(ds);
    setDataSourcePanelOpen(true);
  }, [getDataSourceById]);

  const handleGameEnd = useCallback(() => {
    if (state?.id) {
      navigate(`/result/${state.id}`);
    }
  }, [state?.id, navigate]);

  useEffect(() => {
    if (state?.status === 'finished') {
      const timer = setTimeout(handleGameEnd, 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.status, handleGameEnd]);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">加载中...</div>
      </div>
    );
  }

  const unresolvedEvents = state.events.filter(e => !e.resolved);
  const crowdDensity = state.snapshots[state.snapshots.length - 1]?.crowdDensity || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-cyan-400 tracking-wide">音乐节安保布阵</h1>
              <p className="text-xs text-slate-400">FESTIVAL SECURITY DEPLOYMENT</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">当前时间</div>
              <div className="text-lg font-mono font-bold text-cyan-300">
                {Math.floor(state.currentTime / 60)}:{String(Math.floor(state.currentTime % 60)).padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={() => setDataSourcePanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Database className="w-4 h-4 text-yellow-400" />
              <span className="text-sm">数据来源</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3 space-y-4">
            <MonitorPanel
              congestionIndex={state.congestionIndex}
              patrolCoverage={state.patrolCoverage}
              riskLevel={state.riskLevel}
              weather={state.weather}
              currentTime={state.currentTime}
              speed={state.speed}
              status={state.status}
            />

            <GameMap
              mapId={state.mapId}
              particles={state.crowdParticles}
              deployments={state.deployments}
              events={state.events}
              onMapClick={handleMapClick}
              onDeploymentClick={handleDeploymentClick}
              onEventClick={handleEventClick}
              selectedDeploymentId={selectedDeploymentId}
              selectedEventId={selectedEventId}
              isPaused={state.status === 'paused'}
              crowdDensity={crowdDensity}
            />

            <ControlBar
              status={state.status}
              speed={state.speed}
              onStart={useGameStore.getState().startGame}
              onPause={useGameStore.getState().pauseGame}
              onResume={useGameStore.getState().resumeGame}
              onRestart={() => useGameStore.getState().restartGame()}
              onEnd={useGameStore.getState().endGame}
              onSpeedChange={useGameStore.getState().setSpeed}
            />
          </div>

          <div className="space-y-4">
            <DeploymentPanel
              selectedUnitType={selectedUnitType}
              selectedCount={selectedCount}
              onUnitTypeChange={setSelectedUnitType}
              onCountChange={setSelectedCount}
              deployments={state.deployments}
              selectedDeploymentId={selectedDeploymentId}
              onRemoveDeployment={handleRemoveDeployment}
              disabled={state.status === 'finished'}
            />

            <AnimatePresence>
              {unresolvedEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    待处理事件 ({unresolvedEvents.length})
                  </h3>
                </motion.div>
              )}
            </AnimatePresence>

            {unresolvedEvents.length > 0 && (
              <EventNotification
                event={unresolvedEvents.find(e => e.id === selectedEventId) || unresolvedEvents[0]}
                onResolve={(action) => handleResolveEvent(
                  selectedEventId || unresolvedEvents[0].id, 
                  action
                )}
                onViewSource={handleViewDataSource}
                availableDataSources={availableDataSources}
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-800 rounded-2xl p-8 text-center max-w-md"
            >
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">任务完成</h2>
              <p className="text-slate-400 mb-6">正在生成评估报告...</p>
              <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataSourcePanel
        isOpen={dataSourcePanelOpen}
        onClose={() => setDataSourcePanelOpen(false)}
        dataSource={currentDataSource}
      />
    </div>
  );
}
