import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ZAxis,
} from 'recharts'
import type { Sample, ClusterInfo } from '@/types'
import { mockClusterInfo } from '@/data/mockData'

interface ClusterChartProps {
  samples: Sample[]
  height?: number
  highlightIds?: string[]
  mini?: boolean
  showLegend?: boolean
  onPointClick?: (sampleId: string) => void
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-slate-800">{data.sampleName}</p>
      <p className="text-slate-500">聚类: {data.clusterId}</p>
      {data.timepoint === '' ? (
        <p className="text-red-500">⚠ 时间点缺失</p>
      ) : (
        <p className="text-slate-500">时间点: {data.timepoint}</p>
      )}
      {data.samplingLocation === '' ? (
        <p className="text-red-500">⚠ 采样地点缺失</p>
      ) : (
        <p className="text-slate-500">地点: {data.samplingLocation}</p>
      )}
    </div>
  )
}

export default function ClusterChart({
  samples,
  height = 400,
  highlightIds = [],
  mini = false,
  showLegend = true,
  onPointClick,
}: ClusterChartProps) {
  const batchId = samples[0]?.batchId
  const clusters = mockClusterInfo.filter(c => c.batchId === batchId)
  const clusterColorMap = new Map(clusters.map(c => [c.id, c.color]))

  const data = samples.map(s => ({
    x: s.umapX,
    y: s.umapY,
    sampleName: s.sampleName,
    timepoint: s.timepoint,
    samplingLocation: s.samplingLocation,
    clusterId: s.clusterId,
    isAnomaly: s.isAnomaly,
    id: s.id,
    isHighlighted: highlightIds.includes(s.id),
  }))

  const uniqueClusters = [...new Set(samples.map(s => s.clusterId))]

  const handleClick = (params: any) => {
    if (onPointClick && params?.payload?.id) {
      onPointClick(params.payload.id)
    }
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={mini ? 180 : height}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={mini ? false : { fontSize: 11, fill: '#64748b' }}
            axisLine={mini ? false : true}
            tickLine={mini ? false : true}
            label={mini ? undefined : { value: 'UMAP-1', position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: '#94a3b8' } }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={mini ? false : { fontSize: 11, fill: '#64748b' }}
            axisLine={mini ? false : true}
            tickLine={mini ? false : true}
            label={mini ? undefined : { value: 'UMAP-2', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }}
          />
          <ZAxis range={mini ? [28, 28] : [60, 60]} />
          {!mini && <Tooltip content={<CustomTooltip />} />}
          {uniqueClusters.map(clusterId => {
            const clusterData = data.filter(d => d.clusterId === clusterId)
            const color = clusterColorMap.get(clusterId) || '#94a3b8'
            const clusterLabel = clusters.find(c => c.id === clusterId)?.label || clusterId
            return (
              <Scatter
                key={clusterId}
                name={clusterLabel}
                data={clusterData}
                fill={color}
                onClick={handleClick}
              >
                {clusterData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isHighlighted ? '#ef4444' : color}
                    stroke={entry.isAnomaly ? '#dc2626' : (entry.isHighlighted ? '#991b1b' : 'none')}
                    strokeWidth={entry.isAnomaly ? 2 : (entry.isHighlighted ? 2 : 0)}
                    opacity={entry.isAnomaly && !entry.isHighlighted ? 0.7 : 1}
                  />
                ))}
              </Scatter>
            )
          })}
        </ScatterChart>
      </ResponsiveContainer>
      {showLegend && !mini && (
        <div className="flex gap-4 justify-center mt-2 flex-wrap">
          {uniqueClusters.map(c => {
            const label = clusters.find(ci => ci.id === c)?.label || c
            const color = clusterColorMap.get(c) || '#94a3b8'
            return (
              <div key={c} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
