import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { cases } from '@/data/cases'
import { useGameStore } from '@/store/gameStore'
import Timer from '@/components/Timer'
import MaterialPanel from '@/components/MaterialPanel'
import JudgmentPanel from '@/components/JudgmentPanel'
import JudgmentFeedback from '@/components/JudgmentFeedback'
import type { Material } from '@/types'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

const DIFFICULTY_STARS = ['⭐', '⭐⭐', '⭐⭐⭐']

export default function CaseReview() {
  const { id: caseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentCase = useGameStore((s) => s.currentCase)
  const judgments = useGameStore((s) => s.judgments)
  const selectedMaterialId = useGameStore((s) => s.selectedMaterialId)
  const gameStarted = useGameStore((s) => s.gameStarted)
  const gameEnded = useGameStore((s) => s.gameEnded)
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const feedbackModal = useGameStore((s) => s.feedbackModal)
  const completedCases = useGameStore((s) => s.completedCases)
  const startCase = useGameStore((s) => s.startCase)
  const tick = useGameStore((s) => s.tick)
  const selectMaterial = useGameStore((s) => s.selectMaterial)
  const dismissFeedback = useGameStore((s) => s.dismissFeedback)

  useEffect(() => {
    const caseData = cases.find((c) => c.id === caseId)
    if (!caseData) {
      navigate('/')
      return
    }
    startCase(caseData)
  }, [caseId])

  useEffect(() => {
    if (gameStarted && !gameEnded) {
      intervalRef.current = setInterval(() => tick(), 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [gameStarted, gameEnded])

  if (!currentCase) return null

  const allMaterials: Material[] = [
    ...currentCase.policyCards,
    ...currentCase.medicalRecords,
    ...currentCase.invoices,
    ...currentCase.clauses,
  ]

  const selectedMaterial = allMaterials.find((m) => m.id === selectedMaterialId) ?? null
  const totalMaterials = allMaterials.length

  const caseResult = completedCases[currentCase.id]

  return (
    <div className="flex h-screen flex-col bg-[#0f1219]">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 bg-[#0f1219]">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-400 hover:text-[#d4a843] transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">返回</span>
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-[#f5f0e8]">{currentCase.title}</h1>
          <span className="text-xs text-[#d4a843]">{DIFFICULTY_STARS[currentCase.difficulty - 1]}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-gray-400">{judgments.length} / {totalMaterials}</span>
            <div className="h-1.5 w-20 rounded-full bg-gray-700 mt-1">
              <div className="h-full rounded-full bg-[#d4a843] transition-all" style={{ width: `${(judgments.length / totalMaterials) * 100}%` }} />
            </div>
          </div>
          <Timer timeRemaining={timeRemaining} totalTime={currentCase.timeLimitSeconds} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[60%] border-r border-gray-800 p-3">
          <MaterialPanel
            policyCards={currentCase.policyCards}
            medicalRecords={currentCase.medicalRecords}
            invoices={currentCase.invoices}
            clauses={currentCase.clauses}
            selectedMaterialId={selectedMaterialId}
            judgments={judgments}
            onSelectMaterial={selectMaterial}
          />
        </div>
        <div className="w-[40%] p-3">
          <JudgmentPanel selectedMaterial={selectedMaterial} judgments={judgments} />
        </div>
      </div>

      <JudgmentFeedback
        visible={feedbackModal.visible}
        judgment={feedbackModal.judgment}
        trapHit={feedbackModal.trapHit}
        correctVerdict={feedbackModal.correctVerdict}
        correctReason={feedbackModal.correctReason}
        onDismiss={dismissFeedback}
      />

      {gameEnded && caseResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl p-8 text-center shadow-2xl" style={{ backgroundColor: '#1a1f2e', border: '1px solid #f5f0e830' }}>
            <AlertTriangle className="mx-auto h-10 w-10 text-[#d4a843]" />
            <h2 className="mt-3 text-2xl font-bold text-[#f5f0e8]">审查结束</h2>
            <div className="mt-4 space-y-1 text-sm text-[#f5f0e8cc]">
              <p>得分：<span className="text-[#d4a843] font-bold text-lg">{caseResult.score}</span></p>
              <p>正确：{caseResult.correctCount} / {caseResult.totalCount}</p>
              <p>陷阱识别：{caseResult.trapIdentifiedCount}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => navigate(`/report/${caseId}`)} className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-[#d4a843] text-[#1a1f2e] hover:opacity-90 transition">
                查看报告
              </button>
              <button onClick={() => navigate('/')} className="flex-1 rounded-lg py-2.5 text-sm font-semibold border border-[#f5f0e840] text-[#f5f0e8] hover:bg-[#f5f0e810] transition">
                返回大厅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
