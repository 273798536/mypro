import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { gameLoop } from '../../engine/GameEngine';
import { MapRenderer } from './MapRenderer';
import { StatusBar } from './StatusBar';
import { DispatchPanel } from './DispatchPanel';
import { EventPanel } from './EventPanel';
import { AnomalyAlert } from './AnomalyAlert';
import { RerouteModal } from './RerouteModal';
import { Route } from '../../types';
import { Panel } from '../common/Panel';
import { Route as RouteIcon, AlertTriangle, List, BarChart3 } from 'lucide-react';

type TabType = 'dispatch' | 'events' | 'log' | 'stats';

export const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { status, initGame, level, saveHistory } = useGameStore();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dispatch');
  const [rerouteModalRoute, setRerouteModalRoute] = useState<Route | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (level === 0) {
      initGame(1);
    }
  }, [level, initGame]);

  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }
    const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    gameLoop(deltaTime);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (status === 'playing') {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, animate]);

  useEffect(() => {
    if (status === 'ended') {
      saveHistory();
      navigate('/result');
    }
  }, [status, navigate, saveHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const { status, pauseGame, resumeGame } = useGameStore.getState();
        if (status === 'playing') {
          pauseGame();
        } else if (status === 'paused') {
          resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dispatch', label: '调度', icon: <RouteIcon size={16} /> },
    { id: 'events', label: '事件', icon: <AlertTriangle size={16} /> },
    { id: 'log', label: '日志', icon: <List size={16} /> },
    { id: 'stats', label: '统计', icon: <BarChart3 size={16} /> },
  ];

  const { actionLog, stats, anomalies, scoreBreakdown } = useGameStore();

  return (
    <div className="h-screen flex flex-col bg-dispatch-bg">
      <StatusBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4">
          <MapRenderer
            selectedRouteId={selectedRouteId || undefined}
            onRouteClick={(route) => setSelectedRouteId(route.id)}
          />
        </div>

        <div className="w-96 border-l border-dispatch-border flex flex-col">
          <div className="flex border-b border-dispatch-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-xs font-mono flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-dispatch-primary text-white'
                    : 'text-dispatch-text-muted hover:text-dispatch-text hover:bg-dispatch-panel'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'events' && (
                  <span className="bg-dispatch-danger text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {anomalies.filter((a) => !a.resolved).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'dispatch' && (
              <DispatchPanel
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onEnterRerouteMode={setRerouteModalRoute}
              />
            )}

            {activeTab === 'events' && <EventPanel />}

            {activeTab === 'log' && (
              <div className="space-y-2">
                <div className="text-sm text-dispatch-text-muted mb-3">操作日志</div>
                {actionLog.length > 0 ? (
                  actionLog.slice().reverse().map((action) => (
                    <div
                      key={action.id}
                      className="bg-dispatch-bg border border-dispatch-border rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-dispatch-primary">
                          {action.type}
                        </span>
                        <span className="text-xs text-dispatch-text-muted">
                          {Math.floor(action.timestamp / 60)}:{(action.timestamp % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="text-dispatch-text">{action.description}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-dispatch-text-muted text-sm">
                    暂无操作记录
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4">
                <Panel title="运营统计">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dispatch-text-muted">总到站次数</span>
                      <span className="font-mono">{stats.totalArrivals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dispatch-text-muted">准点到站</span>
                      <span className="font-mono text-dispatch-success">{stats.onTimeArrivals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dispatch-text-muted">服务站点</span>
                      <span className="font-mono">{stats.totalStopsServed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dispatch-text-muted">服务乘客</span>
                      <span className="font-mono">{stats.totalPassengersServed}</span>
                    </div>
                  </div>
                </Panel>

                <Panel title="当前评分">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-dispatch-text-muted">准点率</span>
                      <span className="font-mono">
                        {scoreBreakdown.punctuality.score}/{scoreBreakdown.punctuality.maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dispatch-text-muted">覆盖率</span>
                      <span className="font-mono">
                        {scoreBreakdown.coverage.score}/{scoreBreakdown.coverage.maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dispatch-text-muted">满意度</span>
                      <span className="font-mono">
                        {scoreBreakdown.satisfaction.score}/{scoreBreakdown.satisfaction.maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dispatch-text-muted">效率</span>
                      <span className="font-mono">
                        {scoreBreakdown.efficiency.score}/{scoreBreakdown.efficiency.maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dispatch-text-muted">响应速度</span>
                      <span className="font-mono">
                        {scoreBreakdown.response.score}/{scoreBreakdown.response.maxScore}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-dispatch-border flex justify-between items-center">
                      <span className="text-dispatch-danger">扣分合计</span>
                      <span className="font-mono text-dispatch-danger">-{scoreBreakdown.penalties.total}</span>
                    </div>
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnomalyAlert />

      {rerouteModalRoute && (
        <RerouteModal
          route={rerouteModalRoute}
          onClose={() => setRerouteModalRoute(null)}
        />
      )}

      {status === 'paused' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-dispatch-panel border border-dispatch-border rounded-xl p-8 text-center">
            <h2 className="text-2xl font-mono font-bold mb-4">游戏暂停</h2>
            <p className="text-dispatch-text-muted mb-6">按空格键或点击按钮继续游戏</p>
            <button
              onClick={() => useGameStore.getState().resumeGame()}
              className="px-8 py-3 bg-dispatch-success hover:bg-emerald-600 text-white rounded-lg font-mono transition-colors"
            >
              继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
