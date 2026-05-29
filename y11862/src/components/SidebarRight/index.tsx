import { useMemo, useState } from 'react';
import { TrendingUp, AlertTriangle, FileWarning, VolumeX, Zap, User, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useSpectrumStore } from '../../store/spectrumStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { formatTime, getIssueColor } from '../../utils/audioValidator';
import { QualityIssue } from '../../types';

export function SidebarRight() {
  const { analysisResult, selectedPeak, setSelectedPeak } = useSpectrumStore();
  const { findPeaks } = useAudioAnalyzer();
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const peaks = useMemo(() => {
    if (!analysisResult) return [];
    return findPeaks(analysisResult, -30).slice(0, 15);
  }, [analysisResult, findPeaks]);

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIssueIcon = (type: QualityIssue['type']) => {
    switch (type) {
      case 'missing_field':
        return <FileWarning className="w-4 h-4" />;
      case 'silent_segment':
        return <VolumeX className="w-4 h-4" />;
      case 'sample_rate_error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'peak_clipping':
        return <Zap className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityBadge = (severity: QualityIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (!analysisResult) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-700/50">
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            峰值标注 / 问题清单
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-xs text-gray-500">导入音频后显示峰值和质量问题</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700/50">
        <h2 className="text-sm font-bold text-white mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          峰值标注 / 问题清单
        </h2>
        <p className="text-[10px] text-gray-500">
          与3D主视图中的橙色标记点互相对应
        </p>
      </div>

      {analysisResult.issues.length > 0 && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-gray-300">
                数据质量问题 ({analysisResult.issues.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {analysisResult.issues.map((issue, idx) => {
              const issueId = `issue-${idx}`;
              const isExpanded = expandedIssues.has(issueId);

              return (
                <div
                  key={idx}
                  className={`rounded-lg border overflow-hidden transition-all
                    ${issue.severity === 'error' ? 'border-red-500/30 bg-red-500/5' :
                      issue.severity === 'warning' ? 'border-orange-500/30 bg-orange-500/5' :
                      'border-blue-500/30 bg-blue-500/5'}`}
                >
                  <button
                    onClick={() => toggleIssue(issueId)}
                    className="w-full p-2.5 flex items-start gap-2 text-left hover:bg-white/5 transition-all"
                  >
                    <div className={`mt-0.5 ${getIssueColor(issue.severity)}`}>
                      {getIssueIcon(issue.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}>
                          {issue.severity === 'error' ? '错误' : issue.severity === 'warning' ? '警告' : '提示'}
                        </span>
                        {issue.timeRange && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatTime(issue.timeRange[0])} - {formatTime(issue.timeRange[1])}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{issue.message}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-1" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-0">
                      <div className="p-2 bg-black/30 rounded space-y-2 text-[10px]">
                        <div className="flex items-start gap-2">
                          <Zap className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-cyan-400 font-medium">操作建议：</span>
                            <p className="text-gray-400 mt-0.5 leading-relaxed">{issue.guidance.action}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-purple-400 font-medium">责任人：</span>
                            <span className="text-gray-400 ml-1">{issue.guidance.responsible}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <FolderOpen className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-amber-400 font-medium">相关文件：</span>
                            <span className="text-gray-400 ml-1">{issue.guidance.fileReference}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-gray-300">
              主要峰值点 ({peaks.length})
            </h3>
          </div>
        </div>

        <div className="space-y-1.5">
          {peaks.map((peak, idx) => {
            const isSelected = selectedPeak?.frameIndex === peak.frameIndex &&
                              selectedPeak?.freqIndex === peak.freqIndex;

            return (
              <button
                key={idx}
                onClick={() => setSelectedPeak(isSelected ? null : peak)}
                className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2
                  ${isSelected
                    ? 'bg-orange-500/20 border border-orange-500/40'
                    : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0
                    ${isSelected ? 'bg-orange-400' : 'bg-gray-600'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-500 font-mono">
                      #{idx + 1} {formatTime(peak.time)}
                    </span>
                    <span className={`text-[10px] font-mono
                      ${peak.energy > -10 ? 'text-red-400' :
                        peak.energy > -25 ? 'text-orange-400' :
                        peak.energy > -40 ? 'text-yellow-400' : 'text-green-400'}`}
                    >
                      {peak.energy.toFixed(1)} dB
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 font-mono">
                    {peak.frequency.toFixed(0)} Hz
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {peaks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">未检测到显著峰值</p>
            <p className="text-[10px] text-gray-600 mt-1">尝试降低能量阈值</p>
          </div>
        )}
      </div>
    </div>
  );
}
