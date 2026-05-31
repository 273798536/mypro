import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { StageGrid } from '@/components/StageGrid';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';

export const ReviewPage = () => {
  const navigate = useNavigate();
  const {
    reviewHistory,
    reviewFrame,
    isReviewPlaying,
    setReviewFrame,
    toggleReviewPlay,
    history,
    level
  } = useGameStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (reviewHistory.length === 0) {
      navigate('/result');
    }
  }, [reviewHistory.length, navigate]);

  useEffect(() => {
    if (isReviewPlaying) {
      intervalRef.current = window.setInterval(() => {
        setReviewFrame(Math.min(reviewFrame + 1, reviewHistory.length - 1));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReviewPlaying, reviewFrame, reviewHistory.length, setReviewFrame]);

  useEffect(() => {
    if (reviewFrame >= reviewHistory.length - 1 && isReviewPlaying) {
      toggleReviewPlay();
    }
  }, [reviewFrame, reviewHistory.length, isReviewPlaying, toggleReviewPlay]);

  const currentState = reviewHistory[reviewFrame];
  const currentAction = history[reviewFrame - 1];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getActionLabel = (action: any) => {
    if (!action) return '初始状态';
    const labels: Record<string, string> = {
      place_device: '放置设备',
      remove_device: '移除设备',
      draw_cable: '连接线缆',
      remove_cable: '移除线缆',
      draw_path: '绘制走位',
      remove_path: '移除走位'
    };
    return labels[action.type] || action.type;
  };

  if (reviewHistory.length === 0) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">加载中...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/result')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>返回结算</span>
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <h1 className="text-lg font-bold text-white">操作复盘</h1>
            <p className="text-xs text-slate-400">{level.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400">操作步骤</div>
            <div className="text-lg font-mono text-purple-400">
              {reviewFrame} / {reviewHistory.length - 1}
            </div>
          </div>
          {currentState && (
            <div className="text-right">
              <div className="text-xs text-slate-400">剩余时间</div>
              <div className="text-lg font-mono text-cyan-400">
                {formatTime(currentState.timeLeft)}
              </div>
            </div>
          )}
          {currentState && (
            <div className="text-right">
              <div className="text-xs text-slate-400">当前得分</div>
              <div className="text-lg font-mono text-yellow-400">
                {currentState.score}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <StageGrid reviewState={currentState} />
          
          <div className="px-8 py-4 bg-slate-900/90 border-t border-slate-700">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setReviewFrame(0)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  disabled={reviewFrame === 0}
                >
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={() => setReviewFrame(Math.max(0, reviewFrame - 1))}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  disabled={reviewFrame === 0}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={toggleReviewPlay}
                  className="p-3 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/30"
                >
                  {isReviewPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={() => setReviewFrame(Math.min(reviewHistory.length - 1, reviewFrame + 1))}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  disabled={reviewFrame >= reviewHistory.length - 1}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setReviewFrame(reviewHistory.length - 1)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  disabled={reviewFrame >= reviewHistory.length - 1}
                >
                  <SkipForward size={18} />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={reviewHistory.length - 1}
                    value={reviewFrame}
                    onChange={(e) => setReviewFrame(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-sm text-slate-300">
                    {getActionLabel(currentAction)}
                  </span>
                  {currentAction?.payload?.device && (
                    <span className="text-sm text-slate-400">
                      → {currentAction.payload.device.name}
                    </span>
                  )}
                  {currentAction?.payload?.cable && (
                    <span className="text-sm text-slate-400">
                      → {currentAction.payload.cable.label}
                    </span>
                  )}
                  {currentAction?.payload?.path && (
                    <span className="text-sm text-slate-400">
                      → {currentAction.payload.path.musician}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {reviewHistory.map((_, idx) => {
                  const action = history[idx - 1];
                  const hasConflict = action && idx > 0 && reviewHistory[idx].conflicts.length > reviewHistory[idx - 1].conflicts.length;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setReviewFrame(idx)}
                      className={`
                        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono
                        transition-all duration-200
                        ${reviewFrame === idx
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : hasConflict
                          ? 'bg-red-500/30 text-red-400 border border-red-500/50 hover:bg-red-500/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }
                      `}
                    >
                      {idx}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-80 flex-shrink-0 bg-slate-900/80 border-l border-slate-700 overflow-y-auto">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">时间线</h3>
            <p className="text-xs text-slate-400 mt-1">点击任意步骤跳转查看</p>
          </div>
          
          <div className="p-4 space-y-3">
            {history.map((action, idx) => {
              const stepState = reviewHistory[idx + 1];
              const conflictAdded = stepState && 
                stepState.conflicts.length > reviewHistory[idx].conflicts.length;
              
              return (
                <div
                  key={action.id}
                  onClick={() => setReviewFrame(idx + 1)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-all duration-200 border
                    ${reviewFrame === idx + 1
                      ? 'bg-purple-500/20 border-purple-500'
                      : conflictAdded
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-200">{getActionLabel(action)}</span>
                    </div>
                    {conflictAdded && (
                      <span className="text-xs bg-red-500/30 text-red-400 px-2 py-0.5 rounded">
                        冲突↑
                      </span>
                    )}
                  </div>
                  {action.payload?.device && (
                    <div className="text-xs text-slate-400 mt-2 ml-8">
                      {action.payload.device.name} ({action.payload.device.deviceType})
                    </div>
                  )}
                  {action.payload?.cable && (
                    <div className="text-xs text-slate-400 mt-2 ml-8">
                      {action.payload.cable.label}
                    </div>
                  )}
                  {action.payload?.path && (
                    <div className="text-xs text-slate-400 mt-2 ml-8">
                      {action.payload.path.musician}
                    </div>
                  )}
                  {stepState && (
                    <div className="flex items-center justify-between mt-2 ml-8 text-xs">
                      <span className="text-slate-500">
                        <Clock size={10} className="inline mr-1" />
                        {formatTime(stepState.timeLeft)}
                      </span>
                      <span className="text-yellow-500">{stepState.score}分</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
