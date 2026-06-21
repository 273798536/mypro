import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface TrendChartProps {
  data: Array<{ date: string; cost: number }>
}

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-5 shadow-lg">
      <h3 className="text-[#B0C4D8] text-sm font-medium mb-4">影子流量成本趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1B3A4B" />
            <XAxis
              dataKey="date"
              stroke="#5A7080"
              tick={{ fill: '#5A7080', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              stroke="#5A7080"
              tick={{ fill: '#5A7080', fontSize: 11 }}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => v.toFixed(3)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#132D42',
                border: '1px solid #1B3A4B',
                borderRadius: '8px',
                color: '#B0C4D8',
                fontSize: '12px',
              }}
              formatter={(value: number) => [value.toFixed(4), '成本']}
              labelFormatter={(label: string) => `日期: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#7DD3FC"
              strokeWidth={2}
              dot={{ fill: '#7DD3FC', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#BAE6FD', stroke: '#7DD3FC', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
