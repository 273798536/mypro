import { Download, RefreshCw, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { exportService } from '../services';
import type { ExportTask } from 'shared/types';
import { EXPORT_STATUS_LABELS, EXPORT_TYPE_LABELS } from 'shared/constants';

interface ExportTaskCardProps {
  task: ExportTask;
}

const statusColorMap = {
  pending: 'bg-slate-100 text-slate-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const progressMap = {
  pending: 0,
  processing: 60,
  completed: 100,
  failed: 100,
};

export function ExportTaskCard({ task }: ExportTaskCardProps) {
  const queryClient = useQueryClient();

  const downloadMutation = useMutation({
    mutationFn: () => exportService.download(task.id),
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.taskName}.${task.exportType}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => exportService.retry(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTasks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => exportService.deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTasks'] });
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const progress = progressMap[task.status];
  const isProcessing = task.status === 'processing';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded',
            task.exportType === 'excel' ? 'bg-green-50' : 'bg-red-50'
          )}>
            {task.exportType === 'excel' ? (
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            ) : (
              <FileText className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{task.taskName}</h4>
            <p className="text-sm text-slate-500">
              {EXPORT_TYPE_LABELS[task.exportType]} · {task.recordIds.length} 条记录
            </p>
          </div>
        </div>
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded',
          statusColorMap[task.status]
        )}>
          {EXPORT_STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.status === 'processing' && (
        <div className="mb-3">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right">{progress}%</p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
        <span>创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
        {task.completedAt && (
          <span>完成时间：{new Date(task.completedAt).toLocaleString('zh-CN')}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-slate-600">
          文件大小：{formatFileSize(task.fileSize)}
        </span>
        <div className="flex items-center gap-2">
          {task.status === 'completed' && (
            <button
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <Download className={cn('h-4 w-4', downloadMutation.isPending && 'animate-bounce')} />
              下载
            </button>
          )}
          {task.status === 'failed' && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', retryMutation.isPending && 'animate-spin')} />
              重试
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('确定要删除此导出任务吗？')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite]" />
        </div>
      )}
    </div>
  );
}
