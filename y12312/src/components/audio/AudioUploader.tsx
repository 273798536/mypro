import React, { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AudioSourceType, SOURCE_TYPE_LABELS, AUDIO_MIME_TYPES } from '../../types';
import { Upload, FileAudio, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const AudioUploader: React.FC = () => {
  const { addAudioFile, activeBatch, originalFile, processedFile } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [sourceType, setSourceType] = useState<AudioSourceType>('original');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndDecodeFile = useCallback(async (file: File, type: AudioSourceType) => {
    setError(null);

    if (!AUDIO_MIME_TYPES.some(mime => file.type.includes(mime.split('/')[1]) || file.name.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/i))) {
      setError('不支持的文件格式。请上传 WAV, MP3, OGG, FLAC, M4A 或 AAC 格式');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('文件过大。请上传小于 50MB 的音频文件');
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }

      await addAudioFile({
        name: file.name,
        sourceType: type,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitDepth: type === 'original' ? 16 : 16,
        duration: audioBuffer.duration,
        channelData,
      });

      audioContext.close();
    } catch (err) {
      setError('音频解码失败。文件可能已损坏或格式不正确');
      console.error('Audio decode error:', err);
    }
  }, [addAudioFile]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    validateAndDecodeFile(files[0], sourceType);
  }, [sourceType, validateAndDecodeFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const getDisplayFile = (type: AudioSourceType) => {
    return type === 'original' ? originalFile : processedFile;
  };

  const displayFile = getDisplayFile(sourceType);

  return (
    <div className="card-surface spectrum-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-spectrum-cyan" />
          <span className="font-display font-semibold text-sm text-slate-200">音频上传</span>
        </div>
        {activeBatch && (
          <span className="text-[10px] text-slate-500 font-mono">
            批次: {activeBatch.name.slice(0, 12)}
          </span>
        )}
      </div>

      <div className="mb-3">
        <label className="data-grid-header block mb-2">材料类型</label>
        <div className="grid grid-cols-2 gap-2">
          {(['original', 'processed'] as AudioSourceType[]).map((type) => {
            const file = getDisplayFile(type);
            return (
              <button
                key={type}
                onClick={() => setSourceType(type)}
                className={`p-2 rounded-lg border transition-all ${
                  sourceType === type
                    ? type === 'original'
                      ? 'bg-spectrum-cyan/10 border-spectrum-cyan/40 text-spectrum-cyan'
                      : 'bg-spectrum-pink/10 border-spectrum-pink/40 text-spectrum-pink'
                    : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {file && <CheckCircle2 className="w-3 h-3" />}
                  <span className="text-xs">{SOURCE_TYPE_LABELS[type]}</span>
                </div>
                {file && (
                  <div className="text-[10px] mt-1 opacity-70 truncate px-1">
                    {file.name.slice(0, 15)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!activeBatch && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>请先选择或创建分析批次</span>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative h-32 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? 'border-spectrum-cyan bg-spectrum-cyan/5'
            : 'border-slate-600/50 hover:border-slate-500/70'
        } ${!activeBatch ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.ogg,.flac,.m4a,.aac,audio/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={!activeBatch}
        />
        
        {displayFile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <FileAudio className={`w-8 h-8 ${sourceType === 'original' ? 'text-spectrum-cyan' : 'text-spectrum-pink'}`} />
            <div className="text-center">
              <div className="text-xs font-medium text-slate-200 truncate max-w-full">
                {displayFile.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {displayFile.sampleRate} Hz · {displayFile.duration.toFixed(1)}s
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Upload className="w-6 h-6 text-slate-500" />
            <div className="text-center">
              <div className="text-xs text-slate-400">
                拖拽文件到这里
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                或点击选择 WAV/MP3/OGG/FLAC
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
          <div className="flex items-center gap-1.5 text-[10px] text-rose-400">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {(originalFile || processedFile) && (
        <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">原始材料</span>
            <span className={originalFile ? 'text-emerald-400' : 'text-slate-500'}>
              {originalFile ? `✓ ${originalFile.name.slice(0, 15)}` : '未上传'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">处理结果</span>
            <span className={processedFile ? 'text-emerald-400' : 'text-slate-500'}>
              {processedFile ? `✓ ${processedFile.name.slice(0, 15)}` : '待生成'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
