import { usePulleyStore } from '../store/pulleyStore'
import { weightToNewtons } from '../utils/calculations'

export default function CalcDetail() {
  const record = usePulleyStore((s) => s.getActiveRecord())
  const result = usePulleyStore((s) => s.getActiveResult())
  const warnings = usePulleyStore((s) => s.getActiveWarnings())

  if (!record || !result) return null

  const weightN = weightToNewtons(record.objectWeight, record.weightUnit)
  const n = result.ropeSegments
  const mu = record.frictionCoefficient
  const hasErrors = warnings.some((w) => w.level === 'error')

  return (
    <div className="space-y-3">
      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">计算过程</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-[#8899aa]">绳段数 n</span>
            <span className="text-white">{n} = 2 × {record.movingPulleys}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8899aa]">物重 G</span>
            <span className="text-white">
              {weightN.toFixed(2)} N
              {record.weightUnit !== 'N' && (
                <span className="text-[#ff6b35] text-xs ml-1">({record.objectWeight}{record.weightUnit}→N)</span>
              )}
            </span>
          </div>
          <div className="h-px bg-[#253345] my-1" />
          <div className="text-xs text-[#667788]">F_理想 = G / n = {weightN.toFixed(2)} / {n}</div>
          <div className="flex justify-between">
            <span className="text-[#8899aa]">理想拉力</span>
            <span className="text-[#00d4aa]">{(weightN / n).toFixed(2)} N</span>
          </div>
          <div className="h-px bg-[#253345] my-1" />
          <div className="text-xs text-[#667788]">
            F_实际 = G / (n × (1 - μ)) = {weightN.toFixed(2)} / ({n} × {mu >= 0 && mu < 1 ? (1 - mu).toFixed(2) : '?'})
          </div>
          <div className="flex justify-between">
            <span className="text-[#8899aa]">实际拉力</span>
            <span className={hasErrors ? 'text-[#ef4444]' : 'text-[#ff6b35]'}>
              {result.pullingForce !== null ? `${result.pullingForce.toFixed(2)} N` : '无法计算'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">机械效率</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="text-xs text-[#667788]">η = G / (n × F_实际) × 100%</div>
          <div className="relative h-8 bg-[#253345] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                result.mechanicalEfficiency !== null && result.mechanicalEfficiency > 100
                  ? 'bg-[#ef4444]'
                  : result.mechanicalEfficiency !== null && result.mechanicalEfficiency > 95
                    ? 'bg-[#ff6b35]'
                    : 'bg-[#00d4aa]'
              }`}
              style={{
                width: result.mechanicalEfficiency !== null
                  ? `${Math.min(100, Math.max(0, result.mechanicalEfficiency))}%`
                  : '0%',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono">
              {result.mechanicalEfficiency !== null
                ? `${result.mechanicalEfficiency.toFixed(1)}%`
                : '无法计算'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#667788]">0%</span>
            <span className="text-[#ef4444]">100%</span>
          </div>
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">功的计算</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-[#8899aa]">有用功 W_有用</span>
            <span className="text-[#00d4aa]">
              {result.usefulWork !== null ? `${result.usefulWork.toFixed(2)} J` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8899aa]">总功 W_总</span>
            <span className="text-[#ff6b35]">
              {result.totalWork !== null ? `${result.totalWork.toFixed(2)} J` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8899aa]">额外功 W_额外</span>
            <span className="text-[#8899aa]">
              {result.usefulWork !== null && result.totalWork !== null
                ? `${(result.totalWork - result.usefulWork).toFixed(2)} J`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
