import { useState } from 'react'
import { useLabStore } from '@/store/useLabStore'
import { downloadAsJSON } from '@/utils/export'
import {
  GitBranch,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  ShieldAlert,
  Thermometer,
  Beaker,
  Scale,
} from 'lucide-react'
import type { RecordStatus, SafetyLevel } from '@/types'

const statusConfig: Record<RecordStatus, { label: string; className: string }> = {
  pass: { label: '通过', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: '待审', className: 'bg-yellow-100 text-yellow-700' },
  fail: { label: '未通过', className: 'bg-red-100 text-red-700' },
}

const levelConfig: Record<SafetyLevel, { label: string; className: string }> = {
  info: { label: '提示', className: 'bg-blue-100 text-blue-700' },
  warning: { label: '警告', className: 'bg-amber-100 text-amber-700' },
  danger: { label: '危险', className: 'bg-red-100 text-red-700' },
}

function getActionColor(action: string) {
  if (action.includes('创建')) return 'bg-teal-500'
  if (action.includes('上传')) return 'bg-blue-500'
  if (action.includes('告警') || action.includes('安全提示')) return 'bg-amber-500'
  return 'bg-slate-500'
}

function getActionLine(action: string) {
  if (action.includes('创建')) return 'border-teal-300'
  if (action.includes('上传')) return 'border-blue-300'
  if (action.includes('告警') || action.includes('安全提示')) return 'border-amber-300'
  return 'border-slate-300'
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN')
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon: React.ElementType
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <Icon size={16} />
          {title}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  )
}

export default function Trace() {
  const [selectedId, setSelectedId] = useState<string>('')
  const {
    records,
    spectralData,
    safetyNotes,
    temperatureCurves,
    concentrationRecords,
    balanceResults,
    getRecordTrace,
    exportRecordSummary,
  } = useLabStore()

  const record = records.find((r) => r.id === selectedId)
  const traceLogs = selectedId ? getRecordTrace(selectedId) : []
  const relatedSpectral = spectralData.filter((s) => s.recordId === selectedId)
  const relatedNotes = safetyNotes.filter((n) => n.recordId === selectedId)
  const relatedTemp = temperatureCurves.filter((t) => t.recordId === selectedId)
  const relatedConc = concentrationRecords.filter((c) => c.recordId === selectedId)
  const relatedBalance = balanceResults.filter((b) => b.recordId === selectedId)

  const handleExport = () => {
    if (!selectedId) return
    const summary = exportRecordSummary(selectedId)
    if (summary) downloadAsJSON(summary, `${record?.name ?? 'record'}-trace`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch size={24} />
          记录溯源
        </h1>
        <p className="text-gray-500 mt-1">从结果倒查来源与处理记录</p>
      </div>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <option value="">-- 选择实验记录 --</option>
        {records.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} ({statusConfig[r.status].label})
          </option>
        ))}
      </select>

      {record && (
        <>
          <div className="border rounded-lg p-5 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{record.name}</h2>
                <p className="text-sm text-gray-500">类型：{record.type}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusConfig[record.status].className}`}>
                {statusConfig[record.status].label}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock size={14} />
              创建：{formatTime(record.createdAt)} · 更新：{formatTime(record.updatedAt)}
            </div>
            <div className="grid grid-cols-4 gap-3 text-center text-sm">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-gray-800">{relatedSpectral.length}</div>
                <div className="text-gray-500">谱图数据</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-gray-800">{relatedNotes.length}</div>
                <div className="text-gray-500">安全备注</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-gray-800">{relatedTemp.length}</div>
                <div className="text-gray-500">温度曲线</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-gray-800">{traceLogs.length}</div>
                <div className="text-gray-500">溯源日志</div>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Download size={14} />
              导出此记录
            </button>
          </div>

          {traceLogs.length > 0 && (
            <div className="space-y-0">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <GitBranch size={18} />
                溯源时间线
              </h3>
              <div className="relative ml-3">
                {traceLogs.map((log, i) => (
                  <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                    <div
                      className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-white shadow ${getActionColor(log.action)}`}
                      style={{ zIndex: 1 }}
                    />
                    {i < traceLogs.length - 1 && (
                      <div className={`absolute left-[5px] top-5 bottom-0 border-l-2 ${getActionLine(log.action)}`} />
                    )}
                    <div className="bg-white border rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{log.action}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <User size={12} />
                        {log.operator}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">关联数据</h3>

            <CollapsibleSection title="谱图数据" icon={FileText} count={relatedSpectral.length}>
              {relatedSpectral.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无数据</p>
              ) : (
                <ul className="divide-y text-sm pt-2">
                  {relatedSpectral.map((s) => (
                    <li key={s.id} className="py-2 flex justify-between">
                      <span>{s.substanceName}</span>
                      <span className={s.hasOverlap ? 'text-amber-600' : 'text-emerald-600'}>
                        {s.hasOverlap ? `重叠×${s.overlapRegions.length}` : '无重叠'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="安全备注" icon={ShieldAlert} count={relatedNotes.length}>
              {relatedNotes.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无数据</p>
              ) : (
                <ul className="divide-y text-sm pt-2">
                  {relatedNotes.map((n) => (
                    <li key={n.id} className="py-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${levelConfig[n.level].className}`}>
                        {levelConfig[n.level].label}
                      </span>
                      <span className="text-gray-700">{n.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="温度曲线" icon={Thermometer} count={relatedTemp.length}>
              {relatedTemp.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无数据</p>
              ) : (
                <ul className="divide-y text-sm pt-2">
                  {relatedTemp.map((t) => (
                    <li key={t.id} className="py-2 flex justify-between">
                      <span>{t.timePoints.length} 个时间点</span>
                      <span className={t.anomalyRanges.length > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {t.anomalyRanges.length > 0 ? `异常×${t.anomalyRanges.length}` : '正常'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="浓度记录" icon={Beaker} count={relatedConc.length}>
              {relatedConc.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无数据</p>
              ) : (
                <ul className="divide-y text-sm pt-2">
                  {relatedConc.map((c) => (
                    <li key={c.id} className="py-2 flex justify-between">
                      <span>{c.substance}</span>
                      <span>{c.value} {c.unit} → {c.convertedValue} {c.convertedUnit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="配平结果" icon={Scale} count={relatedBalance.length}>
              {relatedBalance.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">暂无数据</p>
              ) : (
                <ul className="divide-y text-sm pt-2">
                  {relatedBalance.map((b) => (
                    <li key={b.id} className="py-2">
                      <div className="text-gray-700">{b.equation}</div>
                      <div className="text-emerald-600">{b.balancedEquation}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>
          </div>
        </>
      )}
    </div>
  )
}
