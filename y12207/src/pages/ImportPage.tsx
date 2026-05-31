import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Database, FileText, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { dataSourceLabels } from '@/data/mockData';
import { formatFileSize, formatDateTime } from '@/utils/format';
import type { DataSourceType, ImportFile } from '@/types';

const sourceTypes: { type: DataSourceType; label: string; icon: typeof FileSpreadsheet; description: string }[] = [
  { type: 'ledger', label: '项目台账', icon: Database, description: '包含项目基本信息、投资金额等' },
  { type: 'model', label: '估值模型', icon: FileSpreadsheet, description: '包含估值计算模型和公式' },
  { type: 'memo', label: '估值备忘', icon: FileText, description: '包含人工估值记录和说明' },
];

export default function ImportPage() {
  const { importFiles, addImportFile, updateImportFile } = useValuationStore();
  const [dragActive, setDragActive] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  }, []);

  const processFile = useCallback((file: File, type: DataSourceType) => {
    const importFile: ImportFile = {
      id: `import-${Date.now()}`,
      name: file.name,
      type,
      size: file.size,
      uploadTime: new Date().toISOString(),
      status: 'processing',
    };
    addImportFile(importFile);

    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;
      updateImportFile(importFile.id, {
        status: isSuccess ? 'success' : 'error',
        message: isSuccess ? undefined : '文件格式错误或数据不完整',
        rowCount: isSuccess ? Math.floor(Math.random() * 50) + 10 : undefined,
      });
    }, 1500);
  }, [addImportFile, updateImportFile]);

  const handleDrop = useCallback((e: React.DragEvent, type: DataSourceType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => processFile(file, type));
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: DataSourceType) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => processFile(file, type));
    e.target.value = '';
  }, [processFile]);

  const statusConfig = {
    pending: { icon: Loader2, color: 'text-slate-400', label: '等待处理' },
    processing: { icon: Loader2, color: 'text-blue-500 animate-spin', label: '处理中' },
    success: { icon: CheckCircle, color: 'text-emerald-500', label: '成功' },
    error: { icon: XCircle, color: 'text-red-500', label: '失败' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">数据导入台</h1>
        <p className="text-slate-500 mt-1">上传项目台账、估值模型和估值备忘，系统将自动进行数据校验</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sourceTypes.map((source) => {
          const Icon = source.icon;
          const isDragActive = dragActive === source.type;

          return (
            <div
              key={source.type}
              className={`relative rounded-xl border-2 border-dashed p-6 transition-all ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
              onDragEnter={(e) => handleDrag(e, source.type)}
              onDragLeave={(e) => handleDrag(e, source.type)}
              onDragOver={(e) => handleDrag(e, source.type)}
              onDrop={(e) => handleDrop(e, source.type)}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 ${
                  isDragActive ? 'bg-primary-100' : 'bg-slate-100'
                }`}>
                  <Icon className={`w-8 h-8 ${isDragActive ? 'text-primary-600' : 'text-slate-500'}`} />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">{source.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{source.description}</p>
                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>选择文件</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => handleFileInput(e, source.type)}
                      multiple
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">支持 .xlsx, .xls, .csv 格式</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {importFiles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">导入记录</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {importFiles.map((file) => {
              const StatusIcon = statusConfig[file.status].icon;
              const sourceInfo = sourceTypes.find((s) => s.type === file.type);
              const SourceIcon = sourceInfo?.icon || FileSpreadsheet;

              return (
                <div key={file.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <SourceIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 truncate">{file.name}</p>
                      <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                        {dataSourceLabels[file.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatDateTime(file.uploadTime)}</span>
                      {file.rowCount && <span>{file.rowCount} 条数据</span>}
                    </div>
                    {file.message && (
                      <p className="text-sm text-red-500 mt-1">{file.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-sm ${statusConfig[file.status].color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig[file.status].label}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800">数据处理说明</h3>
            <ul className="mt-2 text-sm text-amber-700 space-y-1">
              <li>• 系统保留原始数据版本，不会自动修改业务口径</li>
              <li>• 数据冲突将在估值工作台显示，请人工确认后处理</li>
              <li>• 所有导入操作都将记录在操作日志中，可追溯</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
