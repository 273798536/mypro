import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { AlertTriangle, AlertCircle, Wind, Zap, UserX, Clock } from 'lucide-react';

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'oxygen': return <Wind className="w-5 h-5" />;
    case 'power': return <Zap className="w-5 h-5" />;
    case 'fatigue': return <UserX className="w-5 h-5" />;
    case 'conflict': return <AlertTriangle className="w-5 h-5" />;
    case 'timeout': return <Clock className="w-5 h-5" />;
    default: return <AlertCircle className="w-5 h-5" />;
  }
};

export const AlertBanner: React.FC = () => {
  const { alerts } = useGameStore();
  const [displayedAlerts, setDisplayedAlerts] = React.useState<typeof alerts>([]);

  React.useEffect(() => {
    if (alerts.length > 0) {
      const latestAlerts = alerts.slice(-3);
      setDisplayedAlerts(latestAlerts);

      const timer = setTimeout(() => {
        setDisplayedAlerts(prev => prev.slice(1));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [alerts]);

  if (displayedAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 space-y-2 w-full max-w-lg px-4">
      <AnimatePresence>
        {displayedAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ delay: index * 0.1 }}
            className={`alert-banner p-4 rounded-lg border backdrop-blur-sm ${
              alert.severity === 'critical'
                ? 'bg-alert-red/20 border-alert-red/50 text-alert-red'
                : 'bg-warning-orange/20 border-warning-orange/50 text-warning-orange'
            }`}
          >
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.message}</p>
                {alert.penalty > 0 && (
                  <p className="text-xs mt-1 opacity-80">
                    扣分: -{alert.penalty}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
