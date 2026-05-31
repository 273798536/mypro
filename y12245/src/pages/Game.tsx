import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Flag, Pause, AlertTriangle, CheckCircle } from 'lucide-react';
import { getLevelById } from '../data/levels';
import { useGameStore, useHistoryStore } from '../store/gameStore';
import { generateTrajectory, checkAllErrors, calculateScore, getErrorLabel, getErrorIcon } from '../utils/gameEngine';
import RaceCanvas from '../components/RaceCanvas';
import { GameStep, GameSession } from '../types';

const Game: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const [showResult, setShowResult] = useState(false);

  const {
    currentLevel,
    parameters,
    isPlaying,
    isPaused,
    carPosition,
    trajectory,
    errors,
    result,
    score,
    steps,
    setLevel,
    setParameter,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    addStep,
    setCarPosition,
    setTrajectory,
    addError,
    setScore,
    clearErrors,
  } = useGameStore();

  const addSession = useHistoryStore((state) => state.addSession);

  useEffect(() => {
    if (levelId) {
      const level = getLevelById(levelId);
      if (level) {
        setLevel(level);
      } else {
        navigate('/');
      }
    }
  }, [levelId, setLevel, navigate]);

  useEffect(() => {
    if (!currentLevel || !isPlaying || isPaused) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 5000, 1);
      const currentX = currentLevel.startPoint.x + progress * (currentLevel.endPoint.x - currentLevel.startPoint.x);

      const newTrajectory = generateTrajectory(
        currentLevel,
        parameters,
        currentLevel.startPoint.x,
        currentX
      );

      setTrajectory(newTrajectory);

      if (newTrajectory.length > 0) {
        const lastPoint = newTrajectory[newTrajectory.length - 1];
        setCarPosition(lastPoint);
      }

      const currentErrors = checkAllErrors(newTrajectory, currentLevel, parameters);
      clearErrors();
      currentErrors.forEach((err) => addError(err));

      if (Math.floor(progress * 100) % 10 === 0) {
        const step: GameStep = {
          stepIndex: steps.length,
          parameters: { ...parameters },
          timestamp: Date.now(),
          trajectory: [...newTrajectory],
          errors: [...currentErrors],
          triggered: currentErrors.length > 0,
          carPosition: newTrajectory[newTrajectory.length - 1] || currentLevel.startPoint,
          speed: progress * 100,
        };
        addStep(step);
      }

      if (progress >= 1) {
        const finalErrors = checkAllErrors(
          generateTrajectory(currentLevel, parameters, currentLevel.startPoint.x, currentLevel.endPoint.x),
          currentLevel,
          parameters
        );

        const reachedGoal = currentX >= currentLevel.endPoint.x - 5;
        const finalScore = calculateScore(finalErrors, reachedGoal, steps.length);
        setScore(finalScore);

        const gameResult = reachedGoal && finalErrors.filter(e => e.severity === 'critical').length === 0
          ? 'success'
          : 'failed';
        endGame(gameResult);

        const session: GameSession = {
          id: Date.now().toString(),
          levelId: currentLevel.id,
          levelName: currentLevel.name,
          startTime: startTimeRef.current,
          endTime: Date.now(),
          steps: steps,
          result: gameResult,
          score: finalScore,
          totalErrors: finalErrors.length,
          finalPosition: newTrajectory[newTrajectory.length - 1] || currentLevel.endPoint,
        };
        addSession(session);

        setShowResult(true);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused, currentLevel, parameters]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    startGame();
    setShowResult(false);
  };

  const handleReset = () => {
    resetGame();
    setShowResult(false);
  };

  const handleViewReplay = () => {
    const sessionId = useHistoryStore.getState().sessions[0]?.id;
    if (sessionId) {
      navigate(`/replay/${sessionId}`);
    }
  };

  if (!currentLevel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-white">{currentLevel.name}</h1>
              <p className="text-xs text-slate-400">
                {isPlaying ? (isPaused ? '已暂停' : '行驶中...') : '准备开始'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">当前得分</div>
              <div className="text-2xl font-bold text-amber-400">{score}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Flag className="w-5 h-5 text-blue-400" />
                函数参数
              </h2>

              <div className="bg-slate-900/50 rounded-lg p-3 mb-6">
                <div className="text-xs text-slate-500 mb-1">函数表达式</div>
                <code className="text-cyan-400 text-sm font-mono">
                  {currentLevel.functionExpression}
                </code>
              </div>

              <div className="space-y-6">
                {currentLevel.parameterRanges.map((param) => (
                  <div key={param.name}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">
                        {param.name}
                      </label>
                      <span className="text-sm font-mono text-cyan-400">
                        {parameters[param.name]?.toFixed(4) || param.default.toFixed(4)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={(param.max - param.min) / 100}
                      value={parameters[param.name] ?? param.default}
                      onChange={(e) => setParameter(param.name, parseFloat(e.target.value))}
                      disabled={isPlaying}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{param.min}</span>
                      <span>{param.max}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">控制</h2>
              <div className="flex gap-3">
                {!isPlaying ? (
                  <button
                    onClick={handleStart}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-green-600/20"
                  >
                    <Play className="w-5 h-5" />
                    开始行驶
                  </button>
                ) : (
                  <button
                    onClick={isPaused ? resumeGame : pauseGame}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-all"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    {isPaused ? '继续' : '暂停'}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                错误检测 ({errors.length})
              </h2>
              {errors.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">
                  暂无错误
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {errors.slice(0, 5).map((error, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        error.severity === 'critical'
                          ? 'bg-red-500/10 border border-red-500/30'
                          : 'bg-amber-500/10 border border-amber-500/30'
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
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
              <div className="flex justify-center">
                <RaceCanvas
                  level={currentLevel}
                  trajectory={trajectory}
                  carPosition={carPosition}
                  errors={errors}
                  obstacles={currentLevel.obstacles}
                  width={800}
                  height={400}
                />
              </div>

              <div className="mt-6 bg-slate-900/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">💡 学习提示</div>
                <p className="text-slate-400 text-sm">{currentLevel.hint}</p>
              </div>

              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-slate-500">步骤数</div>
                  <div className="text-2xl font-bold text-white">{steps.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">严重错误</div>
                  <div className="text-2xl font-bold text-red-400">
                    {errors.filter(e => e.severity === 'critical').length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">警告</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {errors.filter(e => e.severity === 'warning').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              {result === 'success' ? (
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-white mb-2">
                {result === 'success' ? '挑战成功！' : '挑战失败'}
              </h2>
              <p className="text-slate-400 mb-6">
                {result === 'success'
                  ? '恭喜！你成功通过了这个关卡！'
                  : '不要气馁，调整参数再试一次！'}
              </p>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">得分</div>
                    <div className="text-2xl font-bold text-amber-400">{score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">错误数</div>
                    <div className="text-2xl font-bold text-red-400">{errors.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">步骤</div>
                    <div className="text-2xl font-bold text-white">{steps.length}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
                >
                  重新挑战
                </button>
                <button
                  onClick={handleViewReplay}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all"
                >
                  查看回放
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
