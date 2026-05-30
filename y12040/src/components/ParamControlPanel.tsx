import { useGameStore } from '../store/gameStore';
import { PARAM_RANGES } from '../types/game';
import { getFunctionExpression, analyzeParams } from '../utils/mathEngine';
import { AlertTriangle, Play, RotateCcw, Info } from 'lucide-react';

export const ParamControlPanel = () => {
  const {
    currentParams,
    setParam,
    status,
    startGame,
    resetGame,
    paramWarnings,
    score,
    distance,
    collisions,
  } = useGameStore();

  const paramAnalysis = analyzeParams(currentParams);
  const functionExpr = getFunctionExpression(currentParams);

  const handleStart = () => {
    if (status === 'idle' || status === 'finished') {
      resetGame();
      setTimeout(() => startGame(), 100);
    }
  };

  const handleReset = () => {
    resetGame();
  };

  return (
    <div className="w-80 bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold text-mountain-700">函数参数控制</h2>
        <p className="text-sm text-gray-500 mt-1">调整参数控制滑雪曲线</p>
      </div>

      <div className="bg-mountain-50 rounded-xl p-4">
        <p className="text-xs text-mountain-500 mb-1">当前函数</p>
        <p className="text-lg font-mono font-bold text-curve-600">{functionExpr}</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              参数 <span className="font-mono text-lg text-ski-500">a</span>
              <span className="text-xs text-gray-400 ml-2">（开口方向/大小）</span>
            </label>
            <span className="font-mono text-curve-600 font-bold">
              {currentParams.a.toFixed(3)}
            </span>
          </div>
          <input
            type="range"
            min={PARAM_RANGES.a.min}
            max={PARAM_RANGES.a.max}
            step="0.001"
            value={currentParams.a}
            onChange={(e) => setParam('a', parseFloat(e.target.value))}
            disabled={status === 'playing'}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-curve-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{PARAM_RANGES.a.min}</span>
            <span className="text-warning-500">安全范围: ±{PARAM_RANGES.a.safeMax}</span>
            <span>{PARAM_RANGES.a.max}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              参数 <span className="font-mono text-lg text-ski-500">b</span>
              <span className="text-xs text-gray-400 ml-2">（对称轴位置）</span>
            </label>
            <span className="font-mono text-curve-600 font-bold">
              {currentParams.b.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={PARAM_RANGES.b.min}
            max={PARAM_RANGES.b.max}
            step="0.1"
            value={currentParams.b}
            onChange={(e) => setParam('b', parseFloat(e.target.value))}
            disabled={status === 'playing'}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-curve-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{PARAM_RANGES.b.min}</span>
            <span className="text-warning-500">安全范围: ±{PARAM_RANGES.b.safeMax}</span>
            <span>{PARAM_RANGES.b.max}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              参数 <span className="font-mono text-lg text-ski-500">c</span>
              <span className="text-xs text-gray-400 ml-2">（上下平移）</span>
            </label>
            <span className="font-mono text-curve-600 font-bold">
              {currentParams.c.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={PARAM_RANGES.c.min}
            max={PARAM_RANGES.c.max}
            step="0.1"
            value={currentParams.c}
            onChange={(e) => setParam('c', parseFloat(e.target.value))}
            disabled={status === 'playing'}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-curve-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{PARAM_RANGES.c.min}</span>
            <span className="text-warning-500">安全范围: ±{PARAM_RANGES.c.safeMax}</span>
            <span>{PARAM_RANGES.c.max}</span>
          </div>
        </div>
      </div>

      {paramWarnings.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-warning-600">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">参数警告</span>
          </div>
          {paramWarnings.map((warning) => (
            <div key={warning.id} className="text-xs text-warning-700 flex items-start gap-1">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>{warning.message}</span>
              {warning.needsTeacherReview && (
                <span className="text-ski-500 font-medium ml-1">（待老师确认）</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-snow-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">得分</p>
          <p className="text-xl font-bold text-curve-600">{score}</p>
        </div>
        <div className="bg-snow-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">距离</p>
          <p className="text-xl font-bold text-mountain-600">{Math.round(distance)}</p>
        </div>
        <div className="bg-snow-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">碰撞</p>
          <p className="text-xl font-bold text-ski-500">{collisions.length}</p>
        </div>
      </div>

      <div className="bg-mountain-50 rounded-lg p-3">
        <p className="text-xs text-mountain-500 mb-2 font-medium">曲线分析</p>
        <div className="space-y-1 text-xs text-mountain-700">
          <p>• 开口方向：<span className="font-bold">{paramAnalysis.openingDirection}</span></p>
          <p>• 对称轴：x = <span className="font-mono">{paramAnalysis.axisOfSymmetry.toFixed(2)}</span></p>
          <p>• Y轴截距：y = <span className="font-mono">{paramAnalysis.yIntercept.toFixed(2)}</span></p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={status === 'playing'}
          className="flex-1 flex items-center justify-center gap-2 bg-curve-500 hover:bg-curve-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-xl transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
        >
          <Play size={18} />
          {status === 'playing' ? '滑行中...' : status === 'finished' ? '再来一次' : '开始滑雪'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};
