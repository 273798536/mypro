import { useState } from 'react'
import { useReviewStore } from '@/store'
import { ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-500/20 text-emerald-400' },
  warning: { label: '警告', className: 'bg-yellow-500/20 text-yellow-400' },
  error: { label: '异常', className: 'bg-orange-500/20 text-orange-400' },
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-700">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-gray-800/50"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

export default function SideDetail() {
  const {
    selectedPointId, points, coordSystems, stations,
    getPointAdjacencies, getPointMergeIssues, getPointVersions,
  } = useReviewStore()

  if (!selectedPointId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-4">
        请点击3D视图中的点位查看详情
      </div>
    )
  }

  const point = points.find((p) => p.id === selectedPointId)
  if (!point) return null

  const coordSystem = coordSystems.find((c) => c.id === point.coordSystemId)
  const station = stations.find((s) => s.id === point.stationId)
  const adjacencies = getPointAdjacencies(selectedPointId)
  const mergeIssues = getPointMergeIssues(selectedPointId)
  const versions = getPointVersions(selectedPointId)
  const statusInfo = STATUS_MAP[point.status]

  return (
    <div className="h-full overflow-y-auto text-sm">
      <CollapsibleSection title="坐标信息">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">点位名称</span>
            <span className="text-gray-200 font-medium">{point.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">所属站点</span>
            <span className="text-gray-200">{station?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">坐标系</span>
            <span className="text-gray-200">{coordSystem?.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-gray-500 text-xs">X</span>
              <div className="text-gray-200">{point.x.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Y</span>
              <div className="text-gray-200">{point.y.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Z</span>
              <div className="text-gray-200">{point.z.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">状态</span>
            <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
          {versions.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              历史版本: {versions.length} 条变更记录
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="相邻关系">
        {adjacencies.length === 0 ? (
          <div className="text-gray-500 text-xs">无相邻关系</div>
        ) : (
          <div className="space-y-2">
            {adjacencies.map((adj) => {
              const otherId = adj.pointAId === selectedPointId ? adj.pointBId : adj.pointAId
              const otherPoint = points.find((p) => p.id === otherId)
              return (
                <div key={adj.id} className="bg-gray-800/50 rounded p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">{otherPoint?.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      adj.mergeOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {adj.mergeOk ? '合并正常' : '合并异常'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>偏差: {adj.deviation}m</span>
                    <span>距离: {adj.distance}m</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="处理建议">
        {mergeIssues.length === 0 ? (
          <div className="text-gray-500 text-xs">无处理建议</div>
        ) : (
          <div className="space-y-2">
            {mergeIssues.map((issue) => (
              <div key={issue.id} className="bg-gray-800/50 rounded p-2 space-y-1">
                <div className="text-gray-300 text-xs">{issue.description}</div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 text-xs text-blue-300">
                  {issue.actionStep}
                </div>
                <div className="text-xs text-gray-500">
                  状态: {issue.status === 'open' ? '待处理' : issue.status === 'processing' ? '处理中' : '已解决'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}
