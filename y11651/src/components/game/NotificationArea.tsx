import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import type { Notification } from '../../types/game';

interface NotificationAreaProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const iconMap = {
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  danger: <AlertCircle className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />
};

const colorMap = {
  info: 'bg-blue-600/90 border-blue-400',
  warning: 'bg-yellow-600/90 border-yellow-400',
  danger: 'bg-red-600/90 border-red-400',
  success: 'bg-green-600/90 border-green-400'
};

export const NotificationArea: React.FC<NotificationAreaProps> = ({
  notifications,
  onRemove
}) => {
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onRemove]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className={`
              ${colorMap[notification.type]}
              backdrop-blur-sm border rounded-lg p-4 shadow-xl
              flex items-start gap-3
            `}
          >
            <div className="text-white flex-shrink-0">
              {iconMap[notification.type]}
            </div>
            <div className="flex-1 text-white text-sm">
              {notification.message}
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="text-white/70 hover:text-white flex-shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
