import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { TimeDistributionItem } from '../types';

interface TimeDistributionChartProps {
  data: TimeDistributionItem[];
}

export default function TimeDistributionChart({ data }: TimeDistributionChartProps) {
  const chartData = data.map(d => ({
    range: d.range,
    全部慢查询: d.count,
    含索引失效: d.hasIndexFailure,
    无索引失效: d.count - d.hasIndexFailure
  }));

  const totalQueries = data.reduce((sum, d) => sum + d.count, 0);
  const totalIndexFailure = data.reduce((sum, d) => sum + d.hasIndexFailure, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">慢查询时间分布</h3>
          <p className="text-sm text-gray-500 mt-1">
            按查询耗时区间分组，蓝色为正常慢查询，红色为存在索引失效的查询
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            总慢查询: <span className="font-semibold text-gray-900">{totalQueries}</span> 条
          </div>
          <div className="text-sm text-gray-500">
            索引失效: <span className="font-semibold text-red-600">{totalIndexFailure}</span> 条
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => [`${value} 条`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="无索引失效" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
            <Bar dataKey="含索引失效" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2">图说：如何解读这张图</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="text-blue-600 font-medium">蓝色柱</span>：虽然慢但至少用到了索引，可能是查询量本身较大</li>
          <li>• <span className="text-red-600 font-medium">红色柱</span>：索引失效导致的慢查询，是重点优化对象，已被专项拦截</li>
          <li>• <span className="font-medium">10s+ 区间</span>：红色占比最高，说明索引失效对性能影响最严重的区间在10秒以上</li>
          <li>• <span className="font-medium">优化建议</span>：优先处理 5s+ 区间的索引失效问题，可快速降低整体慢查询时间</li>
        </ul>
      </div>
    </div>
  );
}
