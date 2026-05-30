import { Shield, AlertTriangle, Zap } from 'lucide-react';

interface RiskIndicatorProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskIndicator({ level, size = 'md' }: RiskIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const riskConfig = {
    1: { icon: Shield, color: 'text-green-500', bg: 'bg-green-100', label: '低' },
    2: { icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-100', label: '中低' },
    3: { icon: Shield, color: 'text-yellow-500', bg: 'bg-yellow-100', label: '中' },
    4: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100', label: '中高' },
    5: { icon: Zap, color: 'text-red-500', bg: 'bg-red-100', label: '高' },
  };
  
  const config = riskConfig[level as keyof typeof riskConfig] || riskConfig[3];
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-1 ${config.bg} rounded-full px-2 py-0.5`}>
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>{config.label}风险</span>
    </div>
  );
}
