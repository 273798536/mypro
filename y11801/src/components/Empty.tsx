import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function Empty({
  icon = <Inbox className="h-12 w-12 text-slate-300" />,
  title = '暂无数据',
  description,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-medium text-slate-600 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400">{description}</p>
      )}
    </div>
  );
}
