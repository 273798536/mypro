import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { FAIL_TYPE_LABELS } from '../types/game';

export function ReplayPage() {
  const navigate = useNavigate();
  const { replayId } = useParams<{ replayId: string }>();
  const replays = useGameStore(s => s.replays);
  const exitToMenu = useGameStore(s => s.exitToMenu);

  const replay = replays.find(r => r.id === replayId);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || !replay) return;

    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= replay.stateSnapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, replay]);

  const handleBack = useCallback(() => {
    if (replayId) {
      navigate(`/result/${replay.levelId}`, { state: { replayId } });
    } else {
      navigate('/');
    }
  }, [replay, replayId, navigate]);

  const handleExit = useCallback(() => {
    exitToMenu();
    navigate('/');
  }, [exitToMenu, navigate]);

  if (!replay) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <p className="text-white text-xl mb-4">未找到回放记录</p>
        <button
          onClick={handleExit}
          className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
        >
          返回菜单
        </button>
      </div>
    );
  }

  const currentState = replay.stateSnapshots[currentStep];
  const maxSteps = replay.stateSnapshots.length;

  const handlePrev = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentStep(Math.min(maxSteps - 1, currentStep + 1));
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleJumpToEnd = () => {
    setCurrentStep(maxSteps - 1);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const currentFailures = replay.failReasons.filter(f => f.round <= currentStep + 1);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800/80 border-b border-slate-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>返回结果</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">🎬 回放模式</h1>
              <p className="text-xs text-slate-400">{replay.levelName}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              回合 {currentStep + 1}
              <span className="text-sm text-slate-500">/{maxSteps}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">最终得分</p>
            <p className="text-2xl font-bold text-emerald-400">{replay.finalScore}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Replay State */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentState && (
            <div className="space-y-6">
              {/* Teams */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>👷</span> 抢修队伍
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {currentState.teams.map(team => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg border-2 ${
                        team.status === 'idle'
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : team.status === 'executing'
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : 'border-gray-500/50 bg-gray-500/10'
                      }`}
                    >
                      <p className="font-bold text-white">{team.name}</p>
                      <p className="text-xs text-slate-400">
                        {team.status === 'idle' && '待命'}
                        {team.status === 'executing' && `执行中 (剩 ${team.executeRounds})`}
                        {team.status === 'cooling' && `冷却中 (剩 ${team.cooldown})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>📍</span> 抢修区域
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {currentState.areas.map(area => (
                    <div
                      key={area.id}
                      className={`p-3 rounded-lg border-2 ${
                        area.powerStatus === 'normal'
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : area.timeoutRounds <= 1
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-slate-500/50 bg-slate-500/10'
                      }`}
                    >
                      <p className="font-bold text-white">{area.name}</p>
                      <p className="text-xs text-slate-400">
                        {area.powerStatus === 'normal'
                          ? '✓ 已修复'
                          : `超时倒计时: ${area.timeoutRounds} 回合`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spare Parts */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>📦</span> 备件库存
                </h3>
                <div className="flex gap-4">
                  {currentState.spareParts.map(part => (
                    <div
                      key={part.id}
                      className={`p-3 rounded-lg ${
                        part.quantity > 0
                          ? 'bg-slate-700/50'
                          : 'bg-red-500/20 border border-red-500/50'
                      }`}
                    >
                      <p className="text-white font-bold">{part.name}</p>
                      <p className={`text-sm ${part.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ×{part.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failures at this step */}
              {currentFailures.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                    <span>⚠️</span> 失败记录 ({currentFailures.length})
                  </h3>
                  <div className="space-y-2">
                    {currentFailures.map((failure, index) => (
                      <div
                        key={index}
                        className="p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            {FAIL_TYPE_LABELS[failure.type]}
                          </span>
                          <span className="text-slate-400 text-sm">回合 {failure.round}</span>
                        </div>
                        <p className="text-white text-sm">{failure.description}</p>
                        <p className="text-slate-500 text-xs font-mono mt-1">{failure.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Action Timeline */}
        <div className="w-80 bg-slate-800/30 border-l border-slate-600 p-4 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">📋 操作时间线</h3>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {replay.actions.map((action, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-sm cursor-pointer transition-all ${
                  action.round <= currentStep + 1
                    ? action.round === currentStep + 1
                      ? 'bg-orange-500/20 border border-orange-500'
                      : 'bg-slate-700/50'
                    : 'bg-slate-700/20 opacity-50'
                }`}
                onClick={() => {
                  setCurrentStep(Math.min(action.round - 1, maxSteps - 1));
                  setIsPlaying(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono text-xs">R{action.round}</span>
                  <span className="text-slate-300 text-xs">
                    {action.teamId} → {action.areaId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-800 border-t border-slate-600 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="从头开始"
          >
            ⏮
          </button>
          <button
            onClick={handlePrev}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            disabled={currentStep === 0}
          >
            ◀
          </button>
          <button
            onClick={handlePlayPause}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors"
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <button
            onClick={handleNext}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            disabled={currentStep >= maxSteps - 1}
          >
            ▶
          </button>
          <button
            onClick={handleJumpToEnd}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="跳转到最后"
          >
            ⏭
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-slate-400 text-sm">进度</span>
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / maxSteps) * 100}%` }}
            />
          </div>
          <span className="text-slate-400 text-sm">
            {currentStep + 1} / {maxSteps}
          </span>
        </div>
      </div>
    </div>
  );
}