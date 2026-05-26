import { useState } from 'react';
import { useWaterStore } from '@/store/useWaterStore';
import { FileText, Download, Calendar, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Report() {
  const navigate = useNavigate();
  const { segments, dispatchRecords, anomalies, generateReport } = useWaterStore();
  const [startTime, setStartTime] = useState(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [endTime, setEndTime] = useState(Date.now());
  const [generatedReport, setGeneratedReport] = useState<ReturnType<typeof generateReport> | null>(null);
  const [exporting, setExporting] = useState(false);

  const generate = () => {
    const report = generateReport(startTime, endTime);
    setGeneratedReport(report);
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    if (!generatedReport) return;
    setExporting(true);

    setTimeout(() => {
      const content = `
城市水管压力调度报告
生成时间: ${new Date().toLocaleString('zh-CN')}
报告周期: ${new Date(generatedReport.periodStart).toLocaleString('zh-CN')} ~ ${new Date(generatedReport.periodEnd).toLocaleString('zh-CN')}

========================================

一、压力概况
--------------
管段总数: ${generatedReport.pressureSummary.segments}
最低压力: ${generatedReport.pressureSummary.min.toFixed(2)} MPa
最高压力: ${generatedReport.pressureSummary.max.toFixed(2)} MPa
平均压力: ${generatedReport.pressureSummary.avg.toFixed(2)} MPa

二、调度操作记录 (${generatedReport.dispatchRecords.length} 条)
----------------------------------------
${generatedReport.dispatchRecords.map(r => `
[${new Date(r.timestamp).toLocaleString('zh-CN')}] ${r.operator}
操作: ${r.action === 'open' ? '开启' : '关闭'} ${r.valveName}
压力变化: ${r.beforePressure.toFixed(2)} → ${r.afterPressure.toFixed(2)} MPa
备注: ${r.notes}
`).join('')}

三、异常事件 (${generatedReport.anomalies.length} 条)
------------------------------
${generatedReport.anomalies.map(a => `
[${a.type === 'closed_loop' ? '闭环误判' : a.type === 'low_pressure' ? '低压告警' : a.type === 'unsaved_state' ? '未保存状态' : '数据异常'}] ${a.location}
等级: ${a.severity === 'high' ? '严重' : a.severity === 'medium' ? '中等' : '轻微'}
详情: ${a.message}
建议: ${a.suggestion}
`).join('')}

四、数据修正痕迹 (${generatedReport.corrections.length} 条)
----------------------------------------
${generatedReport.corrections.map(c => `
[${new Date(c.timestamp).toLocaleString('zh-CN')}] ${c.operator}
字段: ${c.field}
变更: ${c.oldValue} → ${c.newValue}
原因: ${c.reason}
`).join('')}

========================================
报告结束
      `.trim();

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `水务调度报告_${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'txt' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 500);
  };

  const formatDate = (ts: number) => new Date(ts).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 hover:border-cyan-500/50 transition-colors"
          >
            <ArrowLeft size={16} className="text-cyan-400" />
            <span className="text-slate-300 text-sm">返回沙盘</span>
          </button>
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-cyan-400" />
            <h1 className="text-xl font-semibold text-white">报告导出</h1>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            选择报告周期
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">开始日期</label>
              <input
                type="date"
                value={formatDate(startTime)}
                onChange={(e) => setStartTime(new Date(e.target.value).getTime())}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
              />
            </div>
            <div className="text-slate-500">~</div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">结束日期</label>
              <input
                type="date"
                value={formatDate(endTime)}
                onChange={(e) => setEndTime(new Date(e.target.value).getTime())}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={generate}
              className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-4 py-2 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              <FileText size={16} />
              生成报告
            </button>
          </div>
        </div>

        {generatedReport && (
          <>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300">报告预览</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportReport('excel')}
                    disabled={exporting}
                    className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    <Download size={14} />
                    导出 Excel
                  </button>
                  <button
                    onClick={() => exportReport('pdf')}
                    disabled={exporting}
                    className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                  >
                    <Download size={14} />
                    导出 PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">管段总数</div>
                  <div className="text-2xl font-mono text-cyan-400">{generatedReport.pressureSummary.segments}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">最低压力</div>
                  <div className={`text-2xl font-mono ${generatedReport.pressureSummary.min < 0.14 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {generatedReport.pressureSummary.min.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">最高压力</div>
                  <div className="text-2xl font-mono text-amber-400">{generatedReport.pressureSummary.max.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">平均压力</div>
                  <div className="text-2xl font-mono text-cyan-400">{generatedReport.pressureSummary.avg.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">调度操作记录</h3>
                  <div className="space-y-2">
                    {generatedReport.dispatchRecords.length === 0 && (
                      <div className="text-slate-500 text-sm">该时间段内无调度记录</div>
                    )}
                    {generatedReport.dispatchRecords.map(record => (
                      <div key={record.id} className="bg-slate-800/30 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleString('zh-CN')}</div>
                          <div className="text-sm text-white">{record.valveName} - {record.action === 'open' ? '开启' : '关闭'}</div>
                          <div className="text-xs text-slate-500">{record.notes}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">{record.operator}</div>
                          <div className="text-xs font-mono text-cyan-400">
                            {record.beforePressure.toFixed(2)} → {record.afterPressure.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    异常事件
                  </h3>
                  <div className="space-y-2">
                    {generatedReport.anomalies.length === 0 && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <CheckCircle size={14} />
                        该时间段内无异常事件
                      </div>
                    )}
                    {generatedReport.anomalies.map(anomaly => (
                      <div key={anomaly.id} className={`rounded-lg p-3 border ${
                        anomaly.severity === 'high' ? 'border-red-500/30 bg-red-500/10' :
                        anomaly.severity === 'medium' ? 'border-amber-500/30 bg-amber-500/10' :
                        'border-slate-700/50 bg-slate-800/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${
                            anomaly.severity === 'high' ? 'text-red-400' :
                            anomaly.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            [{anomaly.type === 'closed_loop' ? '闭环误判' : anomaly.type === 'low_pressure' ? '低压告警' : anomaly.type === 'unsaved_state' ? '未保存状态' : '数据异常'}]
                          </span>
                          <span className="text-xs text-slate-400">{anomaly.location}</span>
                        </div>
                        <div className="text-xs text-white">{anomaly.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">数据修正痕迹</h3>
                  <div className="space-y-2">
                    {generatedReport.corrections.length === 0 && (
                      <div className="text-slate-500 text-sm">该时间段内无数据修正</div>
                    )}
                    {generatedReport.corrections.map(corr => (
                      <div key={corr.id} className="bg-slate-800/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-amber-400">{corr.operator}</span>
                          <span className="text-xs text-slate-500">{new Date(corr.timestamp).toLocaleString('zh-CN')}</span>
                        </div>
                        <div className="text-xs text-white">{corr.field}: {corr.oldValue} → {corr.newValue}</div>
                        <div className="text-xs text-slate-400">{corr.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
