import { Copy, Download, Check, FileText, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateComparisonReport, compareFitResults } from '../utils/reportGenerator';
import { formatNumber, getUnitShortLabel } from '../utils/unitConversion';

export function ReportSection() {
  const { 
    fitResults, 
    activeResultId, 
    runFitting, 
    isFitting,
    anomalies,
    compareMode,
    compareResultIds
  } = useAppStore();
  
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeResult = fitResults.find(r => r.id === activeResultId);
  const compareResult1 = compareResultIds ? fitResults.find(r => r.id === compareResultIds[0]) : null;
  const compareResult2 = compareResultIds ? fitResults.find(r => r.id === compareResultIds[1]) : null;

  const displayReport = (() => {
    if (compareMode && compareResult1 && compareResult2) {
      const diffs = compareFitResults(compareResult1, compareResult2);
      return generateComparisonReport(compareResult1, compareResult2, diffs);
    }
    return activeResult?.report || '';
  })();

  const handleRunFitting = () => {
    setMessage(null);
    const result = runFitting();
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message || ''
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCopy = async () => {
    if (!displayReport) return;
    try {
      await navigator.clipboard.writeText(displayReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleExport = () => {
    if (!displayReport) return;
    const blob = new Blob([displayReport], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const material = activeResult?.material.name || 'decay';
    link.download = `${material}_fit_report_${timestamp}.txt`;
    link.click();
  };

  const errorCount = anomalies.filter(a => a.severity === 'error').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;

  return (
    <div className="lab-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">📋</span>
          {compareMode && compareResultIds ? '对比报告' : '拟合报告'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRunFitting}
            disabled={isFitting}
            className="lab-btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            运行拟合
          </button>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="mb-3 p-3 bg-lab-danger/10 border border-lab-danger/50 rounded text-sm text-lab-danger">
          ⚠️ 存在 {errorCount} 个错误，请先修正后再运行拟合
          {warningCount > 0 && `（另有 ${warningCount} 个警告）`}
        </div>
      )}

      {message && (
        <div className={`mb-3 p-3 rounded text-sm ${
          message.type === 'success' 
            ? 'bg-lab-success/10 border border-lab-success/50 text-lab-success' 
            : 'bg-lab-danger/10 border border-lab-danger/50 text-lab-danger'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleCopy}
          disabled={!displayReport}
          className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-info disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm flex-1"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制报告'}
        </button>
        <button
          onClick={handleExport}
          disabled={!displayReport}
          className="lab-btn bg-transparent border-lab-border text-lab-muted hover:border-lab-info hover:text-lab-info disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm flex-1"
        >
          <Download size={14} />
          导出报告
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin min-h-0">
        {!displayReport ? (
          <div className="h-full flex items-center justify-center text-lab-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">📄</div>
              <p>点击"运行拟合"生成报告</p>
              <p className="text-sm mt-1">报告将包含原始数据、拟合参数和异常说明</p>
            </div>
          </div>
        ) : (
          <pre className="bg-lab-bg rounded-lg p-4 text-sm font-mono whitespace-pre-wrap border border-lab-border leading-relaxed">
            {displayReport}
          </pre>
        )}
      </div>

      {activeResult && !compareMode && (
        <div className="mt-3 pt-3 border-t border-lab-border flex justify-between text-xs text-lab-muted">
          <span>
            共 {activeResult.dataPoints.length} 个数据点
          </span>
          <span>
            R² = {formatNumber(activeResult.rSquared, 6)} | 
            t₁/₂ = {formatNumber(activeResult.halfLife, 4)} {getUnitShortLabel(activeResult.halfLifeUnit)}
          </span>
        </div>
      )}
    </div>
  );
}
