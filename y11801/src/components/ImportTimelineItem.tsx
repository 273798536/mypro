import { Trash2, Car, FileText, BarChart3 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { importService } from '../services';
import type { ImportLog, ImportDataType } from 'shared/types';
import { DATA_TYPE_LABELS, IMPORT_STATUS_LABELS } from 'shared/constants';

interface ImportTimelineItemProps {
  log: ImportLog;
  isNew?: boolean;
}

const iconMap: Record<ImportDataType, typeof Car> = {
  vehicle: Car,
  contract: FileText,
  residual: BarChart3,
};

const colorMap: Record<ImportDataType, string> = {
  vehicle: 'bg-blue-500',
  contract: 'bg-green-500',
  residual: 'bg-purple-500',
};

const statusColorMap: Record<string, string> = {
  success: 'bg-green-100 text-green-700 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
  partial: 'bg-amber-100 text-amber-700 border-amber-300',
};

export function ImportTimelineItem({ log, isNew }: ImportTimelineItemProps) {
  const queryClient = useQueryClient();
  const Icon = iconMap[log.dataType];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => importService.deleteImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importLogs'] });
    },
  });

  const handleDelete = () => {
    if (log.status === 'failed' || log.status === 'partial') {
      if (confirm('确定要删除此导入记录吗？')) {
        deleteMutation.mutate(log.id);
      }
    }
  };

  return (
    <div
      className={cn(
        'relative pl-8 pb-6',
        isNew && 'animate-[slideInLeft_0.5s_ease-out]'
      )}
    >
      <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-slate-200" />
      <div
        className={cn(
          'absolute left-[-16px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
          colorMap[log.dataType]
        )}
      >
        <span className="text-xs font-bold">{log.importOrder}</span>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded', colorMap[log.dataType], 'bg-opacity-10')}>
              <Icon className={cn('h-5 w-5', colorMap[log.dataType].replace('bg-', 'text-'))} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">{log.fileName}</h4>
              <p className="text-sm text-slate-500">
                {DATA_TYPE_LABELS[log.dataType]} · {log.recordCount} 条记录
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded border',
                statusColorMap[log.status]
              )}
            >
              {IMPORT_STATUS_LABELS[log.status]}
            </span>
            {(log.status === 'failed' || log.status === 'partial') && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="删除错误导入"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>导入人：{log.importedBy}</span>
          <span>导入时间：{new Date(log.importedAt).toLocaleString('zh-CN')}</span>
        </div>

        {log.errorMessage && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            错误信息：{log.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
