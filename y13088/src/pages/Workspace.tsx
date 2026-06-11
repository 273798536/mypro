import { useStore } from '@/store/useStore'
import ProfileCanvas from '@/components/ProfileCanvas'
import SidePanel from '@/components/SidePanel'
import CsvPanel from '@/components/CsvPanel'
import Toolbar from '@/components/Toolbar'
import HelpCard from '@/components/HelpCard'
import TraceRestore from '@/components/TraceRestore'
import { Link } from 'react-router-dom'

export default function Workspace() {
  const selectedRecordId = useStore(s => s.selectedRecordId)
  const filteredRecords = useStore(s => s.filteredRecords)
  const selectRecord = useStore(s => s.selectRecord)

  return (
    <div className="h-screen flex flex-col bg-[#0d0d1a] text-[#e8e8f0] overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {!selectedRecordId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5a5a7e]">
                  <p className="text-sm mb-3">点击顶部「加载样例」或选择一条巡检记录</p>
                  <div className="flex flex-wrap gap-2 max-w-md">
                    {filteredRecords.map(r => (
                      <button
                        key={r.id}
                        onClick={() => selectRecord(r.id)}
                        className="px-3 py-1.5 text-xs rounded border border-[#2a2a3e] hover:border-[#d4a853] hover:text-[#d4a853] transition-colors"
                      >
                        {r.displayCaseId}
                        {r.status === 'revoked' && <span className="ml-1 text-[#e74c3c]">已撤回</span>}
                        {r.status === 'anomaly' && <span className="ml-1 text-[#d4a853]">!</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ProfileCanvas />
              )}
            </div>

            <SidePanel />
          </div>

          <CsvPanel />

          <div className="px-4 py-1.5 border-t border-[#2a2a3e] bg-[#0a0a15] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TraceRestore />
              <Link to="/records" className="text-[10px] text-[#6a6a8e] hover:text-[#d4a853] transition-colors">
                巡检记录 →
              </Link>
            </div>
            <span className="text-[10px] text-[#4a4a6e]">
              {filteredRecords.length} 条记录 · {filteredRecords.reduce((s, r) => s + r.lights.filter(l => l.isAnomaly).length, 0)} 项异常
            </span>
          </div>
        </div>

        <HelpCard />
      </div>
    </div>
  )
}
