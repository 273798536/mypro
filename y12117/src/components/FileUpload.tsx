import { useState, useRef } from 'react';
import { Upload, X, FileText, Database } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { parseCSV } from '@/utils/dataProcessor';
import { generateMockData, getMockAnalysisParams } from '@/utils/mockData';
import { cn } from '@/lib/utils';

export default function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedFiles, addFile, removeFile, setMockData, setParams } = useAppStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await handleFiles(e.target.files);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.csv')) {
          const parsed = await parseCSV(file);
          addFile(parsed);
        }
      }
    } catch (error) {
      console.error('文件解析失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const loadMockData = () => {
    const mockFiles = generateMockData();
    const mockParams = getMockAnalysisParams();
    setMockData(mockFiles, mockParams);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
          isDragging 
            ? "border-cyan-400 bg-cyan-900/20" 
            : "border-slate-600 hover:border-slate-500 bg-slate-800/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-slate-300 mb-2">
          {isDragging ? '释放以上传文件' : '拖拽 CSV 文件到此处，或点击选择文件'}
        </p>
        <p className="text-sm text-slate-500">支持多文件上传</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={loadMockData}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
        >
          <Database className="h-4 w-4" />
          加载示例数据
        </button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">已上传文件</h4>
          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-slate-800 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-sm text-slate-200 font-mono">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {file.rows.length} 行数据 · {file.fields.length} 个字段
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">字段识别</h4>
          <div className="bg-slate-800 rounded p-3">
            {uploadedFiles.flatMap(file => 
              file.fields.map(field => (
                <div key={`${file.id}-${field.name}`} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300">{field.name}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-mono",
                    field.type === 'time' ? "bg-cyan-900 text-cyan-300" :
                    field.type === 'metric' ? "bg-emerald-900 text-emerald-300" :
                    field.type === 'group' ? "bg-amber-900 text-amber-300" :
                    "bg-slate-700 text-slate-400"
                  )}>
                    {field.type === 'time' ? '时间' :
                     field.type === 'metric' ? '指标' :
                     field.type === 'group' ? '分组' : '未知'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
