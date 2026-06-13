import { FileText, AlertTriangle, GitBranch, Sliders, BookOpen } from 'lucide-react'
import { useRegressionStore } from '@/store/regression'
import type { MaterialImpact } from '@/store/regression'

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
        <Icon className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FormulaSection({ formulas }: { formulas: string[] }) {
  return (
    <div className="space-y-1">
      {formulas.map((f, i) => (
        <code key={i} className="block rounded bg-gray-900 px-3 py-1.5 font-mono text-sm text-green-400">
          {f}
        </code>
      ))}
    </div>
  )
}

function UnitWarningsSection({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return <p className="text-sm text-gray-500">无单位警告</p>
  }
  return (
    <ul className="space-y-1">
      {warnings.map((w, i) => (
        <li key={i} className="flex items-start gap-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <span>{w}</span>
        </li>
      ))}
    </ul>
  )
}

function BoundaryImpactSection({ impacts }: { impacts: import('@/store/regression').BoundaryImpact[] }) {
  if (impacts.length === 0) {
    return <p className="text-sm text-gray-500">无边界样本影响数据</p>
  }
  return (
    <div className="space-y-3">
      {impacts.map((impact, i) => (
        <div key={i} className="rounded border border-gray-100 bg-gray-50 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
            <GitBranch className="h-3.5 w-3.5 text-blue-500" />
            <span>断点: {impact.breakpoint}</span>
            <span className="text-gray-400">|</span>
            <span>段 {impact.leftSegment} → 段 {impact.rightSegment}</span>
          </div>
          <p className="text-sm text-gray-600">{impact.influenceOnConclusion}</p>
          {impact.nearbyPoints.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">附近数据点: {impact.nearbyPoints.length} 个</p>
          )}
        </div>
      ))}
    </div>
  )
}

function SensitivitySection({ entries }: { entries: import('@/store/regression').SensitivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">无参数敏感性数据</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="pb-2 pr-4 font-medium">参数</th>
            <th className="pb-2 pr-4 font-medium">旧值</th>
            <th className="pb-2 pr-4 font-medium">新值</th>
            <th className="pb-2 pr-4 font-medium">影响段</th>
            <th className="pb-2 font-medium">描述</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-2 pr-4 font-mono text-gray-800">{entry.parameter}</td>
              <td className="py-2 pr-4 text-gray-600">{String(entry.oldValue)}</td>
              <td className="py-2 pr-4 text-gray-600">{String(entry.newValue)}</td>
              <td className="py-2 pr-4 text-gray-600">{entry.affectedSegments.join(', ')}</td>
              <td className="py-2 text-gray-600">{entry.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MaterialImpactSection({ impacts }: { impacts: MaterialImpact[] }) {
  if (impacts.length === 0) {
    return <p className="text-sm text-gray-500">无材料影响数据</p>
  }
  return (
    <div className="space-y-2">
      {impacts.map((impact, i) => (
        <div key={i} className="flex items-start gap-3 rounded border border-gray-100 bg-gray-50 p-3">
          <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <span>{impact.materialId}</span>
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">{impact.type}</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-600">{impact.description}</p>
            <p className="mt-0.5 text-xs text-gray-400">影响段: {impact.affectedSegments.join(', ')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReportPanel() {
  const result = useRegressionStore(s => s.result)
  const materialImpact = useRegressionStore(s => s.materialImpact)

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">请先运行计算</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">分析报告</h2>
        <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          R² = {result.totalR2.toFixed(4)}
        </div>
      </div>

      <Section icon={FileText} title="回归公式">
        <FormulaSection formulas={result.formulaDisplay} />
      </Section>

      <Section icon={AlertTriangle} title="单位警告">
        <UnitWarningsSection warnings={result.unitWarnings} />
      </Section>

      <Section icon={GitBranch} title="边界样本影响">
        <BoundaryImpactSection impacts={result.boundaryImpact} />
      </Section>

      <Section icon={Sliders} title="参数敏感性分析">
        <SensitivitySection entries={result.parameterSensitivity} />
      </Section>

      <Section icon={BookOpen} title="材料影响分析">
        <MaterialImpactSection impacts={materialImpact} />
      </Section>
    </div>
  )
}
