import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function Empty({
  title = '暂无数据',
  description,
  actionText,
  onAction,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8')}>
      <Info className="w-10 h-10 text-stone-400 mb-3" />
      <p className="text-stone-600 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-stone-500 mt-1">{description}</p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-sm bg-terracotta-600 text-white rounded hover:bg-terracotta-700"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
