import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useLensStore } from '../../store/useLensStore';
import { validateParameters, formatNumber, getImageTypeDescription } from '../../physics/lensCalculator';
import { Warning } from '../../types';

const WarningIcon: React.FC<{ severity: Warning['severity'] }> = ({ severity }) => {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-400" />;
  }
};

export const InfoPanel: React.FC = () => {
  const { lensState } = useLensStore();
  const validation = validateParameters(lensState.focalLength, lensState.objectDistance);

  const params = [
    { label: '焦距 f', value: formatNumber(lensState.focalLength), unit: 'cm', color: 'text-blue-400' },
    { label: '物距 u', value: formatNumber(lensState.objectDistance), unit: 'cm', color: 'text-orange-400' },
    { label: '像距 v', value: formatNumber(lensState.imageDistance), unit: 'cm', color: 'text-green-400' },
    { label: '放大率 m', value: formatNumber(lensState.magnification, 3), unit: '', color: 'text-purple-400' },
  ];

  return (
    <motion.div
      className="glass-panel rounded-xl p-5 space-y-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h2 className="text-lg font-bold text-white">成像信息</h2>

      <div className="grid grid-cols-2 gap-3">
        {params.map((param, index) => (
          <motion.div
            key={param.label}
            className="bg-slate-800/50 rounded-lg p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
          >
            <p className="text-xs text-slate-400 mb-1">{param.label}</p>
            <p className={`font-mono font-bold ${param.color}`}>
              {param.value}
              <span className="text-sm font-normal text-slate-500 ml-1">{param.unit}</span>
            </p>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          {lensState.isRealImage ? (
            <Eye className="w-4 h-4 text-green-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-orange-400" />
          )}
          <span className="text-sm text-slate-400">像的性质</span>
        </div>
        <p className={`font-medium ${lensState.isRealImage ? 'text-green-400' : 'text-orange-400'}`}>
          {getImageTypeDescription(lensState.isRealImage, lensState.magnification)}
        </p>
      </div>

      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            提示信息
          </h3>
          <AnimatePresence>
            {validation.warnings.map((warning, index) => (
              <motion.div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  warning.severity === 'critical'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : warning.severity === 'warning'
                    ? 'bg-orange-500/10 border border-orange-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
                }`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <WarningIcon severity={warning.severity} />
                <span
                  className={
                    warning.severity === 'critical'
                      ? 'text-red-400'
                      : warning.severity === 'warning'
                      ? 'text-orange-400'
                      : 'text-blue-400'
                  }
                >
                  {warning.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {validation.warnings.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">参数正常，成像清晰</span>
        </div>
      )}
    </motion.div>
  );
};
