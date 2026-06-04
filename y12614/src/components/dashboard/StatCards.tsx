import { Monitor, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof Monitor;
  trend?: number;
  color: 'green' | 'blue' | 'orange' | 'purple';
}

function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs',
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <TrendingUp className={cn('w-3 h-3', trend < 0 && 'rotate-180')} />
              <span>{trend >= 0 ? '+' : ''}{trend}% 较上周</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

interface StatCardsProps {
  totalDevices: number;
  activeDevices: number;
  avgPassRate: number;
  totalDetections: number;
}

export function StatCards({ totalDevices, activeDevices, avgPassRate, totalDetections }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="设备总数"
        value={totalDevices}
        icon={Monitor}
        color="blue"
        trend={5}
      />
      <StatCard
        title="在线设备"
        value={activeDevices}
        icon={Monitor}
        color="green"
        trend={12}
      />
      <StatCard
        title="平均通过率"
        value={`${avgPassRate}%`}
        icon={CheckCircle}
        color="purple"
        trend={3.2}
      />
      <StatCard
        title="今日检测"
        value={totalDetections}
        icon={AlertTriangle}
        color="orange"
        trend={-2}
      />
    </div>
  );
}
