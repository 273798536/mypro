import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useReportStore } from '../store/useReportStore';
import { computeStats } from '../utils/validation';

const PIE_DATA_CONFIG = [
  { key: 'successCount', name: '放行', color: '#2A9D8F' },
  { key: 'pendingCount', name: '待确认', color: '#E9C46A' },
  { key: 'failedCount', name: '异常', color: '#E63946' },
];

export const StatusPieChart: React.FC = () => {
  const batches = useReportStore((s) => s.batches);
  const stats = computeStats(batches);

  const data = PIE_DATA_CONFIG.map((c) => ({
    name: c.name,
    value: stats[c.key as keyof typeof stats] as number,
    color: c.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="card-paper p-5">
      <div className="mb-3">
        <h3 className="font-serif text-lg font-semibold text-brand-800">批次状态分布</h3>
        <p className="text-xs text-gray-500 mt-0.5">放行 / 待确认 / 异常 占比</p>
      </div>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">暂无数据</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={4}
                dataKey="value"
                stroke="#FDFCFA"
                strokeWidth={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FDFCFA',
                  border: '1px solid #EDEBE4',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} 批`, '数量']}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span style={{ fontSize: '12px', color: '#256d7e' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
