import { CheckCircle2, Loader2, XCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/types';
import { formatTime } from '@/utils/format';

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSavedTime: string | null;
  className?: string;
}

export default function SyncIndicator({ status, lastSavedTime, className }: SyncIndicatorProps) {
  const config = {
    idle: {
      icon: Cloud,
      text: '已就绪',
      iconColor: 'text-text-muted',
      textColor: 'text-text-muted',
    },
    saving: {
      icon: Loader2,
      text: '正在同步...',
      iconColor: 'text-yellow-500 animate-spin',
      textColor: 'text-yellow-600',
    },
    synced: {
      icon: CheckCircle2,
      text: '已同步',
      iconColor: 'text-success',
      textColor: 'text-success',
    },
    error: {
      icon: XCircle,
      text: '同步失败',
      iconColor: 'text-danger',
      textColor: 'text-danger',
    },
  };

  const { icon: Icon, text, iconColor, textColor } = config[status];

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className={cn('w-4 h-4', iconColor)} />
      <span className={cn('font-medium', textColor)}>{text}</span>
      {lastSavedTime && status === 'idle' && (
        <span className="text-text-muted text-xs">
          上次保存：{formatTime(lastSavedTime)}
        </span>
      )}
    </div>
  );
}
