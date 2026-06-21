import { useEffect } from 'react'
import { useDashboardStore } from '@/store/useDashboardStore'
import DiffPanel from '@/components/DiffPanel'
import { ArrowRight, Plus, Minus, PenLine } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  sample: '样本',
  threshold: '阈值',
  manual: '人工修正',
  metric: '指标变化',
}

export default function Compare() {
  const versions = useDashboardStore(s => s.versions)
  const compareResult = useDashboardStore(s => s.compareResult)
  const selectedFromVersion = useDashboardStore(s => s.selectedFromVersion)
  const selectedToVersion = useDashboardStore(s => s.selectedToVersion)
  const loading = useDashboardStore(s => s.loading)
  const fetchVersions = useDashboardStore(s => s.fetchVersions)
  const fetchCompare = useDashboardStore(s => s.fetchCompare)
  const setVersions = useDashboardStore(s => s.setVersions)

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  useEffect(() => {
    if (versions.length >= 2) {
      fetchCompare(selectedFromVersion, selectedToVersion)
    }
  }, [selectedFromVersion, selectedToVersion, versions.length, fetchCompare])

  const handleCompare = () => {
    fetchCompare(selectedFromVersion, selectedToVersion)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[#E0E7EF] text-xl font-bold mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
          版本对比
        </h2>
        <p className="text-[#5A7080] text-sm">比对样本、阈值、人工修正与指标变化差异</p>
      </div>

      <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={selectedFromVersion}
            onChange={e => setVersions(e.target.value, selectedToVersion)}
            className="bg-[#132D42] text-[#B0C4D8] text-sm rounded-lg px-4 py-2.5 border border-[#1B3A4B] focus:border-[#7DD3FC]/50 focus:outline-none transition-colors min-w-[200px]"
          >
            {versions.map(v => (
              <option key={v.version} value={v.version}>{v.label}</option>
            ))}
          </select>

          <ArrowRight size={20} className="text-[#5A7080]" />

          <select
            value={selectedToVersion}
            onChange={e => setVersions(selectedFromVersion, e.target.value)}
            className="bg-[#132D42] text-[#B0C4D8] text-sm rounded-lg px-4 py-2.5 border border-[#1B3A4B] focus:border-[#7DD3FC]/50 focus:outline-none transition-colors min-w-[200px]"
          >
            {versions.map(v => (
              <option key={v.version} value={v.version}>{v.label}</option>
            ))}
          </select>

          <button
            onClick={handleCompare}
            className="bg-[#1B3A4B] hover:bg-[#234E64] text-[#7DD3FC] text-sm px-5 py-2.5 rounded-lg border border-[#1B3A4B] hover:border-[#7DD3FC]/30 transition-all shadow-md"
          >
            对比
          </button>
        </div>

        {compareResult && (
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="text-[#5A7080] text-xs">差异统计：</span>
            <span className="flex items-center gap-1.5 text-xs text-[#34D399] bg-[#0D2818] border border-[#10B981]/30 px-2.5 py-1 rounded-full">
              <Plus size={12} /> 新增 {compareResult.summary.added}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#F87171] bg-[#1C0A0A] border border-[#EF4444]/30 px-2.5 py-1 rounded-full">
              <Minus size={12} /> 删除 {compareResult.summary.removed}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#FBBF24] bg-[#1A1708] border border-[#F59E0B]/30 px-2.5 py-1 rounded-full">
              <PenLine size={12} /> 修改 {compareResult.summary.modified}
            </span>
            <span className="text-[#7B8FA3] text-xs">
              共 {compareResult.summary.total} 项
            </span>
          </div>
        )}
      </div>

      {loading.compare ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#7DD3FC] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : compareResult ? (
        <div className="grid grid-cols-2 gap-6">
          {(['sample', 'threshold', 'manual', 'metric'] as const).map(cat => (
            <DiffPanel
              key={cat}
              title={categoryLabels[cat]}
              items={compareResult.diff[cat]}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
