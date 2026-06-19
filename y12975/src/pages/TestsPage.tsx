import { useEffect, useState } from 'react'
import { getTestList, runTest, type TestScenario, type TestRunResult } from '@/api'
import { FlaskConical, Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function TestsPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<TestRunResult | null>(null)

  const fetchList = () => {
    setLoading(true)
    getTestList().then((r) => {
      if (r.ok && r.data) setScenarios(r.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleRun = async (scenario: string) => {
    setRunning(scenario)
    setLastResult(null)
    const res = await runTest(scenario)
    setRunning(null)
    if (res.ok && res.data) {
      setLastResult(res.data)
      fetchList()
    }
  }

  const tryParseDetail = (detail: string | null) => {
    if (!detail) return null
    try {
      return JSON.parse(detail)
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
          <FlaskConical size={22} className="text-signal-lime" /> 测试场景
        </h2>
        <p className="text-sm text-txt-muted">
          验证工具在关键路径上的稳定性，特别是重复导入场景，避免"看上去能跑、实际越跑越乱"
        </p>
      </div>

      {lastResult && (
        <div
          className={`p-4 rounded border ${
            lastResult.passed
              ? 'border-signal-lime/30 bg-signal-lime/5'
              : 'border-signal-coral/30 bg-signal-coral/5'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.passed ? (
              <CheckCircle2 size={18} className="text-signal-lime" />
            ) : (
              <XCircle size={18} className="text-signal-coral" />
            )}
            <span className="font-medium">
              场景「{lastResult.scenario}」{lastResult.passed ? '通过' : '未通过'}
            </span>
            <span className="text-xs text-txt-muted ml-auto">
              {new Date(lastResult.runAt).toLocaleString()}
            </span>
          </div>
          {tryParseDetail(lastResult.detail) && (
            <pre className="font-mono text-xs p-2 bg-bg-raised rounded border border-border overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(tryParseDetail(lastResult.detail), null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="col-span-full py-8 text-center text-txt-muted">加载中...</div>
        )}
        {!loading &&
          scenarios.map((s) => {
            const last = s.lastRun as unknown as TestRunResult | null
            const passed = last ? Boolean(last.passed) : null
            return (
              <div key={s.scenario} className="card flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif italic text-lg">{s.scenario}</h3>
                  {passed === true && (
                    <span className="badge-lime inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                      <CheckCircle2 size={10} /> 稳定
                    </span>
                  )}
                  {passed === false && (
                    <span className="badge-coral inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                      <AlertTriangle size={10} /> 不稳定
                    </span>
                  )}
                  {passed === null && (
                    <span className="badge-muted px-2 py-0.5 rounded text-xs">未运行</span>
                  )}
                </div>
                <p className="text-sm text-txt-muted flex-1 mb-3">{s.description}</p>
                {last && (
                  <div className="text-xs text-txt-dim mb-3">
                    上次运行：{new Date(last.runAt).toLocaleString()}
                    {last.beforeCount !== null && (
                      <span className="ml-2">
                        条数：{last.beforeCount} → {last.afterCount}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleRun(s.scenario)}
                  disabled={running === s.scenario}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-signal-lime text-signal-lime transition-colors disabled:opacity-50"
                >
                  <Play size={14} className={running === s.scenario ? 'animate-pulse' : ''} />
                  {running === s.scenario ? '运行中...' : '运行场景'}
                </button>
              </div>
            )
          })}
      </div>

      <div className="card border-signal-amber/30 bg-signal-amber/5">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="text-signal-amber mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-signal-amber">关于重复导入场景</div>
            <div className="text-xs text-txt-muted mt-1 leading-relaxed">
              该场景模拟同一批来源材料被重复导入两次，验证 dedup_key 去重机制是否生效。
              如果重复导入后条数无限增长，说明工具"看上去能跑、实际越跑越乱"，
              需立即修复去重逻辑。日常真跑前请确保此场景为「稳定」状态。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
