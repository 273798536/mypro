import { cn } from '@/lib/utils';
import { Inbox, Search, FileX, AlertCircle, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type EmptyStateType = 'default' | 'search' | 'error' | 'no-data';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap: Record<EmptyStateType, LucideIcon> = {
  default: Inbox,
  search: Search,
  error: AlertCircle,
  'no-data': FileX,
};

const titleMap: Record<EmptyStateType, string> = {
  default: '暂无数据',
  search: '未找到匹配结果',
  error: '加载失败',
  'no-data': '暂无记录',
};

const descriptionMap: Record<EmptyStateType, string> = {
  default: '这里还没有任何内容，点击下方按钮添加第一条记录吧',
  search: '请尝试更换搜索关键词或筛选条件',
  error: '请检查网络连接后重试',
  'no-data': '当前条件下没有可用数据',
};

export default function EmptyState({
  type = 'default',
  title,
  description,
  icon: CustomIcon,
  action,
  className,
}: EmptyStateProps) {
  const Icon = CustomIcon || iconMap[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-full">
        <Icon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
        {title || titleMap[type]}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
        {description || descriptionMap[type]}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2',
            'bg-primary-700 hover:bg-primary-800 text-white',
            'text-sm font-medium rounded-lg transition-colors'
          )}
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
