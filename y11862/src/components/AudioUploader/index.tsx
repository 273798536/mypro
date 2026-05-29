import { useCallback, useState, useRef } from 'react';
import { Upload, Music, AlertCircle } from 'lucide-react';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useSpectrumStore } from '../../store/spectrumStore';

export function AudioUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyzeFile, generateDemoData, error } = useAudioAnalyzer();
  const { isAnalyzing, analysisProgress, clearAll } = useSpectrumStore();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('请上传音频文件 (WAV, MP3, AIFF等)');
      return;
    }
    try {
      await analyzeFile(file);
    } catch (err) {
      console.error('分析失败:', err);
    }
  }, [analyzeFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-gray-600 hover:border-cyan-500/50 hover:bg-gray-800/50'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleInputChange}
        />

        {isAnalyzing ? (
          <div className="space-y-3">
            <div className="animate-spin w-10 h-10 mx-auto border-3 border-cyan-400 border-t-transparent rounded-full" />
            <p className="text-gray-300 text-sm">正在分析音频...</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{(analysisProgress * 100).toFixed(0)}%</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-300 text-sm font-medium">拖拽音频文件到此处</p>
            <p className="text-gray-500 text-xs mt-1">或点击选择文件 (WAV, MP3, AIFF)</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">快速演示</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => generateDemoData(false)}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-all"
          >
            <Music className="w-4 h-4" />
            正常样例
          </button>
          <button
            onClick={() => generateDemoData(true)}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            采样率错误样例
          </button>
        </div>
      </div>

      <button
        onClick={clearAll}
        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-all"
      >
        清除数据
      </button>
    </div>
  );
}
