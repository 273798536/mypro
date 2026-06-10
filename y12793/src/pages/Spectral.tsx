import { useState } from 'react'
import { useLabStore } from '@/store/useLabStore'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceDot,
} from 'recharts'
import { ScanLine, AlertTriangle, CheckCircle2, ShieldAlert, Plus } from 'lucide-react'
import type { SafetyLevel } from '@/types'

const levelColors: Record<SafetyLevel, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-300',
  warning: 'bg-amber-100 text-amber-700 border-amber-300',
  danger: 'bg-red-100 text-red-700 border-red-300',
}

export default function Spectral() {
  const spectralData = useLabStore((s) => s.spectralData)
  const safetyNotes = useLabStore((s) => s.safetyNotes)
  const updateRecordStatus = useLabStore((s) => s.updateRecordStatus)
  const addSafetyNote = useLabStore((s) => s.addSafetyNote)
  const addTraceLog = useLabStore((s) => s.addTraceLog)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [noteText, setNoteText] = useState('')
  const [noteLevel, setNoteLevel] = useState<SafetyLevel>('info')
  const [checks, setChecks] = useState([false, false, false])

  const current = spectralData[selectedIdx] ?? null
  const notes = current ? safetyNotes.filter((n) => n.recordId === current.recordId) : []

  const toggleCheck = (i: number) => {
    setChecks((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      return next
    })
  }

  const handleAddNote = () => {
    if (!current || !noteText.trim()) return
    addSafetyNote({
      id: `note-${Date.now()}`,
      recordId: current.recordId,
      content: noteText.trim(),
      level: noteLevel,
      author: '当前用户',
      createdAt: new Date().toISOString(),
    })
    setNoteText('')
  }

  const handleConfirm = () => {
    if (!current) return
    const status = current.hasOverlap ? 'fail' : 'pass'
    updateRecordStatus(current.recordId, status)
    addTraceLog({
      id: `trace-${Date.now()}`,
      recordId: current.recordId,
      action: '谱图复核确认',
      operator: '当前用户',
      detail: `复核完成，状态：${status}`,
      timestamp: new Date().toISOString(),
    })
  }

  const handleMarkFail = (recordId: string) => {
    updateRecordStatus(recordId, 'fail')
    addTraceLog({
      id: `trace-${Date.now()}`,
      recordId,
      action: '标记坏记录',
      operator: '当前用户',
      detail: '谱峰重叠，标记为坏记录',
      timestamp: new Date().toISOString(),
    })
  }

  if (!current) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <ScanLine className="mr-2" /> 暂无谱图数据
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ScanLine className="text-teal-600" /> 谱图复核
        </h1>
        <p className="text-sm text-gray-500 mt-1">谱图数据 + 安全备注 + 谱峰重叠 — 同轮复核</p>
      </div>

      <div className="mb-4 flex gap-2">
        {spectralData.map((sd, i) => (
          <button
            key={sd.id}
            onClick={() => { setSelectedIdx(i); setChecks([false, false, false]) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              i === selectedIdx
                ? 'bg-teal-600 text-white shadow'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {sd.substanceName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-teal-500" /> {current.substanceName} 谱图
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={current.dataPoints}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="wavelength" tick={{ fontSize: 12 }} label={{ value: '2θ', position: 'insideBottomRight', offset: -5 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: '强度', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                {current.hasOverlap && current.overlapRegions.map((r, i) => (
                  <ReferenceArea key={i} x1={r.start} x2={r.end} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                ))}
                <Area type="monotone" dataKey="intensity" stroke="#0d9488" fill="url(#tealGrad)" strokeWidth={2} />
                {current.peaks.map((p, i) => (
                  <ReferenceDot key={i} x={p.position} y={p.intensity} r={4} fill="#0d9488" stroke="#fff" strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> 谱峰重叠检测
            </h3>
            {current.hasOverlap ? (
              <div className="space-y-2">
                {current.overlapRegions.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <div className="text-sm">
                      <span className="font-medium text-amber-700">区间 {r.start}°–{r.end}°</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-amber-600">重叠率 {(r.overlapRatio * 100).toFixed(1)}%</span>
                    </div>
                    <button
                      onClick={() => handleMarkFail(current.recordId)}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      标记为坏记录
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="w-5 h-5" /> 未检测到谱峰重叠
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-blue-500" /> 安全备注
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {notes.length === 0 && <p className="text-sm text-gray-400">暂无安全备注</p>}
              {notes.map((n) => (
                <div key={n.id} className={`text-sm rounded-lg border px-3 py-2 ${levelColors[n.level]}`}>
                  <span className="font-medium">[{n.level}]</span> {n.content}
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="输入安全备注..."
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                rows={2}
              />
              <div className="flex gap-2">
                <select
                  value={noteLevel}
                  onChange={(e) => setNoteLevel(e.target.value as SafetyLevel)}
                  className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="danger">danger</option>
                </select>
                <button
                  onClick={handleAddNote}
                  className="flex-1 flex items-center justify-center gap-1 bg-teal-600 text-white rounded-lg px-3 py-1 text-sm hover:bg-teal-700 transition"
                >
                  <Plus className="w-4 h-4" /> 添加安全备注
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold mb-3">复核确认</h3>
            {['谱图数据已查看', '安全备注已确认', '谱峰重叠已复核'].map((label, i) => (
              <label key={i} className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} className="w-4 h-4 accent-teal-600" />
                {label}
              </label>
            ))}
            <button
              onClick={handleConfirm}
              disabled={!checks.every(Boolean)}
              className="mt-3 w-full py-2 rounded-lg text-sm font-medium transition disabled:bg-gray-200 disabled:text-gray-400 bg-teal-600 text-white hover:bg-teal-700"
            >
              复核确认
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
