import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import {
  tickTimer,
  performOperation,
  openJudgingModal,
  closeJudgingModal,
  selectAnswer,
  submitConclusion,
  nextScenario,
  goToReview,
} from '@/store/gameStore'
import ClueCard from '@/components/ClueCard'
import NoticePanel from '@/components/NoticePanel'
import Timer from '@/components/Timer'
import ActionBar from '@/components/ActionBar'
import ReasoningChain from '@/components/ReasoningChain'
import JudgingModal from '@/components/JudgingModal'
import { CheckCircle, XCircle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Game() {
  const navigate = useNavigate()
  const {
    phase,
    currentScenarioIndex,
    scenarios,
    score,
    timeRemaining,
    timerActive,
    currentChain,
    showJudgingModal,
    selectedAnswer,
    isCorrectAnswer,
    revealDetail,
    completedOperations,
  } = useGameStore()

  const currentScenario = scenarios[currentScenarioIndex]

  useEffect(() => {
    if (phase === 'intro' || !currentScenario) {
      navigate('/')
    }
  }, [phase, currentScenario, navigate])

  const tick = useCallback(() => {
    tickTimer()
  }, [])

  useEffect(() => {
    if (!timerActive || phase !== 'playing') return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timerActive, phase, tick])

  function handleVerifyAuth() {
    performOperation('verify-auth')
  }

  function handleCheckSample() {
    performOperation('check-sample')
  }

  function handleCompareTrack() {
    performOperation('compare-track')
  }

  function handleSubmit() {
    openJudgingModal()
  }

  function handleConfirmSubmit() {
    if (selectedAnswer) {
      submitConclusion(selectedAnswer)
    }
  }

  function handleNext() {
    if (currentScenarioIndex >= scenarios.length - 1) {
      goToReview()
      navigate('/review')
    } else {
      nextScenario()
    }
  }

  if (!currentScenario) {
    return null
  }

  const isLastScenario = currentScenarioIndex >= scenarios.length - 1

  return (
    <div className="min-h-screen bg-ink-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-xl text-parchment-100 font-semibold">
              音乐版权跑团
            </h1>
            <p className="text-ink-400 text-xs font-serif">
              场景 {currentScenarioIndex + 1} / {scenarios.length}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="label-text">当前得分</div>
              <div className={cn(
                'font-mono text-xl font-bold',
                score >= 0 ? 'text-success' : 'text-danger'
              )}>
                {score > 0 ? '+' : ''}{score}
              </div>
            </div>
            <Timer
              timeRemaining={timeRemaining}
              timeLimit={currentScenario.timeLimit}
              timerActive={timerActive}
            />
          </div>
        </header>

        <div className="mb-4">
          <div className="card-base p-3">
            <h2 className="font-serif text-amber font-semibold text-base mb-1">
              {currentScenario.title}
            </h2>
            <p className="text-ink-300 text-sm font-serif">
              {currentScenario.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="section-title mb-3">歌曲线索</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentScenario.clueCards.map((card, index) => (
                  <ClueCard key={card.id} card={card} index={index} />
                ))}
              </div>
            </div>

            <div className="card-base p-4">
              <h3 className="section-title mb-3">推理链</h3>
              <ReasoningChain nodes={currentChain} />
            </div>

            {phase === 'reveal' && (
              <div
                className={cn(
                  'card-base p-4 animate-fade-in',
                  isCorrectAnswer
                    ? 'border-t-4 border-t-success'
                    : 'border-t-4 border-t-danger'
                )}
              >
                <div className="flex items-start gap-3">
                  {isCorrectAnswer ? (
                    <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-danger shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={cn(
                      'font-serif font-semibold mb-2',
                      isCorrectAnswer ? 'text-success-light' : 'text-danger-light'
                    )}>
                      {isCorrectAnswer ? '判断正确！' : '判断错误'}
                    </h4>
                    <p className="text-sm text-parchment-200 font-serif whitespace-pre-line leading-relaxed">
                      {revealDetail}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleNext}
                        className="btn-primary flex items-center gap-2"
                      >
                        {isLastScenario ? (
                          <>查看复盘</>
                        ) : (
                          <>
                            下一场景
                            <SkipForward className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {phase === 'playing' && (
              <div>
                <h3 className="section-title mb-3">操作</h3>
                <ActionBar
                  onVerifyAuth={handleVerifyAuth}
                  onCheckSample={handleCheckSample}
                  onCompareTrack={handleCompareTrack}
                  onSubmit={handleSubmit}
                  completedOperations={completedOperations}
                  disabled={false}
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="section-title mb-3">平台通知</h3>
            <NoticePanel notices={currentScenario.notices} />
          </div>
        </div>
      </div>

      <JudgingModal
        open={showJudgingModal}
        onClose={closeJudgingModal}
        onSelectAnswer={selectAnswer}
        selectedAnswer={selectedAnswer}
        onSubmit={handleConfirmSubmit}
      />
    </div>
  )
}
