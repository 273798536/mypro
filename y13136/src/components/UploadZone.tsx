import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import type { RawParameterRecord } from '@/types';
import { parseCSVFile } from '@/utils/csv';
import { formatFileSize } from '@/utils/common';

interface UploadZoneProps {
  onUpload: (records: RawParameterRecord[], fileName: string) => void;
  currentFileName?: string;
}

export default function UploadZone({ onUpload, currentFileName }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('请上传 CSV 格式的文件');
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const records = await parseCSVFile(file);
        onUpload(records, file.name);
      } catch (e) {
        setError('文件解析失败，请检查文件格式');
      } finally {
        setIsLoading(false);
      }
    },
    [onUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded border-2 border-dashed transition-all p-6 text-center cursor-pointer ${
          isDragging
            ? 'border-amber-400/60 bg-amber-500/5'
            : error
            ? 'border-rose-500/40 bg-rose-500/5'
            : 'border-slate-700 hover:border-slate-600 bg-slate-800/20 hover:bg-slate-800/40'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
          ) : (
            <Upload
              className={`w-8 h-8 ${isDragging ? 'text-amber-400' : 'text-slate-500'}`}
              strokeWidth={1.5}
            />
          )}
          <div className={`text-sm ${isDragging ? 'text-amber-400' : 'text-slate-400'}`}>
            {isLoading ? '正在解析...' : '拖拽 CSV 文件到这里，或点击选择'}
          </div>
          <div className="text-xs text-slate-600">支持 .csv 格式，保留原始数据副本</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.8} />
          {error}
        </div>
      )}

      {currentFileName && !error && (
        <div className="flex items-center justify-between px-3 py-2 rounded border border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" strokeWidth={1.8} />
            <span className="text-sm text-slate-300 font-mono">{currentFileName}</span>
          </div>
          <span className="text-xs text-slate-500">当前数据源</span>
        </div>
      )}
    </div>
  );
}
