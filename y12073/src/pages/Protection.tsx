import { useState, useCallback } from 'react'
import { getAllRules } from '@/data/protectionRules'
import { evaluateProtections, getTriggeredResults, hasBlockedProtections } from '@/utils/protectionEngine'
import { getSurfaceById, getAllSurfaces } from '@/data/surfaces'
import { Shield, ShieldAlert, ShieldOff, Play, FileText, Palette, Camera, Link2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { ProtectionResult, DirtyTestResult, TraceSource } from '@/types'
import { useNavigate } from 'react-router-dom'

function SourceIcon({ type }: { type: TraceSource['type'] }) {
  switch (type) {
    case 'formula': return <FileText className="w-3 h-3 text-blue-400" />
    case 'color_rule': return <Palette className="w-3 h-3 text-purple-400" />
    case 'exhibit_screenshot': return <Camera className="w-3 h-3 text-teal-400" />
  }
}

function SourceBadge({ type }: { type: TraceSource['type'] }) {
  const labels = { formula: '公式', color_rule: '颜色规则', exhibit_screenshot: '展陈截图' }
  const colors = {
    formula: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    color_rule: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    exhibit_screenshot: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${colors[type]}`}>
      <SourceIcon type={type} />
      {labels[type]}
    </span>
  )
}

function RuleStatusBadge({ result }: { result: ProtectionResult }) {
  if (!result.triggered) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
        <Shield className="w-3 h-3" /> 正常
      </span>
    )
  }
  if (result.action === 'block') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
        <ShieldOff className="w-3 h-3" /> 阻止
      </span>
    )
  }
  if (result.action === 'clamp') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
        <ShieldAlert className="w-3 h-3" /> 钳位
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
      <ShieldAlert className="w-3 h-3" /> 警告
    </span>
  )
}

function RuleList() {
  const rules = getAllRules()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {rules.map(rule => {
        const surface = getSurfaceById(rule.surfaceId)
        const isExpanded = expandedId === rule.id
        return (
          <div
            key={rule.id}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : rule.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#e8e6e1]">{rule.paramKey}</span>
                  <span className="text-[9px] text-[#e8e6e1]/30">·</span>
                  <span className="text-[10px] text-[#e8e6e1]/50">{surface?.name ?? rule.surfaceId}</span>
                  <span className="text-[9px] text-[#e8e6e1]/30">·</span>
                  <SourceBadge type={rule.source.type} />
                </div>
                <div className="text-[10px] text-[#e8e6e1]/40 font-mono mt-0.5 truncate">
                  {rule.message}
                </div>
              </div>
              <div className="text-[9px] font-mono text-[#e8e6e1]/30">
                {rule.condition} → {rule.action}
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-3 pt-1 border-t border-white/[0.06] bg-white/[0.01] space-y-2">
                <div className="flex items-start gap-2">
                  <Link2 className="w-3 h-3 text-[#d4a853] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[9px] text-[#e8e6e1]/40 uppercase">溯源链路</div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                      <SourceIcon type={rule.source.type} />
                      <span className="text-[#e8e6e1]/70">{rule.source.label}</span>
                      <span className="text-[#e8e6e1]/20">→</span>
                      <span className="text-[#d4a853]">{rule.condition}</span>
                      <span className="text-[#e8e6e1]/20">→</span>
                      <span className="text-[#e05555]">{rule.action}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#e8e6e1]/50">
                  <span className="text-[#e8e6e1]/30">引用: </span>{rule.source.reference}
                </div>
                <div className="text-[10px] text-[#e8e6e1]/40">{rule.source.detail}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DirtyTestPanel() {
  const [testInput, setTestInput] = useState('{\n  "a": 15,\n  "b": -2,\n  "c": 0.001\n}')
  const [surfaceId, setSurfaceId] = useState('ellipsoid')
  const [results, setResults] = useState<DirtyTestResult[]>(() => {
    try {
      const stored = localStorage.getItem('math-surface-hall-dirty-tests')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  const runTest = useCallback(() => {
    try {
      const inputParams = JSON.parse(testInput)
      const protectionResults = evaluateProtections(surfaceId, inputParams)
      const triggered = getTriggeredResults(protectionResults)
      const hasBlock = hasBlockedProtections(protectionResults)

      const hasExplosionInput = Object.values(inputParams).some(
        v => typeof v === 'number' && (Math.abs(v) > 10 || v < 0)
      )
      const explosionCaught = triggered.some(t => t.action === 'block')

      const testResult: DirtyTestResult = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        timestamp: Date.now(),
        inputParams,
        surfaceId,
        results: protectionResults,
        passed: !hasBlock || explosionCaught,
        missedExplosion: hasExplosionInput && !explosionCaught,
      }

      const newResults = [testResult, ...results]
      setResults(newResults)
      localStorage.setItem('math-surface-hall-dirty-tests', JSON.stringify(newResults))
    } catch (e) {
      console.error('Invalid JSON input', e)
    }
  }, [testInput, surfaceId, results])

  const clearResults = useCallback(() => {
    setResults([])
    localStorage.removeItem('math-surface-hall-dirty-tests')
  }, [])

  return (
    <div className="space-y-4">
      <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#e8e6e1]">脏样例测试</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#e8e6e1]/50 font-mono">目标曲面:</span>
            <select
              value={surfaceId}
              onChange={e => setSurfaceId(e.target.value)}
              className="text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 text-[#e8e6e1] outline-none"
            >
              {getAllSurfaces().map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <textarea
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            rows={5}
            className="w-full text-[10px] font-mono bg-[#0a0a0f] border border-white/[0.08] rounded-md p-3 text-[#e8e6e1]/70 resize-none outline-none focus:border-[#d4a853]/30"
            placeholder='{"a": 15, "b": -2}'
          />

          <div className="flex gap-2">
            <button
              onClick={runTest}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-md
                bg-[#d4a853]/20 text-[#d4a853] border border-[#d4a853]/30
                hover:bg-[#d4a853]/30 transition-all"
            >
              <Play className="w-3 h-3" />
              运行测试
            </button>
            {results.length > 0 && (
              <button
                onClick={clearResults}
                className="text-[10px] px-3 py-1.5 rounded-md
                  border border-white/[0.06] text-[#e8e6e1]/40
                  hover:text-red-400 hover:border-red-400/20 transition-all"
              >
                清除结果
              </button>
            )}
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-[#e8e6e1]/50">测试结果</h3>
          {results.map(result => {
            const surface = getSurfaceById(result.surfaceId)
            return (
              <div
                key={result.id}
                className={`backdrop-blur-xl bg-white/[0.04] border rounded-lg p-3 space-y-2 ${
                  result.missedExplosion
                    ? 'border-red-500/30'
                    : result.passed
                    ? 'border-emerald-500/20'
                    : 'border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.missedExplosion ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : result.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-[10px] font-mono text-[#e8e6e1]/70">
                      {surface?.name ?? result.surfaceId}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#e8e6e1]/30">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-[#e8e6e1]/40">
                  输入: {JSON.stringify(result.inputParams)}
                </div>

                {result.missedExplosion && (
                  <div className="text-[10px] text-red-400 font-mono bg-red-500/5 px-2 py-1 rounded-md">
                    ⚠ 参数爆炸未被拦截！
                  </div>
                )}

                <div className="space-y-1">
                  {result.results.filter(r => r.triggered).map(r => (
                    <div key={r.ruleId} className="flex items-center gap-2">
                      <RuleStatusBadge result={r} />
                      <span className="text-[10px] font-mono text-[#e8e6e1]/50">{r.message}</span>
                    </div>
                  ))}
                  {result.results.filter(r => r.triggered).length === 0 && (
                    <div className="text-[10px] text-[#e8e6e1]/30 font-mono">无规则触发</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Protection() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e8e6e1]">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-md border border-white/[0.06] text-[#e8e6e1]/50
              hover:text-[#e8e6e1]/80 hover:bg-white/[0.04] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-['Cormorant_Garamond',serif] text-[#e8e6e1]">参数保护</h1>
            <p className="text-xs text-[#e8e6e1]/40 font-mono">保护规则列表 · 来源追溯 · 脏样例测试</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">保护规则列表</h2>
          <RuleList />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">脏样例测试</h2>
          <DirtyTestPanel />
        </section>
      </div>
    </div>
  )
}
