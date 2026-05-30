import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { resetGame } from '@/store/gameStore'
import StepTimeline from '@/components/StepTimeline'
import ChainAnnotation from '@/components/ChainAnnotation'
import ErrorAnalysisCard from '@/components/ErrorAnalysisCard'
import { BookOpen, Trophy, XCircle, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Review() {
  const navigate = useNavigate()
  const { scenarios, operations, score, scenarioScores, phase } = useGameStore()
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0)

  if (phase !== 'finished') {
    navigate('/')
    return null
  }

  const selectedScenario = scenarios[selectedScenarioIndex]
  const selectedScenarioOps = operations.filter(o => o.scenarioId === selectedScenario?.id)
  const hasErrors = selectedScenarioOps.some(op => !op.isCorrect)

  function getErrorForScenario(): { type: string; lawReference: string; explanation: string } | null {
    if (!selectedScenario) return null
    const wrongOp = selectedScenarioOps.find(op => !op.isCorrect)
    if (!wrongOp) {
      const missingKeys = Object.keys(selectedScenario.errorAnalysis).filter(k => k.startsWith('skip-'))
      if (missingKeys.length > 0) {
        return selectedScenario.errorAnalysis[missingKeys[0]] || null
      }
      return null
    }
    const errorKey = wrongOp.operationType === 'submit'
      ? (wrongOp.result.includes('超时') ? null : 'wrong-judgment')
      : wrongOp.operationType === 'verify-auth'
        ? 'auth-expired'
        : wrongOp.operationType === 'check-sample'
          ? 'sample-exceeded'
          : wrongOp.operationType === 'compare-track'
            ? 'name-confusion'
            : 'wrong-judgment'
    return errorKey ? (selectedScenario.errorAnalysis[errorKey] || null) : null
  }

  const errorInfo = getErrorForScenario()

  function handleHome() {
    resetGame()
    navigate('/')
  }

  function prevScenario() {
    if (selectedScenarioIndex > 0) {
      setSelectedScenarioIndex(selectedScenarioIndex - 1)
    }
  }

  function nextScenario() {
    if (selectedScenarioIndex < scenarios.length - 1) {
      setSelectedScenarioIndex(selectedScenarioIndex + 1)
    }
  }

  const correctCount = scenarioScores.filter((s, i) => {
    const finalOps = operations.filter(o => o.scenarioId === scenarios[i]?.id)
    const submitOp = finalOps.find(o => o.operationType === 'submit')
    return submitOp?.isCorrect
  }).length

  return (
    <div className="min-h-screen bg-ink-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-parchment-100 font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-amber" />
              审核复盘
            </h1>
            <p className="text-ink-400 text-sm font-serif mt-1">
              回看每一步推理与错因
            </p>
          </div>
          <button
            onClick={handleHome}
            className="btn-secondary flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            返回首页
          </button>
        </header>

        <div className="card-base p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <Trophy className={cn(
                'h-10 w-10 mx-auto mb-2',
                score >= 0 ? 'text-amber' : 'text-danger'
              )} />
              <div className="label-text">最终得分</div>
              <div className={cn(
                'font-mono text-3xl font-bold',
                score >= 0 ? 'text-success' : 'text-danger'
              )}>
                {score > 0 ? '+' : ''}{score}
              </div>
            </div>
            <div className="h-16 w-px bg-ink-600" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-success text-2xl font-bold">{correctCount}</span>
                <span className="text-ink-500">/</span>
                <span className="text-ink-300 text-2xl font-bold">{scenarios.length}</span>
              </div>
              <div className="label-text">正确判断</div>
              <div className="text-ink-400 text-sm font-serif">场景通过率</div>
            </div>
            <div className="h-16 w-px bg-ink-600" />
            <div className="text-center">
              <XCircle className={cn(
                'h-10 w-10 mx-auto mb-2',
                hasErrors ? 'text-danger' : 'text-ink-500'
              )} />
              <div className="label-text">错误操作</div>
              <div className="text-2xl font-bold text-ink-300 font-mono">
                {operations.filter(o => !o.isCorrect).length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {scenarios.map((scenario, index) => {
            const isSelected = index === selectedScenarioIndex
            const scenarioOps = operations.filter(o => o.scenarioId === scenario.id)
            const submitOp = scenarioOps.find(o => o.operationType === 'submit')
            const isCorrect = submitOp?.isCorrect
            const scScore = scenarioScores[index] || 0

            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenarioIndex(index)}
                className={cn(
                  'card-base p-4 text-left transition-all duration-200',
                  isSelected && 'border-amber border-glow-amber',
                  !isSelected && 'hover:border-ink-500'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-ink-400 text-xs font-mono">
                    场景 {index + 1}
                  </span>
                  {submitOp && (
                    isCorrect ? (
                      <span className="text-xs text-success">✓ 正确</span>
                    ) : (
                      <span className="text-xs text-danger">✗ 错误</span>
                    )
                  )}
                </div>
                <h3 className="text-parchment-200 font-serif text-sm font-semibold mb-1">
                  {scenario.title}
                </h3>
                <div className="text-xs font-mono text-right">
                  <span className={cn(
                    scScore >= 0 ? 'text-success' : 'text-danger'
                  )}>
                    {scScore > 0 ? '+' : ''}{scScore}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevScenario}
            disabled={selectedScenarioIndex === 0}
            className={cn(
              'btn-secondary flex items-center gap-1',
              selectedScenarioIndex === 0 && 'opacity-40 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            上一场景
          </button>
          <h2 className="font-serif text-lg text-amber font-semibold">
            {selectedScenario?.title}
          </h2>
          <button
            onClick={nextScenario}
            disabled={selectedScenarioIndex === scenarios.length - 1}
            className={cn(
              'btn-secondary flex items-center gap-1',
              selectedScenarioIndex === scenarios.length - 1 && 'opacity-40 cursor-not-allowed'
            )}
          >
            下一场景
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card-base p-5">
              <h3 className="section-title mb-4">操作时间线</h3>
              <StepTimeline
                operations={operations}
                currentScenarioId={selectedScenario?.id || ''}
              />
            </div>

            <div className="card-base p-5">
              <h3 className="section-title mb-4">推理链对比</h3>
              <ChainAnnotation
                playerChain={selectedScenario?.reasoningChain.map(n => {
                  const inOps = selectedScenarioOps.find(op =>
                    op.reasoningImpact.some(i => i.includes(n.label))
                  )
                  if (n.label === '合规判断') {
                    const submit = selectedScenarioOps.find(o => o.operationType === 'submit')
                    return { ...n, status: submit?.isCorrect ? 'confirmed' : 'conflict' }
                  }
                  if (inOps) {
                    return {
                      ...n,
                      status: inOps.reasoningImpact.some(i => i.includes('冲突'))
                        ? 'conflict'
                        : 'confirmed'
                    }
                  }
                  return n
                }) || []}
                correctChain={selectedScenario?.reasoningChain.map(n => ({
                  ...n,
                  status: 'confirmed' as const
                })) || []}
              />
            </div>
          </div>

          <div>
            <div className="card-base p-5">
              <h3 className="section-title mb-4">错因分析</h3>
              {errorInfo ? (
                <ErrorAnalysisCard
                  errorType={errorInfo.type}
                  lawReference={errorInfo.lawReference}
                  explanation={errorInfo.explanation}
                  scenarioTitle={selectedScenario?.title || ''}
                />
              ) : (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 border border-success/30 mb-4">
                    <span className="text-success text-3xl">✓</span>
                  </div>
                  <h4 className="text-success-light font-serif text-lg font-semibold mb-2">
                    操作规范
                  </h4>
                  <p className="text-ink-300 text-sm font-serif">
                    本场景所有操作均正确，无错误分析。
                  </p>
                </div>
              )}
            </div>

            <div className="card-base p-5 mt-6">
              <h3 className="section-title mb-4">得分明细</h3>
              <div className="space-y-2">
                {selectedScenarioOps.map((op, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-ink-700 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-ink-400 text-xs font-mono w-8">
                        {index + 1}.
                      </span>
                      <span className="text-ink-200 text-sm font-serif">
                        {op.result}
                      </span>
                    </div>
                    <span className={cn(
                      'font-mono text-sm font-semibold',
                      op.scoreDelta > 0 ? 'text-success' : op.scoreDelta < 0 ? 'text-danger' : 'text-ink-400'
                    )}>
                      {op.scoreDelta > 0 ? '+' : ''}{op.scoreDelta}
                    </span>
                  </div>
                ))}
                {selectedScenarioOps.length === 0 && (
                  <div className="py-8 text-center text-ink-400 text-sm font-serif">
                    暂无操作记录
                  </div>
                )}
              </div>
              {selectedScenarioOps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-ink-600 flex items-center justify-between">
                  <span className="text-parchment-200 font-serif font-semibold">
                    本场景得分
                  </span>
                  <span className={cn(
                    'font-mono text-xl font-bold',
                    (scenarioScores[selectedScenarioIndex] || 0) >= 0 ? 'text-success' : 'text-danger'
                  )}>
                    {(scenarioScores[selectedScenarioIndex] || 0) > 0 ? '+' : ''}
                    {scenarioScores[selectedScenarioIndex] || 0}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
