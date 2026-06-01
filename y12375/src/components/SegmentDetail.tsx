import React from 'react';
import { Music, Clock, Gauge, Edit3, User, History, Link } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { Segment } from '../types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSegmentTypeLabel = (type: Segment['type']) => {
  switch (type) {
    case 'speech': return '语音';
    case 'ad': return '广告';
    case 'music': return '音乐';
    case 'silence': return '静音';
    default: return type;
  }
};

const getSegmentTypeColor = (type: Segment['type']) => {
  switch (type) {
    case 'speech': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'ad': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'music': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'silence': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const SegmentDetail: React.FC = () => {
  const { selectedSegment, selectedIssue, issues, updateSegmentType, changeLogs } = useAudioStore();

  const relatedIssues = selectedSegment
    ? issues.filter((i) => i.segmentId === selectedSegment.id)
    : [];

  const relatedChangeLogs = selectedSegment
    ? changeLogs.filter((l) => l.segmentId === selectedSegment.id)
    : [];

  const handleTypeChange = (newType: Segment['type']) => {
    if (selectedSegment) {
      updateSegmentType(selectedSegment.id, newType);
    }
  };

  if (!selectedSegment) {
    return (
      <div className="bg-[#1a1f36] rounded-lg p-6 flex items-center justify-center h-64">
        <span className="text-gray-500">请选择一个片段</span>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-cyan-400" />
          片段详情
        </h3>
        <span className={`text-xs px-2 py-1 rounded border ${getSegmentTypeColor(selectedSegment.type)}`}>
          {getSegmentTypeLabel(selectedSegment.type)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Clock className="w-3 h-3" />
            开始时间
          </div>
          <div className="text-lg font-mono text-white">
            {formatTime(selectedSegment.startTime)}
          </div>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Clock className="w-3 h-3" />
            结束时间
          </div>
          <div className="text-lg font-mono text-white">
            {formatTime(selectedSegment.endTime)}
          </div>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Gauge className="w-3 h-3" />
            响度
          </div>
          <div className={`text-lg font-mono ${
            selectedSegment.loudness > -16 ? 'text-red-400' : 'text-green-400'
          }`}>
            {selectedSegment.loudness.toFixed(1)} LUFS
          </div>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            时长
          </div>
          <div className="text-lg font-mono text-white">
            {formatTime(selectedSegment.endTime - selectedSegment.startTime)}
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <Edit3 className="w-3 h-3" />
          修改片段类型
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['speech', 'music', 'ad', 'silence'] as Segment['type'][]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                selectedSegment.type === type
                  ? getSegmentTypeColor(type) + ' border-2'
                  : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-500'
              }`}
            >
              {getSegmentTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {selectedSegment.modifiedBy === 'manual' && (
        <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-sm text-purple-400 mb-1">
            <User className="w-4 h-4" />
            人工修改记录
          </div>
          <div className="text-xs text-gray-400">
            {selectedSegment.originalType && (
              <span>原始类型: {getSegmentTypeLabel(selectedSegment.originalType as Segment['type'])} → </span>
            )}
            <span>当前类型: {getSegmentTypeLabel(selectedSegment.type)}</span>
          </div>
          {selectedSegment.modifiedAt && (
            <div className="text-xs text-gray-500 mt-1">
              修改时间: {formatDate(selectedSegment.modifiedAt)}
            </div>
          )}
        </div>
      )}

      {relatedIssues.length > 0 && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">关联问题 ({relatedIssues.length})</div>
          <div className="space-y-2">
            {relatedIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-2 rounded-lg border ${
                  issue.severity === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : issue.severity === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{issue.type === 'loudness' ? '响度超标' : issue.type === 'silence' ? '静音异常' : '采样率问题'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    issue.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{issue.description}</p>
                {(issue.affectedByManualChange || issue.affectedByAdAddition) && (
                  <div className="flex items-center gap-2 mt-1">
                    {issue.affectedByManualChange && (
                      <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">受人工修改影响</span>
                    )}
                    {issue.affectedByAdAddition && (
                      <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">受广告补录影响</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedChangeLogs.length > 0 && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
            <History className="w-4 h-4" />
            修改历史
          </div>
          <div className="space-y-2">
            {relatedChangeLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {log.changeType === 'type_change' ? '类型变更: ' : '边界调整: '}
                  <span className="text-red-400">{log.oldValue}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="text-green-400">{log.newValue}</span>
                </span>
                <span className="text-gray-500">{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link className="w-3 h-3" />
          <span>来源追溯</span>
        </div>
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div>片段ID: {selectedSegment.id}</div>
          <div>音频文件ID: {selectedSegment.audioFileId}</div>
          <div>时间范围: {formatTime(selectedSegment.startTime)} - {formatTime(selectedSegment.endTime)}</div>
        </div>
      </div>
    </div>
  );
};
