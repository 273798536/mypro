import { Card } from 'antd';
import { TrendingDown, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/calculator';

interface StatCardProps {
  title: string;
  value: number;
  type?: 'currency' | 'number' | 'percent';
  trend?: 'up' | 'down' | 'neutral';
  isNegative?: boolean;
  suffix?: string;
  description?: string;
}

const iconMap = {
  up: <TrendingUp className="text-emerald-500" size={20} />,
  down: <TrendingDown className="text-red-500" size={20} />,
  neutral: <DollarSign className="text-slate-500" size={20} />,
};

export default function StatCard({
  title,
  value,
  type = 'currency',
  trend = 'neutral',
  isNegative = false,
  suffix,
  description,
}: StatCardProps) {
  const displayValue = type === 'currency' ? formatCurrency(value) : value.toLocaleString();
  const textColor = isNegative ? 'text-red-600' : trend === 'up' ? 'text-emerald-600' : 'text-slate-800';

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${textColor} font-mono`}>
            {isNegative ? '-' : ''}{displayValue}
            {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-2">{description}</p>
          )}
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          {iconMap[trend]}
        </div>
      </div>
    </Card>
  );
}
