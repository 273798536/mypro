import { AlertTriangle, XCircle, Zap } from 'lucide-react';
import { ErrorType } from '@/types';

interface ErrorDisplayProps {
  errorType: ErrorType;
  errorMessage: string;
  flashing?: boolean;
}

const errorConfig = {
  explosion: {
    icon: Zap,
    title: '迭代爆炸',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
  },
  invalid_rule: {
    icon: XCircle,
    title: '规则非法',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
  },
  color_overlap: {
    icon: AlertTriangle,
    title: '颜色重叠警告',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500',
  },
  other: {
    icon: XCircle,
    title: '计算错误',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-500',
  },
};

export default function ErrorDisplay({ errorType, errorMessage, flashing = false }: ErrorDisplayProps) {
  const config = errorConfig[errorType] || errorConfig.other;
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-4 ${
        flashing ? 'animate-pulse danger-pulse' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-white shadow-sm`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <h4 className={`font-bold ${config.textColor} text-lg mb-1`}>{config.title}</h4>
          <p className={`${config.textColor} text-sm opacity-90`}>{errorMessage}</p>
        </div>
      </div>
    </div>
  );
}
