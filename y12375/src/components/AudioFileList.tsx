import React, { useRef, useState } from 'react';
import { Music, Upload, Clock, AlertTriangle, CheckCircle, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { Segment, Issue } from '../types';

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
  const { audioFiles, selectedAudioFile, setSelectedAudioFile, segments, issues, importAudioFile, importSegmentsData } = useAudioStore();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [showImportMenu, setShowImportMenu] = useState(false);

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

  const handleAudioImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    setShowSuccess(null);

    try {
      let lastImportedId = '';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const audioFile = await importAudioFile(file);
        lastImportedId = audioFile.id;
      }
      setShowSuccess(`成功导入 ${files.length} 个音频文件`);
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '音频导入失败';
      setImportError(msg);
      setTimeout(() => setImportError(null), 5000);
    } finally {
      setIsImporting(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
      setShowImportMenu(false);
    }
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    setShowSuccess(null);

    try {
      const targetAudio = selectedAudioFile;
      if (!targetAudio) {
        throw new Error('请先选择目标音频文件，再导入片段标记');
      }

      const file = files[0];
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json.segments)) {
        throw new Error('JSON 格式错误：缺少 segments 数组');
      }

      const segmentsData: Segment[] = json.segments;
      const issuesData: Issue[] = Array.isArray(json.issues) ? json.issues : [];

      importSegmentsData(targetAudio.id, { segments: segmentsData, issues: issuesData });

      setShowSuccess(`成功导入 ${segmentsData.length} 个片段${issuesData.length > 0 ? `，${issuesData.length} 个问题标记` : ''}`);
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'JSON 导入失败';
      setImportError(msg);
      setTimeout(() => setImportError(null), 5000);
    } finally {
      setIsImporting(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
      setShowImportMenu(false);
    }
  };

  const downloadSampleJson = () => {
    const targetAudio = selectedAudioFile;
    if (!targetAudio) {
      setImportError('请先选择一个音频文件，查看示例 JSON 结构');
      setTimeout(() => setImportError(null), 4000);
      return;
    }
    const sampleData = {
      segments: [
        { id: 'seg-sample-1', audioFileId: targetAudio.id, startTime: 0, endTime: 60, type: 'speech', loudness: -22.5, status: 'detected', modifiedBy: 'auto' },
        { id: 'seg-sample-2', audioFileId: targetAudio.id, startTime: 60, endTime: 120, type: 'ad', loudness: -14.0, status: 'detected', modifiedBy: 'auto' },
      ],
      issues: [
        {
          id: 'issue-sample-1',
          segmentId: 'seg-sample-2',
          type: 'loudness',
          severity: 'high',
          description: '广告片段响度过高',
          isFixed: false,
          sourceRef: { audioFileId: targetAudio.id, segmentId: 'seg-sample-2', startTime: 60, endTime: 120 },
        },
      ],
    };
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `片段标记示例_${targetAudio.name.replace(/\.[^.]+$/, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-lg font-semibold text-white">音频文件</h3>
        <div className="relative">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            disabled={isImporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? '导入中...' : '导入'}
          </button>

          {showImportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#252b45] border border-gray-700 rounded-lg shadow-xl z-50 w-52 overflow-hidden">
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
              >
                <Music className="w-4 h-4 text-cyan-400" />
                导入音频文件
              </button>
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 transition-colors border-t border-gray-700"
              >
                <FileJson className="w-4 h-4 text-yellow-400" />
                导入片段标记 JSON
              </button>
              <button
                onClick={downloadSampleJson}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 transition-colors border-t border-gray-700"
              >
                <FileJson className="w-4 h-4 text-green-400" />
                下载示例 JSON
              </button>
            </div>
          )}
        </div>

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleAudioImport}
          className="hidden"
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleJsonImport}
          className="hidden"
        />
      </div>

      {showImportMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
      )}

      {importError && (
        <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-400">{importError}</span>
        </div>
      )}

      {showSuccess && (
        <div className="mb-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2 text-xs">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-green-400">{showSuccess}</span>
        </div>
      )}

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
