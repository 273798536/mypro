import { useStore } from '@/store/useStore'
import { Filter } from 'lucide-react'
import type { CollisionStatus, ObjectType } from '@/types'

export default function FilterPanel() {
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)

  const statusOptions: { value: CollisionStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'collision', label: '碰撞' },
    { value: 'pending_review', label: '待确认' },
    { value: 'safe', label: '安全' },
  ]

  const typeOptions: { value: ObjectType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'bar', label: '吊杆' },
    { value: 'fixture', label: '灯具' },
    { value: 'scenery', label: '景片' },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800">
      <Filter size={12} className="text-zinc-500" />
      <select
        value={filter.collisionStatus}
        onChange={(e) => setFilter({ collisionStatus: e.target.value as CollisionStatus | 'all' })}
        className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-amber-400/50"
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={filter.objectType}
        onChange={(e) => setFilter({ objectType: e.target.value as ObjectType | 'all' })}
        className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-amber-400/50"
      >
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
