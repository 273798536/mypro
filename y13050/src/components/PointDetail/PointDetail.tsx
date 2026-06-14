import { X, FileText, MapPin, AlertTriangle, Check, AlertCircle, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ReviewResult } from '@/types'
import { useState } from 'react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: 'text-green-pass bg-green-pass/15 border-green-pass/40' },
  overlap: { label: '重叠', color: 'text-orange-alert bg-orange-alert/15 border-orange-alert/40' },
  missing: { label: '缺失', color: 'text-gray-wait bg-gray-wait/15 border-gray-wait/40' },
  outlier: { label: '越界', color: 'text-pink-400 bg-pink-400/15 border-pink-400/40' },
  dirty: { label: '脏数据', color: 'text-yellow-400 bg-yellow-400/15 border-yellow-400/40' },
}

export default function PointDetail() {
  const showDetail = useAppStore((s) => s.showDetail)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const setShowDetail = useAppStore((s) => s.setShowDetail)
  const points = useAppStore((s) => s.points)
  const layers = useAppStore((s) => s.layers)
  const anomalies = useAppStore((s) => s.anomalies)
  const reviews = useAppStore((s) => s.reviews)
  const setReview = useAppStore((s) => s.setReview)

  const [remark, setRemark] = useState('')

  if (!showDetail || !selectedPointId) return null

  const point = points.find((p) => p.id === selectedPointId)
  if (!point) return null

  const layer = layers.find((l) => l.id === point.layerId)
  const pointAnomalies = anomalies.filter((a) => a.pointId === point.id)
  const review = reviews[point.id]
  const statusInfo = STATUS_LABELS[point.status]

  const applyReview = (result: ReviewResult) => {
    setReview(point.id, result, remark)
    setRemark('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-glass w-[880px] max-w-[92vw] max-h-[86vh] flex flex-col scanline-overlay relative rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <h2 className="font-mono text-base text-cyan-industrial tracking-wide">
                {point.id}
              </h2>
              <div className="text-[11px] text-gray-wait">{point.type}</div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 text-[11px] rounded border font-mono ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
          {review && (
            <span
              className={`px-2 py-0.5 text-[11px] rounded border font-mono ${
                review.result === 'pass'
                  ? 'text-green-pass bg-green-pass/15 border-green-pass/40'
                  : review.result === 'supply'
                  ? 'text-orange-alert bg-orange-alert/15 border-orange-alert/40'
                  : 'text-gray-wait bg-gray-wait/15 border-gray-wait/40'
              }`}
            >
              {review.result === 'pass' ? '已放行' : review.result === 'supply' ? '需补料' : '待确认'}
            </span>
          )}
          <button
            onClick={() => setShowDetail(false)}
            className="ml-auto p-1.5 rounded hover:bg-navy-mid/60 text-gray-wait hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin grid grid-cols-2 gap-0 min-h-0">
          <div className="p-5 border-r border-gray-border/60 space-y-4">
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-mono text-gray-wait mb-2 tracking-wider">
                <MapPin size={12} /> 空间坐标
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-navy-deep/60 border border-gray-border/60 rounded px-3 py-2">
                  <div className="text-[10px] text-gray-wait font-mono">X</div>
                  <div className="font-mono text-sm text-cyan-industrial">
                    {point.x.toFixed(4)}
                  </div>
                </div>
                <div className="bg-navy-deep/60 border border-gray-border/60 rounded px-3 py-2">
                  <div className="text-[10px] text-gray-wait font-mono">Y (高度)</div>
                  <div className="font-mono text-sm text-cyan-industrial">
                    {point.y.toFixed(4)}
                  </div>
                </div>
                <div className="bg-navy-deep/60 border border-gray-border/60 rounded px-3 py-2">
                  <div className="text-[10px] text-gray-wait font-mono">Z</div>
                  <div className="font-mono text-sm text-cyan-industrial">
                    {point.z.toFixed(4)}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-mono text-gray-wait mb-2 tracking-wider">
                <FileText size={12} /> 图层信息
              </h3>
              <div className="bg-navy-deep/60 border border-gray-border/60 rounded p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-wait">所属图层</span>
                  <span className="text-gray-200">{layer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-wait">来源文件</span>
                  <span className="text-cyan-industrial font-mono text-[11px]">
                    {layer?.sourceFile}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-wait">CAD 原始行号</span>
                  <span className="font-mono text-cyan-industrial">行 {point.cadLineNumber}</span>
                </div>
              </div>
            </section>

            {pointAnomalies.length > 0 && (
              <section>
                <h3 className="flex items-center gap-1.5 text-[11px] font-mono text-orange-alert mb-2 tracking-wider">
                  <AlertTriangle size={12} /> 异常说明 ({pointAnomalies.length})
                </h3>
                <div className="space-y-2">
                  {pointAnomalies.map((a) => (
                    <div
                      key={a.id}
                      className="bg-orange-alert/8 border border-orange-alert/30 rounded p-3 text-xs"
                    >
                      <div className="text-orange-alert font-medium mb-1.5">
                        [{STATUS_LABELS[a.type]?.label || a.type}] {a.description}
                      </div>
                      <div className="text-[10px] text-gray-wait font-mono bg-navy-deep/70 px-2 py-1.5 rounded border border-gray-border/40">
                        {a.cadReference}
                      </div>
                      {a.relatedPointIds.length > 0 && (
                        <div className="text-[11px] text-gray-wait mt-1.5">
                          关联对象: {a.relatedPointIds.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="p-5 space-y-4">
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-mono text-gray-wait mb-2 tracking-wider">
                <FileText size={12} /> CAD 原始数据行
              </h3>
              <div className="bg-navy-deep/80 border border-gray-border rounded p-3 font-mono text-[11px] overflow-x-auto">
                <div className="text-gray-wait mb-2 text-[10px]">
                  // 保留原始脏数据不做修正
                </div>
                <table className="w-full">
                  <tbody>
                    {Object.entries(point.rawData).map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-border/30 last:border-0">
                        <td className="py-1 pr-3 text-cyan-industrial whitespace-nowrap">{k}</td>
                        <td className="py-1 text-gray-300">
                          {v === null || v === undefined ? (
                            <span className="text-yellow-400">null ⚠</span>
                          ) : v === '' ? (
                            <span className="text-yellow-400">(空字符串) ⚠</span>
                          ) : (
                            String(v)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-mono text-gray-wait mb-2 tracking-wider">
                复核结论
              </h3>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="复核备注（可选）..."
                className="w-full h-20 px-3 py-2 text-xs bg-navy-deep/70 border border-gray-border rounded focus:border-cyan-industrial outline-none text-gray-200 resize-none font-mono"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => applyReview('pass')}
                  className="btn-industrial btn-pass flex-1 flex items-center justify-center gap-1.5 !py-2"
                >
                  <Check size={14} />
                  放行通过
                </button>
                <button
                  onClick={() => applyReview('supply')}
                  className="btn-industrial btn-supply flex-1 flex items-center justify-center gap-1.5 !py-2"
                >
                  <AlertCircle size={14} />
                  需补材料
                </button>
                <button
                  onClick={() => applyReview('pending')}
                  className="btn-industrial flex-1 flex items-center justify-center gap-1.5 !py-2 text-gray-wait border-gray-wait/50"
                >
                  <Clock size={14} />
                  待确认
                </button>
              </div>
            </section>

            {review && (
              <section className="pt-2 border-t border-gray-border/60">
                <div className="text-[11px] text-gray-wait mb-1">最近复核时间</div>
                <div className="font-mono text-xs text-gray-300">
                  {new Date(review.updatedAt).toLocaleString('zh-CN')}
                </div>
                {review.remark && (
                  <div className="mt-2 text-xs text-gray-300 bg-navy-deep/60 p-2 rounded border border-gray-border/40">
                    备注: {review.remark}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
