import { useState } from "react"
import { ChevronDown, ChevronUp, Clock } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import StatusBadge from "./StatusBadge"

interface Contract {
  id: string
  platform_name: string
  contract_amount: number
  paid_amount: number
  platform_status: string
  import_order: number
}

interface StatusLog {
  id: string
  from_status: string
  to_status: string
  changed_at: string
}

interface PlatformStatusTrackerProps {
  contracts: Contract[]
  statusLogs: StatusLog[]
  caseId: string
  onStatusChange: (status: string) => Promise<void>
}

const statusOptions = ["未结清", "已结清", "退款申请中"]

export default function PlatformStatusTracker({
  contracts,
  statusLogs,
  caseId,
  onStatusChange,
}: PlatformStatusTrackerProps) {
  const [logsOpen, setLogsOpen] = useState(false)
  const [changing, setChanging] = useState<string | null>(null)

  const handleChange = async (status: string) => {
    setChanging(status)
    try {
      await onStatusChange(status)
    } finally {
      setChanging(null)
    }
  }

  return (
    <div className="rounded-lg border border-[#F5F5F0]/10 bg-[#1A1A2E] p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#F5F5F0]">
        <Clock className="h-5 w-5 text-[#0F9B8E]" />
        平台状态追踪
      </h2>

      <div className="space-y-3">
        {contracts.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-[#F5F5F0]/5 bg-[#F5F5F0]/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#F5F5F0]/40">#{c.import_order}</span>
              <span className="font-medium text-[#F5F5F0]">{c.platform_name}</span>
              <StatusBadge status={c.platform_status} />
            </div>
            <select
              value={c.platform_status}
              onChange={(e) => handleChange(e.target.value)}
              disabled={changing !== null}
              className="rounded border border-[#F5F5F0]/10 bg-[#1A1A2E] px-2 py-1 text-sm text-[#F5F5F0] outline-none focus:border-[#0F9B8E]"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {statusLogs.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setLogsOpen(!logsOpen)}
            className="flex items-center gap-1 text-sm text-[#0F9B8E] hover:text-[#0F9B8E]/80"
          >
            {logsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            状态变更记录 ({statusLogs.length})
          </button>
          {logsOpen && (
            <div className="mt-2 space-y-2">
              {statusLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-2 rounded bg-[#F5F5F0]/5 px-3 py-2 text-xs"
                >
                  <span className="text-[#F5F5F0]/40">{formatDateTime(log.changed_at)}</span>
                  <StatusBadge status={log.from_status} />
                  <span className="text-[#F5F5F0]/30">→</span>
                  <StatusBadge status={log.to_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
