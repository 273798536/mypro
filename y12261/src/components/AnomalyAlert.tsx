import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Anomaly } from '@/types/game';
import { getAnomalyTypeLabel } from '@/utils/anomalyDetection';

interface AnomalyAlertProps {
  anomalies: Anomaly[];
  onDismiss?: (id: string) => void;
}

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ anomalies, onDismiss }) => {
  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-danger-400 uppercase tracking-wider flex items-center gap-2">
        <AlertTriangle size={14} />
        异常清单 ({anomalies.length})
      </h4>
      
      <AnimatePresence>
        {anomalies.map((anomaly) => (
          <motion.div
            key={anomaly.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="anomaly-alert relative"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 bg-danger-500/30 rounded">
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  <span className="text-xs font-mono text-danger-300">
                    {anomaly.penalty}分
                  </span>
                </div>
                <p className="text-sm">{anomaly.description}</p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(anomaly.id)}
                  className="text-danger-300 hover:text-danger-100 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
