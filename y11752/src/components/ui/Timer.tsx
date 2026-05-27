import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/gameEngine';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  className?: string;
}

export const Timer = ({ timeRemaining, totalTime, className }: TimerProps) => {
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const percentage = (timeRemaining / totalTime) * 100;
    setIsWarning(percentage <= 30);
    setIsCritical(percentage <= 10);
  }, [timeRemaining, totalTime]);

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold',
        isCritical 
          ? 'bg-red-100 text-red-600 border-2 border-red-300' 
          : isWarning 
            ? 'bg-amber-100 text-amber-600 border-2 border-amber-300' 
            : 'bg-slate-100 text-slate-700 border-2 border-slate-200',
        className
      )}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
    >
      <AnimatePresence mode="wait">
        {isCritical ? (
          <motion.div
            key="critical"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
          >
            <AlertTriangle className="w-6 h-6" />
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Clock className="w-6 h-6" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="min-w-[70px] text-center">
        {formatTime(timeRemaining)}
      </span>
    </motion.div>
  );
};
