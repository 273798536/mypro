import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { cn } from '@/lib/utils';

// 数据点类型
export interface TrendDataPoint {
  name: string;
  value: number;
}

// 趋势图类型
type TrendType = 'area' | 'line';

// 颜色变体
type TrendColor =
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'amber'
  | 'slate';

interface MiniTrendProps {
  data: TrendDataPoint[];
  type?: TrendType;
  color?: TrendColor;
  width?: number | string;
  height?: number;
  showTooltip?: boolean;
  strokeWidth?: number;
  className?: string;
}

// 颜色配置映射
const colorConfig: Record<
  TrendColor,
  { stroke: string; gradientStart: string; gradientEnd: string }
> = {
  blue: {
    stroke: '#3B82F6',
    gradientStart: 'rgba(59, 130, 246, 0.4)',
    gradientEnd: 'rgba(59, 130, 246, 0)',
  },
  green: {
    stroke: '#10B981',
    gradientStart: 'rgba(16, 185, 129, 0.4)',
    gradientEnd: 'rgba(16, 185, 129, 0)',
  },
  red: {
    stroke: '#EF4444',
    gradientStart: 'rgba(239, 68, 68, 0.4)',
    gradientEnd: 'rgba(239, 68, 68, 0)',
  },
  purple: {
    stroke: '#8B5CF6',
    gradientStart: 'rgba(139, 92, 246, 0.4)',
    gradientEnd: 'rgba(139, 92, 246, 0)',
  },
  amber: {
    stroke: '#F59E0B',
    gradientStart: 'rgba(245, 158, 11, 0.4)',
    gradientEnd: 'rgba(245, 158, 11, 0)',
  },
  slate: {
    stroke: '#64748B',
    gradientStart: 'rgba(100, 116, 139, 0.4)',
    gradientEnd: 'rgba(100, 116, 139, 0)',
  },
};

// 自定义提示框组件
const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TrendDataPoint;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">{data.name}</p>
        <p className="font-medium text-slate-900 dark:text-white">
          {data.value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

// 基于 Recharts 的迷你趋势图组件
export default function MiniTrend({
  data,
  type = 'area',
  color = 'blue',
  width = '100%',
  height = 80,
  showTooltip = true,
  strokeWidth = 2,
  className,
}: MiniTrendProps) {
  const colors = colorConfig[color];
  const gradientId = `trend-gradient-${color}`;

  return (
    <div
      className={cn('min-h-[80px] w-full', className)}
      style={{ width, height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 5, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.gradientStart} />
                <stop offset="100%" stopColor={colors.gradientEnd} />
              </linearGradient>
            </defs>
            {showTooltip && <Tooltip content={<CustomTooltip />} cursor={false} />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={600}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 2, left: 2, bottom: 2 }}>
            {showTooltip && <Tooltip content={<CustomTooltip />} cursor={false} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={strokeWidth}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: colors.stroke }}
              isAnimationActive
              animationDuration={600}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
