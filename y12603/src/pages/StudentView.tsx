import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { GraduationCap, MapPin } from "lucide-react"
import { useWorkshopStore } from "@/store/useWorkshopStore"
import { useDefectStore } from "@/store/useDefectStore"
import StatusBadge from "@/components/StatusBadge"

export default function StudentView() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const { currentWorkshop, fetchWorkshop } = useWorkshopStore()
  const { defects, colorRules, loading, fetchDefects, fetchColorRules, setFilters } =
    useDefectStore()

  useEffect(() => {
    if (!workshopId) return
    fetchWorkshop(workshopId)
    fetchColorRules(workshopId)
    setFilters({ status: "resolved" })
    fetchDefects(workshopId)
  }, [workshopId])

  const resolvedDefects = useMemo(
    () => defects.filter((d) => d.status === "resolved"),
    [defects]
  )

  const colorRuleMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    colorRules.forEach((r) => map.set(r.id, { name: r.name, color: r.color }))
    return map
  }, [colorRules])

  const typeStats = useMemo(() => {
    const stats = new Map<string, { name: string; color: string; count: number }>()
    resolvedDefects.forEach((d) => {
      const rule = colorRuleMap.get(d.colorRuleId)
      if (!stats.has(d.colorRuleId)) {
        stats.set(d.colorRuleId, {
          name: rule?.name ?? d.type,
          color: rule?.color ?? "#999",
          count: 0,
        })
      }
      stats.get(d.colorRuleId)!.count++
    })
    return Array.from(stats.values())
  }, [resolvedDefects, colorRuleMap])

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)]">
      <header className="flex h-12 items-center gap-3 bg-iron px-6 text-white">
        <GraduationCap size={20} />
        <span className="text-base font-semibold">
          {currentWorkshop?.name ?? "车间"}
        </span>
        <span className="rounded-full bg-pass/90 px-2.5 py-0.5 text-xs font-medium">
          教学视图
        </span>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <section className="mb-8">
          <h2 className="mb-4 text-base font-medium text-gray-500">
            已处理缺陷统计
          </h2>
          <div className="flex flex-wrap gap-3">
            {typeStats.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 rounded-lg bg-white px-4 py-2.5 shadow-sm"
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm text-gray-600">{s.name}</span>
                <span className="text-base font-bold text-gray-800">
                  {s.count}
                </span>
              </div>
            ))}
            {typeStats.length === 0 && !loading && (
              <p className="text-sm text-gray-400">暂无已处理缺陷</p>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-base font-medium text-gray-500">
            缺陷结论
          </h2>
          {loading && <p className="text-sm text-gray-400">加载中...</p>}
          {!loading && resolvedDefects.length === 0 && (
            <p className="text-sm text-gray-400">暂无已处理缺陷数据</p>
          )}
          <div className="flex flex-col gap-2.5">
            {resolvedDefects.map((d) => {
              const rule = colorRuleMap.get(d.colorRuleId)
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
                >
                  <MapPin size={14} className="shrink-0 text-muted" />
                  <span className="shrink-0 text-xs text-gray-400">
                    ({d.posX}, {d.posY})
                  </span>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: rule?.color ?? "#999" }}
                  />
                  <span className="flex-1 truncate text-sm text-gray-600">
                    {d.description || "无描述"}
                  </span>
                  <StatusBadge status={d.status} />
                </div>
              )
            })}
          </div>
        </section>

        <footer className="pointer-events-none select-none pt-6 text-center text-base font-medium text-gray-300/50">
          数据仅供教学参考
        </footer>
      </div>
    </div>
  )
}
