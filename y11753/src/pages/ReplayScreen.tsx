import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Home, FileText, Clock } from 'lucide-react';
import { GameState, FaultPriority } from '../types';

export const ReplayScreen = () => {
  const navigate = useNavigate();
  const [replayData, setReplayData] = useState<GameState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem('gameReplayData');
    if (saved) {
      const data = JSON.parse(saved);
      setReplayData(data);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    
    if (isPlaying && currentIndex < replayData.length - 1) {
      interval = window.setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= replayData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, replayData.length, currentIndex]);

  const currentState = replayData[currentIndex];

  const handlePlayPause = () => {
    if (currentIndex >= replayData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCurrentIndex(value);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (replayData.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">暂无回放数据</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Play className="w-8 h-8 text-cyan-400" />
              操作回放
            </h1>
            <p className="text-slate-400 mt-1">
              {currentState?.level?.name || '未知关卡'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-6"
        >
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-2xl font-bold text-yellow-400">{currentState?.score || 0}</p>
              <p className="text-xs text-slate-400">当前得分</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">{formatTime(currentState?.currentTime || 0)}</p>
              <p className="text-xs text-slate-400">游戏时间</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{Math.round(currentState?.battery || 0)}%</p>
              <p className="text-xs text-slate-400">剩余电量</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-2xl font-bold text-orange-400">
                {currentState?.faults.filter(f => f.status === 'pending').length || 0}
              </p>
              <p className="text-xs text-slate-400">待处理故障</p>
            </div>
          </div>

          <div className="relative h-96 bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden mb-6">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(#10B981 1px, transparent 1px), linear-gradient(90deg, #10B981 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }} />
            </div>
            
            <div className="relative w-full h-full p-8">
              <div className="relative w-full h-full max-w-4xl mx-auto">
                {currentState?.level?.mapLayout.map((area) => {
                  const areaFaults = currentState.faults.filter(
                    f => f.areaId === area.id && (f.status === 'pending' || f.status === 'processing')
                  );
                  const areaResources = currentState.resources.filter(r => r.currentTarget === area.id);
                  const hasFault = areaFaults.length > 0;
                  const hasResource = areaResources.length > 0;

                  let areaBg = 'bg-slate-800/50';
                  let areaBorder = 'border-slate-700';
                  
                  if (area.type === 'panel') {
                    areaBg = 'bg-blue-900/20';
                    areaBorder = 'border-blue-700/50';
                  } else if (area.type === 'inverter') {
                    areaBg = 'bg-orange-900/20';
                    areaBorder = 'border-orange-700/50';
                  } else if (area.type === 'substation') {
                    areaBg = 'bg-purple-900/20';
                    areaBorder = 'border-purple-700/50';
                  }

                  if (hasFault) {
                    const priorityOrder: Record<FaultPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                    const highestPriority = areaFaults.reduce<FaultPriority>((max, f) => {
                      return priorityOrder[f.priority] > priorityOrder[max] ? f.priority : max;
                    }, 'low');
                    
                    if (highestPriority === 'critical') {
                      areaBorder = 'border-red-500';
                    } else if (highestPriority === 'high') {
                      areaBorder = 'border-orange-500';
                    } else {
                      areaBorder = 'border-yellow-500';
                    }
                  }

                  return (
                    <div
                      key={area.id}
                      className={`absolute rounded-xl border-2 ${areaBg} ${areaBorder}`}
                      style={{
                        left: `${area.position.x}px`,
                        top: `${area.position.y}px`,
                        width: `${area.size.width}px`,
                        height: `${area.size.height}px`
                      }}
                    >
                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-white truncate">{area.name}</h4>
                      </div>

                      {hasFault && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs animate-pulse">
                          !
                        </div>
                      )}

                      {hasResource && (
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-5 h-5 rounded-full bg-cyan-500 animate-bounce" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {currentState?.status === 'paused' && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">已暂停</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={() => setCurrentIndex(Math.min(replayData.length - 1, currentIndex + 1))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={replayData.length - 1}
                value={currentIndex}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400 min-w-[80px]">
                {formatTime(currentState?.currentTime || 0)} / {formatTime(currentState?.totalTime || 0)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold mb-3">操作日志</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentState?.operations.slice(-10).reverse().map((op) => (
                <div key={op.id} className="p-2 bg-slate-700/30 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      {op.resourceType === 'drone' ? '无人机' : op.resourceType === 'cleaner' ? '清洗队' : '维修队'}
                      {' '}
                      {op.action === 'inspect' ? '巡检' : op.action === 'clean' ? '清洁' : '维修'}
                    </span>
                    <span className={`text-xs ${op.result === 'success' ? 'text-green-400' : op.result === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {op.result === 'success' ? '成功' : op.result === 'failed' ? '失败' : '进行中'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatTime(op.timestamp)} | {op.targetAreaId}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold mb-3">事件日志</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentState?.events.slice(-10).reverse().map((event) => (
                <div key={event.id} className="p-2 bg-slate-700/30 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      event.level === 'danger' ? 'text-red-400' :
                      event.level === 'warning' ? 'text-yellow-400' :
                      'text-slate-300'
                    }`}>
                      {event.title}
                    </span>
                    <span className="text-xs text-slate-500">{formatTime(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{event.message}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
