import { useState } from "react"
import { Search } from "lucide-react"
import { DEPARTMENTS } from "@/data/mockData"
import { useStore } from "@/store/useStore"

export function DepartmentFilter() {
  const [search, setSearch] = useState("")
  const selectedDepartments = useStore((s) => s.selectedDepartments)
  const toggleDepartment = useStore((s) => s.toggleDepartment)
  const setSelectedDepartments = useStore((s) => s.setSelectedDepartments)
  const items = useStore((s) => s.items)

  const filtered = DEPARTMENTS.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedDepartments.includes(d.id))

  const itemCounts: Record<string, number> = {}
  items.forEach((item) => {
    itemCounts[item.department] = (itemCounts[item.department] || 0) + 1
  })

  return (
    <div className="flex flex-col h-full bg-[#1a1f36] text-white/90">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索部门..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-[#4fc3f7]/50"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setSelectedDepartments(filtered.map((d) => d.id))}
            className="flex-1 py-1 text-xs rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            全选
          </button>
          <button
            onClick={() =>
              setSelectedDepartments(
                selectedDepartments.filter(
                  (id) => !filtered.find((d) => d.id === id)
                )
              )
            }
            className="flex-1 py-1 text-xs rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.map((dept) => {
          const isSelected = selectedDepartments.includes(dept.id)
          const count = itemCounts[dept.id] || 0

          return (
            <label
              key={dept.id}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
                ${isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"}
              `}
            >
              <div
                className="w-1 h-5 rounded-full shrink-0"
                style={{ backgroundColor: dept.color }}
              />
              <span className="flex-1 text-sm truncate">{dept.name}</span>
              <span className="text-xs text-white/40 mr-1">{count}</span>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleDepartment(dept.id)}
                className="w-3.5 h-3.5 rounded accent-[#4fc3f7]"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}
