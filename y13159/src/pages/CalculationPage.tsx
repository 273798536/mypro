import { useStore } from '@/store'
import { ArrowRight, GitCompare, Ruler } from 'lucide-react'

export default function CalculationPage() {
  const { data, selectedParamGroup, setSelectedParamGroup } = useStore()

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            计算过程 / CALCULATION
          </h2>
          <p className="text-sm text-industrial-600 mt-1 font-mono">
            两组参数对照 · 单位换算明细 · 中间步骤不隐藏
          </p>
        </div>
        <div className="flex items-center gap-2 bg-industrial-900/50 border border-grid-line rounded p-1">
          <ParamGroupBtn
            active={selectedParamGroup === 'A'}
            onClick={() => setSelectedParamGroup('A')}
            label="参数组 A"
          />
          <ParamGroupBtn
            active={selectedParamGroup === 'B'}
            onClick={() => setSelectedParamGroup('B')}
            label="参数组 B"
          />
          <div className="px-3 py-1.5">
            <GitCompare className="w-4 h-4 text-industrial-600" />
          </div>
        </div>
      </header>

      {/* Parameter comparison summary */}
      <div className="grid grid-cols-2 gap-5">
        <ParamGroupCard
          group="A"
          label="原始参数组"
          accent="industrial"
          steps={data?.calculation_steps || []}
        />
        <ParamGroupCard
          group="B"
          label="复核参数组"
          accent="green"
          steps={data?.calculation_steps || []}
        />
      </div>

      {/* Step-by-step calculation */}
      <div className="bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-grid-line flex items-center gap-2">
          <Ruler className="w-4 h-4 text-warning-500" />
          <h3 className="font-display font-bold text-white text-sm">
            分步计算明细 / STEP-BY-STEP
          </h3>
        </div>
        <div className="divide-y divide-grid-line">
          {data?.calculation_steps.map((step) => {
            const hasDiff = Math.abs(step.result_a - step.result_b) > 0.001
            return (
              <div key={step.step_no} className="p-5 grid grid-cols-12 gap-4 items-start">
                <div className="col-span-1">
                  <div className="w-10 h-10 rounded bg-industrial-800 border border-industrial-700 flex items-center justify-center font-display font-bold text-warning-500">
                    {step.step_no}
                  </div>
                </div>
                <div className="col-span-4">
                  <p className="font-mono text-sm text-white mb-1">{step.description}</p>
                  <div className="bg-industrial-800 rounded px-3 py-2 font-mono text-xs text-status-green inline-block">
                    {step.formula}
                  </div>
                </div>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">输入 (A组)</span>
                    <span className="text-white">
                      {step.param_a} {step.from_unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">换算</span>
                    <ArrowRight className="w-3 h-3 text-industrial-600" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">结果 (A组)</span>
                    <span className={`font-bold ${hasDiff ? 'text-warning-500' : 'text-white'}`}>
                      {step.result_a} {step.to_unit}
                    </span>
                  </div>
                </div>
                <div className="col-span-3 space-y-2 border-l border-grid-line pl-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">输入 (B组)</span>
                    <span className={hasDiff ? 'text-status-yellow font-bold' : 'text-white'}>
                      {step.param_b} {step.from_unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">换算</span>
                    <ArrowRight className="w-3 h-3 text-industrial-600" />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-industrial-600">结果 (B组)</span>
                    <span className={`font-bold ${hasDiff ? 'text-status-green' : 'text-white'}`}>
                      {step.result_b} {step.to_unit}
                    </span>
                  </div>
                </div>
                <div className="col-span-1 flex flex-col items-end justify-center h-full">
                  {hasDiff ? (
                    <span className="text-xs font-mono px-2 py-1 bg-status-yellow/20 text-status-yellow rounded border border-status-yellow/30">
                      Δ≠0
                    </span>
                  ) : (
                    <span className="text-xs font-mono px-2 py-1 bg-status-green/20 text-status-green rounded border border-status-green/30">
                      Δ=0
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Final result comparison */}
      <div className="bg-industrial-900/50 border border-grid-line rounded-lg p-5">
        <h3 className="font-display font-bold text-white text-sm mb-4">
          最终结果对照 / FINAL COP
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <FinalResult
            label="参数组 A 制冷系数"
            value={data?.calculation_steps[data.calculation_steps.length - 1].result_a || 0}
            accent="warning"
          />
          <FinalResult
            label="参数组 B 制冷系数"
            value={data?.calculation_steps[data.calculation_steps.length - 1].result_b || 0}
            accent="green"
          />
        </div>
      </div>
    </div>
  )
}

function ParamGroupBtn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-sm font-mono transition-all ${
        active
          ? 'bg-warning-500 text-industrial-900 font-bold'
          : 'text-industrial-600 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function ParamGroupCard({
  group,
  label,
  accent,
  steps,
}: {
  group: 'A' | 'B'
  label: string
  accent: 'industrial' | 'green'
  steps: any[]
}) {
  const finalResult = steps[steps.length - 1]
  const value = group === 'A' ? finalResult?.result_a : finalResult?.result_b
  const accentColors = {
    industrial: 'text-warning-500 border-warning-500/30',
    green: 'text-status-green border-status-green/30',
  }
  return (
    <div className={`bg-industrial-900/50 border rounded-lg p-5 ${accentColors[accent]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs text-industrial-600 uppercase tracking-wider">
          组 {group} · {label}
        </span>
        <span className={`font-display font-bold text-3xl ${accentColors[accent].split(' ')[0]}`}>
          {value?.toFixed(2)}
        </span>
      </div>
      <div className="space-y-1.5">
        {steps.slice(0, 4).map((s) => (
          <div key={s.step_no} className="flex items-center justify-between text-xs font-mono">
            <span className="text-industrial-600">Step {s.step_no}</span>
            <span className="text-white">
              {group === 'A' ? s.result_a : s.result_b} {s.to_unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinalResult({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'warning' | 'green'
}) {
  const color = accent === 'warning' ? 'text-warning-500' : 'text-status-green'
  return (
    <div className="bg-industrial-800 rounded p-4 flex items-center justify-between">
      <span className="font-mono text-sm text-industrial-600">{label}</span>
      <span className={`font-display font-bold text-4xl ${color}`}>
        COP = {value.toFixed(2)}
      </span>
    </div>
  )
}
