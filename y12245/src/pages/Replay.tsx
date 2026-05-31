import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Flag, AlertTriangle } from 'lucide-react';
import { useHistoryStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { getErrorLabel, getErrorIcon } from '../utils/gameEngine';
import RaceCanvas from '../components/RaceCanvas';

const Replay: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const sessions = useHistoryStore((state) => state.sessions);
  const session = sessions.find((s) => s.id === sessionId);
  const level = session ? getLevelById(session.levelId) : null;

  useEffect(() => {
    if (!session) {
      navigate('/history');
    }
  }, [session, navigate]);

  useEffect(() => {
    if (!isPlaying || !session) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > 500 / playbackSpeed) {
        lastUpdateRef.current = timestamp;
        setCurrentStepIndex((prev) => {
          if (prev >= session.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, session, playbackSpeed]);

  if (!session || !level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  const currentStep = session.steps[currentStepIndex] || session.steps[0];
  const hasErrors = currentStep?.errors?.length > 0;
  const triggeredSteps = session.steps.filter((s) => s.triggered);

  const goToStep = (index: number) => {
    setCurrentStepIndex(Math.max(0, Math.min(index, session.steps.length - 1)));
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetReplay = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const stepForward = () => {
    goToStep(currentStepIndex + 1);
  };

  const stepBackward = () => {
    goToStep(currentStepIndex - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-white">回放分析 - {session.levelName}</h1>
              <p className="text-xs text-slate-400">
                结果: {session.result === 'success' ? '成功' : '失败'} | 得分: {session.score}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">速度:</span>
            {[0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Flag className="w-5 h-5 text-blue-400" />
                当前步骤参数
              </h2>
              <div className="text-xs text-slate-500 mb-4">
                步骤 {currentStepIndex + 1} / {session.steps.length}
              </div>
              <div className="space-y-4">
                {Object.entries(currentStep?.parameters || {}).map(([name, value]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{name}</span>
                      <span className="text-sm font-mono text-cyan-400">
                        {(value as number).toFixed(4)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((value as number) - level.parameterRanges.find(p => p.name === name)?.min || 0) / ((level.parameterRanges.find(p => p.name === name)?.max || 1) - (level.parameterRanges.find(p => p.name === name)?.min || 0)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`border rounded-xl p-6 transition-all ${
              hasErrors
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                hasErrors ? 'text-red-400' : 'text-white'
              }`}>
                <AlertTriangle className="w-5 h-5" />
                本步骤错误
              </h2>
              {currentStep?.errors?.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  本步骤无错误 ✓
                </div>
              ) : (
                <div className="space-y-3">
                  {currentStep?.errors?.map((error, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        error.severity === 'critical'
                          ? 'bg-red-500/20 border border-red-500/50'
                          : 'bg-amber-500/20 border border-amber-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getErrorIcon(error.type)}</span>
                        <span className={`text-sm font-medium ${
                          error.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {getErrorLabel(error.type)}
                        </span>
                        {error.severity === 'critical' && (
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                            严重
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{error.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">触发曲线的步骤</h2>
              {triggeredSteps.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  无触发事件
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {triggeredSteps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToStep(step.stepIndex)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        currentStepIndex === step.stepIndex
                          ? 'bg-red-500/20 border border-red-500/50'
                          : 'bg-slate-700/50 hover:bg-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">步骤 {step.stepIndex + 1}</span>
                        <span className="text-xs text-red-400">{step.errors.length} 个错误</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
              <div className="flex justify-center mb-6">
                <RaceCanvas
                  level={level}
                  trajectory={currentStep?.trajectory || []}
                  carPosition={currentStep?.carPosition || level.startPoint}
                  errors={currentStep?.errors || []}
                  obstacles={level.obstacles}
                  width={800}
                  height={400}
                />
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">
                    进度: {Math.round(((currentStepIndex + 1) / session.steps.length) * 100)}%
                  </span>
                  <span className="text-sm text-slate-400">
                    总错误: {session.totalErrors}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={session.steps.length - 1}
                  value={currentStepIndex}
                  onChange={(e) => goToStep(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={resetReplay}
                  className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={stepBackward}
                  disabled={currentStepIndex === 0}
                  className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button
                  onClick={stepForward}
                  disabled={currentStepIndex >= session.steps.length - 1}
                  className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">最终得分</div>
                  <div className="text-2xl font-bold text-amber-400">{session.score}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">总步骤</div>
                  <div className="text-2xl font-bold text-white">{session.steps.length}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">总错误</div>
                  <div className="text-2xl font-bold text-red-400">{session.totalErrors}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">触发次数</div>
                  <div className="text-2xl font-bold text-orange-400">{triggeredSteps.length}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">成绩影响分析</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">基础分</span>
                  <span className="text-white font-mono">+1000</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">严重错误扣分</span>
                  <span className="text-red-400 font-mono">
                    -{session.steps.reduce((acc, s) => acc + s.errors.filter(e => e.severity === 'critical').length, 0) * 100}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">警告扣分</span>
                  <span className="text-amber-400 font-mono">
                    -{session.steps.reduce((acc, s) => acc + s.errors.filter(e => e.severity === 'warning').length, 0) * 30}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">到达终点奖励</span>
                  <span className="text-green-400 font-mono">
                    {session.result === 'success' ? '+500' : '+0'}
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">最终得分</span>
                    <span className="text-2xl font-bold text-amber-400">{session.score}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Replay;
