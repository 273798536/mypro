import { useState, useCallback } from 'react';
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSourceType } from '@/types';

interface FileUploadProps {
  onFileUpload: (file: File, type: DataSourceType) => void;
  acceptedTypes?: DataSourceType[];
}

interface UploadedFile {
  file: File;
  type: DataSourceType;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const typeLabels: Record<DataSourceType, string> = {
  payment: '回款流水',
  invoice: '发票池',
  seller: '卖方账号',
  contract: '保理合同',
  fee: '手续费',
  report: '拆分报告',
};

const typeColors: Record<DataSourceType, string> = {
  payment: 'bg-blue-100 text-blue-700 border-blue-200',
  invoice: 'bg-green-100 text-green-700 border-green-200',
  seller: 'bg-purple-100 text-purple-700 border-purple-200',
  contract: 'bg-orange-100 text-orange-700 border-orange-200',
  fee: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  report: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function FileUpload({
  onFileUpload,
  acceptedTypes = ['payment', 'invoice', 'seller', 'contract', 'fee'],
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(
    (file: File) => {
      const fileName = file.name.toLowerCase();
      let detectedType: DataSourceType = 'payment';

      if (fileName.includes('回款') || fileName.includes('payment')) {
        detectedType = 'payment';
      } else if (fileName.includes('发票') || fileName.includes('invoice')) {
        detectedType = 'invoice';
      } else if (fileName.includes('卖方') || fileName.includes('seller')) {
        detectedType = 'seller';
      } else if (fileName.includes('合同') || fileName.includes('contract')) {
        detectedType = 'contract';
      } else if (fileName.includes('手续费') || fileName.includes('fee')) {
        detectedType = 'fee';
      }

      if (!acceptedTypes.includes(detectedType)) {
        detectedType = acceptedTypes[0];
      }

      const newFile: UploadedFile = {
        file,
        type: detectedType,
        status: 'uploading',
      };

      setUploadedFiles((prev) => [...prev, newFile]);

      setTimeout(() => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file.name === file.name ? { ...f, status: 'success' } : f
          )
        );
        onFileUpload(file, detectedType);
      }, 500);
    },
    [acceptedTypes, onFileUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')
        ) {
          processFile(file);
        }
      });
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => processFile(file));
      e.target.value = '';
    },
    [processFile]
  );

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-slate-600 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          className={cn(
            'mx-auto h-12 w-12 mb-3 transition-colors',
            isDragging ? 'text-slate-600' : 'text-slate-400'
          )}
        />
        <p className="text-sm text-slate-600 mb-2">
          拖拽文件到此处，或
          <label className="text-slate-800 font-medium cursor-pointer hover:underline ml-1">
            点击上传
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileChange}
            />
          </label>
        </p>
        <p className="text-xs text-slate-400">支持 .xlsx, .xls, .csv 格式</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {acceptedTypes.map((type) => (
          <span
            key={type}
            className={cn(
              'px-3 py-1 text-xs rounded-full border',
              typeColors[type]
            )}
          >
            {typeLabels[type]}
          </span>
        ))}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
            >
              <File className="h-5 w-5 text-slate-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {item.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-full border',
                      typeColors[item.type]
                    )}
                  >
                    {typeLabels[item.type]}
                  </span>
                </div>
              </div>
              {item.status === 'uploading' && (
                <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              )}
              {item.status === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {item.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
