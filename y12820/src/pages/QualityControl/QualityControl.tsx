import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  ShieldCheck,
  Play,
  Upload,
  Thermometer,
  AlertTriangle,
  FlaskConical,
  Settings,
  Layers,
} from 'lucide-react';
import { useQCStore } from '@/store/qcStore';
import { useSampleStore } from '@/store/sampleStore';
import { useUIStore } from '@/store/uiStore';
import { QCThresholds } from '@/types';
import TraceChain from '@/components/common/TraceChain';
import { cn } from '@/lib/utils';

function ThresholdInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm font-semibold text-gray-900 w-20 text-right">{value}{unit}</span>
      </div>
    </div>
  );
}

export default function QualityControl() {
  const {
    thresholds,
    updateThresholds,
    runQualityFilter,
    isFiltering,
    getLowQualitySamples,
    getQualityStats,
    getTraceChain,
  } = useQCStore();
  const { samples, importPathologyNotes } = useSampleStore();
  const { selectedSampleId, setSelectedSampleId, showNotification } = useUIStore();

  const [showNoteImport, setShowNoteImport] = useState(false);
  const lowQualitySamples = getLowQualitySamples();
  const qualityStats = getQualityStats();

  const heatmapOption = useMemo(() => {
    const sampleNames = samples.slice(0, 8).map((s) => s.name);
    const metrics = ['质控分数', '读段质量', '低质量占比'];
    const data: number[][] = [];

    for (let i = 0; i < sampleNames.length; i++) {
      for (let j = 0; j < metrics.length; j++) {
        const value = j === 0 ? 30 + Math.random() * 25 : j === 1 ? 20 + Math.random() * 20 : Math.random() * 30;
        data.push([j, i, Math.round(value * 10) / 10]);
      }
    }

    return {
      tooltip: {
        position: 'top',
        formatter: (params: { data: number[] }) =>
          `${sampleNames[params.data[1]]}<br/>${metrics[params.data[0]]}: ${params.data[2]}`,
      },
      grid: { left: '15%', right: '5%', top: '5%', bottom: '15%' },
      xAxis: { type: 'category', data: metrics, splitArea: { show: true } },
      yAxis: { type: 'category', data: sampleNames, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: 60,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: { color: ['#EF4444', '#F59E0B', '#10B981'] },
      },
      series: [{ name: '质量热力图', type: 'heatmap', data, label: { show: true, fontSize: 11 } }],
    };
  }, [samples]);

  const handleRunFilter = () => {
    const results = runQualityFilter();
    const failed = Array.from(results.values()).filter((r) => !r.passed).length;
    showNotification(
      failed > 0 ? 'warning' : 'success',
      failed > 0 ? `质控筛选完成，发现${failed}个低质量样本` : '质控筛选完成，所有样本通过'
    );
  };

  const handleThresholdChange = (key: keyof QCThresholds, value: number) => {
    updateThresholds({ [key]: value });
  };

  const handleNoteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const mockNotes = [
      { barcode: 'BC001', content: '测试备注1', pathologist: '测试医师', noteTime: new Date(), isConflict: false, sampleId: samples.find(s => s.barcode === 'BC001')?.id || '' },
      { barcode: 'BC002', content: '测试备注2', pathologist: '测试医师', noteTime: new Date(), isConflict: false, sampleId: samples.find(s => s.barcode === 'BC002')?.id || '' },
    ];
    const result = importPathologyNotes(mockNotes);
    showNotification('success', `匹配${result.matched.length}条，未匹配${result.unmatched.length}条`);
    setShowNoteImport(false);
  };

  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const traceChain = selectedSampleId ? getTraceChain(selectedSampleId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">质控中心</h1>
          <p className="mt-1 text-sm text-gray-500">配置质控规则，筛选低质量数据</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNoteImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            导入病理备注
          </button>
          <button
            onClick={handleRunFilter}
            disabled={isFiltering}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white',
              isFiltering ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            )}
          >
            <Play className={cn('h-4 w-4', isFiltering && 'animate-spin')} />
            {isFiltering ? '运行中...' : '一键运行质控筛选'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">质控阈值配置</h2>
          </div>
          <div className="space-y-5">
            <ThresholdInput label="最低质控分数" value={thresholds.minQcScore} min={0} max={60} step={1} unit="分" onChange={(v) => handleThresholdChange('minQcScore', v)} />
            <ThresholdInput label="最低读段质量" value={thresholds.minReadQuality} min={0} max={40} step={1} unit="" onChange={(v) => handleThresholdChange('minReadQuality', v)} />
            <ThresholdInput label="最大低质量占比" value={thresholds.maxLowQualityRatio * 100} min={0} max={50} step={1} unit="%" onChange={(v) => handleThresholdChange('maxLowQualityRatio', v / 100)} />
          </div>
          <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-gray-900">{qualityStats.total}</p><p className="text-xs text-gray-500">总样本</p></div>
            <div><p className="text-2xl font-bold text-green-600">{qualityStats.passed}</p><p className="text-xs text-gray-500">通过</p></div>
            <div><p className="text-2xl font-bold text-red-600">{qualityStats.failed}</p><p className="text-xs text-gray-500">失败</p></div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">质量热力图</h2>
          </div>
          <ReactECharts option={heatmapOption} style={{ height: '320px' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              低质量样本列表
              <span className="ml-2 text-sm font-normal text-gray-500">({lowQualitySamples.length}个)</span>
            </h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lowQualitySamples.map((record) => {
              const sample = samples.find((s) => s.id === record.sampleId);
              if (!sample) return null;
              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedSampleId(sample.id)}
                  className={cn(
                    'rounded-lg border p-4 cursor-pointer',
                    selectedSampleId === sample.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-sm font-mono text-gray-900">{sample.barcode}</code>
                      <p className="text-sm font-medium text-gray-700 mt-1">{sample.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{record.qcScore.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">质控分数</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {record.filterReasons.map((reason, idx) => (
                      <span key={idx} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{reason}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {lowQualitySamples.length === 0 && (
              <div className="text-center py-8">
                <ShieldCheck className="mx-auto h-12 w-12 text-green-400" />
                <p className="mt-2 text-sm text-gray-500">暂无低质量样本</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              来源追溯
              {selectedSample && <span className="text-sm font-normal text-gray-500"> - {selectedSample.name}</span>}
            </h2>
          </div>
          {selectedSampleId && traceChain.length > 0 ? (
            <TraceChain nodes={traceChain} />
          ) : (
            <div className="text-center py-12">
              <FlaskConical className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">
                {selectedSampleId ? '暂无追溯数据' : '点击左侧样本查看来源追溯链'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showNoteImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">批量导入病理备注</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">选择包含病理备注的文件</p>
              <p className="text-xs text-gray-400 mb-3">支持 CSV 和 Excel 格式</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleNoteUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowNoteImport(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
