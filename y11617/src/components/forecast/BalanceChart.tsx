import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useCashflowStore } from '../../store/useCashflowStore';

interface BalanceChartProps {
  days?: number;
}

export default function BalanceChart({ days = 90 }: BalanceChartProps) {
  const [rangeDays, setRangeDays] = useState(days);
  const getBalanceForecast = useCashflowStore(state => state.getBalanceForecast);
  const currentScenario = useCashflowStore(state => state.currentScenario);

  const data = useMemo(() => {
    const forecast = getBalanceForecast(rangeDays);
    return forecast.map(f => ({
      ...f,
      dateLabel: format(parseISO(f.date), 'MM/dd'),
      safetyLine: currentScenario?.settings.safetyLine || 0
    }));
  }, [rangeDays, getBalanceForecast, currentScenario]);

  const hasDangerDays = data.some(d => d.balance < (currentScenario?.settings.safetyLine || 0));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">余额预测</h3>
          {hasDangerDays && (
            <span className="text-xs text-red-500">⚠ 存在余额低于安全线的日期</span>
          )}
        </div>
        <div className="flex gap-1">
          {[30, 60, 90, 180].map(d => (
            <button
              key={d}
              onClick={() => setRangeDays(d)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                rangeDays === d
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      <div className="h-64" id="balance-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={value => `${Math.round(value / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number) => [`¥${value.toLocaleString()}`, '余额']}
              labelFormatter={label => `日期: ${label}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <ReferenceLine
              y={currentScenario?.settings.safetyLine || 0}
              stroke="#e53e3e"
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{
                value: '安全线',
                position: 'right',
                fill: '#e53e3e',
                fontSize: 10
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (payload.balance < (currentScenario?.settings.safetyLine || 0)) {
                  return (
                    <circle
                      key={`danger-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#e53e3e"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }
                return <circle key={`safe-${index}`} cx={cx} cy={cy} r={0} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}