import { useState, useEffect } from 'react'
import { useRegressionStore, type DataPoint, type RegressionParams } from '@/store/regression'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Play, RotateCcw, History, Settings, Database, ChevronRight } from 'lucide-react'

const DEMO_DATA: DataPoint[] = [
  { x: 1, y: 2.1, unit: 'cm' },
  { x: 2, y: 4.0, unit: 'cm' },
  { x: 3, y: 5.9, unit: 'cm' },
  { x: 4, y: 8.1, unit: 'cm' },
  { x: 5, y: 10.2, unit: 'cm' },
  { x: 6, y: 15.5, unit: 'cm' },
  { x: 7, y: 18.3, unit: 'cm' },
  { x: 8, y: 21.0, unit: 'cm' },
  { x: 9, y: 24.8, unit: 'cm' },
  { x: 10, y: 27.5 },
  { x: 11, y: 30.1, unit: 'cm' },
  { x: 12, y: 33.2, unit: 'cm' },
]

const STATUS_STYLES: Record<string, string> = {
  idle: 'bg-gray-200 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  idle: '待计算',
  running: '计算中',
  completed: '已完成',
  error: '错误',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status] || 'bg-gray-100 text-gray-500')}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function SessionPanel() {
  const {
    sessions,
    currentSession,
    data,
    params,
    history,
    loading,
    fetchSessions,
    createSession,
    selectSession,
    deleteSession,
    updateParams,
    setData,
    addDataPoint,
    removeDataPoint,
    compute,
    restoreState,
  } = useRegressionStore()

  const [newX, setNewX] = useState('')
  const [newY, setNewY] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [breakpointsInput, setBreakpointsInput] = useState(params.breakpoints?.join(', ') || '')
  const [unitInput, setUnitInput] = useState(params.unit || '')
  const [minSizeInput, setMinSizeInput] = useState(String(params.minSegmentSize ?? 3))
  const [sensParams, setSensParams] = useState<RegressionParams>({})
  const [sensLabel, setSensLabel] = useState('')
  const [showSensitivity, setShowSensitivity] = useState(false)

  useEffect(() => {
    setBreakpointsInput(params.breakpoints?.join(', ') || '')
    setUnitInput(params.unit || '')
    setMinSizeInput(String(params.minSegmentSize ?? 3))
  }, [params.breakpoints, params.unit, params.minSegmentSize])

  const handleAddDataPoint = async () => {
    const xVal = parseFloat(newX)
    const yVal = parseFloat(newY)
    if (isNaN(xVal) || isNaN(yVal)) return
    const point: DataPoint = { x: xVal, y: yVal }
    if (newUnit.trim()) point.unit = newUnit.trim()
    await addDataPoint(point)
    setNewX('')
    setNewY('')
    setNewUnit('')
  }

  const handleApplyParams = () => {
    const bp = breakpointsInput.trim()
      ? breakpointsInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : undefined
    const updated: RegressionParams = {
      ...params,
      breakpoints: bp,
      unit: unitInput.trim() || undefined,
      minSegmentSize: parseInt(minSizeInput, 10) || 3,
    }
    updateParams(updated)
  }

  const handleSensCompute = () => {
    if (!sensLabel.trim()) return
    compute({ params: sensParams, label: sensLabel.trim() })
  }

  const formatTime = (iso: string) => {
    try {
      const normalized = iso?.includes('T') ? iso : iso?.replace(' ', 'T')
      const d = new Date(normalized)
      if (isNaN(d.getTime())) return iso
      return d.toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto border-r pr-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            会话列表
          </h2>
          <button
            onClick={() => createSession()}
            disabled={loading}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            新建会话
          </button>
        </div>

        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">暂无会话</p>
        )}

        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => selectSession(s.id)}
            className={cn(
              'group cursor-pointer rounded-lg border p-2.5 transition-colors',
              currentSession?.id === s.id
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn('h-3 w-3 flex-shrink-0 transition-transform', currentSession?.id === s.id && 'rotate-90 text-blue-500')} />
                  <span className="truncate text-sm font-medium">{s.name}</span>
                </div>
                <div className="ml-5 mt-1 flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="text-[10px] text-gray-400">{formatTime(s.updatedAt)}</span>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {!currentSession ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            请选择或创建一个会话
          </div>
        ) : (
          <>
            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                <Database className="h-4 w-4" />
                数据点
              </h3>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setData(DEMO_DATA)}
                  className="rounded-md bg-amber-500 px-2.5 py-1 text-xs text-white hover:bg-amber-600"
                >
                  加载示例数据
                </button>
              </div>

              {data.length > 0 && (
                <table className="w-full text-xs mb-3">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-1.5 pr-2 font-medium">x</th>
                      <th className="pb-1.5 pr-2 font-medium">y</th>
                      <th className="pb-1.5 pr-2 font-medium">unit</th>
                      <th className="pb-1.5 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(d => (
                      <tr key={d.id} className={cn('border-b last:border-0', !d.unit && 'bg-red-50')}>
                        <td className="py-1.5 pr-2">{d.x}</td>
                        <td className="py-1.5 pr-2">{d.y}</td>
                        <td className="py-1.5 pr-2">{d.unit ?? <span className="text-red-400 italic">缺失</span>}</td>
                        <td className="py-1.5">
                          <button onClick={() => removeDataPoint(d.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">x</label>
                  <input
                    type="number"
                    value={newX}
                    onChange={e => setNewX(e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">y</label>
                  <input
                    type="number"
                    value={newY}
                    onChange={e => setNewY(e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    placeholder="可选"
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAddDataPoint}
                  className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700"
                >
                  <Plus className="h-3 w-3" />
                  添加
                </button>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                <Settings className="h-4 w-4" />
                参数设置
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">断点 (逗号分隔)</label>
                  <input
                    type="text"
                    value={breakpointsInput}
                    onChange={e => setBreakpointsInput(e.target.value)}
                    placeholder="如: 5, 8"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">单位</label>
                  <input
                    type="text"
                    value={unitInput}
                    onChange={e => setUnitInput(e.target.value)}
                    placeholder="如: cm"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">最小段大小</label>
                  <input
                    type="number"
                    value={minSizeInput}
                    onChange={e => setMinSizeInput(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyParams}
                  className="rounded-md bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700"
                >
                  应用参数
                </button>
                <button
                  onClick={() => compute()}
                  disabled={loading || data.length === 0}
                  className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="h-3 w-3" />
                  计算
                </button>
                <button
                  onClick={() => restoreState()}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-md bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  恢复状态
                </button>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <button
                onClick={() => setShowSensitivity(v => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', showSensitivity && 'rotate-90')} />
                灵敏度对比
              </button>

              {showSensitivity && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">对比断点</label>
                      <input
                        type="text"
                        value={sensParams.breakpoints?.join(', ') ?? ''}
                        onChange={e => {
                          const val = e.target.value.trim()
                          setSensParams(prev => ({
                            ...prev,
                            breakpoints: val ? val.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : undefined,
                          }))
                        }}
                        placeholder="如: 6, 9"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">对比单位</label>
                      <input
                        type="text"
                        value={sensParams.unit ?? ''}
                        onChange={e => setSensParams(prev => ({ ...prev, unit: e.target.value.trim() || undefined }))}
                        placeholder="如: mm"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">对比最小段大小</label>
                      <input
                        type="number"
                        value={sensParams.minSegmentSize ?? ''}
                        onChange={e => setSensParams(prev => ({ ...prev, minSegmentSize: parseInt(e.target.value, 10) || undefined }))}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">标签</label>
                      <input
                        type="text"
                        value={sensLabel}
                        onChange={e => setSensLabel(e.target.value)}
                        placeholder="对比名称"
                        className="w-40 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSensCompute}
                      disabled={loading || !sensLabel.trim() || data.length === 0}
                      className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      对比计算
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                <History className="h-4 w-4" />
                历史记录
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-gray-400">暂无历史记录</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {history.map(h => (
                    <li key={h.id} className="flex items-center justify-between rounded bg-gray-50 px-2.5 py-1.5 text-xs">
                      <span className="text-gray-700 font-medium">{h.action}</span>
                      <span className="text-gray-400 text-[10px]">{formatTime(h.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
