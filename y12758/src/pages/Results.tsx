import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronRight,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ExplanationTooltip from '@/components/ExplanationTooltip';
import { useStore } from '@/store';
import { exportToCSV } from '@/utils/exportUtils';
import type { ExperimentBatch, CheckResult } from '@/types';

export default function Results() {
  const { batches, currentBatchId, checkResults, setCurrentBatch } = useStore();

  const currentBatch = useMemo<ExperimentBatch | undefined>(
    () => batches.find((b) => b.batchId === currentBatchId),
    [batches, currentBatchId]
  );

  const currentResult = useMemo<CheckResult | undefined>(
    () => (currentBatchId ? checkResults[currentBatchId] : undefined),
    [checkResults, currentBatchId]
  );

  const handleExport = () => {
    if (!currentResult || !currentBatch) return;
    const csv = exportToCSV(currentResult, currentBatch);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `杂质检查报告_${currentBatch.batchId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-ink-light flex items-center justify-center mb-4">
          <ClipboardCheck className="w-8 h-8 text-ink-muted" />
        </div>
        <p className="text-ink-muted text-sm mb-6">暂无检查结果，请先在实验记录页面导入数据</p>
        <Link
          to="/records"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          去导入数据
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">杂质限度检查结果</h2>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-muted">选择批次：</label>
          <select
            value={currentBatchId ?? ''}
            onChange={(e) => setCurrentBatch(e.target.value || null)}
            className="px-3 py-2 rounded-md border border-ink-light bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">请选择批次</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.batchId} — {b.sampleName}
              </option>
            ))}
          </select>
        </div>

        {!currentBatch || !currentResult ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-12 h-12 text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">请从上方选择一个批次查看检查结果</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-ink-light p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-ink-muted mb-1">批次号</div>
                  <div className="text-ink font-medium">{currentBatch.batchId}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted mb-1">样品名称</div>
                  <div className="text-ink font-medium">{currentBatch.sampleName}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted mb-1">记录日期</div>
                  <div className="text-ink font-medium">{currentBatch.recordDate}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted mb-1">反应条件</div>
                  <div className="text-ink font-medium text-sm">
                    {currentBatch.reactionConditions?.temperature !== undefined &&
                      `温度 ${currentBatch.reactionConditions.temperature}°C `}
                    {currentBatch.reactionConditions?.ph !== undefined &&
                      `pH ${currentBatch.reactionConditions.ph} `}
                    {currentBatch.reactionConditions?.time !== undefined &&
                      `时间 ${currentBatch.reactionConditions.time}min`}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg p-5 flex items-center justify-between ${
                currentResult.overallStatus === 'PASS'
                  ? 'bg-pass-light border border-pass'
                  : 'bg-fail-light border border-fail'
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`font-serif text-3xl font-bold ${
                    currentResult.overallStatus === 'PASS' ? 'text-pass' : 'text-fail'
                  }`}
                >
                  {currentResult.overallStatus}
                </span>
                <StatusBadge status={currentResult.overallStatus} />
                <span
                  className={`text-sm ${
                    currentResult.overallStatus === 'PASS' ? 'text-pass' : 'text-fail'
                  }`}
                >
                  {currentResult.explanation}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {currentResult.impurityResults.map((imp) => {
                const impurityRecord = currentBatch.impurities.find((i) => i.id === imp.impurityId);
                return (
                  <div
                    key={imp.impurityId}
                    className={`bg-white rounded-lg border border-ink-light p-4 flex items-center justify-between ${
                      imp.status === 'FAIL'
                        ? 'border-l-4 border-l-fail'
                        : 'border-l-4 border-l-pass'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-ink font-medium">{imp.name}</div>
                      <div className="text-xs text-ink-muted mt-0.5">{impurityRecord?.standard ?? '标准依据'}</div>
                    </div>
                  <div className="flex items-center gap-8 font-mono tabular-nums text-sm">
                    <div className="text-center">
                      <div className="text-ink-muted text-xs mb-0.5">实测值</div>
                      <div className="text-ink">{imp.measured}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-ink-muted text-xs mb-0.5">限度值</div>
                      <div className="text-ink">{imp.limit}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-ink-muted text-xs mb-0.5">偏差</div>
                      <div
                        className={imp.status === 'FAIL' ? 'text-fail' : 'text-ink'}
                      >
                        {imp.deviation}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-6">
                    <ExplanationTooltip text={imp.explanation}>
                      <StatusBadge status={imp.status} />
                    </ExplanationTooltip>
                  </div>
                  </div>
                );
              })}
            </div>

            {currentResult.retestAdvice && (
              <div className="bg-warn-light rounded-lg border border-warn p-4 flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-warn font-medium text-sm mb-1">复测建议</div>
                  <div className="text-warn text-sm">{currentResult.retestAdvice}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                to="/retest"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-light text-sm text-ink hover:bg-ink-light/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                查看复测建议
              </Link>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出报告
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
