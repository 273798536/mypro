import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'energy' | 'cooldown' | 'turn';
  className?: string;
}

const variantStyles = {
  default: 'bg-blue-500',
  energy: 'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500',
  cooldown: 'bg-purple-500',
  turn: 'bg-cyan-500'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  showValue = false,
  variant = 'default',
  className = ''
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const isLow = percentage < 20 && variant === 'energy';

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1 text-sm">
          {label && <span className="text-slate-300">{label}</span>}
          {showValue && (
            <span className={`font-mono ${isLow ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${variantStyles[variant]} rounded-full ${isLow ? 'animate-pulse' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
