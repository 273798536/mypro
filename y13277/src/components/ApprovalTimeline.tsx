import { Clock, User, FileText } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface ApprovalTimelineProps {
  complaintId: string
}

const stageColors: Record<string, { bg: string; border: string; text: string }> = {
  '受理登记': { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400' },
  '现场核查': { bg: 'bg-duplicate-yellow', border: 'border-duplicate-yellow', text: 'text-duplicate-yellow' },
  '部门审批': { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400' },
  '处理完成': { bg: 'bg-success-green', border: 'border-success-green', text: 'text-success-green' },
}

const defaultColor = { bg: 'bg-fire-white/40', border: 'border-fire-white/40', text: 'text-fire-white/60' }

export default function ApprovalTimeline({ complaintId }: ApprovalTimelineProps) {
  const approvalRecords = useAppStore((state) =>
    state.getApprovalRecordsByComplaintId(complaintId)
  )

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isCurrentStage = (index: number) => index === approvalRecords.length - 1

  return (
    <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20 h-full">
      <h3 className="text-fire-white text-lg font-semibold mb-6 flex items-center gap-2">
        <span className="w-1 h-5 bg-fire-orange rounded-full" />
        审批台账
      </h3>

      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-fire-orange/20" />

        <div className="space-y-6">
          {approvalRecords.map((record, index) => {
            const colors = stageColors[record.stage] || defaultColor
            const current = isCurrentStage(index)

            return (
              <div key={record.id} className="relative flex gap-4">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    current
                      ? `bg-fire-orange border-fire-orange animate-pulse-orange`
                      : `${colors.bg}/20 ${colors.border}`
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      current ? 'text-fire-white' : colors.text
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>

                <div
                  className={`flex-1 rounded-xl p-4 border transition-all duration-300 ${
                    current
                      ? 'bg-fire-orange/10 border-fire-orange/40'
                      : 'bg-fire-deep/50 border-fire-orange/10 hover:border-fire-orange/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`font-semibold ${
                        current ? 'text-fire-orange' : colors.text
                      }`}
                    >
                      {record.stage}
                    </span>
                    <div className="flex items-center gap-1 text-fire-white/50 text-sm">
                      <Clock size={14} />
                      <span>{formatTime(record.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-2">
                    <div className="flex items-center gap-1 text-fire-white/60">
                      <User size={14} />
                      <span>{record.operator}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-fire-white/70">
                    <FileText size={14} className="mt-0.5 shrink-0" />
                    <p className="text-sm">{record.note}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
