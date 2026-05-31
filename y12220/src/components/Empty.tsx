import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '当前没有可用的数据记录',
  icon,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="mb-4 p-4 rounded-full bg-primary-50 text-primary-400">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-lg font-medium text-primary-800 mb-2">{title}</h3>
      <p className="text-sm text-primary-500 max-w-md">{description}</p>
    </div>
  );
}
