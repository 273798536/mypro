import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { detectMixedInput } from '@/utils/detectMixed'
import MixedConfirmDialog from '@/components/MixedConfirmDialog'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import type { RecordStatus } from '@/types'

const statusConfig: Record<RecordStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  normal: { label: '正常', color: 'text-[#4ade80]', bg: 'bg-[#4ade8010]', icon: <CheckCircle size={12} /> },
  anomaly: { label: '异常', color: 'text-[#d4a853]', bg: 'bg-[#d4a85310]', icon: <AlertTriangle size={12} /> },
  revoked: { label: '已撤回', color: 'text-[#e74c3c]', bg: 'bg-[#e74c3c10]', icon: <XCircle size={12} /> },
}

export default function Records() {
  const filteredRecords = useStore(s => s.filteredRecords)
  const filterState = useStore(s => s.filterState)
  const setFilter = useStore(s => s.setFilter)
  const applyFilter = useStore(s => s.applyFilter)
  const selectRecord = useStore(s => s.selectRecord)
  const showMixedConfirm = useStore(s => s.showMixedConfirm)
  const navigate = useNavigate()

  const [floorInput, setFloorInput] = useState(filterState.floor)
  const [unitInput, setUnitInput] = useState(filterState.unit)
  const [statusToggles, setStatusToggles] = useState<RecordStatus[]>(filterState.statuses)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    setFloorInput(filterState.floor)
    setUnitInput(filterState.unit)
    setStatusToggles(filterState.statuses)
  }, [filterState.floor, filterState.unit, filterState.statuses])

  const handleFloorChange = (val: string) => {
    setFloorInput(val)
    const result = detectMixedInput(val)
    if (result.isMixed) {
      showMixedConfirm(result.reason ?? '', result.floor, result.unit)
    }
  }

  const handleUnitChange = (val: string) => {
    setUnitInput(val)
  }

  const toggleStatus = (s: RecordStatus) => {
    const next = statusToggles.includes(s) ? statusToggles.filter(x => x !== s) : [...statusToggles, s]
    setStatusToggles(next)
  }

  const handleApply = () => {
    setFilter({ floor: floorInput, unit: unitInput, statuses: statusToggles })
    applyFilter()
  }

  const handleReset = () => {
    setFloorInput('')
    setUnitInput('')
    setStatusToggles([])
    setFilter({ floor: '', unit: '', statuses: [] })
    applyFilter()
  }

  const handleSelect = (id: string) => {
    selectRecord(id)
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d0d1a] text-[#e8e8f0] overflow-hidden">
      <div className="h-11 min-h-11 border-b border-[#2a2a3e] bg-[#12121f] flex items-center px-4 gap-3">
        <Link to="/" className="text-[#6a6a8e] hover:text-[#d4a853] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-sm font-semibold text-[#d4a853] tracking-wide">巡检记录</span>
        <span className="text-xs text-[#5a5a7e]">({filteredRecords.length} 条)</span>
      </div>

      <div className="border-b border-[#2a2a3e] bg-[#12121f] px-4 py-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-[#6a6a8e] block mb-1">楼层</label>
            <input
              value={floorInput}
              onChange={e => handleFloorChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="如 2F、3F-A区"
              className={`w-full px-2 py-1.5 text-xs bg-[#0d0d1a] border rounded text-[#c8c8d8] placeholder:text-[#4a4a6e] focus:outline-none transition-colors ${
                searchFocused ? 'border-[#d4a853]' : 'border-[#2a2a3e]'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-[#6a6a8e] block mb-1">单位</label>
            <input
              value={unitInput}
              onChange={e => handleUnitChange(e.target.value)}
              placeholder="如 A区、B区"
              className="w-full px-2 py-1.5 text-xs bg-[#0d0d1a] border border-[#2a2a3e] rounded text-[#c8c8d8] placeholder:text-[#4a4a6e] focus:outline-none focus:border-[#d4a853] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(['normal', 'anomaly', 'revoked'] as RecordStatus[]).map(s => {
              const cfg = statusConfig[s]
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-2 py-1.5 text-[10px] rounded border transition-colors flex items-center gap-1 ${
                    statusToggles.includes(s) ? 'border-[#d4a853] text-[#d4a853] bg-[#d4a85310]' : 'border-[#2a2a3e] text-[#6a6a8e]'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              )
            })}
          </div>
          <button onClick={handleApply} className="px-3 py-1.5 text-xs bg-[#d4a853] text-[#1a1a2e] rounded font-medium hover:bg-[#c49a48] transition-colors">
            筛选
          </button>
          <button onClick={handleReset} className="px-2 py-1.5 text-xs text-[#6a6a8e] hover:text-[#c8c8d8] transition-colors">
            重置
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredRecords.map(r => {
            const cfg = statusConfig[r.status]
            const anomalyCount = r.lights.filter(l => l.isAnomaly).length
            return (
              <div
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className={`flex gap-3 p-3 rounded border cursor-pointer transition-colors hover:border-[#d4a85340] ${
                  r.status === 'revoked' ? 'border-[#e74c3c40] bg-[#e74c3c05]' : 'border-[#2a2a3e] bg-[#12121f]'
                }`}
              >
                <div className="w-24 h-16 rounded overflow-hidden bg-[#1a1a2e] shrink-0">
                  <img src={r.photoUrl} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#c8c8d8]">{r.displayCaseId}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${cfg.color} ${cfg.bg}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-[#6a6a8e]">
                    <span>{r.floor} {r.unit}</span>
                    <span>{r.timestamp.slice(0, 10)}</span>
                    <span>{r.lights.length} 盏灯</span>
                    {anomalyCount > 0 && <span className="text-[#d4a853]">{anomalyCount} 项异常</span>}
                  </div>
                  {r.status === 'revoked' && r.revokeReason && (
                    <p className="mt-1 text-[10px] text-[#e74c3c] leading-relaxed">撤回原因: {r.revokeReason}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-[10px] text-[#4a4a6e]">→</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <MixedConfirmDialog />
    </div>
  )
}
