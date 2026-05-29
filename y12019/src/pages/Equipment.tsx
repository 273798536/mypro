import { useState, useMemo } from "react"
import { Search, Info, ChevronDown, ChevronRight } from "lucide-react"
import { useAppStore } from "@/store"

const statusLabel: Record<string, string> = { active: "在用", inactive: "停用" }
const contractStatusLabel: Record<string, string> = {
  active: "生效中", terminated_early: "提前终止", completed: "已完成",
}
const woTypeLabel: Record<string, string> = {
  routine: "日常", fault: "故障", fault_supplement: "故障追加",
}

export default function Equipment() {
  const { equipments, contracts, workOrders } = useAppStore()
  const [keyword, setKeyword] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return equipments
    return equipments.filter(
      (e) =>
        e.code.toLowerCase().includes(kw) ||
        e.name.toLowerCase().includes(kw) ||
        e.category.toLowerCase().includes(kw)
    )
  }, [equipments, keyword])

  const contractCount = (eqId: string) =>
    contracts.filter((c) => c.equipmentId === eqId).length

  const relatedContracts = (eqId: string) =>
    contracts.filter((c) => c.equipmentId === eqId)

  const relatedWorkOrders = (eqId: string) =>
    workOrders.filter((w) => w.equipmentId === eqId)

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索设备编码、名称或分类…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2">设备编码</th>
              <th className="px-3 py-2">设备名称</th>
              <th className="px-3 py-2">分类</th>
              <th className="px-3 py-2">备注</th>
              <th className="px-3 py-2 text-center">关联合同数</th>
              <th className="px-3 py-2 text-center">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((eq) => {
              const expanded = expandedId === eq.id
              const rContracts = relatedContracts(eq.id)
              const rOrders = relatedWorkOrders(eq.id)
              return (
                <tr key={eq.id} className="border-t">
                  <td colSpan={7} className="p-0">
                    <div
                      className="flex items-center cursor-pointer hover:bg-gray-50"
                      onClick={() => toggle(eq.id)}
                    >
                      <div className="w-8 px-3 py-2">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="px-3 py-2 font-mono">{eq.code}</div>
                      <div className="px-3 py-2">{eq.name}</div>
                      <div className="px-3 py-2">{eq.category}</div>
                      <div className="px-3 py-2">
                        {eq.remark ? (
                          <span className="inline-flex items-center gap-1 text-gray-400 italic" title={eq.remark}>
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[140px]">参考信息</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div className="px-3 py-2 text-center">{contractCount(eq.id)}</div>
                      <div className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            eq.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {statusLabel[eq.status]}
                        </span>
                      </div>
                    </div>

                    {expanded && (
                      <div className="bg-gray-50/60 px-10 py-3 space-y-3">
                        {rContracts.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">关联合同</div>
                            <table className="w-full text-xs border rounded overflow-hidden">
                              <thead>
                                <tr className="bg-white text-gray-500">
                                  <th className="px-2 py-1 text-left">合同编码</th>
                                  <th className="px-2 py-1 text-left">期间</th>
                                  <th className="px-2 py-1 text-right">年度金额</th>
                                  <th className="px-2 py-1 text-center">状态</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rContracts.map((c) => (
                                  <tr key={c.id} className="border-t bg-white">
                                    <td className="px-2 py-1 font-mono">{c.code}</td>
                                    <td className="px-2 py-1">{c.startDate} ~ {c.endDate}</td>
                                    <td className="px-2 py-1 text-right">
                                      {c.annualAmount != null
                                        ? `¥${c.annualAmount.toLocaleString()}`
                                        : "—"}
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                        c.status === "active"
                                          ? "bg-green-50 text-green-600"
                                          : c.status === "completed"
                                          ? "bg-blue-50 text-blue-600"
                                          : "bg-red-50 text-red-500"
                                      }`}>
                                        {contractStatusLabel[c.status]}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {rOrders.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">关联工单</div>
                            <table className="w-full text-xs border rounded overflow-hidden">
                              <thead>
                                <tr className="bg-white text-gray-500">
                                  <th className="px-2 py-1 text-left">工单编码</th>
                                  <th className="px-2 py-1 text-center">类型</th>
                                  <th className="px-2 py-1 text-right">金额</th>
                                  <th className="px-2 py-1 text-center">工单日期</th>
                                  <th className="px-2 py-1 text-center">迟到</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rOrders.map((w) => (
                                  <tr key={w.id} className="border-t bg-white">
                                    <td className="px-2 py-1 font-mono">{w.code}</td>
                                    <td className="px-2 py-1 text-center">{woTypeLabel[w.type]}</td>
                                    <td className="px-2 py-1 text-right">¥{w.amount.toLocaleString()}</td>
                                    <td className="px-2 py-1 text-center">{w.orderDate}</td>
                                    <td className="px-2 py-1 text-center">
                                      {w.isLateArrival ? (
                                        <span className="text-red-500 font-medium">延迟</span>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {rContracts.length === 0 && rOrders.length === 0 && (
                          <div className="text-xs text-gray-400">暂无关联数据</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">未找到匹配设备</div>
        )}
      </div>
    </div>
  )
}
