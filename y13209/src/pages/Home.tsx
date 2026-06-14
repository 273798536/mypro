import { useState } from 'react'
import { useStore } from '@/store'
import FilterBar from '@/components/FilterBar'
import EntryList from '@/components/EntryList'
import AuthExpiryCard from '@/components/AuthExpiryCard'
import RemarksPanel from '@/components/RemarksPanel'
import HistoryDrawer from '@/components/HistoryDrawer'
import ExportBar from '@/components/ExportBar'
import AddEntryModal from '@/components/AddEntryModal'
import { Plus, History, Trash2, Crosshair } from 'lucide-react'

export default function Home() {
  const { entries, activeEntryId, deleteEntry, toggleHistoryDrawer } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)

  const activeEntry = entries.find((e) => e.id === activeEntryId)

  const handleDelete = () => {
    if (!activeEntryId) return
    if (confirm('确定删除此条目？')) {
      deleteEntry(activeEntryId)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d0d1a] text-gray-200">
      <header className="flex items-center justify-between px-6 py-3 bg-[#12122a] border-b border-[#2a2a4a]">
        <div className="flex items-center gap-3">
          <Crosshair size={20} className="text-amber-500" />
          <h1 className="text-base font-bold tracking-wide text-gray-100">
            录音棚时码分账对齐
          </h1>
          <span className="text-[10px] text-gray-600 bg-[#2a2a4a] px-2 py-0.5 rounded-full">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-[#1a1a2e] hover:bg-amber-400 transition-all"
          >
            <Plus size={14} />
            新增
          </button>
        </div>
      </header>

      <FilterBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#2a2a4a]">
          <EntryList />
        </div>

        <div className="w-[380px] shrink-0 flex flex-col overflow-auto bg-[#12122a]/50">
          {activeEntry ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-200">{activeEntry.projectName}</h2>
                  <div className="text-xs text-gray-500 mt-0.5 font-mono">
                    {activeEntry.timeRange.start} → {activeEntry.timeRange.end}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleHistoryDrawer}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                    title="版本历史"
                  >
                    <History size={15} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="删除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <AuthExpiryCard />
              <RemarksPanel />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Crosshair size={40} className="mx-auto text-gray-700 mb-3" />
                <div className="text-sm text-gray-500">选择左侧条目</div>
                <div className="text-xs text-gray-600 mt-1">查看授权、备注和对齐状态</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExportBar />
      <HistoryDrawer />

      {showAddModal && <AddEntryModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
