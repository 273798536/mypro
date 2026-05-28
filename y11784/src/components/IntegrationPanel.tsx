import { useCallback } from 'react';
import { Calculator, Play, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePathStore } from '@/store/pathStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useResultStore } from '@/store/resultStore';
import { useRevisionStore } from '@/store/revisionStore';
import { useVectorField } from '@/hooks/useVectorField';
import { usePathInterpolation } from '@/hooks/usePathInterpolation';
import { useNumericalIntegration } from '@/hooks/useNumericalIntegration';
import { INTEGRATION_METHODS } from '@/shared/constants';
import type { IntegrationMethod } from '@/types';
import { cn } from '@/lib/utils';

export function IntegrationPanel() {
  const { vectorFields, activeVectorFieldId, paths } = usePathStore();
  const { config, selectedPathIds, setMethod, setStepSize, setAdaptiveTolerance, setGaussOrder, setIsComputing } = useIntegrationStore();
  const { addResults, clearResults } = useResultStore();
  const { addEntry } = useRevisionStore();

  const activeVf = vectorFields.find((vf) => vf.id === activeVectorFieldId);
  const { parsedField, isValid } = useVectorField(activeVf || null);
  const { isComputing, progress, computeMultiple } = useNumericalIntegration();

  const activePaths = paths.filter((p) => p.vectorFieldId === activeVectorFieldId);
  const computePaths = activePaths.filter((p) => selectedPathIds.includes(p.id));

  const handleCompute = useCallback(async () => {
    if (!parsedField || computePaths.length === 0) return;

    setIsComputing(true);

    const pathData = computePaths.map((path) => {
      const { interpolatedPoints } = usePathInterpolation(path.nodes, config.stepSize);
      return {
        pathId: path.id,
        points: interpolatedPoints,
      };
    });

    const results = await computeMultiple(
      parsedField.evaluate,
      pathData,
      config
    );

    addResults(results.map((r) => r.result));

    addEntry({
      targetType: 'integrationConfig',
      targetId: 'computation',
      action: 'update',
      previousValue: null,
      newValue: {
        method: config.method,
        stepSize: config.stepSize,
        pathsComputed: computePaths.length,
      },
      source: '积分计算',
      correctionNote: `计算 ${computePaths.length} 条路径的曲线积分`,
    });

    setIsComputing(false);
  }, [parsedField, computePaths, config, computeMultiple, addResults, addEntry, setIsComputing]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-slate-600" />
        <span className="font-medium text-slate-800">积分计算</span>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            积分方法
          </label>
          <select
            value={config.method}
            onChange={(e) => setMethod(e.target.value as IntegrationMethod)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {INTEGRATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} - {m.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            采样步长: {config.stepSize.toFixed(4)}
          </label>
          <input
            type="range"
            min="0.001"
            max="0.5"
            step="0.001"
            value={config.stepSize}
            onChange={(e) => setStepSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>精细 0.001</span>
            <span>粗糙 0.5</span>
          </div>
        </div>

        {config.method === 'adaptiveSimpson' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              自适应容差: {config.adaptiveTolerance?.toExponential(2)}
            </label>
            <input
              type="range"
              min="-10"
              max="-2"
              step="1"
              value={Math.log10(config.adaptiveTolerance || 1e-6)}
              onChange={(e) =>
                setAdaptiveTolerance(Math.pow(10, parseFloat(e.target.value)))
              }
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {config.method === 'gaussLegendre' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              高斯求积阶数: {config.gaussOrder}
            </label>
            <select
              value={config.gaussOrder}
              onChange={(e) => setGaussOrder(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2}>2 阶</option>
              <option value={3}>3 阶</option>
              <option value={4}>4 阶</option>
              <option value={5}>5 阶</option>
            </select>
          </div>
        )}

        {computePaths.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-700">
              请在左侧路径列表中选择要计算的路径
            </span>
          </div>
        )}

        {isComputing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>计算中...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCompute}
            disabled={!isValid || computePaths.length === 0 || isComputing}
            className={cn(
              'flex-1 px-4 py-2 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
              isValid && computePaths.length > 0 && !isComputing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-400 cursor-not-allowed'
            )}
          >
            {isComputing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isComputing ? '计算中...' : '开始计算'}
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors"
          >
            清除结果
          </button>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
          已选择 {computePaths.length} / {activePaths.length} 条路径
        </div>
      </div>
    </div>
  );
}
