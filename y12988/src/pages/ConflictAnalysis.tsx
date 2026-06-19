import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useStore } from '@/store/useStore'

const severityColor: Record<string, string> = {
  high: 'text-rose-400',
  medium: 'text-amber-400',
  low: 'text-blue-400',
}

export default function ConflictAnalysis() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { conflicts, fetchConflicts, slowQueryLogs, fetchSlowQueryLogs } = useStore()
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [activeRow, setActiveRow] = useState<string | null>(null)

  useEffect(() => {
    fetchConflicts()
    fetchSlowQueryLogs()
  }, [fetchConflicts, fetchSlowQueryLogs])

  const conflict = conflicts.find((c) => c.id === id)

  useEffect(() => {
    if (conflict) {
      const idx = slowQueryLogs.findIndex((l) => l.id === conflict.log_id)
      if (idx >= 0) {
        setActiveRow(conflict.log_id)
        setActivePoint(idx)
      }
    }
  }, [conflict, slowQueryLogs])

  const chartData = useMemo(() => {
    return slowQueryLogs.map((log, idx) => ({
      name: `#${idx + 1}`,
      executionTime: log.execution_time_ms,
      isDuplicate: log.is_duplicate,
      logId: log.id,
    }))
  }, [slowQueryLogs])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]) {
      setActiveRow(data.activePayload[0].payload.logId)
    }
  }

  const handleRowClick = (logId: string, index: number) => {
    setActiveRow(logId)
    setActivePoint(index)
  }

  if (!conflict) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/migration-status')} className="flex items-center text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回看板
        </button>
        <div className="bg-slate-800 rounded-xl p-10 text-center border border-slate-700">
          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">请从迁移状态看板点击冲突项进入分析</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/migration-status')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">冲突分析</h1>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          conflict.severity === 'high' ? 'bg-rose-500/20 text-rose-400' :
          conflict.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {conflict.severity}
        </span>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="text-sm text-slate-400 mb-4">趋势对比图</h2>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend />
            <Bar yAxisId="right" dataKey="isDuplicate" name="重复标记" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="executionTime" name="执行耗时(ms)" stroke="#10b981" dot={{ r: activePoint !== null ? 6 : 3 }} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 text-sm text-slate-400">冲突明细</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left px-5 py-2 font-medium">查询语句</th>
              <th className="text-left px-5 py-2 font-medium">耗时</th>
              <th className="text-left px-5 py-2 font-medium">冲突类型</th>
              <th className="text-left px-5 py-2 font-medium">严重性</th>
            </tr>
          </thead>
          <tbody>
            {slowQueryLogs.map((log, idx) => {
              const relatedConflict = conflicts.find((c) => c.log_id === log.id)
              const isHighlight = activeRow === log.id
              return (
                <tr
                  key={log.id}
                  onClick={() => handleRowClick(log.id, idx)}
                  className={`border-b border-slate-700/50 cursor-pointer transition-colors ${
                    isHighlight ? 'bg-amber-500/10' :
                    relatedConflict ? 'bg-rose-500/5 hover:bg-rose-500/10' :
                    'hover:bg-slate-700/30'
                  } ${relatedConflict ? 'border-l-2 border-l-rose-500' : ''}`}
                >
                  <td className="px-5 py-2.5">
                    <code className="font-mono text-xs text-slate-300 line-clamp-1">{log.query_text}</code>
                  </td>
                  <td className="px-5 py-2.5 text-slate-300">{log.execution_time_ms}ms</td>
                  <td className="px-5 py-2.5 text-slate-300">
                    {relatedConflict ? relatedConflict.type : '-'}
                  </td>
                  <td className="px-5 py-2.5">
                    {relatedConflict ? (
                      <span className={severityColor[relatedConflict.severity] ?? 'text-slate-400'}>
                        {relatedConflict.severity}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="text-sm text-slate-400 mb-3">冲突说明</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{conflict.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>类型: {conflict.type}</span>
          <span>·</span>
          <span>图表引用: {conflict.chart_data_ref ?? '-'}</span>
          <span>·</span>
          <span>表行引用: {conflict.table_row_ref ?? '-'}</span>
          {conflict.resolved ? <><span>·</span><span className="text-emerald-400">已解决</span></> : <><span>·</span><span className="text-rose-400">未解决</span></>}
        </div>
      </div>
    </div>
  )
}
