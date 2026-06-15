import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useAppStore } from '../store';

export default function NotificationToast() {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  const getIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-data-available" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-data-recollect" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-ocean-400" />;
    }
  };

  const getBgColor = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-data-available/10 border-data-available/30';
      case 'error':
        return 'bg-data-recollect/10 border-data-recollect/30';
      case 'info':
        return 'bg-ocean-600/20 border-ocean-500/30';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg animate-fade-in-up ${getBgColor(
            notification.type
          )}`}
        >
          {getIcon(notification.type)}
          <span className="text-sm text-ocean-100">{notification.message}</span>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-2 text-ocean-400 hover:text-ocean-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
