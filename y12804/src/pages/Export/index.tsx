import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Info,
  FileJson,
  MousePointerClick,
} from 'lucide-react';
import type { ExportOptions } from '@/types';
import {
  exportToCSV,
  exportToHTML,
  downloadFile,
  generateExportFileName,
} from '@/utils/export';
import { formatDateTime } from '@/utils/common';

export default function ExportPage() {
  const {
    samples,
    qcResults,
    anomalies,
    cages,
    reagentBatches,
    runBatches,
    currentRunBatch,
  } = useAppStore();

  const [selectedRunBatchId, setSelectedRunBatchId] = useState<string>(
    currentRunBatch?.id || ''
  );
  const [exportFormat, setExportFormat] = useState<'csv' | 'html'>('html');
  const [options, setOptions] = useState<ExportOptions>({
    format: 'html',
    includeSamples: true,
    includeQcResults: true,
    includeAnomalies: true,
    includeFormulas: false,
  });

  const selectedRunBatch = useMemo(() => {
    return runBatches.find((rb) => rb.id === selectedRunBatchId) || currentRunBatch;
  }, [runBatches, selectedRunBatchId, currentRunBatch]);

  const batchQcResults = useMemo(() => {
    if (!selectedRunBatch) return qcResults;
    return qcResults.filter((q) => q.runBatchId === selectedRunBatch.id);
  }, [selectedRunBatch, qcResults]);

  const batchAnomalies = useMemo(() => {
    if (!selectedRunBatch) return anomalies;
    return anomalies.filter((a) => a.runBatchId === selectedRunBatch.id);
  }, [selectedRunBatch, anomalies]);

  const batchSamples = useMemo(() => {
    if (!selectedRunBatch) return samples;
    const qcSampleIds = new Set(batchQcResults.map((q) => q.sampleId));
    const anomalySampleIds = new Set(
      batchAnomalies.flatMap((a) => a.affectedSamples)
    );
    return samples.filter(
      (s) => qcSampleIds.has(s.id) || anomalySampleIds.has(s.id)
    );
  }, [selectedRunBatch, samples, batchQcResults, batchAnomalies]);

  const handleExport = () => {
    if (!selectedRunBatch) {
      alert('请选择运行批次');
      return;
    }

    const exportOpts = { ...options, format: exportFormat, runBatchId: selectedRunBatch.id };

    if (exportFormat === 'csv') {
      const content = exportToCSV(
        batchSamples,
        batchQcResults,
        batchAnomalies,
        selectedRunBatch,
        cages,
        reagentBatches,
        exportOpts
      );
      const filename = generateExportFileName(selectedRunBatch.batchNumber, 'csv');
      downloadFile(content, filename, 'text/csv;charset=utf-8');
    } else {
      const content = exportToHTML(
        batchSamples,
        batchQcResults,
        batchAnomalies,
        selectedRunBatch,
        cages,
        reagentBatches,
        exportOpts
      );
      const filename = generateExportFileName(selectedRunBatch.batchNumber, 'html');
      downloadFile(content, filename, 'text/html;charset=utf-8');
    }
  };

  const previewFileName = selectedRunBatch
    ? generateExportFileName(selectedRunBatch.batchNumber, exportFormat)
    : '请选择运行批次';

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <Card title="导出配置" subtitle="设置导出内容和格式">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                选择运行批次
              </label>
              <select
                value={selectedRunBatchId}
                onChange={(e) => setSelectedRunBatchId(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
              >
                {runBatches.length === 0 && <option value="">暂无运行批次</option>}
                {runBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.batchNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-3">
                导出格式
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('html')}
                  className={`p-4 rounded-md border-2 text-left transition-all ${
                    exportFormat === 'html'
                      ? 'border-medical-500 bg-medical-50'
                      : 'border-neutral-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-medical-100 rounded-md flex items-center justify-center">
                      <FileCode className="w-5 h-5 text-medical-600" />
                    </div>
                    <div>
                      <p className="font-medium text-primary-800">HTML 报告</p>
                      <p className="text-xs text-neutral-500">带格式的完整报告</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    适合质控组直接查看，包含样式和异常说明
                  </p>
                </button>

                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-md border-2 text-left transition-all ${
                    exportFormat === 'csv'
                      ? 'border-medical-500 bg-medical-50'
                      : 'border-neutral-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-success-100 rounded-md flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-primary-800">CSV 表格</p>
                      <p className="text-xs text-neutral-500">纯数据表格格式</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    适合用 Excel 打开，方便进一步数据分析
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-3">
                包含内容
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-md cursor-pointer hover:bg-neutral-100">
                  <input
                    type="checkbox"
                    checked={options.includeSamples}
                    onChange={(e) =>
                      setOptions({ ...options, includeSamples: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-medical-600 focus:ring-medical-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-800">样本明细</p>
                    <p className="text-xs text-neutral-500">
                      包含样本条码、笼位、采集信息等
                    </p>
                  </div>
                  <Badge variant="default">{samples.length} 条</Badge>
                </label>

                <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-md cursor-pointer hover:bg-neutral-100">
                  <input
                    type="checkbox"
                    checked={options.includeQcResults}
                    onChange={(e) =>
                      setOptions({ ...options, includeQcResults: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-medical-600 focus:ring-medical-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-800">质控结果</p>
                    <p className="text-xs text-neutral-500">
                      包含检测项目、结果值、状态、试剂批号等
                    </p>
                  </div>
                  <Badge variant="default">{qcResults.length} 条</Badge>
                </label>

                <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-md cursor-pointer hover:bg-neutral-100">
                  <input
                    type="checkbox"
                    checked={options.includeAnomalies}
                    onChange={(e) =>
                      setOptions({ ...options, includeAnomalies: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-neutral-300 text-medical-600 focus:ring-medical-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-800">异常清单</p>
                    <p className="text-xs text-neutral-500">
                      包含异常描述、原因、处理建议等
                    </p>
                  </div>
                  <Badge variant="supplement">{anomalies.length} 条</Badge>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {selectedRunBatch && (
          <Card
            title="文件名预览"
            subtitle="文件名中包含批次号和导出时间，便于区分不同运行"
          >
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-md">
              {exportFormat === 'html' ? (
                <FileCode className="w-10 h-10 text-medical-500" />
              ) : (
                <FileSpreadsheet className="w-10 h-10 text-success-500" />
              )}
              <div className="flex-1">
                <p className="font-mono text-sm text-primary-800 break-all">
                  {previewFileName}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  文件名格式：小鼠笼位健康台账_运行批次号_导出时间.格式
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card
          title="导出版本说明"
          subtitle="为什么要区分运行批次？"
        >
          <div className="space-y-4 text-sm text-neutral-600">
            <div className="p-3 bg-medical-50 rounded-md border border-medical-200">
              <p className="text-medical-800 font-medium mb-1">
                🔍 便于追溯
              </p>
              <p className="text-medical-700 text-xs">
                质控组可根据批次号追溯到具体的运行记录，
                便于审核和复查。
              </p>
            </div>

            <div className="p-3 bg-supplement-50 rounded-md border border-supplement-200">
              <p className="text-supplement-800 font-medium mb-1">
                📋 拦截原因明确
              </p>
              <p className="text-supplement-700 text-xs">
                导出报告中自动包含条码重复等异常的拦截原因说明，
                质控组即使只看导出报告也能明白为什么被拦。
              </p>
            </div>

            <div className="p-3 bg-recalibration-50 rounded-md border border-recalibration-200">
              <p className="text-recalibration-800 font-medium mb-1">
                📊 批次间对比
              </p>
              <p className="text-recalibration-700 text-xs">
                不同批次的报告可以对比分析，观察质控趋势变化，
                判断是补材料还是改口径。
              </p>
            </div>
          </div>
        </Card>

        {selectedRunBatch && (
          <Card title="本批次概览">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">批次名称</span>
                <span className="font-medium text-primary-800">
                  {selectedRunBatch.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">批次号</span>
                <span className="font-mono text-primary-700">
                  {selectedRunBatch.batchNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">操作人</span>
                <span className="text-primary-700">
                  {selectedRunBatch.operator}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">运行时间</span>
                <span className="text-primary-700">
                  {formatDateTime(selectedRunBatch.runAt)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">样本数量</span>
                <Badge variant="info">{selectedRunBatch.sampleCount}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">异常数量</span>
                <Badge
                  variant={selectedRunBatch.anomalyCount > 0 ? 'supplement' : 'success'}
                >
                  {selectedRunBatch.anomalyCount}
                </Badge>
              </div>
            </div>

            {batchAnomalies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <h5 className="text-sm font-medium text-primary-700 mb-2">
                  主要异常类型
                </h5>
                <div className="space-y-2">
                  {batchAnomalies.slice(0, 3).map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="text-xs p-2 bg-neutral-50 rounded"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary-700">
                          {anomaly.type}
                        </span>
                        <Badge
                          variant={
                            anomaly.category === 'supplement'
                              ? 'supplement'
                              : 'recalibration'
                          }
                        >
                          {anomaly.category === 'supplement'
                            ? '补材料'
                            : '改口径'}
                        </Badge>
                      </div>
                      <p className="text-neutral-500 line-clamp-2">
                        {anomaly.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        <Button
          size="lg"
          className="w-full"
          leftIcon={<Download className="w-5 h-5" />}
          onClick={handleExport}
          disabled={!selectedRunBatch}
        >
          导出报告
        </Button>

        {!selectedRunBatch && (
          <p className="text-xs text-center text-neutral-400">
            请先选择运行批次后再导出
          </p>
        )}
      </div>
    </div>
  );
}
