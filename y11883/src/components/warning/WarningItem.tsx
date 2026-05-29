import { motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { WarningItem as WarningItemType } from '../../types';
import { usePartitionStore } from '../../store/usePartitionStore';

interface WarningItemProps {
  warning: WarningItemType;
  problemLineNumber: number;
}

const warningTypeConfig = {
  duplicate_miss: {
    icon: AlertTriangle,
    label: '重复排列',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  condition_unused: {
    icon: AlertTriangle,
    label: '条件未生效',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-500',
  },
  explosion: {
    icon: AlertTriangle,
    label: '方案爆炸',
    color: 'rose',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-500',
  },
};

export function WarningItem({ warning, problemLineNumber }: WarningItemProps) {
  const confirmWarning = usePartitionStore(state => state.confirmWarning);
  const config = warningTypeConfig[warning.type];
  const Icon = config.icon;

  if (warning.confirmed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} border`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-md bg-white/60`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${config.textColor}`}>
              第{problemLineNumber}行
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-700">{warning.message}</p>
        </div>
        <button
          onClick={() => confirmWarning(warning.id)}
          className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors text-gray-500 hover:text-emerald-600"
          title="确认已处理"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
