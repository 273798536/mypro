import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ZAxis,
  CartesianGrid,
} from 'recharts'
import { CheckCircle2, XCircle, AlertTriangle, FileText, BarChart3, PenLine } from 'lucide-react'
import type { Batch, ReviewRecord, Sample, ClusterInfo, ConclusionType } from '@/types'
import { cn } from '@/lib/utils'
import { mockClusterInfo } from '@/data/mockData'

const CONCLUSION_BADGE: Record<ConclusionType, { label: string; cls: string; icon: React.ReactNode }> = {
  pass: { label: '通过', cls: 'bg-teal-50 text-teal-700 border-teal-200', icon: <CheckCircle2 className="h-4 w-4" /> },
  fail: { label: '不通过', cls: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" /> },
  anomaly_detected: { label: '检出异常', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-4 w-4" /> },
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-slate-800">{data.sampleName || data.id}</p>
      <p className="text-slate-500">聚类: {data.clusterId}</p>
      {data.timepoint === '' && <p className="text-red-500">⚠ 时间点缺失</p>}
      {data.samplingLocation === '' && <p className="text-red-500">⚠ 采样地点缺失</p>}
    </div>
  )
}

interface ConclusionPanelProps {
  batch: Batch
  reviewRecord: ReviewRecord | null
  samples: Sample[]
  highlightedSampleId: string | null
  selectedClusterId: string | null
}

export default function ConclusionPanel({
  batch,
  reviewRecord,
  samples,
  highlightedSampleId,
  selectedClusterId,
}: ConclusionPanelProps) {
  const clusters = mockClusterInfo.filter(c => c.batchId === batch.id)
  const conclusionType = reviewRecord?.conclusionType || null
  const anomalySamples = samples.filter(s => s.isAnomaly)
  const highlightedSample = samples.find(s => s.id === highlightedSampleId)
  const selectedCluster = clusters.find(c => c.id === selectedClusterId)

  const relevantSamples = selectedCluster
    ? samples.filter(s => s.clusterId === selectedClusterId)
    : highlightedSample
      ? [highlightedSample]
      : anomalySamples.length > 0
        ? anomalySamples
        : samples.slice(0, 5)

  const miniData = samples.map(s => ({
    umapX: s.umapX,
    umapY: s.umapY,
    clusterId: s.clusterId,
    sampleName: s.sampleName,
    id: s.id,
    timepoint: s.timepoint,
    samplingLocation: s.samplingLocation,
  }))

  const badgeConfig = conclusionType ? CONCLUSION_BADGE[conclusionType] : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">复核结论</h3>
      </div>
      <div className="grid grid-cols-3 gap-0 divide-x divide-slate-200">
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <PenLine className="h-3.5 w-3.5" />
            聚类图标注
          </div>
          <div className="rounded-lg bg-slate-800 p-2">
            <ResponsiveContainer width="100%" height={160}>
              <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis type="number" dataKey="umapX" tick={false} axisLine={false} />
                <YAxis type="number" dataKey="umapY" tick={false} axisLine={false} />
                {clusters.map(cluster => {
                  const clusterSamples = miniData.filter(s => s.clusterId === cluster.id)
                  const isRelevant = cluster.id === selectedClusterId
                  return (
                    <Scatter
                      key={cluster.id}
                      name={cluster.label}
                      data={clusterSamples}
                      fill={cluster.color}
                      opacity={isRelevant || !selectedClusterId ? 1 : 0.2}
                    />
                  )
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {selectedCluster && (
            <p className="mt-2 text-xs text-slate-500">
              当前选中: <span className="font-medium text-slate-700">{selectedCluster.label}</span>（{selectedCluster.sampleCount} 个样本）
            </p>
          )}
          {highlightedSample && !selectedCluster && (
            <p className="mt-2 text-xs text-slate-500">
              当前选中: <span className="font-medium text-slate-700">{highlightedSample.sampleName}</span>
            </p>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <BarChart3 className="h-3.5 w-3.5" />
            数据表关联
          </div>
          <div className="space-y-1.5">
            {relevantSamples.slice(0, 6).map(sample => (
              <div
                key={sample.id}
                className={cn(
                  'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors',
                  sample.id === highlightedSampleId
                    ? 'bg-teal-50 ring-1 ring-teal-300'
                    : 'bg-slate-50',
                  sample.isAnomaly && 'border-l-2 border-l-amber-400'
                )}
              >
                <span className="font-mono text-slate-700">{sample.sampleName}</span>
                <span className="text-slate-500">{sample.clusterId}</span>
                <span className="text-slate-500">{sample.samplingLocation || '—'}</span>
                <span className="text-slate-500">{sample.timepoint || '—'}</span>
                {sample.isAnomaly && (
                  <span className="text-xs font-medium text-red-600">异常</span>
                )}
              </div>
            ))}
            {relevantSamples.length > 6 && (
              <p className="text-xs text-slate-400">...共 {relevantSamples.length} 条关联数据</p>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            文字结论
          </div>
          {reviewRecord ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500">批次</span>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{batch.name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">复核结论</span>
                <div className="mt-0.5">
                  {badgeConfig && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', badgeConfig.cls)}>
                      {badgeConfig.icon}
                      {badgeConfig.label}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">结论详情</span>
                <p className="mt-0.5 text-sm text-slate-700">{reviewRecord.conclusion}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">样本统计</span>
                <p className="mt-0.5 text-sm text-slate-700">
                  总计 <span className="font-medium">{samples.length}</span> 个样本，
                  异常 <span className="font-medium text-red-600">{anomalySamples.length}</span> 个
                </p>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="text-xs text-slate-400">
                  复核人: {reviewRecord.reviewer} · {new Date(reviewRecord.reviewedAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <FileText className="mb-2 h-8 w-8" />
              <p className="text-sm">暂无复核结论</p>
              <p className="text-xs">该批次尚未进行复核</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
