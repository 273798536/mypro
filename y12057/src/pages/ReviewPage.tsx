import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Database,
  Clock,
  AlertTriangle,
  Shield,
  Users,
  MapPin,
  Home,
  Award
} from 'lucide-react';
import { useReviewStore } from '../store/useReviewStore';
import { DataSourcePanel } from '../components/common/DataSourcePanel';
import type { GameSnapshot, GameEvent, Decision, DataSource } from '../engine/types';
import { severityToNumber } from '../engine/types';

const weatherLabels: Record<string, string> = {
  clear: '晴朗',
  cloudy: '多云',
  rain: '小雨',
  heavy_rain: '大雨',
  storm: '暴雨'
};

const riskColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-yellow-500',
  3: 'bg-orange-500',
  4: 'bg-red-500',
  5: 'bg-red-700'
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  
  const {
    gameState,
    snapshots,
    currentSnapshotIndex,
    isPlaying,
    playbackSpeed,
    selectedEventId,
    selectedDecisionId,
    isLoading,
    error,
    loadGame,
    setSnapshotIndex,
    togglePlayback,
    setPlaybackSpeed,
    selectEvent,
    selectDecision,
    getDataSource,
    reset
  } = useReviewStore();
  
  const [dataSourcePanelOpen, setDataSourcePanelOpen] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<DataSource | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    }
    return () => reset();
  }, [gameId, loadGame, reset]);

  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > 1000 / playbackSpeed) {
        lastUpdateRef.current = timestamp;
        
        if (currentSnapshotIndex < snapshots.length - 1) {
          setSnapshotIndex(currentSnapshotIndex + 1);
        } else {
          togglePlayback();
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSnapshotIndex, snapshots.length, playbackSpeed, setSnapshotIndex, togglePlayback]);

  const currentSnapshot = useMemo(() => 
    snapshots[currentSnapshotIndex] || null, 
    [snapshots, currentSnapshotIndex]
  );

  const chartData = useMemo(() => {
    return snapshots.map((s, i) => ({
      index: i,
      time: `${Math.floor(s.timestamp / 60)}:${String(Math.floor(s.timestamp % 60)).padStart(2, '0')}`,
      congestionIndex: Math.round(s.congestionIndex * 20),
      patrolCoverage: Math.round(s.patrolCoverage * 100),
      riskLevel: s.riskLevel * 20,
      activeEvents: s.activeEvents * 10,
      deploymentCount: s.deploymentCount * 5
    }));
  }, [snapshots]);

  const timelineItems = useMemo(() => {
    if (!gameState) return [];
    
    const items: Array<{
      type: 'event' | 'decision';
      timestamp: number;
      data: GameEvent | Decision;
    }> = [];
    
    gameState.events.forEach(e => {
      items.push({ type: 'event', timestamp: e.timestamp, data: e });
    });
    
    gameState.decisions.forEach(d => {
      items.push({ type: 'decision', timestamp: d.timestamp, data: d });
    });
    
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [gameState]);

  const currentTimelineItems = useMemo(() => {
    if (!currentSnapshot) return [];
    return timelineItems.filter(item => item.timestamp <= currentSnapshot.timestamp);
  }, [timelineItems, currentSnapshot]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleViewDataSource = useCallback(async (dataSourceId: string) => {
    const ds = await getDataSource(dataSourceId);
    setCurrentDataSource(ds || null);
    setDataSourcePanelOpen(true);
  }, [getDataSource]);

  const getDataSourceById = useCallback(async (id: string): Promise<DataSource | undefined> => {
    return getDataSource(id);
  }, [getDataSource]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSnapshotIndex(parseInt(e.target.value));
  }, [setSnapshotIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">加载复盘数据...</div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg">{error || '数据加载失败'}</div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  const selectedEvent = selectedEventId 
    ? gameState.events.find(e => e.id === selectedEventId) 
    : null;
    
  const selectedDecision = selectedDecisionId 
    ? gameState.decisions.find(d => d.id === selectedDecisionId) 
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-purple-400 tracking-wide">复盘分析</h1>
              <p className="text-xs text-slate-400">POST-MISSION REVIEW</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">回放时间</div>
              <div className="text-lg font-mono font-bold text-purple-300">
                {currentSnapshot ? formatTime(currentSnapshot.timestamp) : '0:00'}
                <span className="text-slate-500 text-sm"> / {formatTime(gameState.currentTime)}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/result/${gameId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
            >
              <Award className="w-4 h-4" />
              <span className="text-sm">查看报告</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full" />
            态势趋势图
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPatrol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={Math.floor(chartData.length / 8)}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="congestionIndex" 
                  name="拥堵指数" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#colorCongestion)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="patrolCoverage" 
                  name="巡逻覆盖" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorPatrol)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="riskLevel" 
                  name="风险等级" 
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              回放控制
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">速度:</span>
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    playbackSpeed === speed 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSnapshotIndex(0)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              disabled={currentSnapshotIndex === 0}
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setSnapshotIndex(Math.max(0, currentSnapshotIndex - 1))}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              disabled={currentSnapshotIndex === 0}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayback}
              className="p-4 bg-purple-600 hover:bg-purple-500 rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={() => setSnapshotIndex(Math.min(snapshots.length - 1, currentSnapshotIndex + 1))}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              disabled={currentSnapshotIndex === snapshots.length - 1}
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setSnapshotIndex(snapshots.length - 1)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              disabled={currentSnapshotIndex === snapshots.length - 1}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              value={currentSnapshotIndex}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>0:00</span>
              <span>{formatTime(gameState.currentTime / 4)}</span>
              <span>{formatTime(gameState.currentTime / 2)}</span>
              <span>{formatTime(gameState.currentTime * 3 / 4)}</span>
              <span>{formatTime(gameState.currentTime)}</span>
            </div>
          </div>
        </div>

        {currentSnapshot && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">拥堵指数</div>
              <div className={`text-2xl font-bold ${currentSnapshot.congestionIndex > 1.2 ? 'text-red-400' : currentSnapshot.congestionIndex > 0.8 ? 'text-yellow-400' : 'text-green-400'}`}>
                {currentSnapshot.congestionIndex.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">巡逻覆盖率</div>
              <div className={`text-2xl font-bold ${currentSnapshot.patrolCoverage < 0.5 ? 'text-red-400' : currentSnapshot.patrolCoverage < 0.7 ? 'text-yellow-400' : 'text-green-400'}`}>
                {(currentSnapshot.patrolCoverage * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">风险等级</div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${riskColors[Math.ceil(currentSnapshot.riskLevel)] || 'bg-gray-500'}`} />
                <span className="text-2xl font-bold text-white">
                  {currentSnapshot.riskLevel.toFixed(1)}
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">天气</div>
              <div className="text-2xl font-bold text-cyan-400">
                {weatherLabels[currentSnapshot.weather] || '未知'}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              事件时间轴
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {currentTimelineItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  暂无时间线数据
                </div>
              ) : (
                currentTimelineItems.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.data.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                      item.type === 'event' && selectedEventId === item.data.id
                        ? 'bg-yellow-500/20 border border-yellow-500/50'
                        : item.type === 'decision' && selectedDecisionId === item.data.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                    onClick={() => {
                      if (item.type === 'event') {
                        selectEvent(item.data.id);
                        selectDecision(null);
                      } else {
                        selectDecision(item.data.id);
                        selectEvent(null);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-sm font-mono text-slate-400">
                        {formatTime(item.timestamp)}
                      </div>
                      <div className={`text-xs mt-1 ${
                        item.type === 'event' ? 'text-yellow-400' : 'text-cyan-400'
                      }`}>
                        {item.type === 'event' ? '事件' : '决策'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === 'event' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-white truncate">
                          {item.type === 'event' 
                            ? (item.data as GameEvent).title 
                            : (item.data as Decision).action}
                        </span>
                      </div>
                      
                      {item.type === 'event' && (
                        <div className="text-sm text-slate-400">
                          {(item.data as GameEvent).description.substring(0, 60)}...
                        </div>
                      )}
                      
                      {item.type === 'decision' && (
                        <div className="text-sm text-slate-400">
                          结果: {(item.data as Decision).result}
                        </div>
                      )}
                      
                      {item.type === 'event' && (item.data as GameEvent).dataSourceId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDataSource((item.data as GameEvent).dataSourceId);
                          }}
                          className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 mt-1 transition-colors"
                        >
                          <Database className="w-3 h-3" />
                          查看数据源
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              详情面板
            </h3>
            
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">事件类型</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {selectedEvent.title}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">严重程度</div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div
                        key={level}
                        className={`w-6 h-6 rounded ${
                          level <= severityToNumber(selectedEvent.severity)
                            ? riskColors[level]
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-white ml-2">{severityToNumber(selectedEvent.severity)}/5</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">发生时间</div>
                  <div className="text-white">{formatTime(selectedEvent.timestamp)}</div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">详细描述</div>
                  <div className="text-slate-300 bg-slate-700/50 p-3 rounded-lg">
                    {selectedEvent.description}
                  </div>
                </div>
                
                {selectedEvent.resolved && (
                  <div>
                    <div className="text-sm text-slate-400 mb-1">处置结果</div>
                    <div className="text-green-400">
                      {selectedEvent.resolutionAction}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      响应时间: {((selectedEvent.resolutionTime || 0) - selectedEvent.timestamp).toFixed(1)} 秒
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => handleViewDataSource(selectedEvent.dataSourceId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors"
                >
                  <Database className="w-4 h-4" />
                  查看原始数据来源
                </button>
              </div>
            ) : selectedDecision ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">决策内容</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {selectedDecision.action}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">决策时间</div>
                  <div className="text-white">{formatTime(selectedDecision.timestamp)}</div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-1">执行结果</div>
                  <div className="text-green-400">{selectedDecision.result}</div>
                </div>
                
                {selectedDecision.markedCritical && (
                  <div className="flex items-center gap-2 text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>关键决策点</span>
                  </div>
                )}
                
                {selectedDecision.dataSourceIds.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">关联数据源</div>
                    <div className="space-y-2">
                      {selectedDecision.dataSourceIds.map(id => (
                        <button
                          key={id}
                          onClick={() => handleViewDataSource(id)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-left"
                        >
                          <Database className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-slate-300">数据源 #{id.substring(0, 8)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>请在左侧时间轴选择一个事件或决策</p>
                <p className="text-sm mt-1">查看详细信息和数据来源</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 pt-4 pb-8">
          <button
            onClick={() => navigate(`/game/${gameState.mapId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
          
          <button
            onClick={() => navigate(`/result/${gameId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all hover:scale-105"
          >
            <Award className="w-5 h-5" />
            评估报告
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all hover:scale-105"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
        </div>
      </div>

      <DataSourcePanel
        isOpen={dataSourcePanelOpen}
        onClose={() => setDataSourcePanelOpen(false)}
        dataSource={currentDataSource}
      />
    </div>
  );
}
