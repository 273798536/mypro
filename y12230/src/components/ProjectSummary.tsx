import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ExpenseAggregation, ExpenseSource, ProjectLedger } from '@/types'

const fmt = (n: number) => n.toLocaleString()

function SourceTags({ sources }: { sources: ExpenseSource[] }) {
  if (sources.length === 0) return <span className="text-gray-400 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        >
          <span>{s.label}</span>
          <span className="font-mono">{fmt(s.amount)}</span>
        </span>
      ))}
    </div>
  )
}

function ProjectRow({
  agg,
  project,
}: {
  agg: ExpenseAggregation
  project: ProjectLedger | undefined
}) {
  const [open, setOpen] = useState(false)
  const budgetRemaining = project ? project.budget - agg.totalCost : 0

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setOpen(!open)}
      >
        <td className="px-3 py-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="px-3 py-2 text-sm">{project?.code ?? '—'}</td>
        <td className="px-3 py-2 text-sm">{project?.name ?? '—'}</td>
        <td className="px-3 py-2 text-sm font-mono text-right">{fmt(agg.laborCost)}</td>
        <td className="px-3 py-2 text-sm font-mono text-right">{fmt(agg.materialCost)}</td>
        <td className="px-3 py-2 text-sm font-mono text-right">{fmt(agg.otherCost)}</td>
        <td className="px-3 py-2 text-sm font-mono text-right font-semibold">{fmt(agg.totalCost)}</td>
        <td
          className={cn(
            'px-3 py-2 text-sm font-mono text-right font-semibold',
            budgetRemaining < 0 ? 'text-[#e8635a]' : 'text-[#4caf82]'
          )}
        >
          {fmt(budgetRemaining)}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 dark:bg-gray-800/50">
          <td />
          <td colSpan={7} className="px-3 py-2">
            <div className="space-y-2">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">人工费来源</div>
                <SourceTags sources={agg.laborSources} />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">材料费来源</div>
                <SourceTags sources={agg.materialSources} />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">其他费用来源</div>
                <SourceTags sources={agg.otherSources} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ProjectSummary() {
  const { aggregations, projects } = useStore()

  const totals = aggregations.reduce(
    (acc, a) => ({
      laborCost: acc.laborCost + a.laborCost,
      materialCost: acc.materialCost + a.materialCost,
      otherCost: acc.otherCost + a.otherCost,
      totalCost: acc.totalCost + a.totalCost,
    }),
    { laborCost: 0, materialCost: 0, otherCost: 0, totalCost: 0 }
  )

  const totalBudget = aggregations.reduce((sum, a) => {
    const p = projects.find((proj) => proj.id === a.projectId)
    return sum + (p?.budget ?? 0)
  }, 0)

  const budgetRemaining = totalBudget - totals.totalCost

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[#d4a853]/15 border-b border-[#d4a853]/30">
            <th className="w-8 px-3 py-2" />
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853]">项目编号</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853]">项目名称</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">人工费</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">材料费</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">其他费用</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">合计</th>
            <th className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">预算余额</th>
          </tr>
        </thead>
        <tbody>
          {aggregations.map((agg) => {
            const project = projects.find((p) => p.id === agg.projectId)
            return <ProjectRow key={agg.projectId} agg={agg} project={project} />
          })}
          <tr className="border-t-2 border-[#d4a853]/30 bg-[#d4a853]/5">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-sm font-semibold" colSpan={2}>合计</td>
            <td className="px-3 py-2 text-sm font-mono text-right font-semibold">{fmt(totals.laborCost)}</td>
            <td className="px-3 py-2 text-sm font-mono text-right font-semibold">{fmt(totals.materialCost)}</td>
            <td className="px-3 py-2 text-sm font-mono text-right font-semibold">{fmt(totals.otherCost)}</td>
            <td className="px-3 py-2 text-sm font-mono text-right font-semibold">{fmt(totals.totalCost)}</td>
            <td
              className={cn(
                'px-3 py-2 text-sm font-mono text-right font-semibold',
                budgetRemaining < 0 ? 'text-[#e8635a]' : 'text-[#4caf82]'
              )}
            >
              {fmt(budgetRemaining)}
            </td>
          </tr>
        </tbody>
      </table>
      {aggregations.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">暂无项目费用数据</div>
      )}
    </div>
  )
}
