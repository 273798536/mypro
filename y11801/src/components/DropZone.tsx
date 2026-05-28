import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { importService } from '../services';
import type { ImportDataType } from 'shared/types';
import { DATA_TYPE_LABELS } from 'shared/constants';

interface DropZoneProps {
  dataType: ImportDataType;
  onDataTypeChange: (type: ImportDataType) => void;
}

export function DropZone({ dataType, onDataTypeChange }: DropZoneProps) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: ImportDataType }) =>
      importService.uploadFile(file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importLogs'] });
      setSelectedFile(null);
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, type: dataType });
    }
  };

  const dataTypes: ImportDataType[] = ['vehicle', 'contract', 'residual'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-700">选择数据类型：</span>
        <div className="flex gap-2">
          {dataTypes.map((type) => (
            <button
              key={type}
              onClick={() => onDataTypeChange(type)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded border-2 transition-colors',
                dataType === type
                  ? 'border-blue-900 bg-blue-900 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-blue-900'
              )}
            >
              {type === 'vehicle' && <FileSpreadsheet className="inline h-4 w-4 mr-1" />}
              {type === 'contract' && <FileText className="inline h-4 w-4 mr-1" />}
              {type === 'residual' && <AlertCircle className="inline h-4 w-4 mr-1" />}
              {DATA_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
          isDragOver
            ? 'border-blue-900 bg-blue-50'
            : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
        )}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={cn('h-12 w-12 mx-auto mb-4', isDragOver ? 'text-blue-900' : 'text-slate-400')} />
        {selectedFile ? (
          <div>
            <p className="text-lg font-medium text-slate-800">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-slate-700">拖拽文件到此处或点击上传</p>
            <p className="text-sm text-slate-500 mt-1">支持 Excel (.xlsx, .xls) 和 CSV 文件</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setSelectedFile(null)}
            className="px-4 py-2 text-sm font-medium text-slate-600 border-2 border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-900 border-2 border-blue-900 rounded hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                开始导入
              </>
            )}
          </button>
        </div>
      )}

      {uploadMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">上传失败</p>
          <p className="text-sm mt-1">{(uploadMutation.error as Error).message}</p>
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          <p className="font-medium">导入成功！</p>
          <p className="text-sm mt-1">数据已成功导入系统</p>
        </div>
      )}
    </div>
  );
}
