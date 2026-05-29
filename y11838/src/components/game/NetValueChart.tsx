import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { NetValuePoint } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NetValueChartProps {
  height?: number;
}

export default function NetValueChart({ height = 300 }: NetValueChartProps) {
  const { gameState, industryCards } = useGameStore();
  const history = gameState?.netValueHistory || [];

  const chartData = history.map((point) => {
    const decision = gameState?.decisions.find((d) => d.id === point.decisionId);
    const industry = decision
      ? industryCards.find((c) => c.id === decision.industryCardId)
      : null;

    return {
      round: `第${point.round}回合`,
      value: Number(point.value.toFixed(2)),
      action: decision
        ? decision.actionType === 'buy'
          ? '加仓'
          : decision.actionType === 'sell'
          ? '减仓'
          : '持有'
        : '-',
      industry: industry?.name || '-',
      hasRisk: !!point.riskEventId,
    };
  });

  const initialValue = history[0]?.value || 100;
  const currentValue = history[history.length - 1]?.value || initialValue;
  const change = currentValue - initialValue;
  const changePercent = ((change / initialValue) * 100).toFixed(2);
  const isProfit = change >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-800">{data.round}</p>
          <p className="text-lg font-mono font-bold text-primary-600">
            净值: {data.value}
          </p>
          {data.industry !== '-' && (
            <p className="text-sm text-gray-600">
              {data.industry}: {data.action}
            </p>
          )}
          {data.hasRisk && (
            <p className="text-sm text-red-500 font-medium">⚠️ 触发风险事件</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary-600 flex items-center gap-2">
          {isProfit ? (
            <TrendingUp className="w-5 h-5 text-accent-profit" />
          ) : (
            <TrendingDown className="w-5 h-5 text-accent-loss" />
          )}
          净值曲线
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">当前净值</p>
            <p className="text-2xl font-mono font-bold text-primary-600">
              {currentValue.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">累计收益</p>
            <p
              className={cn(
                'text-xl font-mono font-bold',
                isProfit ? 'text-accent-profit' : 'text-accent-loss'
              )}
            >
              {isProfit ? '+' : ''}
              {changePercent}%
            </p>
          </div>
        </div>
      </div>

      <div className="progress-bar mb-4">
        <div
          className={cn(
            'progress-fill',
            isProfit ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
          )}
          style={{ width: `${Math.min(Math.abs(change / initialValue) * 500 + 50, 100)}%` }}
        />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isProfit ? '#10b981' : '#e63946'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isProfit ? '#10b981' : '#e63946'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={false}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={initialValue}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{ value: '初始净值', position: 'right', fill: '#9ca3af', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isProfit ? '#10b981' : '#e63946'}
            strokeWidth={3}
            fill="url(#colorValue)"
            animationDuration={1000}
            activeDot={{
              r: 6,
              fill: isProfit ? '#10b981' : '#e63946',
              stroke: '#fff',
              strokeWidth: 2,
            }}
            dot={{ r: 4, fill: '#fff', stroke: isProfit ? '#10b981' : '#e63946', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
