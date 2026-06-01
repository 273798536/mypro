import React from 'react';
import { AlertTriangle, AlertCircle, Info, Check, ArrowUpRight, User } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { Issue } from '../types';

interface IssueListProps {
  onIssueClick?: (issue: Issue) => void;
}

const getIssueIcon = (type: Issue['type']) => {
  switch (type) {
    case 'loudness': return <AlertTriangle className="w-4 h-4" />;
    case 'silence': return <AlertCircle className="w-4 h-4" />;
    case 'sampleRate': return <Info className="w-4 h-4" />;
    case 'clipping': return <AlertTriangle className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

const getSeverityColor = (severity: Issue['severity']) => {
  switch (severity) {
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getIssueTypeLabel = (type: Issue['type']) => {
  switch (type) {
    case 'loudness': return '响度超标';
    case 'silence': return '静音异常';
    case 'sampleRate': return '采样率问题';
    case 'clipping': return '削波失真';
    default: return '未知问题';
  }
};

const getSeverityLabel = (severity: Issue['severity']) => {
  switch (severity) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '未知';
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const IssueList: React.FC<IssueListProps> = ({ onIssueClick }) => {
  const {
    selectedAudioFile,
    issues,
    segments,
    selectedIssue,
    jumpToIssue,
    fixIssue,
  } = useAudioStore();

  const audioIssues = selectedAudioFile
    ? issues.filter((i) => {
        const segment = segments.find((s) => s.id === i.segmentId);
        return segment?.audioFileId === selectedAudioFile.id;
      })
    : [];

  const handleIssueClick = (issue: Issue) => {
    jumpToIssue(issue);
    onIssueClick?.(issue);
  };

  const handleFixIssue = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    fixIssue(issueId);
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">问题列表</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
            高: {audioIssues.filter((i) => i.severity === 'high' && !i.isFixed).length}
          </span>
          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
            中: {audioIssues.filter((i) => i.severity === 'medium' && !i.isFixed).length}
          </span>
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
            低: {audioIssues.filter((i) => i.severity === 'low' && !i.isFixed).length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {audioIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <Check className="w-8 h-8 mb-2" />
            <p>暂无问题</p>
          </div>
        ) : (
          audioIssues.map((issue) => {
            const segment = segments.find((s) => s.id === issue.segmentId);
            const isSelected = selectedIssue?.id === issue.id;

            return (
              <div
                key={issue.id}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                } ${issue.isFixed ? 'opacity-60' : ''}`}
                onClick={() => handleIssueClick(issue)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${getSeverityColor(issue.severity)}`}>
                    {getIssueIcon(issue.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${getSeverityColor(issue.severity)}`}>
                        {getSeverityLabel(issue.severity)}
                      </span>
                      {issue.affectedByManualChange && (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                          <User className="w-3 h-3" />
                          人工影响
                        </span>
                      )}
                      {issue.affectedByAdAddition && (
                        <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          补录广告
                        </span>
                      )}
                      {issue.isFixed && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Check className="w-3 h-3" />
                          已修复
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {issue.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          位置: {formatTime(issue.sourceRef.startTime)} - {formatTime(issue.sourceRef.endTime)}
                        </span>
                        <span>
                          片段: {segment?.type === 'speech' ? '语音' : segment?.type === 'ad' ? '广告' : segment?.type === 'silence' ? '静音' : '音乐'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!issue.isFixed && (
                          <button
                            onClick={(e) => handleFixIssue(e, issue.id)}
                            className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          >
                            标记修复
                          </button>
                        )}
                        <button className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
