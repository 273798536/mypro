import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '请先导入数据或加载样例',
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-4 p-6', className)}>
      {icon && (
        <div className="mb-2">
          {icon}
        </div>
      )}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        <p className="text-sm text-zinc-400 max-w-sm">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
