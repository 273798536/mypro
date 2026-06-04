import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'
import { generateReport } from '@/utils/reportGenerator'
import type { CanvasSnapshot, Anomaly } from '@/types'

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function TimelineEntry({
  snapshot,
  isLast,
  expanded,
  onToggle,
}: {
  snapshot: CanvasSnapshot
  isLast: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'z-10 h-4 w-4 rounded-full border-2 border-blue-500 bg-white',
            snapshot.anomalies.length > 0 && 'border-amber-500',
            snapshot.anomalies.some((a) => a.type === 'coordinate_flip') &&
              'border-red-500'
          )}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-300" />}
      </div>
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <button
          onClick={onToggle}
          className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="font-mono text-xs text-gray-500">
              {formatTimestamp(snapshot.timestamp)}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {snapshot.action}
            </span>
            {snapshot.anomalies.length > 0 && (
              <AlertTriangle
                size={14}
                className="text-amber-500"
              />
            )}
          </div>
        </button>
        {expanded && (
          <div className="ml-6 mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <p className="text-xs font-semibold text-gray-600">
                标注点 ({snapshot.points.length})
              </p>
              {snapshot.points.length === 0 ? (
                <p className="text-xs text-gray-400">无</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {snapshot.points.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 text-xs text-gray-700"
                    >
                      <span className="font-medium">{p.label}</span>
                      <span className="font-mono text-gray-500">
                        ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                      </span>
                      {p.coordinateReversed && (
                        <span className="rounded bg-red-100 px-1 text-[10px] text-red-600">
                          翻转
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {snapshot.anomalies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600">
                  异常 ({snapshot.anomalies.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {snapshot.anomalies.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-1 text-xs text-amber-700"
                    >
                      <AlertTriangle size={12} />
                      {a.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {snapshot.scaleRefs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600">
                  比例尺参考线 ({snapshot.scaleRefs.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {snapshot.scaleRefs.map((r) => (
                    <li
                      key={r.id}
                      className="text-xs text-gray-700"
                    >
                      {r.realDistance}
                      {r.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {snapshot.equipment.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600">
                  设备 ({snapshot.equipment.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {snapshot.equipment.map((e) => (
                    <li
                      key={e.id}
                      className="text-xs text-gray-700"
                    >
                      {e.name} — {e.spec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FlipAnomalyCard({
  anomaly,
}: {
  anomaly: Anomaly
}) {
  const [copied, setCopied] = useState(false)
  const point = useGameStore((s) =>
    s.points.find((p) => p.id === anomaly.pointId)
  )

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(anomaly.plainExplanation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [anomaly.plainExplanation])

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" />
        <span className="text-sm font-semibold text-red-800">
          坐标翻转
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium">标注点：</span>
          {point?.label ?? anomaly.pointId}
        </p>
        {point && (
          <p className="font-mono text-xs text-gray-600">
            坐标 ({point.x.toFixed(1)}, {point.y.toFixed(1)})
          </p>
        )}
      </div>
      <div className="mt-3 rounded-md bg-white p-3 text-sm leading-relaxed text-gray-700">
        {anomaly.plainExplanation}
      </div>
      <button
        onClick={handleCopy}
        className="mt-2 flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
      >
        {copied ? (
          <>
            <CheckCircle size={14} className="text-green-500" />
            已复制
          </>
        ) : (
          <>
            <Copy size={14} />
            复制解释
          </>
        )}
      </button>
      {anomaly.manualNote && (
        <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3">
          <div className="mb-1 flex items-center gap-1">
            <MessageSquare size={12} className="text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700">
              人工备注（原话保留）
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-yellow-900">
            {anomaly.manualNote}
          </p>
        </div>
      )}
    </div>
  )
}

export default function Replay() {
  const navigate = useNavigate()
  const loadFromStorage = useGameStore((s) => s.loadFromStorage)
  const round = useGameStore((s) => s.round)
  const elapsedTime = useGameStore((s) => s.elapsedTime)
  const points = useGameStore((s) => s.points)
  const scaleRefs = useGameStore((s) => s.scaleRefs)
  const anomalies = useGameStore((s) => s.anomalies)
  const equipment = useGameStore((s) => s.equipment)
  const snapshots = useGameStore((s) => s.snapshots)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [reportCopied, setReportCopied] = useState(false)

  const flipAnomalies = anomalies.filter(
    (a) => a.type === 'coordinate_flip'
  )

  const report = generateReport({
    round,
    elapsedTime,
    points,
    scaleRefs,
    anomalies,
    equipment,
    snapshots,
  })

  const handleCopyReport = useCallback(() => {
    navigator.clipboard.writeText(report).then(() => {
      setReportCopied(true)
      setTimeout(() => setReportCopied(false), 2000)
    })
  }, [report])

  const handleDownload = useCallback(() => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `校对复盘_第${round}轮.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [report, round])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settlement')}
              className="flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft size={18} />
              返回结算
            </button>
            <div className="h-5 w-px bg-gray-300" />
            <h1 className="text-lg font-bold text-gray-900">校对复盘</h1>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
            第{round}轮
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          <div className="w-2/3 space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  操作时间线
                </h2>
                <span className="text-xs text-gray-500">
                  {snapshots.length} 步操作
                </span>
              </div>
              {snapshots.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  暂无操作记录
                </p>
              ) : (
                <div>
                  {snapshots.map((snap, i) => (
                    <TimelineEntry
                      key={i}
                      snapshot={snap}
                      isLast={i === snapshots.length - 1}
                      expanded={expandedIndex === i}
                      onToggle={() =>
                        setExpandedIndex(expandedIndex === i ? null : i)
                      }
                    />))}
                </div>
              )}
            </section>

            {flipAnomalies.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    坐标翻转详情
                  </h2>
                  <span className="text-xs text-gray-500">
                    {flipAnomalies.length} 处
                  </span>
                </div>
                <div className="space-y-4">
                  {flipAnomalies.map((a) => (
                    <FlipAnomalyCard key={a.id} anomaly={a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="w-1/3">
            <div className="sticky top-20">
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    <h2 className="text-base font-semibold text-gray-900">
                      报告预览
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyReport}
                      className={cn(
                        'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        reportCopied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {reportCopied ? (
                        <>
                          <CheckCircle size={12} />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          复制全文
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <Download size={12} />
                      下载报告
                    </button>
                  </div>
                </div>
                <div
                  className="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(transparent, transparent 27px, #f3f4f6 28px)',
                    backgroundSize: '100% 28px',
                    fontFamily:
                      '"Courier New", Courier, monospace',
                    fontSize: '11px',
                    lineHeight: '28px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {report}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
