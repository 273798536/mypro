import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import type { AudioData } from '../types';

interface AudioUploaderProps {
  onAudioLoaded?: (audioData: AudioData) => void;
}

export function AudioUploader({ onAudioLoaded }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { audioData, setAudioData, resetAnalysis } = useAnalysisStore();
  const { loadAudioFile } = useAudioAnalysis();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|m4a|flac)$/i)) {
      alert('请上传音频文件（.wav, .mp3, .ogg, .m4a, .flac）');
      return;
    }

    setIsLoading(true);
    try {
      const audioData = await loadAudioFile(file);
      if (audioData && onAudioLoaded) {
        onAudioLoaded(audioData);
      }
    } catch (error) {
      console.error('Failed to load audio:', error);
      alert('音频文件加载失败，请检查文件格式');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    resetAnalysis();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetAnalysis]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full">
      {!audioData ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-primary-500 bg-primary-500/10' 
              : 'border-dark-600 hover:border-primary-500 bg-dark-800/50'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors
              ${isDragging ? 'bg-primary-500/20' : 'bg-dark-700'}`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-400' : 'text-dark-400'}`} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-white mb-1">
                {isLoading ? '正在加载音频...' : '拖拽音频文件到此处'}
              </p>
              <p className="text-sm text-dark-400">
                或点击选择文件，支持 WAV、MP3、OGG、M4A 格式
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <FileAudio className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-white truncate max-w-[200px]">
                  {useAnalysisStore.getState().currentRecord?.source.fileName}
                </p>
                <p className="text-sm text-dark-400">
                  {formatFileSize(useAnalysisStore.getState().currentRecord?.source.fileSize || 0)} · 
                  {audioData.duration.toFixed(2)} 秒 · 
                  {audioData.sampleRate} Hz
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-dark-700 transition-colors text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
