import React from 'react';
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
  AreaChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface NetValueChartProps {
  netValueHistory: number[];
  round: number;
}

const NetValueChart: React.FC<NetValueChartProps> = ({
  netValueHistory,
  round,
}) => {
  const chartData = netValueHistory.map((value, index) => ({
    round: `R${index}`,
    roundNum: index,
    netValue: value * 100,
    baseline: 100,
  }));

  const latestValue = netValueHistory[netValueHistory.length - 1] || 1;
  const totalReturn = (latestValue - 1) * 100;
  const maxValue = Math.max(...netValueHistory) * 100;
  const minValue = Math.min(...netValueHistory) * 100;
  const maxDrawdown = ((maxValue - minValue) / maxValue) * 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-white font-mono font-bold">
            净值: {data.netValue.toFixed(2)}
          </p>
          <p className={`text-sm font-mono ${data.netValue >= 100 ? 'text-green-400' : 'text-red-400'}`}>
            {data.netValue >= 100 ? '+' : ''}{(data.netValue - 100).toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white">净值曲线</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs text-slate-400">当前净值</p>
            <p className={`font-bold font-mono ${latestValue >= 1 ? 'text-green-400' : 'text-red-400'}`}>
              {(latestValue * 100).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">累计收益</p>
            <p className={`font-bold font-mono ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="netValueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="round"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              domain={['dataMin - 5', 'dataMax + 5']}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={100}
              stroke="#64748b"
              strokeDasharray="5 5"
              label={{ value: '基准', fill: '#64748b', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="netValue"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#netValueGradient)"
              dot={false}
              activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">最高净值</p>
          <p className="text-lg font-bold text-green-400 font-mono">{maxValue.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">最低净值</p>
          <p className="text-lg font-bold text-red-400 font-mono">{minValue.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">最大回撤</p>
          <p className="text-lg font-bold text-orange-400 font-mono">-{maxDrawdown.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
};

export default NetValueChart;
