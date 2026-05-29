import { FileText, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { CATEGORY_LABELS } from '@/types'
import type { VoxelData, DetectedIssue } from '@/types'

function getStatusInfo(voxelId: string, issues: DetectedIssue[]): {
  label: string
  color: string
  bg: string
} {
  const related = issues.filter((i) => i.affectedVoxelIds.includes(voxelId))
  if (related.length === 0) return { label: '正常', color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
  const hasUnconfirmed = related.some((i) => !i.confirmed)
  if (hasUnconfirmed) return { label: '待确认', color: 'text-amber-400', bg: 'bg-amber-500/15' }
  return { label: '异常', color: 'text-red-400', bg: 'bg-red-500/15' }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#2D333B] last:border-0">
      <span className="text-xs text-[#8B949E]">{label}</span>
      <span className="text-xs font-mono text-[#E6EDF3]">{value}</span>
    </div>
  )
}

function VoxelDetail({ voxel, issues }: { voxel: VoxelData; issues: DetectedIssue[] }) {
  const status = getStatusInfo(voxel.id, issues)
  return (
    <div className="space-y-1">
      <DetailRow label="ID" value={voxel.id} />
      <DetailRow label="坐标 X" value={voxel.position[0].toFixed(1)} />
      <DetailRow label="坐标 Y" value={voxel.position[1].toFixed(1)} />
      <DetailRow label="坐标 Z" value={voxel.position[2].toFixed(1)} />
      <DetailRow label="风速" value={`${voxel.windSpeed.toFixed(2)} m/s`} />
      <DetailRow
        label="风向"
        value={`(${voxel.windDirection.map((d) => d.toFixed(2)).join(', ')})`}
      />
      <DetailRow label="类型" value={CATEGORY_LABELS[voxel.category]} />
      {voxel.zoneId && <DetailRow label="区域ID" value={voxel.zoneId} />}
      {voxel.buildingId && <DetailRow label="建筑ID" value={voxel.buildingId} />}
      <div className="flex justify-between items-center py-1.5">
        <span className="text-xs text-[#8B949E]">检测状态</span>
        <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>
    </div>
  )
}

export default function DetailPanel() {
  const { detailPanelOpen, toggleDetailPanel, getSelectedVoxel, selectVoxel, issues } = useStore()
  const voxel = getSelectedVoxel()

  return (
    <div
      className="flex h-full bg-[#0F1419] border-l border-[#2D333B] transition-all duration-300 ease-in-out"
      style={{ width: detailPanelOpen ? 300 : 48 }}
    >
      <div className="flex flex-col w-full overflow-hidden">
        <div className="flex items-center justify-between px-3 h-12 border-b border-[#2D333B] shrink-0">
          {detailPanelOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={16} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-[#E6EDF3] truncate">详情</span>
              {voxel && (
                <button
                  onClick={() => selectVoxel(null)}
                  className="p-0.5 rounded hover:bg-[#1A1F26] text-[#8B949E] hover:text-[#E6EDF3] transition-colors ml-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <button
            onClick={toggleDetailPanel}
            className="p-1.5 rounded hover:bg-[#1A1F26] text-[#8B949E] hover:text-[#E6EDF3] transition-colors ml-auto"
          >
            {detailPanelOpen ? <X size={16} /> : <FileText size={16} className="text-blue-500" />}
          </button>
        </div>

        {detailPanelOpen && (
          <div className="flex-1 overflow-y-auto p-4">
            {voxel ? (
              <VoxelDetail voxel={voxel} issues={issues} />
            ) : (
              <div className="flex items-center justify-center h-32">
                <span className="text-sm text-[#8B949E]">点击体素查看详情</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
