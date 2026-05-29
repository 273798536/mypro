import { ShieldCheck, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

interface TreatmentRecord {
  id: string
  treatment_name: string
  session_count: number
  completed_sessions: number
  unit_price: number
  consumed_amount: number
  import_order: number
  imported_at: string
}

interface TreatmentDeductionProps {
  treatmentConsumed: number
  treatments: TreatmentRecord[]
  caseId: string
}

export default function TreatmentDeduction({ treatmentConsumed, treatments, caseId }: TreatmentDeductionProps) {
  const navigate = useNavigate()

  if (treatments.length === 0) {
    return (
      <div className="rounded-lg border-2 border-red-500/50 bg-red-500/5 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <div>
            <p className="text-lg font-bold text-red-400">⚠ 未录入疗程记录，无法计算退款拆分</p>
            <p className="mt-1 text-sm text-[#F5F5F0]/50">请先导入疗程记录后再进行拆账计算</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="mt-4 rounded-lg bg-[#0F9B8E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F9B8E]/80"
        >
          前往导入
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-red-500/50 bg-red-500/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#F5F5F0]">
          <ShieldCheck className="h-5 w-5 text-red-400" />
          疗程消耗抵扣
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl font-bold text-red-400">
            {formatCurrency(treatmentConsumed)}
          </span>
          <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400">
            ✓ 已拦截
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F5F5F0]/10 text-[#F5F5F0]/50">
              <th className="py-2 text-left font-medium">序号</th>
              <th className="py-2 text-left font-medium">疗程名称</th>
              <th className="py-2 text-center font-medium">已完成/总次数</th>
              <th className="py-2 text-right font-medium">单价</th>
              <th className="py-2 text-right font-medium">消耗金额</th>
              <th className="py-2 text-right font-medium">导入时间</th>
            </tr>
          </thead>
          <tbody>
            {treatments.map((t) => (
              <tr key={t.id} className="border-b border-[#F5F5F0]/5">
                <td className="py-2.5 text-[#F5F5F0]/40">#{t.import_order}</td>
                <td className="py-2.5 text-[#F5F5F0]">{t.treatment_name}</td>
                <td className="py-2.5 text-center">
                  <span className="text-red-300">{t.completed_sessions}</span>
                  <span className="text-[#F5F5F0]/30">/{t.session_count}</span>
                </td>
                <td className="py-2.5 text-right font-mono text-[#F5F5F0]/70">
                  {formatCurrency(t.unit_price)}
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-red-400">
                  {formatCurrency(t.consumed_amount)}
                </td>
                <td className="py-2.5 text-right text-[#F5F5F0]/40">
                  {formatDateTime(t.imported_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
