import { FileQuestion } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '这里还没有任何内容',
  action,
  icon,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <div className="mb-4 w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
        {icon || <FileQuestion className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-md">{description}</p>
      {action}
    </div>
  );
}
