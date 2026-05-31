import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../utils/calculationEngine';

interface MetricCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  icon: LucideIcon;
  trend?: number;
  color?: 'primary' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  isCurrency = true, 
  icon: Icon, 
  trend, 
  color = 'primary',
  subtitle 
}: MetricCardProps) {
  const colorClasses = {
    primary: 'from-primary-700 to-primary-900',
    emerald: 'from-emerald-600 to-emerald-800',
    amber: 'from-amber-500 to-amber-700',
    rose: 'from-rose-500 to-rose-700',
  };
  
  const iconBgClasses = {
    primary: 'bg-primary-600/30',
    emerald: 'bg-emerald-500/30',
    amber: 'bg-amber-400/30',
    rose: 'bg-rose-500/30',
  };
  
  return (
    <div className="card relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color]}`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2 font-serif">
            {isCurrency ? formatCurrency(value) : value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-3">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span className={`text-sm font-medium ${
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'
              }`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">较上期</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl ${iconBgClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color === 'primary' ? 'text-primary-200' : color === 'emerald' ? 'text-emerald-200' : color === 'amber' ? 'text-amber-200' : 'text-rose-200'}`} />
        </div>
      </div>
    </div>
  );
}
