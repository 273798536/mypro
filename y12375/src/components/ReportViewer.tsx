import React, { useState } from 'react';
import { FileText, Download, Calendar, Clock, AlertTriangle, CheckCircle, Info, Music, User, Link, AlertCircle, Loader2 } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}分${secs}秒`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getIssueTypeLabel = (type: string) => {
  switch (type) {
    case 'loudness': return '响度超标';
    case 'silence': return '静音异常';
    case 'sampleRate': return '采样率问题';
    case 'clipping': return '削波失真';
    default: return type;
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return severity;
  }
};

const getSegmentTypeLabel = (type: string) => {
  switch (type) {
    case 'speech': return '语音';
    case 'ad': return '广告';
    case 'music': return '音乐';
    case 'silence': return '静音';
    default: return type;
  }
};

export const ReportViewer: React.FC = () => {
  const { selectedAudioFile, reports, issues, segments, versions, exportReport, getIssuesForAudio, getSegmentsForAudio } = useAudioStore();
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const audioReports = selectedAudioFile
    ? reports.filter((r) => r.audioFileId === selectedAudioFile.id).sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime())
    : [];

  const currentIssues = selectedAudioFile ? getIssuesForAudio(selectedAudioFile.id) : [];
  const currentSegments = selectedAudioFile ? getSegmentsForAudio(selectedAudioFile.id) : [];
  const currentVersions = selectedAudioFile ? versions.filter(v => v.audioFileId === selectedAudioFile.id) : [];

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  const handleExportReport = async (format: 'pdf' | 'html') => {
    if (!selectedAudioFile) {
      setExportError('请先选择音频文件');
      setTimeout(() => setExportError(null), 4000);
      return;
    }

    setIsExporting(format);
    setExportError(null);
    setExportSuccess(null);

    try {
      const report = exportReport(format);
      setSelectedReportId(report.id);
      setExportSuccess(`${format.toUpperCase()} 报告已生成并开始下载`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败，请重试';
      setExportError(msg);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(null);
    }
  };

  const summary = {
    totalIssues: currentIssues.length,
    highSeverity: currentIssues.filter((i) => i.severity === 'high' && !i.isFixed).length,
    mediumSeverity: currentIssues.filter((i) => i.severity === 'medium' && !i.isFixed).length,
    lowSeverity: currentIssues.filter((i) => i.severity === 'low' && !i.isFixed).length,
    fixedIssues: currentIssues.filter((i) => i.isFixed).length,
  };

  if (!selectedAudioFile) {
    return (
      <div className="bg-[#1a1f36] rounded-lg p-6 flex items-center justify-center h-64">
        <span className="text-gray-500">请选择音频文件</span>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          合规报告
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          {audioReports.length > 0 && (
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- 选择历史报告 --</option>
              {audioReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.exportedAt)} ({r.exportFormat.toUpperCase()})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => handleExportReport('html')}
            disabled={!!isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting === 'html' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting === 'html' ? '生成中...' : '导出 HTML'}
          </button>
          <button
            onClick={() => handleExportReport('pdf')}
            disabled={!!isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting === 'pdf' ? '生成中...' : '导出 PDF'}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-400">{exportError}</span>
        </div>
      )}

      {exportSuccess && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-green-400">{exportSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-lg text-center">
          <div className="text-2xl font-bold text-white">{summary.totalIssues}</div>
          <div className="text-xs text-gray-400 mt-1">问题总数</div>
        </div>
        <div className="p-4 bg-red-500/10 rounded-lg text-center border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{summary.highSeverity}</div>
          <div className="text-xs text-gray-400 mt-1">高严重</div>
        </div>
        <div className="p-4 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{summary.mediumSeverity}</div>
          <div className="text-xs text-gray-400 mt-1">中严重</div>
        </div>
        <div className="p-4 bg-blue-500/10 rounded-lg text-center border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{summary.lowSeverity}</div>
          <div className="text-xs text-gray-400 mt-1">低严重</div>
        </div>
        <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{summary.fixedIssues}</div>
          <div className="text-xs text-gray-400 mt-1">已修复</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" />
              音频文件信息
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">文件名:</span>
                <span className="text-white">{selectedAudioFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">时长:</span>
                <span className="text-white">{formatDuration(selectedAudioFile.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">采样率:</span>
                <span className="text-white">{selectedAudioFile.sampleRate} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">片段数:</span>
                <span className="text-white">{currentSegments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">版本数:</span>
                <span className="text-white">{currentVersions.length}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              片段分层详情
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentSegments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="p-2 bg-gray-900/50 rounded flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-white">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      {getSegmentTypeLabel(segment.type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {segment.loudness.toFixed(1)} LUFS
                    </span>
                    {segment.modifiedBy === 'manual' && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <User className="w-3 h-3" />
                        人工
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            问题明细列表
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {currentIssues.map((issue) => {
              const segment = currentSegments.find((s) => s.id === issue.segmentId);
              return (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border ${
                    issue.isFixed
                      ? 'bg-green-500/5 border-green-500/30'
                      : issue.severity === 'high'
                      ? 'bg-red-500/5 border-red-500/30'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-500/5 border-yellow-500/30'
                      : 'bg-blue-500/5 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {issue.isFixed ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className={`w-4 h-4 ${
                          issue.severity === 'high' ? 'text-red-400' :
                          issue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                      )}
                      <span className="text-sm font-medium text-white">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        issue.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(issue.sourceRef.startTime)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{issue.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Link className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-500">
                        来源: {getSegmentTypeLabel(segment?.type || '')} 片段
                        ({formatTime(issue.sourceRef.startTime)} - {formatTime(issue.sourceRef.endTime)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {issue.affectedByManualChange && (
                        <span className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">受人工修改影响</span>
                      )}
                      {issue.affectedByAdAddition && (
                        <span className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">受广告补录影响</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>报告生成时间: {formatDate(new Date())}</span>
          <span className="mx-2">|</span>
          <span>音频文件ID: {selectedAudioFile.id}</span>
          <span className="mx-2">|</span>
          <span>版本: v{currentVersions.length > 0 ? currentVersions[currentVersions.length - 1].versionNumber : 1}</span>
        </div>
      </div>
    </div>
  );
};
