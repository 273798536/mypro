import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Info } from 'lucide-react';
import type { QueryTypeStats } from '../types';

interface QueryTypeChartProps {
  data: QueryTypeStats[];
}

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'];

export default function QueryTypeChart({ data }: QueryTypeChartProps) {
  const chartData = data.map(d => ({
    name: d.type,
    value: d.count,
    avgTime: d.avgTime.toFixed(2),
    indexFailureCount: d.indexFailureCount
  }));

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const totalIndexFailure = data.reduce((sum, d) => sum + d.indexFailureCount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">查询类型分布</h3>
          <p className="text-sm text-gray-500 mt-1">
            按 SQL 类型统计慢查询数量及索引失效情况
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            总慢查询: <span className="font-semibold text-gray-900">{totalCount}</span> 条
          </div>
          <div className="text-sm text-gray-500">
            索引失效: <span className="font-semibold text-red-600">{totalIndexFailure}</span> 条
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} 条 (平均 ${props.payload.avgTime}s)`,
                  name
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={item.type} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="font-medium text-gray-900">{item.type}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {item.count} 条
                </span>
              </div>
              <div className="text-xs text-gray-500">
                平均耗时: <span className="font-mono">{item.avgTime.toFixed(2)}s</span>
                <span className="mx-2">|</span>
                索引失效:
                <span className={`font-semibold ml-1 ${item.indexFailureCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.indexFailureCount} 条
                </span>
              </div>
              {item.indexFailureCount > 0 && (
                <div className="text-xs text-red-500 mt-1">
                  占比: {((item.indexFailureCount / item.count) * 100).toFixed(1)}% 的 {item.type} 查询存在索引失效
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          图说：如何解读这张图
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="text-blue-600 font-medium">SELECT</span> 查询占比最高，也是索引失效的重灾区</li>
          <li>• <span className="text-red-600 font-medium">DELETE</span> 查询虽然数量少，但单次删除大量数据时风险很高</li>
          <li>• 每种类型都标注了索引失效占比，帮助定位哪类查询优化收益最大</li>
          <li>• 优先优化占比高且索引失效严重的查询类型，可快速降低整体慢查询时间</li>
        </ul>
      </div>
    </div>
  );
}
