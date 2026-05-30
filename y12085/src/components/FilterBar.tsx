import { usePlaybackStore } from '@/store/usePlaybackStore'
import { Filter, X } from 'lucide-react'

export default function FilterBar() {
  const filterConditions = usePlaybackStore((s) => s.filterConditions)
  const setFilterConditions = usePlaybackStore((s) => s.setFilterConditions)
  const practiceRecords = usePlaybackStore((s) => s.practiceRecords)

  const students = [...new Set(practiceRecords.map((p) => p.studentName))]
  const pieces = [...new Set(practiceRecords.map((p) => p.pieceTitle))]

  const hasFilter = filterConditions.studentName || filterConditions.pieceTitle || filterConditions.errorTypes.length < 2

  const clearFilters = () => {
    setFilterConditions({
      studentName: '',
      pieceTitle: '',
      errorTypes: ['KEYPOINT_LOSS', 'MEASURE_MISALIGN'],
    })
  }

  const toggleErrorType = (type: 'KEYPOINT_LOSS' | 'MEASURE_MISALIGN') => {
    const current = filterConditions.errorTypes
    if (current.includes(type)) {
      if (current.length > 1) {
        setFilterConditions({ errorTypes: current.filter((t) => t !== type) })
      }
    } else {
      setFilterConditions({ errorTypes: [...current, type] })
    }
  }

  return (
    <div className="w-full bg-[#12122a] rounded-lg border border-[#2a2a4a] px-3 py-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#8888aa]" />
          <span className="text-[10px] text-[#8888aa] font-mono uppercase tracking-widest">筛选</span>
        </div>

        <select
          value={filterConditions.studentName}
          onChange={(e) => setFilterConditions({ studentName: e.target.value })}
          className="bg-[#1e1e3a] border border-[#2a2a4a] rounded px-2 py-1 text-[11px] text-[#ccccdd] font-mono outline-none focus:border-[#2ed573]/40 transition-colors"
        >
          <option value="">全部学生</option>
          {students.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterConditions.pieceTitle}
          onChange={(e) => setFilterConditions({ pieceTitle: e.target.value })}
          className="bg-[#1e1e3a] border border-[#2a2a4a] rounded px-2 py-1 text-[11px] text-[#ccccdd] font-mono outline-none focus:border-[#2ed573]/40 transition-colors"
        >
          <option value="">全部曲目</option>
          {pieces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleErrorType('KEYPOINT_LOSS')}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              filterConditions.errorTypes.includes('KEYPOINT_LOSS')
                ? 'bg-[#ff4757]/15 text-[#ff4757] border-[#ff4757]/30'
                : 'bg-[#1e1e3a] text-[#6666aa] border-[#2a2a4a]'
            }`}
          >
            关键点丢失
          </button>
          <button
            onClick={() => toggleErrorType('MEASURE_MISALIGN')}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              filterConditions.errorTypes.includes('MEASURE_MISALIGN')
                ? 'bg-[#ff8c00]/15 text-[#ff8c00] border-[#ff8c00]/30'
                : 'bg-[#1e1e3a] text-[#6666aa] border-[#2a2a4a]'
            }`}
          >
            小节错位
          </button>
        </div>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] text-[#8888aa] hover:text-[#ccccdd] transition-colors ml-auto"
          >
            <X className="w-3 h-3" />
            清除筛选
          </button>
        )}
      </div>
    </div>
  )
}
