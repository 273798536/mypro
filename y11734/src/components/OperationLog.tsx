import { Clock, Edit, CheckCircle, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OperationLog as OperationLogType } from '@/types';

interface OperationLogProps {
  logs: OperationLogType[];
  maxItems?: number;
}

const actionIcons = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  confirm: CheckCircle,
  dispute: AlertTriangle,
  adjust: Edit,
};

const actionLabels: Record<OperationLogType['action'], string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  confirm: '确认',
  dispute: '标记争议',
  adjust: '调整',
};

const targetTypeLabels: Record<OperationLogType['targetType'], string> = {
  payment: '回款',
  split: '拆分',
  invoice: '发票',
};

const actionColors: Record<OperationLogType['action'], string> = {
  create: 'text-green-600 bg-green-100',
  update: 'text-blue-600 bg-blue-100',
  delete: 'text-red-600 bg-red-100',
  confirm: 'text-emerald-600 bg-emerald-100',
  dispute: 'text-amber-600 bg-amber-100',
  adjust: 'text-purple-600 bg-purple-100',
};

export default function OperationLog({
  logs,
  maxItems = 20,
}: OperationLogProps) {
  const displayLogs = logs.slice(0, maxItems);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (displayLogs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">暂无操作记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {displayLogs.map((log, index) => {
        const Icon = actionIcons[log.action] || Edit;
        const isLast = index === displayLogs.length - 1;

        return (
          <div key={log.id} className="relative">
            {!isLast && (
              <div
                className="absolute left-5 top-8 w-0.5 h-full bg-slate-200"
                aria-hidden="true"
              />
            )}
            <div className="relative flex gap-4 pb-4">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  actionColors[log.action]
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    {actionLabels[log.action]}{' '}
                    <span className="text-slate-500 font-normal">
                      {targetTypeLabels[log.targetType]}
                    </span>
                  </p>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatTime(log.operateTime)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  操作人：{log.operator}
                </p>
                {(log.beforeValue || log.afterValue) && (
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs space-y-1">
                    {log.beforeValue && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 flex-shrink-0">
                          修改前：
                        </span>
                        <span className="text-slate-600 break-all">
                          {log.beforeValue}
                        </span>
                      </div>
                    )}
                    {log.afterValue && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 flex-shrink-0">
                          修改后：
                        </span>
                        <span className="text-slate-700 font-medium break-all">
                          {log.afterValue}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
