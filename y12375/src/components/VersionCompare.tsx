import React, { useState } from 'react';
import { GitCompare, Clock, FileAudio, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { Version } from '../types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const VersionCompare: React.FC = () => {
  const { selectedAudioFile, versions, segments, issues } = useAudioStore();
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  const audioVersions = selectedAudioFile
    ? versions.filter((v) => v.audioFileId === selectedAudioFile.id).sort((a, b) => b.versionNumber - a.versionNumber)
    : [];

  React.useEffect(() => {
    if (audioVersions.length >= 2) {
      setLeftVersionId(audioVersions[1].id);
      setRightVersionId(audioVersions[0].id);
    } else if (audioVersions.length === 1) {
      setLeftVersionId(audioVersions[0].id);
      setRightVersionId(audioVersions[0].id);
    }
  }, [audioVersions]);

  const leftVersion = versions.find((v) => v.id === leftVersionId);
  const rightVersion = versions.find((v) => v.id === rightVersionId);

  const compareVersions = () => {
    if (!leftVersion || !rightVersion) return { segmentDiffs: [], issueDiffs: [] };

    const segmentDiffs: Array<{
      type: 'added' | 'removed' | 'modified';
      segment: any;
      oldSegment?: any;
    }> = [];

    const rightSegmentMap = new Map(rightVersion.segments.map((s) => [s.id, s]));

    leftVersion.segments.forEach((leftSeg) => {
      const rightSeg = rightSegmentMap.get(leftSeg.id);
      if (!rightSeg) {
        segmentDiffs.push({ type: 'removed', segment: leftSeg });
      } else if (leftSeg.type !== rightSeg.type || leftSeg.modifiedBy !== rightSeg.modifiedBy) {
        segmentDiffs.push({ type: 'modified', segment: rightSeg, oldSegment: leftSeg });
        rightSegmentMap.delete(leftSeg.id);
      } else {
        rightSegmentMap.delete(leftSeg.id);
      }
    });

    rightSegmentMap.forEach((seg) => {
      segmentDiffs.push({ type: 'added', segment: seg });
    });

    const issueDiffs: Array<{
      type: 'added' | 'removed' | 'modified';
      issue: any;
      oldIssue?: any;
    }> = [];

    const rightIssueMap = new Map(rightVersion.issues.map((i) => [i.id, i]));

    leftVersion.issues.forEach((leftIssue) => {
      const rightIssue = rightIssueMap.get(leftIssue.id);
      if (!rightIssue) {
        issueDiffs.push({ type: 'removed', issue: leftIssue });
      } else if (leftIssue.isFixed !== rightIssue.isFixed || leftIssue.affectedByManualChange !== rightIssue.affectedByManualChange) {
        issueDiffs.push({ type: 'modified', issue: rightIssue, oldIssue: leftIssue });
        rightIssueMap.delete(leftIssue.id);
      } else {
        rightIssueMap.delete(leftIssue.id);
      }
    });

    rightIssueMap.forEach((issue) => {
      issueDiffs.push({ type: 'added', issue });
    });

    return { segmentDiffs, issueDiffs };
  };

  const { segmentDiffs, issueDiffs } = compareVersions();

  const toggleDiff = (id: string) => {
    const newExpanded = new Set(expandedDiffs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDiffs(newExpanded);
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

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'loudness': return '响度超标';
      case 'silence': return '静音异常';
      case 'sampleRate': return '采样率问题';
      default: return type;
    }
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
          <GitCompare className="w-5 h-5 text-cyan-400" />
          版本对比
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">旧版本:</label>
            <select
              value={leftVersionId}
              onChange={(e) => setLeftVersionId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {audioVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} - {formatDate(v.createdAt)}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">新版本:</label>
            <select
              value={rightVersionId}
              onChange={(e) => setRightVersionId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {audioVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} - {formatDate(v.createdAt)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {leftVersion && rightVersion && leftVersionId !== rightVersionId && (
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">v{leftVersion.versionNumber}</span>
                <span className="text-xs text-gray-500">{formatDate(leftVersion.createdAt)}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                {leftVersion.segments.length} 个片段 · {leftVersion.issues.length} 个问题
              </span>
            </div>
            <p className="text-sm text-gray-400">{leftVersion.note}</p>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg border border-cyan-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-cyan-400">v{rightVersion.versionNumber}</span>
                <span className="text-xs text-gray-500">{formatDate(rightVersion.createdAt)}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400">
                {rightVersion.segments.length} 个片段 · {rightVersion.issues.length} 个问题
              </span>
            </div>
            <p className="text-sm text-gray-400">{rightVersion.note}</p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-cyan-400" />
            片段变化 ({segmentDiffs.length})
          </h4>
          <div className="space-y-2">
            {segmentDiffs.map((diff, index) => (
              <div
                key={`seg-${index}`}
                className={`p-3 rounded-lg border ${
                  diff.type === 'added'
                    ? 'bg-green-500/10 border-green-500/30'
                    : diff.type === 'removed'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      diff.type === 'added'
                        ? 'bg-green-500/20 text-green-400'
                        : diff.type === 'removed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {diff.type === 'added' ? '新增' : diff.type === 'removed' ? '删除' : '修改'}
                    </span>
                    <span className="text-sm text-white">
                      {formatTime(diff.segment.startTime)} - {formatTime(diff.segment.endTime)}
                    </span>
                    {diff.type === 'modified' ? (
                      <span className="text-sm text-gray-400">
                        {getSegmentTypeLabel(diff.oldSegment?.type || '')}
                        <ArrowRight className="w-4 h-4 inline mx-1" />
                        <span className="text-yellow-400">{getSegmentTypeLabel(diff.segment.type)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        类型: {getSegmentTypeLabel(diff.segment.type)}
                      </span>
                    )}
                  </div>
                  {diff.segment.modifiedBy === 'manual' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      人工修改
                    </span>
                  )}
                </div>
              </div>
            ))}
            {segmentDiffs.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">片段无变化</div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            问题变化 ({issueDiffs.length})
          </h4>
          <div className="space-y-2">
            {issueDiffs.map((diff, index) => (
              <div
                key={`issue-${index}`}
                className={`p-3 rounded-lg border ${
                  diff.type === 'added'
                    ? 'bg-green-500/10 border-green-500/30'
                    : diff.type === 'removed'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      diff.type === 'added'
                        ? 'bg-green-500/20 text-green-400'
                        : diff.type === 'removed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {diff.type === 'added' ? '新增' : diff.type === 'removed' ? '删除' : '修改'}
                    </span>
                    <span className="text-sm text-white">{getIssueTypeLabel(diff.issue.type)}</span>
                    {diff.issue.affectedByManualChange && (
                      <span className="text-xs text-green-400">受人工修改影响</span>
                    )}
                    {diff.issue.affectedByAdAddition && (
                      <span className="text-xs text-orange-400">受广告补录影响</span>
                    )}
                  </div>
                  {diff.issue.isFixed ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{diff.issue.description}</p>
              </div>
            ))}
            {issueDiffs.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">问题无变化</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
