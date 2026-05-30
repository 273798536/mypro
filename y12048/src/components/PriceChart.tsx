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
} from 'recharts';
import { PricePoint } from '../types/game';

interface PriceChartProps {
  priceHistory: PricePoint[];
  liquidationPrice: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  priceHistory,
  liquidationPrice,
}) => {
  const chartData = priceHistory.map((point, index) => ({
    round: index + 1,
    price: point.price,
    isJump: point.isJump,
    isConfirmed: point.isConfirmed,
    source: point.source,
  }));

  const minPrice = Math.min(...priceHistory.map(p => p.price), liquidationPrice) * 0.95;
  const maxPrice = Math.max(...priceHistory.map(p => p.price)) * 1.05;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="round"
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '价格']}
          />
          <ReferenceLine
            y={liquidationPrice}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: `清算价 $${liquidationPrice.toFixed(2)}`,
              fill: '#ef4444',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.isJump && !payload.isConfirmed) {
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#f97316"
                    className="animate-pulse"
                  />
                );
              }
              if (payload.isJump) {
                return (
                  <circle cx={cx} cy={cy} r={5} fill="#f97316" />
                );
              }
              return <circle cx={cx} cy={cy} r={3} fill="#8b5cf6" />;
            }}
            activeDot={{ r: 6, fill: '#a78bfa' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
