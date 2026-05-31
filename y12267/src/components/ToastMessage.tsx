import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ToastMessageProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const ToastMessage: React.FC<ToastMessageProps> = ({
  message,
  type = 'error',
  visible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="text-red-400" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'info':
        return <Info className="text-blue-400" size={20} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-500/50';
      case 'success':
        return 'bg-green-900/90 border-green-500/50';
      case 'info':
        return 'bg-blue-900/90 border-blue-500/50';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg ${getBgColor()}`}
        >
          <div className="flex items-center gap-3 max-w-md">
            {getIcon()}
            <p className="text-white text-sm">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToastMessage;
