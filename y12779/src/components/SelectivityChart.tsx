import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useReportStore } from '../store/useReportStore';
import { BatchStatus } from '../types';

const STATUS_COLORS: Record<BatchStatus, string> = {
  success: '#2A9D8F',
  pending: '#E9C46A',
  failed: '#E63946',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  success: '放行',
  pending: '待确认',
  failed: '异常',
};

export const SelectivityChart: React.FC = () => {
  const batches = useReportStore((s) => s.batches);
  const threshold = batches.length > 0 ? batches[0].selectivityThreshold : 85;

  const data = batches.map((b) => ({
    batchNo: b.batchNo.slice(-6),
    fullBatchNo: b.batchNo,
    selectivity: b.selectivity,
    threshold,
    status: b.status,
    hasBlankControl: b.hasBlankControl,
  }));

  return (
    <div className="card-paper p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-brand-800">选择性分布</h3>
          <p className="text-xs text-gray-500 mt-0.5">各批次选择性与阈值对比</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-success" />
            <span className="text-gray-600">放行</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-pending" />
            <span className="text-gray-600">待确认</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-failed" />
            <span className="text-gray-600">异常</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE4" vertical={false} />
            <XAxis
              dataKey="batchNo"
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
              stroke="#256d7e"
              tickLine={false}
              axisLine={{ stroke: '#acdce3' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
              stroke="#256d7e"
              tickLine={false}
              axisLine={{ stroke: '#acdce3' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FDFCFA',
                border: '1px solid #EDEBE4',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}%`, '选择性']}
              labelFormatter={(label, payload) => {
                const d = payload?.[0]?.payload;
                return `${d?.fullBatchNo || label} · ${STATUS_LABEL[d?.status as BatchStatus] || ''}`;
              }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#E63946"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `阈值 ${threshold}%`,
                position: 'right',
                fill: '#E63946',
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <Bar dataKey="selectivity" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status as BatchStatus]}
                  opacity={entry.hasBlankControl ? 1 : 0.55}
                  stroke={entry.hasBlankControl ? 'none' : '#E63946'}
                  strokeDasharray={entry.hasBlankControl ? '0' : '3 2'}
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-gray-400 font-mono">
        * 斜纹填充表示该批次缺失空白对照
      </p>
    </div>
  );
};
