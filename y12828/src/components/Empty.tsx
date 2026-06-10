import { LucideIcon, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function Empty({
  title = '暂无数据',
  description = '请检查筛选条件或稍后再试',
  icon: Icon = FileQuestion,
  className,
}: EmptyProps) {
  return (
    <div className={cn('lab-card p-12 text-center', className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lab-bg flex items-center justify-center">
        <Icon className="text-lab-textMuted" size={32} />
      </div>
      <h3 className="text-lg font-medium text-lab-text mb-2">{title}</h3>
      <p className="text-lab-textMuted text-sm">{description}</p>
    </div>
  );
}

export default Empty;
