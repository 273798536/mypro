import { useState } from "react"
import { Plus, ChevronDown, ChevronRight, Trash2, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ColorRule, Defect } from "@/types"

interface Props {
  colorRules: ColorRule[]
  defects: Defect[]
  workshopId: string
  onAddRule: (workshopId: string, data: { name: string; color: string; description: string }) => void
  onUpdateRule: (workshopId: string, ruleId: string, data: Record<string, unknown>) => void
  onDeleteRule: (workshopId: string, ruleId: string) => void
  hiddenTypes: Set<string>
  onToggleType: (type: string) => void
}

export default function ColorRuleSidebar({
  colorRules,
  defects,
  workshopId,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  hiddenTypes,
  onToggleType,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", color: "#E87722", description: "" })

  const defectTypes = Array.from(new Set(defects.map((d) => d.type)))
  const typeCountMap = new Map<string, number>()
  const typeColorMap = new Map<string, string>()
  defects.forEach((d) => {
    typeCountMap.set(d.type, (typeCountMap.get(d.type) ?? 0) + 1)
    const rule = colorRules.find((r) => r.id === d.colorRuleId)
    if (rule && !typeColorMap.has(d.type)) typeColorMap.set(d.type, rule.color)
  })

  const handleAdd = () => {
    if (!addForm.name.trim()) return
    onAddRule(workshopId, addForm)
    setAddForm({ name: "", color: "#E87722", description: "" })
    setShowAddForm(false)
  }

  const handleDelete = (ruleId: string) => {
    if (confirmDeleteId === ruleId) {
      onDeleteRule(workshopId, ruleId)
      setConfirmDeleteId(null)
      if (expandedId === ruleId) setExpandedId(null)
    } else {
      setConfirmDeleteId(ruleId)
      setTimeout(() => setConfirmDeleteId(null), 3000)
    }
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-gray-700 bg-iron text-gray-200">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Palette size={15} />
          颜色规则
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 rounded-md bg-warn/80 px-2 py-1 text-xs text-white transition-colors hover:bg-warn"
        >
          <Plus size={12} />
          新增
        </button>
      </div>

      {showAddForm && (
        <div className="border-b border-white/10 px-4 py-3">
          <input
            className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-warn"
            placeholder="规则名称"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="mb-2 flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
              value={addForm.color}
              onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
            />
            <span className="text-xs text-gray-400">{addForm.color}</span>
          </div>
          <input
            className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-warn"
            placeholder="描述（可选）"
            value={addForm.description}
            onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="rounded-md bg-warn/80 px-3 py-1 text-xs text-white hover:bg-warn"
            >
              确认
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-md bg-white/5 px-3 py-1 text-xs text-gray-400 hover:bg-white/10"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {colorRules.length === 0 && !showAddForm && (
          <p className="px-4 py-8 text-center text-xs text-gray-500">暂无颜色规则</p>
        )}
        {colorRules.map((rule) => {
          const isExpanded = expandedId === rule.id
          const isDeleting = confirmDeleteId === rule.id
          return (
            <div key={rule.id} className="border-b border-white/5">
              <button
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: rule.color }}
                />
                <span className="flex-1 truncate text-xs">{rule.name}</span>
                <span className="text-[10px] text-gray-500">{rule.defectCount}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3">
                  <label className="mb-1 block text-[10px] text-gray-500">名称</label>
                  <input
                    className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-warn"
                    value={rule.name}
                    onChange={(e) =>
                      onUpdateRule(workshopId, rule.id, { name: e.target.value })
                    }
                  />
                  <label className="mb-1 block text-[10px] text-gray-500">颜色</label>
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                      value={rule.color}
                      onChange={(e) =>
                        onUpdateRule(workshopId, rule.id, { color: e.target.value })
                      }
                    />
                    <span className="text-xs text-gray-400">{rule.color}</span>
                  </div>
                  <label className="mb-1 block text-[10px] text-gray-500">描述</label>
                  <input
                    className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-warn"
                    value={rule.description}
                    onChange={(e) =>
                      onUpdateRule(workshopId, rule.id, { description: e.target.value })
                    }
                  />
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      isDeleting
                        ? "bg-danger text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-danger"
                    )}
                  >
                    <Trash2 size={11} />
                    {isDeleting ? "确认删除？" : "删除规则"}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-white/10">
        <h3 className="px-4 py-2 text-xs font-medium text-gray-400">图层控制</h3>
        {defectTypes.length === 0 ? (
          <p className="px-4 pb-3 text-[10px] text-gray-600">暂无缺陷类型</p>
        ) : (
          <div className="pb-2">
            {defectTypes.map((type) => {
              const visible = !hiddenTypes.has(type)
              const color = typeColorMap.get(type) ?? "#888"
              return (
                <div key={type} className="flex items-center gap-2 px-4 py-1.5">
                  <button
                    onClick={() => onToggleType(type)}
                    className={cn(
                      "h-4 w-7 rounded-full transition-colors",
                      visible ? "bg-pass/70" : "bg-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "block h-3 w-3 rounded-full bg-white shadow transition-transform",
                        visible ? "translate-x-3.5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 truncate text-xs">{type}</span>
                  <span className="text-[10px] text-gray-500">{typeCountMap.get(type) ?? 0}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
