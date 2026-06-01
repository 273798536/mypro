import { useStore } from "@/store/useStore"
import { Tag, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { CalibrationReview } from "@/types"
import { calibrationReviews } from "@/data/mock"

export default function BackfillBadge({ review }: { review: CalibrationReview }) {
  const getDevice = useStore((s) => s.getDevice)
  const navigate = useNavigate()
  const device = getDevice(review.deviceRecordId)

  if (!device?.isBackfilled) return null

  const affectedReviews = calibrationReviews.filter(
    (r) => device.backfillAffectedDetailIds.includes(r.id)
  )

  return (
    <div className="rounded-lg border-2 border-dashed border-amber-400/40 bg-amber-400/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">补录设备编号影响标注</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-500">设备编号:</span>
          <span className="font-mono text-amber-300">{device.deviceNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-500">补录时间:</span>
          <span className="font-mono text-slate-200">
            {device.backfilledAt ? new Date(device.backfilledAt).toLocaleString("zh-CN") : "-"}
          </span>
        </div>
        <div className="mt-2">
          <span className="text-slate-500 text-xs block mb-1.5">受影响的复盘明细:</span>
          <div className="flex flex-wrap gap-2">
            {affectedReviews.map((ar) => (
              <button
                key={ar.id}
                onClick={() => navigate(`/detail/${ar.id}`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs hover:bg-amber-400/20 transition-colors"
              >
                <ExternalLink size={10} />
                {ar.id}
                <span className="text-amber-400/60">({ar.batchId})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
