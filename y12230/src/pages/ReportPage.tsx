import { useState } from 'react'
import { FileSpreadsheet, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store'
import { exportAggregationReport } from '@/utils/export'
import { cn } from '@/lib/utils'
import type { ValidationAlert } from '@/types'

const fmt = (n: number) => n.toLocaleString()

const COLUMNS = ['人工费', '材料费', '其他费用', '合计', '预算余额'] as const

function Cell({ value, negative }: { value: number; negative?: boolean }) {
  const [active, setActive] = useState(false)
  return (
    <td
      className={cn(
        'px-3 py-2 text-sm font-mono text-right cursor-pointer select-none transition-colors',
        active ? 'bg-[#d4a853]/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800',
        negative && 'text-[#e8635a]'
      )}
      onClick={() => setActive(!active)}
    >
      {fmt(value)}
    </td>
  )
}

function AlertGroup({
  severity,
  items,
  getProjectName,
}: {
  severity: 'error' | 'warning'
  items: ValidationAlert[]
  getProjectName: (id: string) => string
}) {
  const isErr = severity === 'error'
  const badgeColor = isErr ? 'bg-[#e8635a]' : 'bg-amber-500'
  const borderColor = isErr ? 'border-[#e8635a]/30' : 'border-amber-500/30'
  const bgColor = isErr ? 'bg-[#e8635a]/5' : 'bg-amber-500/5'
  const Icon = isErr ? AlertTriangle : CheckCircle2
  const label = isErr ? '错误' : '警告'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className={isErr ? 'text-[#e8635a]' : 'text-amber-500'} />
        <span className="text-sm font-semibold">{label}</span>
        <span className={cn('inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold text-white', badgeColor)}>
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((alert) => (
          <div key={alert.id} className={cn('rounded-lg border p-3', borderColor, bgColor)}>
            <div className="flex items-start gap-2">
              <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-white', badgeColor)}>
                {label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{alert.message}</p>
                <p className="mt-1 text-xs text-gray-500">
                  影响项目：{alert.affectedProjectIds.map(getProjectName).join('、')}
                </p>
                {alert.explanation && (
                  <p className="mt-1 text-xs text-gray-400">说明：{alert.explanation}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReportPage() {
  const { projects, aggregations, alerts, getProjectName } = useStore()

  const errorAlerts = alerts.filter((a) => a.severity === 'error')
  const warningAlerts = alerts.filter((a) => a.severity === 'warning')

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

  const handleExport = () => {
    exportAggregationReport(projects, aggregations, alerts)
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-[#d4a853]" />
          <h2 className="text-lg font-semibold">归集汇总报表</h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#d4a853]/15 border-b border-[#d4a853]/30">
                <th className="px-3 py-2 text-xs font-semibold text-[#d4a853]">项目</th>
                {COLUMNS.map((col) => (
                  <th key={col} className="px-3 py-2 text-xs font-semibold text-[#d4a853] text-right">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const agg = aggregations.find((a) => a.projectId === p.id)
                const labor = agg?.laborCost ?? 0
                const material = agg?.materialCost ?? 0
                const other = agg?.otherCost ?? 0
                const total = agg?.totalCost ?? 0
                const remaining = p.budget - total
                return (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 text-sm">{p.name}</td>
                    <Cell value={labor} />
                    <Cell value={material} />
                    <Cell value={other} />
                    <Cell value={total} />
                    <Cell value={remaining} negative={remaining < 0} />
                  </tr>
                )
              })}
              <tr className="border-t-2 border-[#d4a853]/30 bg-[#d4a853]/5">
                <td className="px-3 py-2 text-sm font-semibold">合计</td>
                <Cell value={totals.laborCost} />
                <Cell value={totals.materialCost} />
                <Cell value={totals.otherCost} />
                <Cell value={totals.totalCost} />
                <Cell value={budgetRemaining} negative={budgetRemaining < 0} />
              </tr>
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">暂无项目费用数据</div>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400 leading-relaxed">
          口径说明：人工费归集自工时记录（工时×时薪），材料费归集自领料单（数量×单价），其他费用归集自发票凭证金额。合计 = 人工费 + 材料费 + 其他费用，预算余额 = 项目预算 - 合计。
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-[#d4a853]" />
          <h2 className="text-lg font-semibold">口径校验报告</h2>
        </div>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-[#4caf82]/30 bg-[#4caf82]/5 p-6 text-center">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-[#4caf82]" />
            <p className="text-sm text-[#4caf82]">校验通过，无异常</p>
          </div>
        ) : (
          <div className="space-y-6">
            {errorAlerts.length > 0 && (
              <AlertGroup severity="error" items={errorAlerts} getProjectName={getProjectName} />
            )}
            {warningAlerts.length > 0 && (
              <AlertGroup severity="warning" items={warningAlerts} getProjectName={getProjectName} />
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Download size={20} className="text-[#d4a853]" />
          <h2 className="text-lg font-semibold">Excel导出</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d4a853] px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#c49a48] active:bg-[#b38d3f]"
          >
            <Download size={16} />
            导出报表
          </button>
          <span className="text-xs text-gray-400">导出包含费用归集汇总和口径校验报告两个Sheet</span>
        </div>
      </section>
    </div>
  )
}
