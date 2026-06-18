import { Save, Check, AlertCircle, Loader2 } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const config = {
    idle: { icon: Save, text: '已保存', color: 'text-emerald-400', bg: '' },
    saving: {
      icon: Loader2,
      text: '保存中...',
      color: 'text-cyan-accent',
      bg: 'animate-pulse',
    },
    saved: { icon: Check, text: '已保存', color: 'text-emerald-400', bg: '' },
    error: {
      icon: AlertCircle,
      text: '保存失败',
      color: 'text-rose-alert',
      bg: '',
    },
  };

  const { icon: Icon, text, color, bg } = config[status];

  return (
    <div className={`flex items-center gap-2 text-xs ${color} ${bg}`}>
      <Icon size={14} className={status === 'saving' ? 'animate-spin' : ''} />
      <span>{text}</span>
    </div>
  );
}
