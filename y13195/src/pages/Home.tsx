import { useStore } from '@/store/useStore'
import RecordCard from '@/components/RecordCard'
import ParamVersionPanel from '@/components/ParamVersionPanel'
import LateAttachmentPanel from '@/components/LateAttachmentPanel'
import NameplateDrawer from '@/components/NameplateDrawer'
import JudgmentModifyDialog from '@/components/JudgmentModifyDialog'
import { Settings2, History } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  const records = useStore((s) => s.records)
  const selectedRecordId = useStore((s) => s.selectedRecordId)
  const selectRecord = useStore((s) => s.selectRecord)
  const nameplateDrawerOpen = useStore((s) => s.nameplateDrawerOpen)
  const nameplateDrawerCode = useStore((s) => s.nameplateDrawerCode)
  const openNameplateDrawer = useStore((s) => s.openNameplateDrawer)
  const closeNameplateDrawer = useStore((s) => s.closeNameplateDrawer)
  const openModifyDialog = useStore((s) => s.openModifyDialog)
  const getDuplicateRecords = useStore((s) => s.getDuplicateRecords)

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null

  const hasDuplicate = (equipmentCode: string) => {
    return getDuplicateRecords(equipmentCode).length > 1
  }

  const handleToggle = (id: string) => {
    selectRecord(selectedRecordId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-base-900">
      <header className="border-b border-base-600 bg-base-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="text-industrial-blue" size={24} />
            <div>
              <h1 className="text-lg font-medium text-white tracking-wide">
                滑轮组张力实验复算
              </h1>
              <p className="text-xs text-base-500">
                设备铭牌复核 · 参数版本追踪 · 异常点归因
              </p>
            </div>
          </div>
          <div className="text-xs text-base-500 font-mono">
            共 {records.length} 条记录
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-3">
        {records.map((record) => {
          const expanded = selectedRecordId === record.id
          return (
            <div key={record.id} className="space-y-0">
              <RecordCard
                record={record}
                isExpanded={expanded}
                onToggle={() => handleToggle(record.id)}
                hasDuplicate={hasDuplicate(record.equipmentCode)}
                onTraceDuplicate={() =>
                  openNameplateDrawer(record.equipmentCode)
                }
              />
              {expanded && (
                <div className="ml-4 mt-2 mb-4 space-y-3 animate-fadeIn">
                  <ParamVersionPanel record={record} />

                  <LateAttachmentPanel record={record} />

                  <div className="card-base p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="section-title">当前判断</h3>
                        <span className="param-value text-base">
                          {record.judgment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/history/${record.id}`}
                          className="flex items-center gap-1.5 text-xs text-base-400 hover:text-industrial-blue-light transition-colors"
                        >
                          <History size={14} />
                          判断历史
                        </Link>
                        <button
                          onClick={() => openModifyDialog(record.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-industrial-blue/20 text-industrial-blue-light rounded hover:bg-industrial-blue/30 transition-colors"
                        >
                          修改判断
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </main>

      <NameplateDrawer
        open={nameplateDrawerOpen}
        equipmentCode={nameplateDrawerCode}
        onClose={closeNameplateDrawer}
      />

      <JudgmentModifyDialog />
    </div>
  )
}
