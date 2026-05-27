import { useState } from 'react';
import { Download, FileText, FileJson, Table, CheckCircle2 } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { exportToCSV } from '../../utils/csvParser';

export default function ReportExportPanel() {
  const { getCurrentExperiment, calculateResult, history, saveToStorage } = useExperimentStore();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'html'>('csv');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);

  const currentExperiment = getCurrentExperiment();
  const result = calculateResult();

  const handleExport = () => {
    if (!currentExperiment) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportFormat === 'csv') {
      content = exportToCSV(currentExperiment);
      filename = `${currentExperiment.studentName}_声速实验报告.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else if (exportFormat === 'json') {
      const exportData = {
        experiment: currentExperiment,
        calculationResult: result,
        history: includeHistory ? history : undefined,
        exportedAt: new Date().toISOString(),
      };
      content = JSON.stringify(exportData, null, 2);
      filename = `${currentExperiment.studentName}_声速实验报告.json`;
      mimeType = 'application/json;charset=utf-8';
    } else {
      content = generateHTMLReport();
      filename = `${currentExperiment.studentName}_声速实验报告.html`;
      mimeType = 'text/html;charset=utf-8';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    saveToStorage();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const generateHTMLReport = (): string => {
    if (!currentExperiment || !result) return '';

    const measurementsTable = currentExperiment.measurements
      .sort((a, b) => a.nodeNumber - b.nodeNumber)
      .map(
        (m) => `
        <tr class="${m.isOutlier ? 'bg-orange-50' : ''}">
          <td class="px-4 py-2 border">${m.nodeNumber}</td>
          <td class="px-4 py-2 border">${m.tubeLength} cm</td>
          <td class="px-4 py-2 border ${m.isOutlier ? 'text-orange-600 font-medium' : ''}">${m.isOutlier ? '是' : '否'}</td>
          <td class="px-4 py-2 border">${m.isTemperatureCorrected ? '是' : '否'}</td>
        </tr>
      `
      )
      .join('');

    const warningsHTML = result.warnings.length > 0
      ? result.warnings
          .map(
            (w) => `
          <div class="mb-2 p-3 rounded-lg ${
            w.severity === 'high'
              ? 'bg-red-50 border border-red-200'
              : w.severity === 'medium'
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-yellow-50 border border-yellow-200'
          }">
            <div class="font-medium">${w.message}</div>
            <div class="text-sm opacity-75">严重程度: ${w.severity === 'high' ? '高' : w.severity === 'medium' ? '中' : '低'}</div>
          </div>
        `
          )
          .join('')
      : '<p class="text-gray-500">无警告信息</p>';

    const historyHTML = includeHistory && history.length > 0
      ? history
          .slice(0, 10)
          .map(
            (h) => `
          <div class="mb-2 p-3 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-start">
              <div>
                <span class="font-medium">${h.changeType === 'create' ? '创建' : h.changeType === 'update' ? '修改' : h.changeType === 'delete' ? '删除' : '修正'}</span>
                <span class="text-gray-500 ml-2">${h.operator}</span>
              </div>
              <span class="text-gray-400 text-sm">${new Date(h.timestamp).toLocaleString('zh-CN')}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">${h.reason}</p>
          </div>
        `
          )
          .join('')
      : '<p class="text-gray-500">无操作记录</p>';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>声速测量实验报告 - ${currentExperiment.studentName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; }
    h1 { color: #0f172a; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; }
    h2 { color: #1e293b; margin-top: 30px; }
    .stat-card { background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #06b6d4; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #0f172a; color: white; padding: 12px; text-align: left; }
    td { padding: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>声速测量实验报告</h1>
  
  <div class="stat-card">
    <div class="text-sm text-gray-500 mb-1">学生信息</div>
    <div class="font-medium">${currentExperiment.studentName}</div>
    <div class="text-sm text-gray-500 mt-1">实验日期: ${currentExperiment.experimentDate}</div>
  </div>

  <h2>实验参数</h2>
  <div class="stat-card">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-sm text-gray-500">温度</div>
        <div class="font-medium">${currentExperiment.temperature} °C</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">频率</div>
        <div class="font-medium">${currentExperiment.frequency} Hz</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">测量次数</div>
        <div class="font-medium">${currentExperiment.measurements.length} 次</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">离群值</div>
        <div class="font-medium ${currentExperiment.measurements.some((m) => m.isOutlier) ? 'text-orange-600' : 'text-green-600'}">${currentExperiment.measurements.filter((m) => m.isOutlier).length} 个</div>
      </div>
    </div>
  </div>

  <h2>测量数据</h2>
  <table border="1">
    <thead>
      <tr>
        <th>节点号</th>
        <th>管长</th>
        <th>离群值</th>
        <th>温度修正</th>
      </tr>
    </thead>
    <tbody>
      ${measurementsTable}
    </tbody>
  </table>

  <h2>计算结果</h2>
  <div class="stat-card">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-sm text-gray-500">实验声速</div>
        <div class="stat-value">${result.soundSpeed.toFixed(2)} m/s</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">理论声速</div>
        <div class="stat-value" style="color: #10b981">${result.theoreticalSpeed.toFixed(2)} m/s</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">相对误差</div>
        <div class="stat-value" style="color: ${result.relativeError < 5 ? '#10b981' : result.relativeError < 10 ? '#f97316' : '#ef4444'}">${result.relativeError.toFixed(2)}%</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">拟合优度 R²</div>
        <div class="stat-value">${result.linearFitResult.rSquared.toFixed(4)}</div>
      </div>
    </div>
    <div class="mt-4 pt-4 border-t">
      <div class="text-sm text-gray-500 mb-1">线性拟合方程</div>
      <div class="font-mono font-medium">y = ${result.linearFitResult.slope.toFixed(2)}x + ${result.linearFitResult.intercept.toFixed(2)}</div>
    </div>
  </div>

  <h2>误差来源分析</h2>
  <div class="stat-card">
    <div class="space-y-2">
      <div class="flex justify-between">
        <span>温度误差</span>
        <span class="font-mono">${result.errorBreakdown.temperatureError.toFixed(2)}%</span>
      </div>
      <div class="flex justify-between">
        <span>测量误差</span>
        <span class="font-mono">${result.errorBreakdown.measurementError.toFixed(2)}%</span>
      </div>
      <div class="flex justify-between">
        <span>频率误差</span>
        <span class="font-mono">${result.errorBreakdown.frequencyError.toFixed(2)}%</span>
      </div>
      ${result.errorBreakdown.outlierInfluence > 0 ? `
      <div class="flex justify-between text-orange-600">
        <span>离群值影响</span>
        <span class="font-mono">${result.errorBreakdown.outlierInfluence.toFixed(2)}%</span>
      </div>
      ` : ''}
      <div class="flex justify-between">
        <span>其他误差</span>
        <span class="font-mono">${result.errorBreakdown.otherErrors.toFixed(2)}%</span>
      </div>
    </div>
  </div>

  <h2>警告与提示</h2>
  ${warningsHTML}

  ${includeHistory ? `
  <h2>操作记录 (最近10条)</h2>
  ${historyHTML}
  ` : ''}

  <h2>备注</h2>
  <div class="stat-card">
    <p>${currentExperiment.notes || '无备注'}</p>
  </div>

  <div class="footer">
    <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    <p>声速测量误差分析系统 v1.0</p>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" />
          报告导出
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!currentExperiment ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400 text-sm">请先选择或创建实验数据</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">选择导出格式</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'csv', label: 'CSV', icon: Table, desc: '表格格式' },
                  { key: 'json', label: 'JSON', icon: FileJson, desc: '数据格式' },
                  { key: 'html', label: 'HTML', icon: FileText, desc: '完整报告' },
                ] as const).map(({ key, label, icon: Icon, desc }) => (
                  <button
                    key={key}
                    onClick={() => setExportFormat(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      exportFormat === key
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${exportFormat === key ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className={`text-sm font-medium ${exportFormat === key ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {label}
                    </div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={(e) => setIncludeHistory(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <div className="text-sm text-slate-200">包含操作历史记录</div>
                  <div className="text-xs text-slate-400">在报告中包含所有数据修改痕迹</div>
                </div>
              </label>
            </div>

            {result && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">报告预览</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>学生姓名</span>
                    <span className="text-slate-200">{currentExperiment.studentName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>实验日期</span>
                    <span className="text-slate-200">{currentExperiment.experimentDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>测量数据</span>
                    <span className="text-slate-200">{currentExperiment.measurements.length} 组</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>实验声速</span>
                    <span className="text-cyan-400 font-mono">{result.soundSpeed.toFixed(2)} m/s</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>相对误差</span>
                    <span
                      className={`font-mono ${
                        result.relativeError < 5
                          ? 'text-green-400'
                          : result.relativeError < 10
                          ? 'text-orange-400'
                          : 'text-red-400'
                      }`}
                    >
                      {result.relativeError.toFixed(2)}%
                    </span>
                  </div>
                  {includeHistory && (
                    <div className="flex justify-between text-slate-400">
                      <span>操作记录</span>
                      <span className="text-slate-200">{history.length} 条</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={!currentExperiment || exportSuccess}
              className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                exportSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  导出成功
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  导出 {exportFormat.toUpperCase()} 报告
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
