import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { ReplayData } from '../types';
import PortMap from '../components/game/PortMap';
import { Home, ArrowLeft, Play, Pause, SkipBack, SkipForward, PlayCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const ReplayPage = () => {
  const navigate = useNavigate();
  const { isReplayMode, replayData, replayIndex, loadReplayData, setReplayIndex, stepReplay, exitReplayMode, getReplayList } = useGameStore();
  const [replayList, setReplayList] = useState<ReplayData[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const autoPlayRef = useRef<number>();

  useEffect(() => {
    setReplayList(getReplayList());
  }, [getReplayList]);

  useEffect(() => {
    if (!isAutoPlaying || !isReplayMode || !replayData) return;

    const interval = setInterval(() => {
      stepReplay('forward');
    }, 1000 / playbackSpeed);

    autoPlayRef.current = interval as unknown as number;

    return () => clearInterval(interval);
  }, [isAutoPlaying, isReplayMode, replayData, playbackSpeed, stepReplay]);

  useEffect(() => {
    if (replayData && replayIndex >= replayData.snapshots.length - 1) {
      setIsAutoPlaying(false);
    }
  }, [replayIndex, replayData]);

  const handleSelectReplay = (data: ReplayData) => {
    loadReplayData(data);
  };

  const handleExitReplay = () => {
    setIsAutoPlaying(false);
    exitReplayMode();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setReplayIndex(value);
  };

  const formatReplayTime = (ms: number): string => {
    return format(ms, 'HH:mm:ss', { locale: zhCN });
  };

  if (!isReplayMode || !replayData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">调度回放</h1>
                <p className="text-sm text-slate-400">查看历史游戏记录</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Home size={16} />
              返回首页
            </button>
          </motion.div>

          {replayList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <PlayCircle className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-bold text-white mb-2">暂无回放记录</h3>
              <p className="text-slate-400">完成游戏后，回放记录将自动保存</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4"
            >
              {replayList.map((replay, index) => (
                <motion.div
                  key={replay.gameId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700 p-5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{replay.levelName}</h3>
                        <span className="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400">
                          关卡 {replay.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          游戏时长: {Math.floor(replay.playDuration / 60000)}分{Math.floor((replay.playDuration % 60000) / 1000)}秒
                        </span>
                        <span>快照数: {replay.snapshots.length}</span>
                        <span>操作数: {replay.logs.length}</span>
                        <span>完成时间: {new Date(replay.completedAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectReplay(replay)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                    >
                      <Play size={18} />
                      查看回放
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  const progress = replayData.snapshots.length > 1
    ? ((replayIndex) / (replayData.snapshots.length - 1)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col gap-4">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleExitReplay}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                <span className="text-cyan-400">🎬</span> 回放模式 - {replayData.levelName}
              </h1>
              <p className="text-sm text-slate-400">游戏ID: {replayData.gameId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">速度:</span>
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => stepReplay('backward')}
                disabled={replayIndex <= 0}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
              >
                {isAutoPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={() => stepReplay('forward')}
                disabled={replayIndex >= replayData.snapshots.length - 1}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={replayData.snapshots.length - 1}
                value={replayIndex}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progress}%, #334155 ${progress}%, #334155 100%)`
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400 min-w-[200px] justify-end">
              <span>{formatReplayTime(replayData.snapshots[replayIndex]?.time || replayData.startTime)}</span>
              <span>/</span>
              <span>{formatReplayTime(replayData.endTime)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>帧 {replayIndex + 1} / {replayData.snapshots.length}</span>
            <span className="flex items-center gap-1">
              <ChevronLeft size={12} />
              拖动滑块或使用按钮控制回放
              <ChevronRight size={12} />
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 min-h-0"
        >
          <div className="h-full">
            <PortMap />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700 p-4 max-h-32 overflow-y-auto"
        >
          <div className="text-xs text-slate-400 mb-2">当前帧操作日志</div>
          <div className="space-y-1">
            {replayData.logs
              .filter((log) => {
                const snapshotTime = replayData.snapshots[replayIndex]?.time || replayData.startTime;
                return Math.abs(log.gameTime - snapshotTime) < 10000;
              })
              .slice(0, 3)
              .map((log) => (
                <div key={log.id} className="text-sm text-slate-300 flex items-center gap-2">
                  <span className="text-slate-500">{format(log.gameTime, 'HH:mm:ss', { locale: zhCN })}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    log.type === 'conflict' ? 'bg-red-500/20 text-red-400' :
                    log.type === 'correction' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {log.type}
                  </span>
                  <span>{log.action}</span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReplayPage;