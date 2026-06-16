import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const gradientMap: Record<string, string> = {
  green: 'from-emerald-500/20 via-emerald-500/5',
  blue: 'from-blue-500/20 via-blue-500/5',
  amber: 'from-amber-500/20 via-amber-500/5',
  red: 'from-red-500/20 via-red-500/5',
  purple: 'from-purple-500/20 via-purple-500/5',
  cyan: 'from-cyan-500/20 via-cyan-500/5',
  orange: 'from-orange-500/20 via-orange-500/5',
  pink: 'from-pink-500/20 via-pink-500/5',
};

const borderGradientMap: Record<string, string> = {
  green: 'before:from-emerald-500 before:via-emerald-500/50 before:to-emerald-500/20',
  blue: 'before:from-blue-500 before:via-blue-500/50 before:to-blue-500/20',
  amber: 'before:from-amber-500 before:via-amber-500/50 before:to-amber-500/20',
  red: 'before:from-red-500 before:via-red-500/50 before:to-red-500/20',
  purple: 'before:from-purple-500 before:via-purple-500/50 before:to-purple-500/20',
  cyan: 'before:from-cyan-500 before:via-cyan-500/50 before:to-cyan-500/20',
  orange: 'before:from-orange-500 before:via-orange-500/50 before:to-orange-500/20',
  pink: 'before:from-pink-500 before:via-pink-500/50 before:to-pink-500/20',
};

const iconBgMap: Record<string, string> = {
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
  orange: 'text-orange-400',
  pink: 'text-pink-400',
};

const iconBgGradientMap: Record<string, string> = {
  green: 'bg-emerald-500/20',
  blue: 'bg-blue-500/20',
  amber: 'bg-amber-500/20',
  red: 'bg-red-500/20',
  purple: 'bg-purple-500/20',
  cyan: 'bg-cyan-500/20',
  orange: 'bg-orange-500/20',
  pink: 'bg-pink-500/20',
};

export function StatusCard({ title, value, icon: Icon, color, trend }: StatusCardProps) {
  const gradientClass = gradientMap[color] || gradientMap.blue;
  const borderGradientClass = borderGradientMap[color] || borderGradientMap.blue;
  const iconColorClass = iconBgMap[color] || iconBgMap.blue;
  const iconBgClass = iconBgGradientMap[color] || iconBgGradientMap.blue;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : ArrowRight;
  const trendColorClass =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
        ? 'text-red-400'
        : 'text-slate-400';

  return (
    <div
      className={`
        relative group relative overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:duration-200
        before:absolute before:inset-0 before:bg-gradient-to-br before:${borderGradientClass} before:content-['']
        hover:scale-[1.02 hover:shadow-lg
      `}
    >
      <div
        className={`
          relative h-full bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 bg-gradient-to-br ${gradientClass} to-transparent`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
            <p className="text-white text-2xl font-bold mt-2 tracking-tight">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 ${trendColorClass}`}>
                <TrendIcon className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {trend === 'up' ? '上升' : trend === 'down' ? '下降' : '持平'}
                </span>
              </div>
            )}
          </div>
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg ${iconBgClass}
              transform transition-transform duration-300
              group-hover:scale-110 group-hover:rotate-3
            `}
          >
            <Icon className={`w-5 h-5 ${iconColorClass}`} />
          </div>
        </div>

        <div
          className={`
            absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-3xl opacity-20
            bg-gradient-to-br ${gradientClass} to-transparent
            transition-opacity duration-300 group-hover:opacity-40
          `}
        />
      </div>
    </div>
  );
}
