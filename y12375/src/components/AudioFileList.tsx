import React from 'react';
import { Music, Upload, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}分${secs}秒`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AudioFileList: React.FC = () => {
  const { audioFiles, selectedAudioFile, setSelectedAudioFile, segments, issues } = useAudioStore();

  const getFileStats = (fileId: string) => {
    const fileSegments = segments.filter((s) => s.audioFileId === fileId);
    const fileIssues = issues.filter((i) => {
      const segment = segments.find((s) => s.id === i.segmentId);
      return segment?.audioFileId === fileId && !i.isFixed;
    });
    return {
      segmentCount: fileSegments.length,
      issueCount: fileIssues.length,
      highSeverityCount: fileIssues.filter((i) => i.severity === 'high').length,
    };
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">音频文件</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm">
          <Upload className="w-4 h-4" />
          导入
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {audioFiles.map((file) => {
          const stats = getFileStats(file.id);
          const isSelected = selectedAudioFile?.id === file.id;

          return (
            <div
              key={file.id}
              onClick={() => setSelectedAudioFile(file)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${
                  isSelected ? 'bg-cyan-500/30' : 'bg-gray-700'
                }`}>
                  <Music className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {file.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(file.duration)}
                    </span>
                    <span>{file.sampleRate} Hz</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      {stats.segmentCount} 片段
                    </span>
                    {stats.issueCount > 0 ? (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        stats.highSeverityCount > 0
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        {stats.issueCount} 问题
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        合规
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-500">
                导入于 {formatDate(file.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
