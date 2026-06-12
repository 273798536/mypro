import type { RiskLevel } from '@/types';
import { getRiskLevelLabel } from '@/utils/riskEngine';

interface Props {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const colorClasses: Record<RiskLevel, string> = {
  high: 'bg-red-100 text-red-800 border border-red-200',
  medium: 'bg-orange-100 text-orange-800 border border-orange-200',
  low: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  pending: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function RiskLevelBadge({ level, size = 'md' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${colorClasses[level]}`}>
      {level === 'high' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500" />}
      {level === 'medium' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />}
      {level === 'low' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />}
      {getRiskLevelLabel(level)}
    </span>
  );
}
