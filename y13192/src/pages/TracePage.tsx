import MaterialTimeline from '@/components/MaterialTimeline'
import MaterialCompare from '@/components/MaterialCompare'
import MaintenanceNotes from '@/components/MaintenanceNotes'
import { FileSearch } from 'lucide-react'

export default function TracePage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-gray-800 px-6 py-3" style={{ background: '#1a1a2e' }}>
        <FileSearch className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="text-lg font-bold text-white">材料溯源</h1>
          <p className="text-xs text-gray-500">口径变更时间线 · 材料对照 · 维修备注来源</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">材料对照表</h2>
            <MaterialCompare />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">口径变更时间线</h2>
            <MaterialTimeline />
          </section>
        </div>
        <aside className="w-80 shrink-0 overflow-auto border-l border-gray-800">
          <MaintenanceNotes />
        </aside>
      </div>
    </div>
  )
}
