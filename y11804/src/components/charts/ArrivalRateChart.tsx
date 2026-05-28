import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardStats } from '../../types';

interface ArrivalRateChartProps {
  stats: DashboardStats;
}

export const ArrivalRateChart = ({ stats }: ArrivalRateChartProps) => {
  const data = [
    { name: '已到账', value: stats.receivedCount, color: '#10b981' },
    { name: '待核验', value: stats.pendingCount, color: '#6b7280' },
    { name: '异常', value: stats.exceptionCount, color: '#ef4444' },
  ];

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">到账状态分布</h3>
      <p className="text-xs text-gray-500 mb-4">
        按票息计划数量统计，分母为当期所有票息计划总数
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}笔`, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
