import { useState } from 'react';
import { FileText, Download, X, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function ReportPanel() {
  const { exportReport, params, resultStats, correctionsApplied, untouchedFields, needsConfirmation, stability } = useSimulationStore();
  const [showReport, setShowReport] = useState(false);

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heat-sim-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const report = exportReport();
    const lines: string[] = [];
    lines.push('类别,参数,值,描述');
    
    for (const section of report.sections) {
      for (const item of section.items) {
        lines.push(`"${section.title}","${item.name}","${item.value}","${item.description}"`);
      }
    }
    
    lines.push('');
    lines.push('模拟结果,,,');
    lines.push(`最高温度,,${report.resultSummary.maxTemp.toFixed(2)} °C,`);
    lines.push(`最低温度,,${report.resultSummary.minTemp.toFixed(2)} °C,`);
    lines.push(`平均温度,,${report.resultSummary.avgTemp.toFixed(2)} °C,`);
    lines.push(`最大梯度,,${report.resultSummary.finalMaxGradient.toFixed(2)} °C/m,`);
    
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heat-sim-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">模拟报告</h3>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          <FileText size={14} />
          查看报告
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CheckCircle size={12} className="text-slate-500" />
          <span>未处理项: {untouchedFields.length}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <AlertTriangle size={12} className="text-amber-500" />
          <span>已修正项: {correctionsApplied.length}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HelpCircle size={12} className="text-blue-500" />
          <span>需确认项: {needsConfirmation.length}</span>
        </div>
      </div>

      {resultStats && (
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">结果摘要</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">最高温度</span>
              <span className="text-red-400 font-mono">{resultStats.maxTemp.toFixed(2)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">最低温度</span>
              <span className="text-blue-400 font-mono">{resultStats.minTemp.toFixed(2)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">平均温度</span>
              <span className="text-slate-200 font-mono">{resultStats.avgTemp.toFixed(2)}°C</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
        >
          <Download size={14} />
          JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors"
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">模拟报告</h2>
              <button onClick={() => setShowReport(false)} className="p-1 hover:bg-slate-700 rounded">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-medium text-emerald-400">未处理项（使用默认值）</h3>
                </div>
                {untouchedFields.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {untouchedFields.map((f) => (
                      <div key={f} className="flex justify-between">
                        <span className="text-slate-400">{f}</span>
                        <span className="text-slate-200 font-mono">{String(params[f as keyof typeof params])}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">无未处理项</p>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h3 className="text-sm font-medium text-amber-400">已修正项（系统自动调整）</h3>
                </div>
                {correctionsApplied.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {correctionsApplied.map((c, i) => (
                      <div key={i} className="bg-slate-700/50 rounded p-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{c.field}</span>
                          <span className="text-slate-200 font-mono">{c.oldValue} → {c.newValue}</span>
                        </div>
                        <p className="text-slate-500 mt-1">{c.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">无已修正项</p>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle size={16} className="text-blue-400" />
                  <h3 className="text-sm font-medium text-blue-400">需确认项（请人工审核）</h3>
                </div>
                {needsConfirmation.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {needsConfirmation.map((n, i) => (
                      <div key={i} className="bg-slate-700/50 rounded p-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{n.field}</span>
                          <span className="text-slate-200 font-mono">{n.value}</span>
                        </div>
                        <p className="text-slate-500 mt-1">{n.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">无需确认项</p>
                )}
              </div>

              {resultStats && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-slate-200 mb-2">结果摘要</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">最高温度</span>
                      <span className="text-red-400 font-mono">{resultStats.maxTemp.toFixed(2)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">最低温度</span>
                      <span className="text-blue-400 font-mono">{resultStats.minTemp.toFixed(2)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">平均温度</span>
                      <span className="text-slate-200 font-mono">{resultStats.avgTemp.toFixed(2)}°C</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
