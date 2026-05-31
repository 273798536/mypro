import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { ValidationResult } from '@/types'

interface ValidationListProps {
  results: ValidationResult[]
}

const CATEGORY_MAP: Record<string, string> = {
  'CR-01': '曲线拖拽',
  'CR-02': '曲线拖拽',
  'CR-03': '组合结算',
  'CR-04': '组合结算',
  'CR-05': '事件叠加',
  'CR-06': '久期计算',
}

function RuleCard({ result }: { result: ValidationResult }) {
  const [expanded, setExpanded] = useState(!result.passed)
  const category = CATEGORY_MAP[result.ruleId] ?? '其他'

  return (
    <div
      className={`rounded-lg border-l-4 ${
        result.passed
          ? 'border-l-[#43A047] bg-[#0D1B30]'
          : 'border-l-[#E53935] bg-[#0D1B30]'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {result.passed ? (
          <CheckCircle2 size={20} className="shrink-0 text-[#43A047]" />
        ) : (
          <XCircle size={20} className="shrink-0 text-[#E53935]" />
        )}

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            result.passed
              ? 'bg-[#D4A017]/20 text-[#D4A017]'
              : 'bg-[#E53935]/20 text-[#E53935]'
          }`}
        >
          {result.ruleId}
        </span>

        <span className="rounded bg-[#1B2A4A] px-2 py-0.5 text-xs text-[#8899B3]">
          {category}
        </span>

        <span className="ml-auto mr-2 text-sm text-[#8899B3]">
          <span className="font-mono">
            {result.actualValue} / {result.threshold}
          </span>
        </span>

        {expanded ? (
          <ChevronUp size={16} className="shrink-0 text-[#5A6E8A]" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-[#5A6E8A]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-sm text-[#C8D0DC]">{result.feedback}</p>
          {!result.passed && (
            <div className="mt-2 border-l-2 border-[#D4A017] pl-3">
              <p className="text-sm text-[#D4A017]">{result.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ValidationList({ results }: ValidationListProps) {
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const score = passed * 10

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-[#D4A017]">规则校验结果</h2>

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <RuleCard key={r.ruleId} result={r} />
        ))}
      </div>

      <div className="mt-2 rounded-lg bg-[#0D1B30] px-4 py-3 text-center text-sm text-[#C8D0DC]">
        通过{' '}
        <span className="font-semibold text-[#43A047]">{passed}</span>/
        {total} 条规则，得分{' '}
        <span className="font-semibold text-[#D4A017]">{score}</span>分
      </div>
    </div>
  )
}
