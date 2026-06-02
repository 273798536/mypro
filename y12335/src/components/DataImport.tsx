import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ImportLog } from '@/types';

interface DataImportProps {
  type: 'volunteers' | 'skills' | 'leave';
  title: string;
  description: string;
  sample: string;
}

export function DataImport({ type, title, description, sample }: DataImportProps) {
  const importVolunteers = useStore(s => s.importVolunteers);
  const importSkills = useStore(s => s.importSkills);
  const importLeaveRecords = useStore(s => s.importLeaveRecords);
  const [isDragging, setIsDragging] = useState(false);
  const [lastLog, setLastLog] = useState<ImportLog | null>(null);
  const [showLog, setShowLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let log: ImportLog | null = null;
      if (type === 'volunteers') {
        log = importVolunteers(text, file.name);
      } else if (type === 'skills') {
        log = importSkills(text, file.name);
      } else if (type === 'leave') {
        log = importLeaveRecords(text, file.name);
      }
      if (log) {
        setLastLog(log);
        setShowLog(true);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFile(file);
    }
  };

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-brand-400" />
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-surface-600 hover:border-surface-500 hover:bg-surface-700/50'
        }`}
      >
        <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-brand-400' : 'text-gray-500'}`} />
        <p className="text-sm text-gray-400">拖放 CSV 文件或点击选择</p>
        <p className="text-xs text-gray-600 mt-1 font-mono">{sample}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {lastLog && showLog && (
        <div className={`mt-3 rounded-lg p-3 ${lastLog.errorCount > 0 ? 'bg-warn/10 border border-warn/30' : 'bg-brand-500/10 border border-brand-500/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {lastLog.errorCount > 0 ? (
                <AlertCircle size={16} className="text-warn" />
              ) : (
                <CheckCircle size={16} className="text-brand-400" />
              )}
              <span className="text-sm font-medium text-gray-200">{lastLog.filename}</span>
            </div>
            <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-gray-400">
              <X size={14} />
            </button>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex gap-4">
              <span>导入: {lastLog.recordCount} 条</span>
              <span className="text-brand-400">成功: {lastLog.successCount} 条</span>
              <span className={lastLog.errorCount > 0 ? 'text-warn' : ''}>错误: {lastLog.errorCount} 条</span>
            </div>
            {lastLog.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-warn/20">
                {lastLog.errors.slice(0, 3).map((err, i) => (
                  <div key={i} className="flex items-start gap-1 text-warn">
                    <XCircle size={12} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
                {lastLog.errors.length > 3 && (
                  <span className="text-gray-500">...还有 {lastLog.errors.length - 3} 条错误</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
