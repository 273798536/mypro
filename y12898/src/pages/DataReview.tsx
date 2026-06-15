import { useOceanStore } from "@/store/useOceanStore"
import QualityPanel from "@/components/QualityPanel"
import CorrectionEditor from "@/components/CorrectionEditor"
import CorrectionTimeline from "@/components/CorrectionTimeline"
import DedupPanel from "@/components/DedupPanel"
import ReviewNotes from "@/components/ReviewNotes"
import { ClipboardCheck } from "lucide-react"

export default function DataReview() {
  const { sampleLoaded, qualityIssues, corrections } = useOceanStore()

  const pendingIssues = qualityIssues.filter((i) => i.status !== "resolved").length
  const pendingCorrections = corrections.filter((c) => c.reviewStatus === "pending").length

  if (!sampleLoaded) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          请先在潮汐计算页面加载示例数据
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ocean-ink">数据复核</h2>
          <p className="text-sm text-gray-400 mt-1">
            检测数据质量 · 修正留痕 · 去重确认
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {pendingIssues > 0 && (
            <span className="text-ocean-coral flex items-center gap-1.5">
              <ClipboardCheck size={14} />
              {pendingIssues} 项待处理
            </span>
          )}
          {pendingCorrections > 0 && (
            <span className="text-amber-500 text-xs">
              {pendingCorrections} 条修正待审核
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <QualityPanel />
          <DedupPanel />
        </div>
        <div className="space-y-6">
          <CorrectionEditor />
          <CorrectionTimeline />
          <ReviewNotes />
        </div>
      </div>
    </div>
  )
}
