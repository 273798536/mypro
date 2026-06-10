import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  BarChart3,
  Play,
  Settings,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useSampleStore } from '@/store/sampleStore';
import { useUIStore } from '@/store/uiStore';
import ActionableErrorDisplay from '@/components/common/ActionableErrorDisplay';
import { cn } from '@/lib/utils';

export default function DifferentialAnalysis() {
  const {
    analyses,
    createAnalysis,
    runAnalysis,
    isRunning,
    error,
    getVolcanoData,
    getSignificantResults,
    clearError,
    retryAnalysis,
  } = useAnalysisStore();
  const { groups, samples } = useSampleStore();
  const { showNotification } = useUIStore();

  const [controlGroupId, setControlGroupId] = useState(groups.find((g) => g.type === 'control')?.id || '');
  const [experimentalGroupId, setExperimentalGroupId] = useState(groups.find((g) => g.type === 'experimental')?.id || '');
  const [pValueThreshold, setPValueThreshold] = useState(0.05);
  const [foldChangeThreshold, setFoldChangeThreshold] = useState(1.5);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(analyses[0]?.id || '');

  const currentAnalysis = analyses.find((a) => a.id === selectedAnalysisId);
  const volcanoData = useMemo(() => selectedAnalysisId ? getVolcanoData(selectedAnalysisId) : [], [selectedAnalysisId, getVolcanoData]);
  const significantResults = useMemo(() => selectedAnalysisId ? getSignificantResults(selectedAnalysisId) : [], [selectedAnalysisId, getSignificantResults]);

  const volcanoOption = useMemo(() => {
    const log2FC = Math.log2(foldChangeThreshold);
    const negLog10P = -Math.log10(pValueThreshold);
    const upData = volcanoData.filter((d) => d.regulation === 'up').map((d) => [d.x, d.y, d.sampleName]);
    const downData = volcanoData.filter((d) => d.regulation === 'down').map((d) => [d.x, d.y, d.sampleName]);
    const noneData = volcanoData.filter((d) => d.regulation === 'none').map((d) => [d.x, d.y, d.sampleName]);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: { data: number[] }) => {
          const name = params.data[2];
          const fc = Math.pow(2, params.data[0]).toFixed(2);
          const p = Math.pow(10, -params.data[1]).toFixed(4);
          return `${name}<br/>log2FC: ${params.data[0].toFixed(2)}<br/>FC: ${fc}<br/>P-value: ${p}`;
        },
      },
      grid: { left: '10%', right: '5%', top: '5%', bottom: '10%' },
      xAxis: { type: 'value', name: 'log2(Fold Change)', nameLocation: 'middle', nameGap: 25, splitLine: { lineStyle: { type: 'dashed' } } },
      yAxis: { type: 'value', name: '-log10(P-value)', nameLocation: 'middle', nameGap: 35, splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        { name: '上调', type: 'scatter', data: upData, itemStyle: { color: '#10B981' }, symbolSize: 10 },
        { name: '下调', type: 'scatter', data: downData, itemStyle: { color: '#EF4444' }, symbolSize: 10 },
        { name: '无显著差异', type: 'scatter', data: noneData, itemStyle: { color: '#9CA3AF' }, symbolSize: 8 },
      ],
      markLine: {
        silent: true,
        lineStyle: { type: 'dashed', color: '#6B7280' },
        data: [
          { xAxis: log2FC, lineStyle: { color: '#10B981' } },
          { xAxis: -log2FC, lineStyle: { color: '#EF4444' } },
          { yAxis: negLog10P },
        ],
        label: { show: false },
      },
    };
  }, [volcanoData, pValueThreshold, foldChangeThreshold]);

  const handleCreateAndRun = async () => {
    if (!controlGroupId || !experimentalGroupId) {
      showNotification('error', '请选择对照组和实验组');
      return;
    }
    if (controlGroupId === experimentalGroupId) {
      showNotification('error', '对照组和实验组不能相同');
      return;
    }

    const newAnalysis = {
      name: `${groups.find((g) => g.id === controlGroupId)?.name} vs ${groups.find((g) => g.id === experimentalGroupId)?.name}`,
      controlGroupId,
      experimentalGroupId,
      method: 't检验',
      pValueThreshold,
      foldChangeThreshold,
    };

    createAnalysis(newAnalysis);
    const analysisId = analyses[analyses.length - 1]?.id || 'A001';
    setSelectedAnalysisId(analysisId);
    await runAnalysis(analysisId);
    showNotification('success', '差异分析完成');
  };

  const getRegulationIcon = (regulation: string) => {
    if (regulation === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (regulation === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getRegulationLabel = (regulation: string) => {
    if (regulation === 'up') return { text: '上调', class: 'bg-green-100 text-green-700' };
    if (regulation === 'down') return { text: '下调', class: 'bg-red-100 text-red-700' };
    return { text: '无差异', class: 'bg-gray-100 text-gray-700' };
  };

  const upCount = significantResults.filter((r) => r.regulation === 'up').length;
  const downCount = significantResults.filter((r) => r.regulation === 'down').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">差异分析</h1>
          <p className="mt-1 text-sm text-gray-500">配置分析参数，运行组间差异比较</p>
        </div>
        <button
          onClick={handleCreateAndRun}
          disabled={isRunning}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white',
            isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          <Play className={cn('h-4 w-4', isRunning && 'animate-spin')} />
          {isRunning ? '分析中...' : '运行分析'}
        </button>
      </div>

      {error && (
        <ActionableErrorDisplay
          error={error}
          onPrimaryAction={() => retryAnalysis(selectedAnalysisId, false)}
          onSecondaryAction={error.canSkip ? () => retryAnalysis(selectedAnalysisId, true) : undefined}
          primaryLabel="修复并重试"
          secondaryLabel={error.skipLabel}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">分析配置</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Users className="h-4 w-4 inline mr-1" />对照组</label>
              <select value={controlGroupId} onChange={(e) => setControlGroupId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="">请选择对照组</option>
                {groups.filter((g) => g.type === 'control').map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.sampleIds.length}个)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Users className="h-4 w-4 inline mr-1" />实验组</label>
              <select value={experimentalGroupId} onChange={(e) => setExperimentalGroupId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="">请选择实验组</option>
                {groups.filter((g) => g.type === 'experimental').map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.sampleIds.length}个)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">P值阈值: {pValueThreshold}</label>
              <input type="range" min="0.01" max="0.1" step="0.01" value={pValueThreshold} onChange={(e) => setPValueThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">倍数变化阈值: {foldChangeThreshold}</label>
              <input type="range" min="1.2" max="3" step="0.1" value={foldChangeThreshold} onChange={(e) => setFoldChangeThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">历史分析</label>
              <select
                value={selectedAnalysisId}
                onChange={(e) => { setSelectedAnalysisId(e.target.value); clearError(); }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.status === 'completed' ? '已完成' : a.status === 'failed' ? '失败' : '进行中'})</option>
                ))}
              </select>
            </div>
          </div>

          {currentAnalysis && (
            <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-bold text-gray-900">{volcanoData.length}</p><p className="text-xs text-gray-500">总样本</p></div>
              <div><p className="text-xl font-bold text-green-600">{upCount}</p><p className="text-xs text-gray-500">上调</p></div>
              <div><p className="text-xl font-bold text-red-600">{downCount}</p><p className="text-xs text-gray-500">下调</p></div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">火山图</h2>
            {currentAnalysis && <span className="text-sm font-normal text-gray-500">- {currentAnalysis.name}</span>}
          </div>
          {volcanoData.length > 0 ? (
            <ReactECharts option={volcanoOption} style={{ height: '400px' }} />
          ) : (
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm text-gray-500">请先运行分析生成火山图</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">显著差异结果</h2>
        {significantResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">样本</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">调控</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">log2FC</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">P-value</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">校正P-value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {significantResults.map((result) => {
                  const sample = samples.find((s) => s.id === result.sampleId);
                  const label = getRegulationLabel(result.regulation);
                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">{sample?.name || result.sampleId}</p>
                        <p className="text-xs text-gray-500">{sample?.barcode}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', label.class)}>
                          {getRegulationIcon(result.regulation)}{label.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{result.log2FoldChange.toFixed(4)}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{result.pValue.toFixed(6)}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{result.adjustedPValue.toFixed(6)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">暂无显著差异结果</p>
          </div>
        )}
      </div>
    </div>
  );
}
