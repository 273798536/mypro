import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';

export default function Retest() {
  const { batches, checkResults, currentBatchId, setCurrentBatch } = useStore();

  const batchesNeedingRetest = useMemo(() => {
    return batches.filter((batch) => {
      const result = checkResults[batch.batchId];
      return result && (result.overallStatus === 'FAIL' || result.retestAdvice);
    });
  }, [batches, checkResults]);

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-ink-light flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-ink-muted" />
        </div>
        <p className="text-ink-muted text-sm mb-6">暂无数据，请先在实验记录页面导入数据</p>
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
      <h2 className="font-serif text-2xl text-ink">复测建议</h2>

      {batchesNeedingRetest.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-ink-muted mb-3" />
          <p className="text-ink-muted text-sm">暂无需要复测的批次</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batchesNeedingRetest.map((batch) => {
            const result = checkResults[batch.batchId];
            return (
              <div
                key={batch.batchId}
                className="bg-white rounded-xl border border-ink-light p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-ink">
                      {batch.batchId} — {batch.sampleName}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">{batch.recordDate}</div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      result?.overallStatus === 'FAIL'
                        ? 'bg-fail-light text-fail'
                        : 'bg-warn-light text-warn'
                    }`}
                  >
                    {result?.overallStatus}
                  </span>
                </div>
                {result?.retestAdvice && (
                  <div className="bg-warn-light rounded-lg border border-warn p-4 flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-warn font-medium text-sm mb-1">复测建议</div>
                      <div className="text-warn text-sm">{result.retestAdvice}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {batchesNeedingRetest.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-muted">查看详情：</label>
          <select
            value={currentBatchId ?? ''}
            onChange={(e) => setCurrentBatch(e.target.value || null)}
            className="px-3 py-2 rounded-md border border-ink-light bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">请选择批次</option>
            {batchesNeedingRetest.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.batchId} — {b.sampleName}
              </option>
            ))}
          </select>
          {currentBatchId && (
            <Link
              to="/results"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              查看检查结果
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
