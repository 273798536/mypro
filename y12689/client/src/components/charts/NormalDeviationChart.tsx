import { useMemo } from 'react'
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
} from 'recharts'
import type { NormalRecord } from '@/types'

interface NormalDeviationChartProps {
  record: NormalRecord
}

function NormalDeviationChart({ record }: NormalDeviationChartProps) {
  const chartData = useMemo(() => {
    return record.normalVectors?.map((vec, idx) => ({
      index: idx + 1,
      deviation: Number(vec.deviation.toFixed(2)),
      isValid: vec.isValid,
    })) || []
  }, [record.normalVectors])

  const stats = useMemo(() => {
    const validVectors = record.normalVectors?.filter((v) => v.isValid) || []
    const deviations = validVectors.map((v) => v.deviation)
    const invalidCount = (record.normalVectors?.length || 0) - validVectors.length

    if (deviations.length === 0) {
      return {
        avg: 0,
        max: 0,
        min: 0,
        validCount: 0,
        invalidCount,
      }
    }

    return {
      avg: Number((deviations.reduce((a, b) => a + b, 0) / deviations.length).toFixed(2)),
      max: Number(Math.max(...deviations).toFixed(2)),
      min: Number(Math.min(...deviations).toFixed(2)),
      validCount: validVectors.length,
      invalidCount,
    }
  }, [record.normalVectors])

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="flex gap-4">
        <div className="flex-1" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
              <XAxis
                dataKey="index"
                tick={{ fill: '#cccccc', fontSize: 12 }}
                axisLine={{ stroke: '#303030' }}
                label={{ value: '向量序号', position: 'insideBottom', offset: -5, fill: '#666666', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#cccccc', fontSize: 12 }}
                axisLine={{ stroke: '#303030' }}
                domain={[0, 'auto']}
                label={{ value: '偏差角度(°)', angle: -90, position: 'insideLeft', fill: '#666666', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: '8px',
                  color: '#ffffff',
                }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(value: number) => [`${value}°`, '偏差']}
                labelFormatter={(label) => `向量 #${label}`}
              />
              <ReferenceLine
                y={15}
                stroke="#ff4d4f"
                strokeDasharray="5 5"
                label={{ value: '阈值 15°', fill: '#ff4d4f', fontSize: 12, position: 'right' }}
              />
              <Bar dataKey="deviation" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.deviation > 15 ? '#ff4d4f' : '#52c41a'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-48 flex flex-col gap-3 border-l border-border pl-4">
          <div className="text-sm font-medium text-text-primary mb-2">统计明细</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">平均偏差</span>
              <span className={`text-sm font-mono font-medium ${stats.avg > 15 ? 'text-danger' : 'text-text-secondary'}`}>
                {stats.avg}°
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">最大偏差</span>
              <span className={`text-sm font-mono font-medium ${stats.max > 15 ? 'text-danger' : 'text-text-secondary'}`}>
                {stats.max}°
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">最小偏差</span>
              <span className="text-sm font-mono font-medium text-text-secondary">{stats.min}°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">有效向量</span>
              <span className="text-sm font-mono font-medium text-success">{stats.validCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">异常向量</span>
              <span className={`text-sm font-mono font-medium ${stats.invalidCount > 0 ? 'text-danger' : 'text-text-secondary'}`}>
                {stats.invalidCount}
              </span>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-success"></span>
              <span className="text-xs text-text-muted">正常 (≤15°)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-danger"></span>
              <span className="text-xs text-text-muted">异常 (&gt;15°)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NormalDeviationChart
