import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Calculator, AlertTriangle } from "lucide-react"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"
import StatusBadge from "@/components/StatusBadge"
import AmountCard from "@/components/AmountCard"
import TreatmentDeduction from "@/components/TreatmentDeduction"
import PlatformStatusTracker from "@/components/PlatformStatusTracker"
import PendingItemsPanel from "@/components/PendingItemsPanel"
import ImportTimeline from "@/components/ImportTimeline"

interface CaseData {
  id: string
  customer_name: string
  total_amount: number
  treatment_consumed: number
  platform_refund: number
  store_refund: number
  status: string
  created_at: string
  contracts: any[]
  treatments: any[]
  coupons: any[]
  pendingItems: any[]
  statusLogs: any[]
  operationLogs: any[]
}

export default function RefundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cases/${id}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCalculate = async () => {
    if (!id) return
    setCalculating(true)
    try {
      const res = await fetch(`/api/cases/${id}/calculate`, { method: "POST" })
      const json = await res.json()
      if (json.intercepted) {
        setErrorModal(json.message || "未录入疗程记录，无法计算")
      } else if (json.success) {
        await fetchData()
      }
    } finally {
      setCalculating(false)
    }
  }

  const handlePlatformStatusChange = async (status: string) => {
    if (!id) return
    await fetch(`/api/cases/${id}/platform-status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformStatus: status }),
    })
    await fetchData()
  }

  const handlePendingConfirm = async (itemId: string) => {
    await fetch(`/api/pending/${itemId}/confirm`, { method: "PUT" })
    await fetchData()
  }

  const handlePendingReject = async (itemId: string) => {
    await fetch(`/api/pending/${itemId}/reject`, { method: "PUT" })
    await fetchData()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1A2E]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F9B8E] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1A2E] text-[#F5F5F0]/50">
        案件不存在
      </div>
    )
  }

  const totalPaid = data.contracts.reduce((s: number, c: any) => s + (c.paid_amount || 0), 0)
  const refundBase = data.total_amount - data.treatment_consumed

  return (
    <div className="min-h-screen bg-[#1A1A2E] p-6">
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 max-w-md rounded-lg border border-red-500/30 bg-[#1A1A2E] p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-bold text-red-400">计算拦截</h3>
            </div>
            <p className="text-sm text-[#F5F5F0]/70">{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg border border-[#F5F5F0]/10 p-2 text-[#F5F5F0]/60 hover:bg-[#F5F5F0]/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#F5F5F0]">{data.customer_name}</h1>
              <p className="text-sm text-[#F5F5F0]/40">{formatDateTime(data.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xl font-bold text-[#F5F5F0]">
              {formatCurrency(data.total_amount)}
            </span>
            <StatusBadge status={data.status} />
          </div>
        </div>

        <TreatmentDeduction
          treatmentConsumed={data.treatment_consumed}
          treatments={data.treatments}
          caseId={data.id}
        />

        <div>
          <h2 className="mb-3 text-lg font-bold text-[#F5F5F0]">退款拆分计算</h2>
          <div className="grid grid-cols-3 gap-4">
            <AmountCard
              title="分期平台应退"
              amount={data.platform_refund}
              description="基于已付金额与退款基数取小"
              theme="teal"
            />
            <AmountCard
              title="门店应退"
              amount={data.store_refund}
              description="退款基数扣除平台应退"
              theme="blue"
            />
            <AmountCard
              title="疗程消耗扣除"
              amount={data.treatment_consumed}
              description="已做疗程消耗金额总和"
              theme="red"
            />
          </div>
          <div className="mt-4 rounded-lg border border-[#F5F5F0]/5 bg-[#F5F5F0]/5 p-4 font-mono text-sm">
            <p className="text-[#F5F5F0]/60">
              退款基数 = 总金额 {formatCurrency(data.total_amount)} - 疗程消耗{" "}
              {formatCurrency(data.treatment_consumed)} = {formatCurrency(refundBase)}
            </p>
            <p className="mt-1 text-[#F5F5F0]/60">
              平台应退 = min(已付金额 {formatCurrency(totalPaid)}, 退款基数{" "}
              {formatCurrency(refundBase)}) = {formatCurrency(data.platform_refund)}
            </p>
            <p className="mt-1 text-[#F5F5F0]/60">
              门店应退 = 退款基数 {formatCurrency(refundBase)} - 平台应退{" "}
              {formatCurrency(data.platform_refund)} = {formatCurrency(data.store_refund)}
            </p>
          </div>
        </div>

        <PlatformStatusTracker
          contracts={data.contracts}
          statusLogs={data.statusLogs}
          caseId={data.id}
          onStatusChange={handlePlatformStatusChange}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PendingItemsPanel
            items={data.pendingItems}
            onConfirm={handlePendingConfirm}
            onReject={handlePendingReject}
          />
          <ImportTimeline
            contracts={data.contracts}
            treatments={data.treatments}
            coupons={data.coupons}
          />
        </div>

        {data.status === "待拆账" && (
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-bold text-white transition-colors",
              calculating
                ? "cursor-not-allowed bg-[#0F9B8E]/50"
                : "bg-[#0F9B8E] hover:bg-[#0F9B8E]/80",
            )}
          >
            <Calculator className="h-5 w-5" />
            {calculating ? "计算中..." : "计算拆账"}
          </button>
        )}
      </div>
    </div>
  )
}
