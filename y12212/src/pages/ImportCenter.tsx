import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  User,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  FileCheck,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import type { ImportType } from '../../shared/types';
import { cn } from '@/lib/utils';
import { useImportStore } from '@/stores/importStore';

const importTypes: { key: ImportType; label: string; icon: typeof User; color: string; description: string }[] = [
  { key: 'profile', label: '用户档案', icon: User, color: 'text-blue-600 border-blue-300 hover:border-blue-500 hover:bg-blue-50', description: '支持 .xlsx, .xls, .csv 格式' },
  { key: 'price', label: '阶梯价格', icon: DollarSign, color: 'text-green-600 border-green-300 hover:border-green-500 hover:bg-green-50', description: '支持 .xlsx, .xls, .csv 格式' },
  { key: 'payment', label: '缴费流水', icon: Receipt, color: 'text-purple-600 border-purple-300 hover:border-purple-500 hover:bg-purple-50', description: '支持 .xlsx, .xls, .csv 格式' },
];

const typeLabels: Record<ImportType, string> = {
  profile: '用户档案',
  price: '阶梯价格',
  payment: '缴费流水',
};

const typeColors: Record<ImportType, string> = {
  profile: 'bg-blue-100 text-blue-700',
  price: 'bg-green-100 text-green-700',
  payment: 'bg-purple-100 text-purple-700',
};

interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export default function ImportCenter() {
  const { tasks, loading, fetchTasks, uploadFile, fetchTaskById } = useImportStore();
  const [dragOver, setDragOver] = useState<ImportType | null>(null);
  const [selectedFile, setSelectedFile] = useState<Record<ImportType, File | null>>({
    profile: null,
    price: null,
    payment: null,
  });
  const [uploadingType, setUploadingType] = useState<ImportType | null>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailErrors, setDetailErrors] = useState<ImportError[]>([]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragOver = useCallback((type: ImportType, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((type: ImportType, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile((prev) => ({ ...prev, [type]: file }));
      }
    }
  }, []);

  const handleFileSelect = (type: ImportType, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFile((prev) => ({ ...prev, [type]: files[0] }));
    }
  };

  const handleUpload = async (type: ImportType) => {
    const file = selectedFile[type];
    if (!file) return;
    setUploadingType(type);
    try {
      await uploadFile(file, type);
      setSelectedFile((prev) => ({ ...prev, [type]: null }));
      await fetchTasks();
    } finally {
      setUploadingType(null);
    }
  };

  const handleViewDetail = async (task: any) => {
    const data = await fetchTaskById(task.id);
    setDetailTask(data);
    if (data && (data as any).error_details) {
      try {
        setDetailErrors(JSON.parse((data as any).error_details));
      } catch {
        setDetailErrors([]);
      }
    } else {
      setDetailErrors([]);
    }
    setShowDetail(true);
  };

  const statusDot: Record<string, string> = {
    processing: 'bg-yellow-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Upload className="h-6 w-6 text-[#3b82f6]" />
        <h2 className="text-xl font-bold text-[#1e3a5f]">数据导入中心</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {importTypes.map(({ key, label, icon: Icon, color, description }) => (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-5 w-5 text-[#3b82f6]" />
              <h3 className="font-semibold text-[#1e3a5f]">{label}</h3>
            </div>

            <div
              onDragOver={(e) => handleDragOver(key, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(key, e)}
              onClick={() => document.getElementById(`file-${key}`)?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-all',
                dragOver === key
                  ? 'border-[#3b82f6] bg-blue-50'
                  : selectedFile[key]
                  ? 'border-[#10b981] bg-green-50'
                  : 'border-gray-300 hover:border-[#3b82f6] hover:bg-gray-50',
                color
              )}
            >
              <input
                id={`file-${key}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFileSelect(key, e)}
              />
              {selectedFile[key] ? (
                <>
                  <FileSpreadsheet className="mb-2 h-10 w-10 text-[#10b981]" />
                  <p className="text-sm font-medium text-[#10b981]">{selectedFile[key]?.name}</p>
                  <p className="mt-1 text-xs text-gray-500">点击重新选择文件</p>
                </>
              ) : (
                <>
                  <Upload className={cn('mb-2 h-10 w-10', dragOver === key ? 'text-[#3b82f6]' : 'text-gray-400')} />
                  <p className="text-sm font-medium text-gray-600">拖拽文件到此处</p>
                  <p className="mt-1 text-xs text-gray-400">或点击选择</p>
                  <p className="mt-2 text-xs text-gray-400">{description}</p>
                </>
              )}
            </div>

            {selectedFile[key] && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleUpload(key)}
                  disabled={uploadingType === key}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
                    uploadingType === key
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-[#3b82f6] hover:bg-[#2563eb]'
                  )}
                >
                  {uploadingType === key ? '上传中...' : '开始导入'}
                </button>
                <button
                  onClick={() => setSelectedFile((prev) => ({ ...prev, [key]: null }))}
                  className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-[#1e3a5f]">导入历史记录</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">导入时间</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">数据类型</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">原始材料</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600">总记录</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600">成功</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600">失败</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">状态</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    <span className="animate-pulse">加载中...</span>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    暂无导入记录
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {task.created_at}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', typeColors[task.type])}>
                        {typeLabels[task.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-xs text-gray-600">{task.file_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-gray-700">{task.total_records}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono font-semibold text-[#10b981]">{task.success_count}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('font-mono font-semibold', task.error_count > 0 ? 'text-[#ef4444]' : 'text-gray-400')}>
                        {task.error_count}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', statusDot[task.status])} />
                        <span className="text-sm text-gray-700">
                          {task.status === 'processing' ? '处理中' : task.status === 'completed' ? '已完成' : '失败'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleViewDetail(task)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#3b82f6] hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && detailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-slide-in-up max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="font-semibold text-[#1e3a5f]">导入任务详情</h3>
              <button onClick={() => setShowDetail(false)} className="rounded-md p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">导入时间</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{detailTask.created_at}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">数据类型</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{typeLabels[detailTask.type]}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">原始文件</p>
                  <p className="mt-1 text-sm font-mono text-gray-800">{detailTask.file_name}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">处理状态</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <span className={cn('h-2 w-2 rounded-full', statusDot[detailTask.status])} />
                    {detailTask.status === 'processing' ? '处理中' : detailTask.status === 'completed' ? '已完成' : '失败'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-500">总记录数</p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">{detailTask.total_records}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    成功
                  </div>
                  <p className="mt-1 text-2xl font-bold text-[#10b981]">{detailTask.success_count}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    失败
                  </div>
                  <p className="mt-1 text-2xl font-bold text-[#ef4444]">{detailTask.error_count}</p>
                </div>
              </div>

              {detailErrors.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-semibold text-[#ef4444]">错误明细</h4>
                  <div className="max-h-64 overflow-x-auto rounded-md border border-red-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-red-700">行号</th>
                          <th className="px-3 py-2 text-left font-medium text-red-700">字段</th>
                          <th className="px-3 py-2 text-left font-medium text-red-700">值</th>
                          <th className="px-3 py-2 text-left font-medium text-red-700">错误信息</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailErrors.map((err, idx) => (
                          <tr key={idx} className="border-b border-red-100">
                            <td className="px-3 py-2 font-mono text-red-800">{err.row}</td>
                            <td className="px-3 py-2 font-mono text-red-800">{err.field}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{err.value}</td>
                            <td className="px-3 py-2 text-red-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-md bg-blue-50 border border-blue-200 p-4">
                <h4 className="mb-1 text-sm font-medium text-blue-700">原始文件路径</h4>
                <p className="font-mono text-xs text-blue-600">{detailTask.original_file_path}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
