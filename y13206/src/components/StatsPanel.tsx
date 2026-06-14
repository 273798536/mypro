import { useStore } from '@/store/useStore'
import { CheckCircle, Clock, FileText, ShieldAlert } from 'lucide-react'
import type { RecordStatus } from '@/types'

const STATUS_CONFIG: Record<RecordStatus, { label: string; icon: React.ReactNode; highlight: boolean }> = {
  normal: { label: '正常', icon: <CheckCircle size={20} />, highlight: false },
  conflict: { label: '排期冲突', icon: <ShieldAlert size={20} />, highlight: true },
  pending: { label: '待处理', icon: <Clock size={20} />, highlight: true },
  resolved: { label: '已解决', icon: <FileText size={20} />, highlight: false },
}

export default function StatsPanel() {
  const records = useStore((s) => s.records)

  const total = records.length
  const counts: Record<RecordStatus, number> = {
    normal: records.filter((r) => r.status === 'normal').length,
    conflict: records.filter((r) => r.status === 'conflict').length,
    pending: records.filter((r) => r.status === 'pending').length,
    resolved: records.filter((r) => r.status === 'resolved').length,
  }

  const statItems = [
    { key: 'total' as const, label: '总记录数', count: total, icon: <FileText size={24} />, highlight: false },
    ...(['conflict', 'pending', 'resolved', 'normal'] as const).map((s) => ({
      key: s,
      label: STATUS_CONFIG[s].label,
      count: counts[s],
      icon: STATUS_CONFIG[s].icon,
      highlight: STATUS_CONFIG[s].highlight,
    })),
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {statItems.map((item) => (
        <div
          key={item.key}
          className="rounded-xl p-4 text-center"
          style={{
            backgroundColor: item.highlight ? '#3d2a10' : '#2d2d44',
            border: item.highlight ? '1px solid #f0a500' : '1px solid #3a3a55',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1 text-[#e8e8e8]/70">
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </div>
          <div
            className="text-3xl font-bold"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: item.highlight ? '#f0a500' : '#e8e8e8',
            }}
          >
            {item.count}
          </div>
        </div>
      ))}
    </div>
  )
}
