import { cn } from '@/lib/utils';
import type { BackupGap } from '@/types';
import { impactLevelLabelMap } from '@/types';
import { formatNumber, formatDateTime } from '@/data/mockData';
import { AlertTriangle, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BackupGapChartProps {
  gap: BackupGap;
}

export function BackupGapChart({ gap }: BackupGapChartProps) {
  const chartData = gap.detailRecords.map((d) => ({
    name: d.timeSlot,
    预期: d.expected,
    实际: d.actual,
    差值: d.delta,
    说明: d.explanation,
  }));

  const impactColors: Record<string, string> = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">备份缺口检测</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                源表：<span className="font-mono">{gap.sourceTable}</span>
              </p>
            </div>
          </div>
          <div
            className={cn(
              'inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded',
              impactColors[gap.impactLevel]
            )}
          >
            影响等级：{impactLevelLabelMap[gap.impactLevel]}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <p className="text-xs text-slate-500">缺口时段</p>
            <p className="text-sm font-mono text-slate-800 mt-1">
              {formatDateTime(gap.gapStart)}
            </p>
            <p className="text-xs text-slate-400">至</p>
            <p className="text-sm font-mono text-slate-800">
              {formatDateTime(gap.gapEnd)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <p className="text-xs text-slate-500">预期记录数</p>
            <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
              {formatNumber(gap.expectedCount)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3">
            <p className="text-xs text-slate-500">缺失记录数</p>
            <p className="text-2xl font-bold font-mono text-red-600 mt-1">
              -{formatNumber(gap.missingCount)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              实际：{formatNumber(gap.actualCount)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-500" />
          <p className="text-xs text-slate-600">
            下图展示各时段预期与实际记录数对比。颜色仅作辅助标识，具体数值请参考下方明细表。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">记录数对比图</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value)} 条`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="预期"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="实际"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <h4 className="text-sm font-medium text-slate-700 p-3 border-b border-slate-200 bg-slate-50">
              缺口明细表
            </h4>
            <div className="overflow-auto max-h-[280px]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">时段</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">预期</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">实际</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">差值</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gap.detailRecords.map((d) => (
                    <tr
                      key={d.id}
                      className={cn(d.delta < 0 && 'bg-red-50/50')}
                    >
                      <td className="px-3 py-2 font-mono text-slate-800">{d.timeSlot}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {formatNumber(d.expected)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {d.delta < 0 ? (
                          <span className="text-red-600">{formatNumber(d.actual)}</span>
                        ) : (
                          <span className="text-slate-600">{formatNumber(d.actual)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {d.delta < 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatNumber(d.delta)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
          <h4 className="text-sm font-medium text-slate-700 p-3 border-b border-slate-200 bg-slate-50">
            明细解释
          </h4>
          <div className="divide-y divide-slate-100">
            {gap.detailRecords.map((d) => (
              <div
                key={d.id}
                className={cn(
                  'p-3 flex items-start gap-3',
                  d.delta < 0 ? 'bg-red-50/30' : ''
                )}
              >
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 mt-0.5',
                    d.delta < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {d.timeSlot}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{d.explanation}</p>
                  {d.delta < 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      预期 {formatNumber(d.expected)} 条，实际 {formatNumber(d.actual)} 条，
                      <span className="text-red-600 font-medium">
                        缺失 {formatNumber(Math.abs(d.delta))} 条
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
