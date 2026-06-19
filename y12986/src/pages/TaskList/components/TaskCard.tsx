import React from 'react';
import type { ReplayTask } from '@/types';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { StatusDot } from '@/components/ui/StatusDot';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Clock, Database, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import {
  formatDateTime,
  getTaskStatusLabel,
  getTaskStatusColor,
} from '@/utils/format';

interface TaskCardProps {
  task: ReplayTask;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onView: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, selected, onSelect, onView }) => {
  const pendingCount = task.exceptionCount - task.reviewedCount;
  const tone =
    task.status === 'processing'
      ? 'primary'
      : task.status === 'completed'
      ? 'emerald'
      : task.status === 'pending'
      ? 'amber'
      : 'primary';

  const borderClass = selected
    ? 'border-2 border-primary-500 shadow-md ring-1 ring-primary-200'
    : 'border border-gray-200';

  return (
    <Card
      className={`cursor-pointer transition-all ${borderClass} ${
        selected ? 'bg-primary-50/30' : ''
      }`}
    >
      <div onClick={() => onSelect(task.id)}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-primary-600">
                {task.id}
              </span>
              <StatusDot
                color={task.status === 'processing' ? 'bg-blue-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}
                pulse={task.status === 'processing'}
              />
            </div>
            <div className="text-sm font-semibold text-gray-900 leading-tight truncate">
              {task.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-500 font-mono">
                {formatDateTime(task.importTime)}
              </span>
            </div>
          </div>
          <Tag
            tone={
              task.status === 'completed'
                ? 'emerald'
                : task.status === 'processing'
                ? 'primary'
                : 'amber'
            }
          >
            {getTaskStatusLabel(task.status)}
          </Tag>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 px-2.5 py-2 border border-gray-100">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-0.5">
              <Database className="w-3 h-3" />
              总记录数
            </div>
            <div className="text-base font-bold text-gray-900 font-mono">
              {task.totalRecords.toLocaleString()}
            </div>
          </div>
          <div className="bg-rose-50 px-2.5 py-2 border border-rose-100">
            <div className="flex items-center gap-1.5 text-[10px] text-rose-600 mb-0.5">
              <AlertTriangle className="w-3 h-3" />
              异常数
            </div>
            <div className="text-base font-bold text-rose-700 font-mono">
              {task.exceptionCount}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1 text-gray-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              已复核 {task.reviewedCount} / {task.exceptionCount}
            </span>
            {pendingCount > 0 && (
              <span className="text-amber-600 font-medium">待处理 {pendingCount}</span>
            )}
          </div>
          <Progress value={task.reviewedCount} max={Math.max(task.exceptionCount, 1)} tone={tone as any} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-1">
        <div className="text-[11px] text-gray-500 truncate max-w-[60%]">
          {task.description}
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          查看
        </Button>
      </div>
    </Card>
  );
};
