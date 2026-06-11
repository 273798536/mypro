import { useScheduleStore, Notification as NotificationType } from '@/store';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const colorMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const iconColorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500'
};

function ToastItem({ notif }: { notif: NotificationType }) {
  const clearNotification = useScheduleStore((s) => s.clearNotification);
  const Icon = iconMap[notif.type];
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-[slideIn_0.2s_ease-out]',
        colorMap[notif.type]
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColorMap[notif.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">{notif.message}</p>
      </div>
      <button
        onClick={() => clearNotification(notif.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

export default function NotificationToast() {
  const notifications = useScheduleStore((s) => s.notifications);
  if (notifications.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] space-y-2 pointer-events-auto">
      {notifications.map((n) => (
        <ToastItem key={n.id} notif={n} />
      ))}
    </div>
  );
}
