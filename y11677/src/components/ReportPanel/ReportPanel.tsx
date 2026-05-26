import { useMemo, useState } from 'react';
import { FileText, Download, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateFlightReport, exportReportAsJSON, exportReportAsText, downloadFile } from '../../utils/reportGenerator';

export const ReportPanel = () => {
  const { frames, anomalies, corrections } = useAppStore();
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    if (frames.length === 0) return null;
    const dataSource = frames[0]?.source || '未知来源';
    return generateFlightReport(frames, anomalies, corrections, dataSource);
  }, [frames, anomalies, corrections]);

  const handleExportJSON = () => {
    if (!report) return;
    const content = exportReportAsJSON(report);
    const filename = `姿态分析报告_${new Date(report.exportTime).toISOString().slice(0, 10)}.json`;
    downloadFile(content, filename, 'application/json');
  };

  const handleExportText = () => {
    if (!report) return;
    const content = exportReportAsText(report);
    const filename = `姿态分析报告_${new Date(report.exportTime).toISOString().slice(0, 10)}.txt`;
    downloadFile(content, filename, 'text/plain');
  };

  const handleCopyReport = () => {
    if (!report) return;
    const content = exportReportAsText(report);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-600/20 border-green-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
    if (score >= 40) return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
    return 'from-red-500/20 to-red-600/20 border-red-500/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '及格';
    return '较差';
  };

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无数据</p>
          <p className="text-xs mt-1">请先导入陀螺仪数据</p>
        </div>
      </div>
    );
  }

  const duration = (report.endTime - report.startTime) / 1000;
  const totalAnomalies = report.anomalyCount.warning + report.anomalyCount.error + report.anomalyCount.critical;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className={`bg-gradient-to-br ${getScoreBgColor(report.qualityScore)} border rounded-lg p-6 text-center`}>
        <div className="text-xs text-gray-400 mb-2">数据质量评分</div>
        <div className={`text-5xl font-bold ${getScoreColor(report.qualityScore)}`}>
          {report.qualityScore}
        </div>
        <div className="text-sm text-gray-400 mt-1">/ 100</div>
        <div className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(report.qualityScore)} bg-black/20`}>
          {getScoreLabel(report.qualityScore)}
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">报告概览</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">报告ID:</span>
            <span className="text-gray-300 font-mono text-xs">{report.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">导出时间:</span>
            <span className="text-gray-300 text-xs">
              {new Date(report.exportTime).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">数据来源:</span>
            <span className="text-gray-300 text-xs truncate max-w-[150px]" title={report.dataSource}>
              {report.dataSource}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">总帧数:</span>
            <span className="text-gray-300">{report.totalFrames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">时长:</span>
            <span className="text-gray-300">{duration.toFixed(2)} 秒</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">异常统计</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{report.anomalyCount.warning}</div>
            <div className="text-xs text-yellow-500/70">警告</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{report.anomalyCount.error}</div>
            <div className="text-xs text-red-500/70">错误</div>
          </div>
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{report.anomalyCount.critical}</div>
            <div className="text-xs text-red-600/70">严重</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">总计 </span>
          <span className="text-lg font-bold text-gray-300">{totalAnomalies}</span>
          <span className="text-xs text-gray-500"> 处异常</span>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">摘要</div>
        <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
      </div>

      {report.calibrationRecords.length > 0 && (
        <div className="bg-[#0f1d30] rounded-lg p-4">
          <div className="text-[#00d4ff] font-bold text-sm mb-3">
            校准记录 ({report.calibrationRecords.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {report.calibrationRecords.slice(0, 5).map((record, index) => (
              <div
                key={record.id}
                className="text-xs p-2 bg-[#1a2a4a] rounded"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-bold">#{index + 1} {record.type}</span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>
                </div>
                {record.note && (
                  <div className="text-[10px] text-gray-500 mt-1">{record.note}</div>
                )}
                <div className="text-[10px] text-gray-600 mt-1">
                  操作人: {record.operator}
                </div>
              </div>
            ))}
            {report.calibrationRecords.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                还有 {report.calibrationRecords.length - 5} 条记录...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">导出报告</div>
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="w-full py-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            导出 JSON
          </button>
          <button
            onClick={handleExportText}
            className="w-full py-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            导出文本报告
          </button>
          <button
            onClick={handleCopyReport}
            className="w-full py-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {copied ? (
              <>
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                复制到剪贴板
              </>
            )}
          </button>
        </div>
      </div>

      {totalAnomalies > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-200">
              <p className="font-bold mb-1">注意事项</p>
              <p>本报告包含 {totalAnomalies} 处数据异常，建议在导出后进行人工复核。</p>
              <p className="mt-1">所有修正操作均已记录在案，可追溯原始数据。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
