import { useMemo } from 'react';
import { Code, RotateCcw, Layers, Calculator, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useParamStore } from '../../store/useParamStore';
import { validateFunction } from '../../utils/math/functionParser';
import { VolumeInfo } from './VolumeInfo';
import { FilterBar } from './FilterBar';
import { REVIEWERS } from '../../types/params';

export function ParameterPanel() {
  const {
    functionExpr,
    rotationAxis,
    axisOffset,
    intervalA,
    intervalB,
    sliceCount,
    showSlices,
    method,
    validation,
    setFunctionExpr,
    setRotationAxis,
    setAxisOffset,
    setIntervalA,
    setIntervalB,
    setSliceCount,
    setShowSlices,
    setMethod,
    reset,
  } = useParamStore();

  const funcValidation = useMemo(() => validateFunction(functionExpr), [functionExpr]);

  const assignedReviewer = validation.assignedReviewer
    ? REVIEWERS.find((r) => r.id === validation.assignedReviewer)
    : null;

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <Code size={18} />
            参数配置
          </h2>
          <button
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="重置参数"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Code size={14} className="text-blue-400" />
            函数曲线 f(x) =
          </label>
          <input
            type="text"
            value={functionExpr}
            onChange={(e) => setFunctionExpr(e.target.value)}
            className={`w-full px-3 py-2 bg-slate-800/80 border rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
              funcValidation.valid
                ? 'border-slate-600 focus:ring-blue-500/50 focus:border-blue-500'
                : 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
            }`}
            placeholder="例如: x^2, sin(x), sqrt(1-x^2)"
          />
          {!funcValidation.valid && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              {funcValidation.error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">旋转轴</label>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'custom'] as const).map((axis) => (
              <button
                key={axis}
                onClick={() => setRotationAxis(axis)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  rotationAxis === axis
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {axis === 'x' ? 'X轴' : axis === 'y' ? 'Y轴' : '自定义'}
              </button>
            ))}
          </div>
          {rotationAxis === 'custom' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">轴偏移量</label>
              <input
                type="number"
                value={axisOffset}
                onChange={(e) => setAxisOffset(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">区间端点 a</label>
            <input
              type="number"
              value={intervalA}
              onChange={(e) => setIntervalA(parseFloat(e.target.value) || 0)}
              step="0.1"
              className={`w-full px-3 py-2 bg-slate-800/80 border rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                validation.isIntervalReversed
                  ? 'border-amber-500/50 focus:ring-amber-500/50'
                  : 'border-slate-600 focus:ring-blue-500/50'
              }`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">区间端点 b</label>
            <input
              type="number"
              value={intervalB}
              onChange={(e) => setIntervalB(parseFloat(e.target.value) || 0)}
              step="0.1"
              className={`w-full px-3 py-2 bg-slate-800/80 border rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                validation.isIntervalReversed
                  ? 'border-amber-500/50 focus:ring-amber-500/50'
                  : 'border-slate-600 focus:ring-blue-500/50'
              }`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Layers size={14} className="text-purple-400" />
              切片数量: <span className="font-mono text-blue-400">{sliceCount}</span>
            </label>
            {validation.isSliceInsufficient && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                过少
              </span>
            )}
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={sliceCount}
            onChange={(e) => setSliceCount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>1</span>
            <span>20</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Calculator size={14} className="text-green-400" />
            计算方法
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod('disk')}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                method === 'disk'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              圆盘法
            </button>
            <button
              onClick={() => setMethod('shell')}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                method === 'shell'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              壳层法
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showSlices}
              onChange={(e) => setShowSlices(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
          <span className="text-sm text-slate-300">显示切片</span>
        </div>

        {validation.issues.length > 0 && (
          <div className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
              <AlertTriangle size={16} />
              参数校验异常
            </div>
            {validation.issues.map((issue, idx) => (
              <div key={idx} className="text-xs space-y-1">
                <p className="text-amber-300">{issue.message}</p>
                <p className="text-slate-400">{issue.nextAction}</p>
              </div>
            ))}
            {assignedReviewer && (
              <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
                  {assignedReviewer.name[0]}
                </div>
                <div>
                  <p className="text-xs text-slate-300">{assignedReviewer.name}</p>
                  <p className="text-xs text-slate-500">{assignedReviewer.role}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {validation.reviewStatus === 'approved' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
              <CheckCircle size={12} />
              已通过
            </span>
          )}
          {validation.reviewStatus === 'pending' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs">
              <AlertTriangle size={12} />
              待审核
            </span>
          )}
          {validation.reviewStatus === 'needs_review' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
              <XCircle size={12} />
              需确认
            </span>
          )}
          {validation.reviewStatus === 'rejected' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
              <XCircle size={12} />
              已驳回
            </span>
          )}
        </div>

        <VolumeInfo />
      </div>

      <FilterBar />
    </div>
  );
}
